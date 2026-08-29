import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentRequestStatus } from "./provider";

function isOptionalSchemaError(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        error.message?.includes("payment_requests") ||
        error.message?.includes("payment_webhook_events"))
  );
}

function logCompatibilityWarning(operation: string) {
  console.warn("payment_audit_schema_unavailable", { operation });
}

export async function recordStripePaymentRequest(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    customerId?: number | null;
    invoiceId: string;
    session: Stripe.Checkout.Session;
    amount: number;
    currency: string;
    status: PaymentRequestStatus;
    idempotencyKey: string;
  }
) {
  const row = {
    organization_id: input.organizationId,
    customer_id: input.customerId ?? null,
    invoice_id: input.invoiceId,
    provider: "stripe",
    provider_request_id: input.session.id,
    payment_url: input.session.url ?? null,
    amount: input.amount,
    currency: input.currency.toUpperCase(),
    status: input.status,
    idempotency_key: input.idempotencyKey,
    expires_at: input.session.expires_at
      ? new Date(input.session.expires_at * 1000).toISOString()
      : null,
    paid_at: input.status === "paid" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("payment_requests")
    .upsert(row, { onConflict: "organization_id,idempotency_key" })
    .select("id,status,provider_request_id,payment_url")
    .single();
  if (isOptionalSchemaError(error)) {
    logCompatibilityWarning("record_stripe_payment_request");
    return null;
  }
  if (error) throw error;
  return data;
}

export async function claimPaymentWebhookEvent(
  supabase: SupabaseClient,
  input: { provider: "stripe" | "gocardless"; eventId: string; eventType: string }
) {
  const { data, error } = await supabase
    .from("payment_webhook_events")
    .insert({
      provider: input.provider,
      provider_event_id: input.eventId,
      event_type: input.eventType,
    })
    .select("id")
    .single();
  if (error?.code === "23505") return { claimed: false, id: null };
  if (isOptionalSchemaError(error)) {
    logCompatibilityWarning("claim_payment_webhook");
    return { claimed: true, id: null };
  }
  if (error) throw error;
  return { claimed: true, id: data.id as string };
}

export async function releasePaymentWebhookClaim(
  supabase: SupabaseClient,
  claimId: string | null
) {
  if (!claimId) return;
  const { error } = await supabase
    .from("payment_webhook_events")
    .delete()
    .eq("id", claimId);
  if (error && !isOptionalSchemaError(error)) throw error;
}

export async function syncStripePaymentRequestStatus(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  status: PaymentRequestStatus,
  claimId?: string | null
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("payment_requests")
    .update({
      status,
      payment_url: session.url ?? undefined,
      paid_at: status === "paid" ? now : null,
      updated_at: now,
    })
    .eq("provider", "stripe")
    .eq("provider_request_id", session.id)
    .select("id")
    .maybeSingle();
  if (isOptionalSchemaError(error)) {
    logCompatibilityWarning("sync_stripe_payment_request");
    return null;
  }
  if (error) throw error;
  if (claimId && data?.id) {
    const { error: eventError } = await supabase
      .from("payment_webhook_events")
      .update({ payment_request_id: data.id, processed_at: now })
      .eq("id", claimId);
    if (eventError && !isOptionalSchemaError(eventError)) throw eventError;
  }
  return data;
}
