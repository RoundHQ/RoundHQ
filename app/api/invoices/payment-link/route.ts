import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { ensureWorkspace } from "@/lib/workspace";
import { getPaymentRequestIdempotencyKey } from "@/lib/payments/provider";
import { recordStripePaymentRequest } from "@/lib/payments/requests";
import { getBaseUrl, getStripe } from "@/lib/stripe/server";
import {
  getWorkspaceStripeSettings,
  updateWorkspaceStripeSettings,
} from "@/lib/stripe/connect";

export const runtime = "nodejs";

type InvoicePaymentRow = {
  id: string;
  invoice_number: string;
  customer_id: number | null;
  customer_name: string;
  status: string;
  total: number | string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_link_url: string | null;
  stripe_payment_status: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_completed_at: string | null;
  updated_at: string;
};

type CustomerEmailRow = {
  email: string | null;
  contact_emails: unknown;
};

function normalizeInvoiceId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePaymentStatus(value: unknown) {
  return value === "paid" || value === "open" || value === "expired"
    ? value
    : "not_created";
}

function getPrimaryCustomerEmail(customer: CustomerEmailRow | null) {
  if (typeof customer?.email === "string" && customer.email.trim()) {
    return customer.email.trim();
  }

  if (Array.isArray(customer?.contact_emails)) {
    return (
      customer.contact_emails.find(
        (entry): entry is string =>
          typeof entry === "string" && entry.trim().length > 0
      )?.trim() || undefined
    );
  }

  return undefined;
}

function serializeInvoice(row: InvoicePaymentRow) {
  return {
    id: row.id,
    status: row.status,
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    stripePaymentLinkUrl: row.stripe_payment_link_url,
    stripePaymentStatus: normalizePaymentStatus(row.stripe_payment_status),
    stripePaymentIntentId: row.stripe_payment_intent_id,
    stripePaymentCompletedAt: row.stripe_payment_completed_at,
  };
}

function isReusableCheckoutSession(session: Stripe.Checkout.Session) {
  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);

  return Boolean(
    session.url &&
      session.status === "open" &&
      (!expiresAt || expiresAt > now + 60)
  );
}

async function getReusableCheckoutSession({
  stripe,
  sessionId,
  connectedAccountId,
}: {
  stripe: Awaited<ReturnType<typeof getStripe>>;
  sessionId: string | null;
  connectedAccountId: string;
}) {
  if (!sessionId) {
    return null;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount: connectedAccountId }
    );

    return isReusableCheckoutSession(session) ? session : null;
  } catch (error) {
    console.warn(
      "Stored invoice Checkout Session could not be reused:",
      error instanceof Error && error.message.trim()
        ? error.message
        : "Unknown Stripe error"
    );
    return null;
  }
}

function getSchemaErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    (error.message.includes("stripe_payment") ||
      error.message.includes("stripe_checkout"))
  ) {
    return "The invoices table needs the Stripe invoice payment columns. Run supabase/stripe_invoice_payments.sql in Supabase, then refresh.";
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { invoiceId?: unknown }
      | null;
    const invoiceId = normalizeInvoiceId(body?.invoiceId);

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const organizationId = await ensureWorkspace(supabase, user);
    const settings = await getWorkspaceStripeSettings(supabase, organizationId);

    if (!settings.stripeConnectedAccountId) {
      return NextResponse.json(
        { error: "Connect Stripe in Settings before creating invoice payment links." },
        { status: 400 }
      );
    }

    if (!settings.stripePaymentLinksEnabled) {
      return NextResponse.json(
        { error: "Turn on payment links in Settings before creating invoice links." },
        { status: 400 }
      );
    }

    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoices")
      .select(
        "id,invoice_number,customer_id,customer_name,status,total,stripe_checkout_session_id,stripe_payment_link_url,stripe_payment_status,stripe_payment_intent_id,stripe_payment_completed_at,updated_at"
      )
      .eq("organization_id", organizationId)
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceError) {
      throw invoiceError;
    }

    const invoice = invoiceData as InvoicePaymentRow | null;

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    if (invoice.status === "Paid" || invoice.stripe_payment_status === "paid") {
      return NextResponse.json({ invoice: serializeInvoice(invoice) });
    }

    const invoiceTotal = Number(invoice.total ?? 0);
    const amount = Math.round(invoiceTotal * 100);

    if (!Number.isFinite(invoiceTotal) || amount <= 0) {
      return NextResponse.json(
        { error: "Only invoices with a positive total can have payment links." },
        { status: 400 }
      );
    }

    const stripe = await getStripe();
    const paymentRequestKey = getPaymentRequestIdempotencyKey({
      organizationId,
      invoiceId: invoice.id,
      provider: "stripe",
      amount: invoiceTotal,
      version: invoice.updated_at,
    });
    const paymentAuditClient = createServiceRoleClient();

    const account = await stripe.accounts.retrieve(settings.stripeConnectedAccountId);

    if (!account.charges_enabled) {
      const refreshedSettings = await updateWorkspaceStripeSettings(
        supabase,
        organizationId,
        {
          stripeConnectStatus: account.details_submitted
            ? "restricted"
            : "onboarding",
          stripeConnectChargesEnabled: account.charges_enabled,
          stripeConnectPayoutsEnabled: account.payouts_enabled,
          stripeConnectDetailsSubmitted: account.details_submitted,
          stripePaymentLinksEnabled: false,
        }
      );

      return NextResponse.json(
        {
          error:
            refreshedSettings.stripeConnectStatus === "restricted"
              ? "Stripe needs more account details before payments can be taken."
              : "Complete Stripe onboarding before creating payment links.",
        },
        { status: 400 }
      );
    }

    if (
      invoice.stripe_payment_link_url &&
      invoice.stripe_payment_status === "open"
    ) {
      const existingSession = await getReusableCheckoutSession({
        stripe,
        sessionId: invoice.stripe_checkout_session_id,
        connectedAccountId: settings.stripeConnectedAccountId,
      });

      if (existingSession?.url) {
        await recordStripePaymentRequest(paymentAuditClient, {
          organizationId,
          customerId: invoice.customer_id,
          invoiceId: invoice.id,
          session: existingSession,
          amount: invoiceTotal,
          currency: settings.currencyCode,
          status: "open",
          idempotencyKey: paymentRequestKey,
        });
        return NextResponse.json({
          invoice: serializeInvoice({
            ...invoice,
            stripe_checkout_session_id: existingSession.id,
            stripe_payment_link_url: existingSession.url,
            stripe_payment_status: "open",
          }),
        });
      }
    }

    const { data: customerData } =
      invoice.customer_id != null
        ? await supabase
            .from("customers")
            .select("email,contact_emails")
            .eq("organization_id", organizationId)
            .eq("id", invoice.customer_id)
            .maybeSingle()
        : { data: null };
    const customerEmail = getPrimaryCustomerEmail(
      customerData as CustomerEmailRow | null
    );
    const baseUrl = getBaseUrl(request.url);
    const metadata = {
      source: "roundhq_invoice",
      organization_id: organizationId,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
    };
    // Intentionally no application_fee_amount: RoundHQ takes no platform fee.
    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: settings.currencyCode.toLowerCase(),
              unit_amount: amount,
              product_data: {
                name: `Invoice ${invoice.invoice_number}`,
                description: `Payment to ${settings.tradingName || settings.businessName || "RoundHQ customer"}`,
              },
            },
          },
        ],
        customer_email: customerEmail,
        success_url: `${baseUrl}/invoice-payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/invoice-payment/cancelled?invoice=${encodeURIComponent(
          invoice.id
        )}`,
        metadata,
        payment_intent_data: {
          metadata,
        },
      },
      {
        stripeAccount: settings.stripeConnectedAccountId,
        idempotencyKey: paymentRequestKey,
      }
    );

    if (!checkoutSession.url) {
      throw new Error("Stripe did not return a payment link.");
    }

    const { data: updatedInvoiceData, error: updateError } = await supabase
      .from("invoices")
      .update({
        stripe_checkout_session_id: checkoutSession.id,
        stripe_payment_link_url: checkoutSession.url,
        stripe_payment_status: "open",
        stripe_payment_intent_id: null,
        stripe_payment_completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("id", invoice.id)
      .select(
        "id,invoice_number,customer_id,customer_name,status,total,stripe_checkout_session_id,stripe_payment_link_url,stripe_payment_status,stripe_payment_intent_id,stripe_payment_completed_at,updated_at"
      )
      .single();

    if (updateError) {
      throw updateError;
    }

    await recordStripePaymentRequest(paymentAuditClient, {
      organizationId,
      customerId: invoice.customer_id,
      invoiceId: invoice.id,
      session: checkoutSession,
      amount: invoiceTotal,
      currency: settings.currencyCode,
      status: "open",
      idempotencyKey: paymentRequestKey,
    });

    return NextResponse.json({
      invoice: serializeInvoice(updatedInvoiceData as InvoicePaymentRow),
    });

  } catch (error) {
    const schemaError = getSchemaErrorMessage(error);

    return NextResponse.json(
      {
        error:
          schemaError ||
          (error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to create invoice payment link."),
      },
      { status: 500 }
    );
  }
}
