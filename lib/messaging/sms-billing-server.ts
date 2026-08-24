import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomerAccountSettings } from "@/lib/customer-account";
import {
  SMS_PRICE_PER_MESSAGE_PENCE,
  canUseSms,
  getDefaultSmsUsageSummary,
  type SmsEntitlement,
  type SmsUsageSummary,
} from "./sms-billing";

export class SmsEntitlementError extends Error {
  readonly code = "SMS_NOT_ENABLED";

  constructor() {
    super("Text messaging is not enabled for this RoundHQ account.");
    this.name = "SmsEntitlementError";
  }
}

function getBillingPeriod(currentPeriodEnd?: string | null) {
  const now = new Date();
  const parsedEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const periodEnd =
    parsedEnd && !Number.isNaN(parsedEnd.getTime()) && parsedEnd.getTime() > now.getTime()
      ? parsedEnd
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const periodStart = new Date(periodEnd);
  periodStart.setUTCMonth(periodStart.getUTCMonth() - 1);

  return { periodStart, periodEnd };
}

export async function getSmsUsageForBillingPeriod(
  supabase: SupabaseClient,
  organizationId: string,
  currentPeriodEnd?: string | null
): Promise<SmsUsageSummary> {
  const { periodStart, periodEnd } = getBillingPeriod(currentPeriodEnd);
  const { data, error } = await supabase
    .from("sms_usage_records")
    .select("quantity,total_price_pence")
    .eq("organization_id", organizationId)
    .gte("created_at", periodStart.toISOString())
    .lt("created_at", periodEnd.toISOString());

  if (error) {
    // The table may not exist until the migration is applied. Keep the dashboard safe
    // while preventing sends through the entitlement check below.
    return {
      ...getDefaultSmsUsageSummary(),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  }

  return (data ?? []).reduce<SmsUsageSummary>(
    (summary, row) => ({
      ...summary,
      messageCount: summary.messageCount + Number(row.quantity ?? 0),
      totalPricePence: summary.totalPricePence + Number(row.total_price_pence ?? 0),
    }),
    {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      messageCount: 0,
      totalPricePence: 0,
    }
  );
}

export async function getSmsEntitlement(
  supabase: SupabaseClient,
  organizationId: string,
  account: CustomerAccountSettings,
  currentPeriodEnd?: string | null
): Promise<SmsEntitlement> {
  const usage = await getSmsUsageForBillingPeriod(
    supabase,
    organizationId,
    currentPeriodEnd
  );

  return {
    billingEnabled: account.smsBillingEnabled,
    feeWaived: account.smsFeeWaived,
    termsAccepted: account.smsTermsAccepted,
    termsAcceptedAt: account.smsTermsAcceptedAt,
    termsAcceptedBy: account.smsTermsAcceptedBy,
    pricePerMessagePence: account.smsFeeWaived ? 0 : account.smsPricePerMessagePence,
    isActive: canUseSms(account),
    usage,
  };
}

export async function requireSmsEntitlement(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ feeWaived: boolean }> {
  const { data, error } = await supabase
    .from("customer_account_settings")
    .select("sms_billing_enabled,sms_fee_waived,sms_terms_accepted")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const feeWaived = data?.sms_fee_waived === true;
  const canSend = feeWaived || (
    data?.sms_billing_enabled === true && data?.sms_terms_accepted === true
  );
  if (error || !data || !canSend) {
    throw new SmsEntitlementError();
  }

  return { feeWaived };
}

export async function recordSmsUsage(options: {
  supabase: SupabaseClient;
  organizationId: string;
  customerMessageId: string;
  customerId?: number | null;
  initiatedBy?: string | null;
  providerMessageId?: string | null;
  recipient: string;
  pricePerMessagePence?: number;
}) {
  const unitPricePence = options.pricePerMessagePence ?? SMS_PRICE_PER_MESSAGE_PENCE;
  const { error } = await options.supabase.from("sms_usage_records").insert({
    organization_id: options.organizationId,
    customer_message_id: options.customerMessageId,
    customer_id: options.customerId ?? null,
    user_id: options.initiatedBy ?? null,
    provider_message_id: options.providerMessageId ?? null,
    recipient: options.recipient,
    quantity: 1,
    unit_price_pence: unitPricePence,
    total_price_pence: unitPricePence,
    status: "sent",
  });

  if (error && error.code !== "23505") {
    throw error;
  }
}
