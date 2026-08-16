import { NextResponse } from "next/server";
import Stripe from "stripe";
import { syncStripeCheckoutSession, syncStripeSubscription } from "@/lib/billing/stripe-sync";
import {
  isRoundHqInvoiceCheckoutSession,
  syncStripeInvoiceCheckoutSession,
} from "@/lib/stripe/invoice-payments";
import { getStripe, getStripeWebhookSecrets } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type StripeWebhookSource = "platform" | "connect";

function getWebhookSecretCandidates(secrets: {
  platform: string;
  connect: string;
}) {
  const candidates: Array<{ source: StripeWebhookSource; secret: string }> = [];
  const platformSecret = secrets.platform.trim();
  const connectSecret = secrets.connect.trim();

  if (platformSecret) {
    candidates.push({ source: "platform", secret: platformSecret });
  }

  if (connectSecret && connectSecret !== platformSecret) {
    candidates.push({ source: "connect", secret: connectSecret });
  }

  return candidates;
}

function constructWebhookEvent(
  stripe: Stripe,
  body: string,
  signature: string,
  secrets: { platform: string; connect: string }
) {
  const candidates = getWebhookSecretCandidates(secrets);
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      return {
        source: candidate.source,
        event: stripe.webhooks.constructEvent(
          body,
          signature,
          candidate.secret
        ),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Invalid Stripe webhook signature.");
}

export async function POST(request: Request) {
  const stripe = await getStripe();
  const webhookSecrets = await getStripeWebhookSecrets();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();
  const hasWebhookSecret = Boolean(
    webhookSecrets.platform.trim() || webhookSecrets.connect.trim()
  );

  if (!hasWebhookSecret || !signature) {
    return NextResponse.json(
      {
        error: !hasWebhookSecret
          ? "Stripe webhook signing is not configured."
          : "Stripe webhook signature header is missing.",
      },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  let source: StripeWebhookSource;

  try {
    const verifiedWebhook = constructWebhookEvent(
      stripe,
      body,
      signature,
      webhookSecrets
    );
    event = verifiedWebhook.event;
    source = verifiedWebhook.source;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Invalid Stripe webhook signature.",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceRoleClient();
    const isConnectWebhookEvent = source === "connect" || Boolean(event.account);

    switch (event.type) {
      case "checkout.session.completed":
        if (
          isRoundHqInvoiceCheckoutSession(
            event.data.object as Stripe.Checkout.Session
          )
        ) {
          await syncStripeInvoiceCheckoutSession(
            supabase,
            event.data.object as Stripe.Checkout.Session,
            (event.data.object as Stripe.Checkout.Session).payment_status === "paid"
              ? "paid"
              : "open",
            { id: event.id, type: event.type }
          );
          break;
        }

        await syncStripeCheckoutSession(
          supabase,
          stripe,
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "checkout.session.async_payment_succeeded":
        if (
          isRoundHqInvoiceCheckoutSession(
            event.data.object as Stripe.Checkout.Session
          )
        ) {
          await syncStripeInvoiceCheckoutSession(
            supabase,
            event.data.object as Stripe.Checkout.Session,
            "paid",
            { id: event.id, type: event.type }
          );
          break;
        }

        await syncStripeCheckoutSession(
          supabase,
          stripe,
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "checkout.session.expired":
        if (
          isRoundHqInvoiceCheckoutSession(
            event.data.object as Stripe.Checkout.Session
          )
        ) {
          await syncStripeInvoiceCheckoutSession(
            supabase,
            event.data.object as Stripe.Checkout.Session,
            "expired",
            { id: event.id, type: event.type }
          );
        }
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        if (!isConnectWebhookEvent) {
          await syncStripeSubscription(
            supabase,
            event.data.object as Stripe.Subscription
          );
        }
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to process Stripe webhook.",
      },
      { status: 500 }
    );
  }
}
