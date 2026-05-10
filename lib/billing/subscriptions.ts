import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_SUBSCRIPTION_PLAN,
  normalizePlanKey,
  type SubscriptionPlanKey,
} from "@/lib/billing/plans";
import { isMissingColumnError } from "@/lib/supabase/errors";

export type SubscriptionRow = {
  organization_id: string;
  plan: SubscriptionPlanKey;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export const SUBSCRIPTION_SELECT =
  "organization_id, plan, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, trial_ends_at, current_period_end, cancel_at_period_end";
export const LEGACY_SUBSCRIPTION_SELECT =
  "organization_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, trial_ends_at, current_period_end, cancel_at_period_end";

type RawSubscriptionRow = Omit<SubscriptionRow, "plan"> & {
  plan?: string | null;
};

export function normalizeSubscriptionRow(
  subscription: RawSubscriptionRow | null | undefined
): SubscriptionRow | null {
  if (!subscription) {
    return null;
  }

  return {
    ...subscription,
    plan: normalizePlanKey(subscription.plan),
  };
}

export function isMissingSubscriptionPlanColumn(error: unknown) {
  return isMissingColumnError(error, "plan");
}

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
  let { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("organization_id", organizationId)
    .limit(1);

  if (isMissingSubscriptionPlanColumn(error)) {
    const legacyResult = await supabase
      .from("subscriptions")
      .select(LEGACY_SUBSCRIPTION_SELECT)
      .eq("organization_id", organizationId)
      .limit(1);

    data = legacyResult.data as typeof data;
    error = legacyResult.error;
  }

  if (error) {
    throw error;
  }

  const existingSubscription = normalizeSubscriptionRow(
    data?.[0] as RawSubscriptionRow | undefined
  );

  if (existingSubscription) {
    return existingSubscription;
  }

  let { data: insertedData, error: insertError } = await supabase
    .from("subscriptions")
    .insert({
      organization_id: organizationId,
      plan: DEFAULT_SUBSCRIPTION_PLAN,
      status: "incomplete",
    })
    .select(SUBSCRIPTION_SELECT)
    .limit(1);

  if (isMissingSubscriptionPlanColumn(insertError)) {
    const legacyInsertResult = await supabase
      .from("subscriptions")
      .insert({
        organization_id: organizationId,
        status: "incomplete",
      })
      .select(LEGACY_SUBSCRIPTION_SELECT)
      .limit(1);

    insertedData = legacyInsertResult.data as typeof insertedData;
    insertError = legacyInsertResult.error;
  }

  if (insertError) {
    throw insertError;
  }

  return normalizeSubscriptionRow(
    insertedData?.[0] as RawSubscriptionRow
  ) as SubscriptionRow;
}
