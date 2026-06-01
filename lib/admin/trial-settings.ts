import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";

export const DEFAULT_FREE_TRIAL_DAYS = 30;
const MAX_FREE_TRIAL_DAYS = 365;

export type PlatformTrialSettings = {
  enabled: boolean;
  defaultDays: number;
  updatedAt: string | null;
  schemaError: string;
};

type PlatformTrialSettingsRow = {
  free_trial_enabled: boolean | null;
  free_trial_days: number | string | null;
  updated_at: string | null;
};

const PLATFORM_TRIAL_SETTINGS_SELECT =
  "free_trial_enabled, free_trial_days, updated_at";

export function normalizeTrialDurationDays(
  value: number | string | null | undefined,
  fallback = DEFAULT_FREE_TRIAL_DAYS
) {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  const fallbackValue = Math.min(
    MAX_FREE_TRIAL_DAYS,
    Math.max(1, Math.round(fallback))
  );

  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(MAX_FREE_TRIAL_DAYS, Math.round(parsed))
    : fallbackValue;
}

export function getTrialEndIso(days: number | string, now = new Date()) {
  const end = new Date(now);
  end.setDate(end.getDate() + normalizeTrialDurationDays(days));

  return end.toISOString();
}

function getFallbackTrialSettings(
  overrides: Partial<PlatformTrialSettings> = {}
): PlatformTrialSettings {
  return {
    enabled: false,
    defaultDays: DEFAULT_FREE_TRIAL_DAYS,
    updatedAt: null,
    schemaError: "",
    ...overrides,
  };
}

function mapPlatformTrialSettingsRow(
  row: PlatformTrialSettingsRow | null
): PlatformTrialSettings {
  if (!row) {
    return getFallbackTrialSettings();
  }

  return {
    enabled: Boolean(row.free_trial_enabled),
    defaultDays: normalizeTrialDurationDays(row.free_trial_days),
    updatedAt: row.updated_at,
    schemaError: "",
  };
}

async function getPlatformTrialSettingsFromClient(
  supabase: SupabaseClient
): Promise<PlatformTrialSettings> {
  const { data, error } = await supabase
    .from("platform_trial_settings")
    .select(PLATFORM_TRIAL_SETTINGS_SELECT)
    .eq("id", "primary")
    .maybeSingle();

  if (error) {
    return getFallbackTrialSettings({
      schemaError: error.message,
    });
  }

  return mapPlatformTrialSettingsRow(data as PlatformTrialSettingsRow | null);
}

export async function getPlatformTrialSettings(): Promise<PlatformTrialSettings> {
  if (!isSupabaseServiceRoleConfigured()) {
    return getFallbackTrialSettings({
      schemaError:
        "Supabase service role credentials are required before saving trial settings.",
    });
  }

  return getPlatformTrialSettingsFromClient(createServiceRoleClient());
}

export async function getPlatformTrialSettingsForClient(
  supabase: SupabaseClient
): Promise<PlatformTrialSettings> {
  const settings = await getPlatformTrialSettingsFromClient(supabase);

  return settings.schemaError
    ? getFallbackTrialSettings()
    : settings;
}
