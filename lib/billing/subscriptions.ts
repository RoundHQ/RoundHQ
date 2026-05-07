import type { SupabaseClient } from "@supabase/supabase-js";

export type SubscriptionRow = {
  organization_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export function hasDashboardAccess(subscription: SubscriptionRow | null) {
  if (!subscription) {
    return false;
  }

  if (subscription.status === "active") {
    return true;
  }

  return (
    subscription.status === "trialing" &&
    Boolean(subscription.stripe_subscription_id)
  );
}

export function getSubscriptionStatusLabel(subscription: SubscriptionRow | null) {
  if (!subscription) {
    return "No subscription";
  }

  return subscription.status.replace(/_/g, " ");
}

export async function ensureSubscriptionRow(
  supabase: SupabaseClient,
  organizationId: string
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "organization_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, trial_ends_at, current_period_end, cancel_at_period_end"
    )
    .eq("organization_id", organizationId)
    .limit(1);

  if (error) {
    throw error;
  }

  const existingSubscription = data?.[0] as SubscriptionRow | undefined;

  if (existingSubscription) {
    return existingSubscription;
  }

  const { data: insertedData, error: insertError } = await supabase
    .from("subscriptions")
    .insert({
      organization_id: organizationId,
      status: "incomplete",
    })
    .select(
      "organization_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, trial_ends_at, current_period_end, cancel_at_period_end"
    )
    .limit(1);

  if (insertError) {
    throw insertError;
  }

  return insertedData?.[0] as SubscriptionRow;
}

