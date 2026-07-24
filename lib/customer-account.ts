import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDefaultCustomerFeatureAccess,
  normalizeCustomerFeatureAccess,
  type CustomerFeatureAccess,
  type CustomerFeatureKey,
} from "@/lib/customer-features";

export type CustomerAccountStatus = "active" | "disabled";
export type CustomerSupportPriority = "standard" | "priority" | "watch";

export type CustomerAccountSettings = {
  accountStatus: CustomerAccountStatus;
  disabledReason: string;
  featureAccess: CustomerFeatureAccess;
  internalNotes: string;
  supportPriority: CustomerSupportPriority;
  updatedAt: string | null;
  exists: boolean;
  schemaReady: boolean;
  schemaError?: string;
};

type CustomerAccountSettingsRow = {
  account_status: string | null;
  disabled_reason: string | null;
  feature_access: unknown;
  internal_notes: string | null;
  support_priority: string | null;
  updated_at: string | null;
};

export function getDefaultCustomerAccountSettings(
  overrides: Partial<CustomerAccountSettings> = {}
): CustomerAccountSettings {
  return {
    accountStatus: "active",
    disabledReason: "",
    featureAccess: getDefaultCustomerFeatureAccess(),
    internalNotes: "",
    supportPriority: "standard",
    updatedAt: null,
    exists: false,
    schemaReady: true,
    ...overrides,
  };
}

export function normalizeCustomerAccountStatus(
  value: string | null | undefined
): CustomerAccountStatus {
  return value === "disabled" ? "disabled" : "active";
}

export function normalizeSupportPriority(
  value: string | null | undefined
): CustomerSupportPriority {
  if (value === "priority" || value === "watch") {
    return value;
  }

  return "standard";
}

export function mapCustomerAccountSettingsRow(
  row: CustomerAccountSettingsRow | null
): CustomerAccountSettings {
  if (!row) {
    return getDefaultCustomerAccountSettings();
  }

  return {
    accountStatus: normalizeCustomerAccountStatus(row.account_status),
    disabledReason: row.disabled_reason?.trim() ?? "",
    featureAccess: normalizeCustomerFeatureAccess(row.feature_access),
    internalNotes: row.internal_notes?.trim() ?? "",
    supportPriority: normalizeSupportPriority(row.support_priority),
    updatedAt: row.updated_at,
    exists: true,
    schemaReady: true,
  };
}

export async function getCustomerAccountSettings(
  supabase: SupabaseClient,
  organizationId: string
) {
  const { data, error } = await supabase
    .from("customer_account_settings")
    .select(
      "account_status, disabled_reason, feature_access, internal_notes, support_priority, updated_at"
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    return getDefaultCustomerAccountSettings({
      schemaReady: false,
      schemaError: error.message,
    });
  }

  return mapCustomerAccountSettingsRow(data as CustomerAccountSettingsRow | null);
}
export async function isCustomerFeatureEnabled(
  supabase: SupabaseClient,
  organizationId: string,
  feature: CustomerFeatureKey
) {

  const settings = await getCustomerAccountSettings(supabase, organizationId);

  return settings.schemaReady && settings.featureAccess[feature];
}