import Stripe from "stripe";
import {
  normalizePlanKey,
  type SubscriptionPlanKey,
} from "@/lib/billing/plans";

let stripeClient: Stripe | null = null;

export function getStripePriceId(plan: SubscriptionPlanKey = "starter") {
  const planKey = normalizePlanKey(plan);

  if (planKey === "growth") {
    return (
      process.env.STRIPE_GROWTH_PRICE_ID?.trim() ||
      process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID?.trim() ||
      ""
    );
  }

  return (
    process.env.STRIPE_STARTER_PRICE_ID?.trim() ||
    process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID?.trim() ||
    process.env.STRIPE_PRICE_ID?.trim() ||
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID?.trim() ||
    ""
  );
}

export function getStripePlanForPriceId(priceId: string | null | undefined) {
  if (!priceId) {
    return null;
  }

  const trimmedPriceId = priceId.trim();

  if (trimmedPriceId && trimmedPriceId === getStripePriceId("growth")) {
    return "growth" as const;
  }

  if (trimmedPriceId && trimmedPriceId === getStripePriceId("starter")) {
    return "starter" as const;
  }

  return null;
}

export function isStripeConfigured(plan?: SubscriptionPlanKey) {
  const hasSecret = Boolean(process.env.STRIPE_SECRET_KEY?.trim());

  if (!hasSecret) {
    return false;
  }

  if (plan) {
    return Boolean(getStripePriceId(plan));
  }

  return Boolean(getStripePriceId("starter") || getStripePriceId("growth"));
}

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function getBaseUrl(requestUrl: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  return new URL(requestUrl).origin;
}

export function getStripeObjectId(
  value: string | { id?: string } | null | undefined
) {
  if (typeof value === "string") {
    return value;
  }

  return typeof value?.id === "string" ? value.id : "";
}

export function stripeTimestampToIso(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}
