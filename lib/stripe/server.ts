import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripePriceId() {
  return (
    process.env.STRIPE_PRICE_ID?.trim() ||
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID?.trim() ||
    ""
  );
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && getStripePriceId());
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

