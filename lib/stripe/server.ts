import Stripe from "stripe";
import {
  normalizePlanKey,
  type SubscriptionPlanKey,
} from "@/lib/billing/plans";
import {
  getPlatformStripeSettings,
  getStripePriceIdFromSettings,
  isPlatformStripeConfigured,
} from "@/lib/admin/stripe-settings";

let stripeClient: { secretKey: string; client: Stripe } | null = null;

export async function getStripePriceId(plan: SubscriptionPlanKey = "starter") {
  const settings = await getPlatformStripeSettings();
  const planKey = normalizePlanKey(plan);

  return getStripePriceIdFromSettings(settings, planKey);
}

export async function getStripePlanForPriceId(
  priceId: string | null | undefined
) {
  if (!priceId) {
    return null;
  }

  const trimmedPriceId = priceId.trim();
  const settings = await getPlatformStripeSettings();

  if (trimmedPriceId && trimmedPriceId === settings.growthPriceId) {
    return "growth" as const;
  }

  if (trimmedPriceId && trimmedPriceId === settings.starterPriceId) {
    return "starter" as const;
  }

  return null;
}

export async function isStripeConfigured(plan?: SubscriptionPlanKey) {
  return isPlatformStripeConfigured(await getPlatformStripeSettings(), plan);
}

export async function getStripe() {
  const settings = await getPlatformStripeSettings();
  const secretKey = settings.secretKey;

  if (!secretKey) {
    throw new Error("Stripe is not configured. Add the secret key in admin settings.");
  }

  if (!stripeClient || stripeClient.secretKey !== secretKey) {
    stripeClient = {
      secretKey,
      client: new Stripe(secretKey),
    };
  }

  return stripeClient.client;
}

export async function getStripeWebhookSecret() {
  return (await getPlatformStripeSettings()).webhookSecret;
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
