import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

const APP_STATE_TABLE = "app_state";
const APP_STATE_ROW_ID = "primary";

export type StripeConnectStatus =
  | "not_connected"
  | "onboarding"
  | "enabled"
  | "restricted";

export type WorkspaceStripeSettings = {
  stripeConnectedAccountId: string;
  stripeConnectStatus: StripeConnectStatus;
  stripeConnectChargesEnabled: boolean;
  stripeConnectPayoutsEnabled: boolean;
  stripeConnectDetailsSubmitted: boolean;
  stripePaymentLinksEnabled: boolean;
  currencyCode: string;
  businessName: string;
  tradingName: string;
};

type AppSettingsRecord = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getAppSettings(data: unknown): AppSettingsRecord {
  if (!isRecord(data) || !isRecord(data.appSettings)) {
    return {};
  }

  return data.appSettings;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readBoolean(value: unknown) {
  return value === true;
}

function normalizeStripeConnectStatus(value: unknown): StripeConnectStatus {
  return value === "onboarding" || value === "enabled" || value === "restricted"
    ? value
    : "not_connected";
}

function normalizeCurrencyCode(value: unknown) {
  const candidate = String(value ?? "")
    .trim()
    .toUpperCase();

  return candidate || "GBP";
}

export function getStripeConnectStatus(account: Stripe.Account): StripeConnectStatus {
  if (account.charges_enabled) {
    return "enabled";
  }

  if (account.details_submitted) {
    return "restricted";
  }

  return "onboarding";
}

export function getStripeSettingsFromAppSettings(
  appSettings: AppSettingsRecord
): WorkspaceStripeSettings {
  return {
    stripeConnectedAccountId: readString(appSettings.stripeConnectedAccountId),
    stripeConnectStatus: normalizeStripeConnectStatus(
      appSettings.stripeConnectStatus
    ),
    stripeConnectChargesEnabled: readBoolean(
      appSettings.stripeConnectChargesEnabled
    ),
    stripeConnectPayoutsEnabled: readBoolean(
      appSettings.stripeConnectPayoutsEnabled
    ),
    stripeConnectDetailsSubmitted: readBoolean(
      appSettings.stripeConnectDetailsSubmitted
    ),
    stripePaymentLinksEnabled: readBoolean(appSettings.stripePaymentLinksEnabled),
    currencyCode: normalizeCurrencyCode(appSettings.currencyCode),
    businessName: readString(appSettings.businessName),
    tradingName: readString(appSettings.tradingName),
  };
}

export async function getWorkspaceStripeSettings(
  supabase: SupabaseClient,
  organizationId: string
) {
  const { data, error } = await supabase
    .from(APP_STATE_TABLE)
    .select("data")
    .eq("organization_id", organizationId)
    .eq("id", APP_STATE_ROW_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return getStripeSettingsFromAppSettings(getAppSettings(data?.data));
}

export async function updateWorkspaceStripeSettings(
  supabase: SupabaseClient,
  organizationId: string,
  updates: Partial<WorkspaceStripeSettings>
) {
  const { data, error } = await supabase
    .from(APP_STATE_TABLE)
    .select("data")
    .eq("organization_id", organizationId)
    .eq("id", APP_STATE_ROW_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const currentData = isRecord(data?.data) ? data.data : {};
  const currentAppSettings = getAppSettings(currentData);
  const nextData = {
    ...currentData,
    appSettings: {
      ...currentAppSettings,
      ...updates,
    },
  };

  const { error: upsertError } = await supabase.from(APP_STATE_TABLE).upsert(
    {
      organization_id: organizationId,
      id: APP_STATE_ROW_ID,
      data: nextData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,id" }
  );

  if (upsertError) {
    throw upsertError;
  }

  return getStripeSettingsFromAppSettings(nextData.appSettings);
}

export function buildStripeConnectResponse(settings: WorkspaceStripeSettings) {
  return {
    connectedAccountId: settings.stripeConnectedAccountId || null,
    status: settings.stripeConnectStatus,
    chargesEnabled: settings.stripeConnectChargesEnabled,
    payoutsEnabled: settings.stripeConnectPayoutsEnabled,
    detailsSubmitted: settings.stripeConnectDetailsSubmitted,
    paymentLinksEnabled: settings.stripePaymentLinksEnabled,
  };
}
