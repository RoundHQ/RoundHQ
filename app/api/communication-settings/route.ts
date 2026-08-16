import { NextResponse } from "next/server";
import { normalizeBusinessTimeZone } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import { getWorkspaceAdminAccess } from "@/lib/workspace-admin";
import { normalizeAlphanumericSenderId, normalizeUkMobileNumber } from "@/lib/messaging/core";

export const runtime = "nodejs";

type SettingsRequest = {
  timezone?: unknown;
  emailFromName?: unknown;
  emailFromAddress?: unknown;
  emailReplyTo?: unknown;
  smsSenderMode?: unknown;
  smsSenderValue?: unknown;
  quietHoursStart?: unknown;
  quietHoursEnd?: unknown;
  quoteFollowUpDelayDays?: unknown;
  invoiceFollowUpDelayDays?: unknown;
  serviceRemindersEnabled?: unknown;
  serviceReminderLeadDays?: unknown;
  serviceReminderSendTime?: unknown;
  serviceReminderTemplate?: unknown;
  completionMessagesEnabled?: unknown;
  completionMessageTemplate?: unknown;
  vatThresholdCardEnabled?: unknown;
  vatThresholdAmount?: unknown;
  vatWarningPercent?: unknown;
};

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function wholeNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
}

function senderMode(value: unknown) {
  return value === "business_name" || value === "business_mobile" || value === "platform_default"
    ? value
    : "platform_default";
}

function clock(value: unknown, fallback: string) {
  const candidate = text(value, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : fallback;
}

function getSafeSmsServiceStatus() {
  const configuredMode = process.env.CUSTOMER_MESSAGING_MODE?.trim().toLowerCase();
  const mode = configuredMode === "live"
    ? "live"
    : configuredMode === "test"
      ? "test"
      : "disabled";
  const apiKey = process.env.CUSTOMER_SMS_TELNYX_API_KEY?.trim() || process.env.AI_RECEPTIONIST_TELNYX_API_KEY?.trim();
  const messagingProfileId = process.env.CUSTOMER_SMS_TELNYX_MESSAGING_PROFILE_ID?.trim() || process.env.AI_RECEPTIONIST_TELNYX_MESSAGING_PROFILE_ID?.trim();
  return {
    mode,
    telnyxConfigured: Boolean(apiKey && messagingProfileId),
    managedNumberConfigured: Boolean(process.env.CUSTOMER_SMS_FROM_NUMBER?.trim()),
  };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const organizationId = await ensureWorkspace(supabase, user);
  if (!(await getWorkspaceAdminAccess(supabase, organizationId, user))) {
    return NextResponse.json({ error: "Workspace administrator access is required." }, { status: 403 });
  }
  return NextResponse.json({ service: getSafeSmsServiceStatus() });
}
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const organizationId = await ensureWorkspace(supabase, user);
  if (!(await getWorkspaceAdminAccess(supabase, organizationId, user))) {
    return NextResponse.json({ error: "Workspace administrator access is required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as SettingsRequest | null;
  if (!body) return NextResponse.json({ error: "Invalid settings request." }, { status: 400 });
  const timezone = normalizeBusinessTimeZone(text(body.timezone, 100));
  const sendTime = clock(body.serviceReminderSendTime, "18:00");
  const selectedSenderMode = senderMode(body.smsSenderMode);
  const senderValue = text(body.smsSenderValue, 30);
  const normalizedSenderValue = selectedSenderMode === "business_name"
    ? normalizeAlphanumericSenderId(senderValue)
    : selectedSenderMode === "business_mobile"
      ? normalizeUkMobileNumber(senderValue)
      : "";
  if (selectedSenderMode !== "platform_default" && !normalizedSenderValue) {
    return NextResponse.json({
      error: selectedSenderMode === "business_name"
        ? "Enter a business sender name using 1?11 letters, numbers, or spaces."
        : "Enter a valid UK mobile number.",
    }, { status: 400 });
  }
  const row = {
    organization_id: organizationId,
    timezone,
    email_from_name: text(body.emailFromName, 200) || null,
    email_from_address: text(body.emailFromAddress, 320) || null,
    email_reply_to: text(body.emailReplyTo, 320) || null,
    sms_sender_mode: selectedSenderMode,
    sms_sender_value: normalizedSenderValue || null,
    quote_follow_up_delay_days: wholeNumber(body.quoteFollowUpDelayDays, 0, 365, 3),
    invoice_follow_up_delay_days: wholeNumber(body.invoiceFollowUpDelayDays, 0, 365, 1),
    service_reminders_enabled: body.serviceRemindersEnabled === true,
    service_reminder_lead_days: wholeNumber(body.serviceReminderLeadDays, 0, 30, 1),
    service_reminder_send_time: sendTime,
    service_reminder_template: text(body.serviceReminderTemplate, 5000),
    completion_messages_enabled: body.completionMessagesEnabled === true,
    completion_message_template: text(body.completionMessageTemplate, 5000),
    vat_threshold_card_enabled: body.vatThresholdCardEnabled === true,
    vat_threshold_amount: Math.max(1, Number(body.vatThresholdAmount) || 90000),
    vat_warning_percent: wholeNumber(body.vatWarningPercent, 1, 100, 80),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("communication_settings").upsert(row, {
    onConflict: "organization_id",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: organizationError } = await supabase
    .from("organizations")
    .update({ business_timezone: timezone, updated_at: new Date().toISOString() })
    .eq("id", organizationId);
  if (organizationError) return NextResponse.json({ error: organizationError.message }, { status: 500 });

  return NextResponse.json({ saved: true, timezone, service: getSafeSmsServiceStatus() });
}
