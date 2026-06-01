import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_SUBSCRIPTION_PLAN,
  normalizeStaffAddonQuantity,
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
  stripe_staff_addon_item_id: string | null;
  staff_addon_quantity: number;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export const SUBSCRIPTION_SELECT =
  "organization_id, plan, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_staff_addon_item_id, staff_addon_quantity, status, trial_ends_at, current_period_end, cancel_at_period_end";
export const BASE_SUBSCRIPTION_SELECT =
  "organization_id, plan, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, trial_ends_at, current_period_end, cancel_at_period_end";
export const LEGACY_SUBSCRIPTION_SELECT =
  "organization_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, trial_ends_at, current_period_end, cancel_at_period_end";

type RawSubscriptionRow = Omit<
  SubscriptionRow,
  "plan" | "staff_addon_quantity" | "stripe_staff_addon_item_id"
> & {
  plan?: string | null;
  stripe_staff_addon_item_id?: string | null;
  staff_addon_quantity?: number | string | null;
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
    stripe_staff_addon_item_id: subscription.stripe_staff_addon_item_id ?? null,
    staff_addon_quantity: normalizeStaffAddonQuantity(
      subscription.staff_addon_quantity
    ),
  };
}

export function isMissingSubscriptionPlanColumn(error: unknown) {
  return isMissingColumnError(error, "plan");
}

export function isMissingSubscriptionAddonColumn(error: unknown) {
  return (
    isMissingColumnError(error, "staff_addon_quantity") ||
    isMissingColumnError(error, "stripe_staff_addon_item_id")
  );
}

export function hasDashboardAccess(subscription: SubscriptionRow | null) {
  if (!subscription) {
    return false;
  }

  if (subscription.status === "active") {
    return true;
  }

  if (subscription.status !== "trialing") {
    return false;
  }

  if (Boolean(subscription.stripe_subscription_id)) {
    return true;
  }

  return isTrialSubscriptionActive(subscription);
}

export function getSubscriptionStatusLabel(subscription: SubscriptionRow | null) {
  if (!subscription) {
    return "No subscription";
  }

  if (subscription.status === "trialing") {
    return isTrialSubscriptionActive(subscription)
      ? "free trial"
      : "free trial ended";
  }

  return subscription.status.replace(/_/g, " ");
}

export function getTrialDaysRemaining(
  subscription: Pick<SubscriptionRow, "status" | "trial_ends_at"> | null,
  now = new Date()
) {
  if (subscription?.status !== "trialing" || !subscription.trial_ends_at) {
    return null;
  }

  const trialEndsAt = new Date(subscription.trial_ends_at);

  if (Number.isNaN(trialEndsAt.getTime())) {
    return null;
  }

  const remainingMilliseconds = trialEndsAt.getTime() - now.getTime();

  return Math.max(
    0,
    Math.ceil(remainingMilliseconds / (24 * 60 * 60 * 1000))
  );
}

export function isTrialSubscriptionActive(
  subscription: Pick<SubscriptionRow, "status" | "trial_ends_at"> | null,
  now = new Date()
) {
  const daysRemaining = getTrialDaysRemaining(subscription, now);

  return daysRemaining !== null && daysRemaining > 0;
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

  if (isMissingSubscriptionAddonColumn(error)) {
    const baseResult = await supabase
      .from("subscriptions")
      .select(BASE_SUBSCRIPTION_SELECT)
      .eq("organization_id", organizationId)
      .limit(1);

    data = baseResult.data as typeof data;
    error = baseResult.error;
  }

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
      stripe_staff_addon_item_id: null,
      staff_addon_quantity: 0,
      status: "incomplete",
    })
    .select(SUBSCRIPTION_SELECT)
    .limit(1);

  if (isMissingSubscriptionAddonColumn(insertError)) {
    const baseInsertResult = await supabase
      .from("subscriptions")
      .insert({
        organization_id: organizationId,
        plan: DEFAULT_SUBSCRIPTION_PLAN,
        status: "incomplete",
      })
      .select(BASE_SUBSCRIPTION_SELECT)
      .limit(1);

    insertedData = baseInsertResult.data as typeof insertedData;
    insertError = baseInsertResult.error;
  }

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
