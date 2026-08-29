import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripeObjectId } from "@/lib/stripe/server";
import {
  claimPaymentWebhookEvent,
  releasePaymentWebhookClaim,
  syncStripePaymentRequestStatus,
} from "@/lib/payments/requests";

export type StripeInvoicePaymentStatus = "open" | "paid" | "expired";

export function isRoundHqInvoiceCheckoutSession(
  session: Stripe.Checkout.Session
) {
  return session.metadata?.source === "roundhq_invoice";
}

export async function syncStripeInvoiceCheckoutSession(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  paymentStatus: StripeInvoicePaymentStatus,
  webhookEvent?: { id: string; type: string }
) {
  const organizationId = session.metadata?.organization_id;
  const invoiceId = session.metadata?.invoice_id;

  if (!organizationId || !invoiceId) {
    return null;
  }

  const claim = webhookEvent
    ? await claimPaymentWebhookEvent(supabase, {
        provider: "stripe",
        eventId: webhookEvent.id,
        eventType: webhookEvent.type,
      })
    : { claimed: true, id: null };
  if (!claim.claimed) return null;

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    stripe_checkout_session_id: session.id,
    stripe_payment_status: paymentStatus,
    stripe_payment_intent_id: getStripeObjectId(session.payment_intent) || null,
    stripe_payment_completed_at: paymentStatus === "paid" ? now : null,
    updated_at: now,
  };

  if (session.url) {
    updatePayload.stripe_payment_link_url = session.url;
  }

  if (paymentStatus === "paid") {
    updatePayload.status = "Paid";
  }

  try {
    const { data, error } = await supabase
      .from("invoices")
      .update(updatePayload)
      .eq("organization_id", organizationId)
      .eq("id", invoiceId)
      .select(
        "id,invoice_number,status,stripe_checkout_session_id,stripe_payment_link_url,stripe_payment_status,stripe_payment_intent_id,stripe_payment_completed_at"
      )
      .maybeSingle();

    if (error) throw error;

    await syncStripePaymentRequestStatus(
      supabase,
      session,
      paymentStatus,
      claim.id
    );
    return data;
  } catch (error) {
    await releasePaymentWebhookClaim(supabase, claim.id);
    throw error;
  }
}