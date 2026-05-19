import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { type SubscriptionPlanKey } from "@/lib/billing/plans";

export type PlatformStripeSettings = {
  secretKey: string;
  webhookSecret: string;
  connectWebhookSecret: string;
  starterPriceId: string;
  growthPriceId: string;
  updatedAt: string | null;
  schemaError: string;
};

type PlatformStripeSettingsRow = {
  stripe_secret_key: string | null;
  stripe_webhook_secret: string | null;
  stripe_connect_webhook_secret: string | null;
  starter_price_id: string | null;
  growth_price_id: string | null;
  updated_at: string | null;
};

const PLATFORM_STRIPE_SETTINGS_SELECT =
  "stripe_secret_key, stripe_webhook_secret, stripe_connect_webhook_secret, starter_price_id, growth_price_id, updated_at";

function getEnvStripeSettings(
  overrides: Partial<PlatformStripeSettings> = {}
): PlatformStripeSettings {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY?.trim() || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || "",
    connectWebhookSecret:
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim() || "",
    starterPriceId:
      process.env.STRIPE_STARTER_PRICE_ID?.trim() ||
      process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID?.trim() ||
      process.env.STRIPE_PRICE_ID?.trim() ||
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ID?.trim() ||
      "",
    growthPriceId:
      process.env.STRIPE_GROWTH_PRICE_ID?.trim() ||
      process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID?.trim() ||
      "",
    updatedAt: null,
    schemaError: "",
    ...overrides,
  };
}

function mapPlatformStripeSettingsRow(
  row: PlatformStripeSettingsRow | null
): PlatformStripeSettings {
  const fallback = getEnvStripeSettings();

  if (!row) {
    return fallback;
  }

  return {
    secretKey: row.stripe_secret_key?.trim() || fallback.secretKey,
    webhookSecret: row.stripe_webhook_secret?.trim() || fallback.webhookSecret,
    connectWebhookSecret:
      row.stripe_connect_webhook_secret?.trim() ||
      fallback.connectWebhookSecret,
    starterPriceId: row.starter_price_id?.trim() || fallback.starterPriceId,
    growthPriceId: row.growth_price_id?.trim() || fallback.growthPriceId,
    updatedAt: row.updated_at,
    schemaError: "",
  };
}

export async function getPlatformStripeSettings(): Promise<PlatformStripeSettings> {
  if (!isSupabaseServiceRoleConfigured()) {
    return getEnvStripeSettings({
      schemaError:
        "Supabase service role credentials are required before saving Stripe settings.",
    });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("platform_stripe_settings")
    .select(PLATFORM_STRIPE_SETTINGS_SELECT)
    .eq("id", "primary")
    .maybeSingle();

  if (error) {
    return getEnvStripeSettings({
      schemaError: error.message,
    });
  }

  return mapPlatformStripeSettingsRow(data as PlatformStripeSettingsRow | null);
}

export function getStripePriceIdFromSettings(
  settings: PlatformStripeSettings,
  plan: SubscriptionPlanKey
) {
  return plan === "growth" ? settings.growthPriceId : settings.starterPriceId;
}

export function isPlatformStripeConfigured(
  settings: PlatformStripeSettings,
  plan?: SubscriptionPlanKey
) {
  if (!settings.secretKey) {
    return false;
  }

  if (plan) {
    return Boolean(getStripePriceIdFromSettings(settings, plan));
  }

  return Boolean(settings.starterPriceId && settings.growthPriceId);
}
