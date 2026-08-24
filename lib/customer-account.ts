import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDefaultCustomerFeatureAccess,
  normalizeCustomerFeatureAccess,
  type CustomerFeatureAccess,
  type CustomerFeatureKey,
} from "@/lib/customer-features";
import { SMS_PRICE_PER_MESSAGE_PENCE } from "@/lib/messaging/sms-billing";

export type CustomerAccountStatus = "active" | "disabled";
export type CustomerSupportPriority = "standard" | "priority" | "watch";

export type CustomerAccountSettings = {
  accountStatus: CustomerAccountStatus;
  disabledReason: string;
  featureAccess: CustomerFeatureAccess;
  internalNotes: string;
  supportPriority: CustomerSupportPriority;
  smsBillingEnabled: boolean;
  smsTermsAccepted: boolean;
  smsTermsAcceptedAt: string | null;
  smsTermsAcceptedBy: string | null;
  smsPricePerMessagePence: number;
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
  sms_billing_enabled: boolean | null;
  sms_terms_accepted: boolean | null;
  sms_terms_accepted_at: string | null;
  sms_terms_accepted_by: string | null;
  sms_price_per_message_pence: number | null;
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
    smsBillingEnabled: false,
    smsTermsAccepted: false,
    smsTermsAcceptedAt: null,
    smsTermsAcceptedBy: null,
    smsPricePerMessagePence: SMS_PRICE_PER_MESSAGE_PENCE,
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
    smsBillingEnabled: row.sms_billing_enabled === true,
    smsTermsAccepted: row.sms_terms_accepted === true,
    smsTermsAcceptedAt: row.sms_terms_accepted_at,
    smsTermsAcceptedBy: row.sms_terms_accepted_by,
    smsPricePerMessagePence:
      typeof row.sms_price_per_message_pence === "number" &&
      Number.isInteger(row.sms_price_per_message_pence) &&
      row.sms_price_per_message_pence > 0
        ? row.sms_price_per_message_pence
        : SMS_PRICE_PER_MESSAGE_PENCE,
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
      "account_status, disabled_reason, feature_access, internal_notes, support_priority, sms_billing_enabled, sms_terms_accepted, sms_terms_accepted_at, sms_terms_accepted_by, sms_price_per_message_pence, updated_at"
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