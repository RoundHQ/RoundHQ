import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripeObjectId, stripeTimestampToIso } from "@/lib/stripe/server";

export type StripeInvoicePaymentStatus = "open" | "paid" | "expired";

export function isRoundHqInvoiceCheckoutSession(
  session: Stripe.Checkout.Session
) {
  return session.metadata?.source === "roundhq_invoice";
}

export async function syncStripeInvoiceCheckoutSession(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  paymentStatus: StripeInvoicePaymentStatus
) {
  const organizationId = session.metadata?.organization_id;
  const invoiceId = session.metadata?.invoice_id;

  if (!organizationId || !invoiceId) {
    return null;
  }

  const now = new Date().toISOString();
  const paidAt =
    paymentStatus === "paid"
      ? stripeTimestampToIso(session.created) ?? now
      : null;
  const updatePayload: Record<string, unknown> = {
    stripe_checkout_session_id: session.id,
    stripe_payment_status: paymentStatus,
    stripe_payment_intent_id: getStripeObjectId(session.payment_intent) || null,
    stripe_payment_completed_at: paidAt,
    updated_at: now,
  };

  if (session.url) {
    updatePayload.stripe_payment_link_url = session.url;
  }

  if (paymentStatus === "paid") {
    updatePayload.status = "Paid";
  }

  const { data, error } = await supabase
    .from("invoices")
    .update(updatePayload)
    .eq("organization_id", organizationId)
    .eq("id", invoiceId)
    .select(
      "id,invoice_number,status,stripe_checkout_session_id,stripe_payment_link_url,stripe_payment_status,stripe_payment_intent_id,stripe_payment_completed_at"
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
