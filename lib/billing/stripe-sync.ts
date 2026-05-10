import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getStripeObjectId,
  getStripePlanForPriceId,
  stripeTimestampToIso,
} from "@/lib/stripe/server";
import {
  normalizePlanKey,
  type SubscriptionPlanKey,
} from "@/lib/billing/plans";
import {
  isMissingSubscriptionPlanColumn,
  LEGACY_SUBSCRIPTION_SELECT,
  normalizeSubscriptionRow,
  SUBSCRIPTION_SELECT,
} from "@/lib/billing/subscriptions";

type LegacySubscriptionPeriod = Stripe.Subscription & {
  current_period_end?: number;
};

function getSubscriptionPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id ?? null;
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const itemPeriodEnd = subscription.items.data[0]?.current_period_end;
  const legacyPeriodEnd = (subscription as LegacySubscriptionPeriod)
    .current_period_end;

  return stripeTimestampToIso(itemPeriodEnd ?? legacyPeriodEnd);
}

async function getSubscriptionPlanKey(
  subscription: Stripe.Subscription,
  priceId: string | null,
  fallbackPlan?: SubscriptionPlanKey | null
) {
  if (subscription.metadata.plan === "starter" || subscription.metadata.plan === "growth") {
    return subscription.metadata.plan;
  }

  const planFromPrice = await getStripePlanForPriceId(priceId);

  if (planFromPrice) {
    return planFromPrice;
  }

  return normalizePlanKey(fallbackPlan);
}

async function findSubscriptionOrganizationId(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const subscriptionId = subscription.id;
  const customerId = getStripeObjectId(subscription.customer);

  const { data: subscriptionMatches, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("organization_id")
    .eq("stripe_subscription_id", subscriptionId)
    .limit(1);

  if (subscriptionError) {
    throw subscriptionError;
  }

  const subscriptionOrganizationId =
    subscriptionMatches?.[0]?.organization_id;

  if (typeof subscriptionOrganizationId === "string") {
    return subscriptionOrganizationId;
  }

  if (!customerId) {
    return "";
  }

  const { data: customerMatches, error: customerError } = await supabase
    .from("subscriptions")
    .select("organization_id")
    .eq("stripe_customer_id", customerId)
    .limit(1);

  if (customerError) {
    throw customerError;
  }

  const customerOrganizationId = customerMatches?.[0]?.organization_id;
  return typeof customerOrganizationId === "string"
    ? customerOrganizationId
    : "";
}

export async function syncStripeSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  fallbackOrganizationId?: string | null,
  fallbackPlan?: SubscriptionPlanKey | null
) {
  const organizationId =
    fallbackOrganizationId ||
    subscription.metadata.organization_id ||
    (await findSubscriptionOrganizationId(supabase, subscription));

  if (!organizationId) {
    throw new Error(
      `Unable to match Stripe subscription ${subscription.id} to a RoundHQ organization.`
    );
  }

  const priceId = getSubscriptionPriceId(subscription);
  const plan = await getSubscriptionPlanKey(subscription, priceId, fallbackPlan);

  let { data, error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        organization_id: organizationId,
        plan,
        stripe_customer_id: getStripeObjectId(subscription.customer),
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        status: subscription.status,
        trial_ends_at: stripeTimestampToIso(subscription.trial_end),
        current_period_end: getSubscriptionPeriodEnd(subscription),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    )
    .select(SUBSCRIPTION_SELECT)
    .limit(1);

  if (isMissingSubscriptionPlanColumn(error)) {
    const legacyResult = await supabase
      .from("subscriptions")
      .upsert(
        {
          organization_id: organizationId,
          stripe_customer_id: getStripeObjectId(subscription.customer),
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          status: subscription.status,
          trial_ends_at: stripeTimestampToIso(subscription.trial_end),
          current_period_end: getSubscriptionPeriodEnd(subscription),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id" }
      )
      .select(LEGACY_SUBSCRIPTION_SELECT)
      .limit(1);

    data = legacyResult.data as typeof data;
    error = legacyResult.error;
  }

  if (error) {
    throw error;
  }

  return normalizeSubscriptionRow(data?.[0] ?? null);
}

export async function syncStripeCheckoutSession(
  supabase: SupabaseClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const subscriptionId = getStripeObjectId(session.subscription);

  if (!subscriptionId) {
    return null;
  }

  const subscription =
    typeof session.subscription === "object" &&
    session.subscription?.object === "subscription"
      ? (session.subscription as Stripe.Subscription)
      : await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items.data.price"],
        });

  return syncStripeSubscription(
    supabase,
    subscription,
    session.client_reference_id || session.metadata?.organization_id || null,
    normalizePlanKey(session.metadata?.plan)
  );
}
