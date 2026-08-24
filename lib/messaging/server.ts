import "server-only";

import { createHash, randomBytes, randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDocumentEmailFromValue,
  normalizeDocumentEmailSettings,
} from "@/lib/email/document-email";
import { buildEmailHtmlBody, sendEmailWithFallback } from "@/lib/email/smtp-delivery";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { buildSecureDocumentUrl, getCanonicalBaseUrl, isSafePublicOrigin } from "@/lib/urls";
import {
  getNextPermittedSendTime,
  normalizeEmailAddress,
  normalizeSmsPhoneNumber,
  type CustomerMessageChannel,
  type CustomerMessageKind,
} from "./core";
import { recordSmsUsage, requireSmsEntitlement } from "./sms-billing-server";

export type QueueCustomerMessageInput = {
  organizationId: string;
  customerId?: number | null;
  channel: CustomerMessageChannel;
  kind: CustomerMessageKind;
  recipient: string;
  subject?: string;
  body: string;
  relatedType?: "quote" | "invoice" | "job" | null;
  relatedId?: string | null;
  idempotencyKey: string;
  occurrence?: string | null;
  initiatedBy?: string | null;
  scheduledFor?: Date;
  requestUrl?: string;
  includeDocumentLink?: boolean;
};

type CommunicationSettingsRow = {
  timezone: string | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  email_from_name: string | null;
  email_from_address: string | null;
  email_reply_to: string | null;
  sms_from_number: string | null;
  sms_sender_mode: string | null;
  sms_sender_value: string | null;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function createDocumentShareLink(options: {
  supabase: SupabaseClient;
  organizationId: string;
  documentType: "quote" | "invoice";
  documentId: string;
  createdBy?: string | null;
  requestUrl?: string;
  expiresInDays?: number;
}) {
  const publicOrigin = getCanonicalBaseUrl(options.requestUrl);
  if (process.env.NODE_ENV === "production" && !isSafePublicOrigin(publicOrigin)) {
    throw new Error(
      "Set NEXT_PUBLIC_SITE_URL to the public HTTPS RoundHQ address before creating customer links."
    );
  }

  const table = options.documentType === "quote" ? "quotes" : "invoices";
  const { data: document, error: documentError } = await options.supabase
    .from(table)
    .select("id")
    .eq("organization_id", options.organizationId)
    .eq("id", options.documentId)
    .maybeSingle();

  if (documentError) throw documentError;
  if (!document) throw new Error("The document was not found in this workspace.");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + Math.max(1, options.expiresInDays ?? 30));

  const { error } = await options.supabase.from("document_share_tokens").insert({
    organization_id: options.organizationId,
    document_type: options.documentType,
    document_id: options.documentId,
    token_hash: tokenHash(token),
    expires_at: expiresAt.toISOString(),
    created_by: options.createdBy ?? null,
  });

  if (error) throw error;
  return buildSecureDocumentUrl(token, options.requestUrl);
}

async function getCommunicationSettings(
  supabase: SupabaseClient,
  organizationId: string
) {
  const { data } = await supabase
    .from("communication_settings")
    .select(
      "timezone,quiet_hours_start,quiet_hours_end,email_from_name,email_from_address,email_reply_to,sms_from_number,sms_sender_mode,sms_sender_value"
    )
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data as CommunicationSettingsRow | null) ?? null;
}

export async function queueCustomerMessage(
  supabase: SupabaseClient,
  input: QueueCustomerMessageInput
) {
  if (input.channel === "sms") {
    await requireSmsEntitlement(supabase, input.organizationId);
  }

  const recipient =
    input.channel === "sms"
      ? normalizeSmsPhoneNumber(input.recipient)
      : normalizeEmailAddress(input.recipient);

  if (!recipient) {
    throw new Error(
      input.channel === "sms"
        ? "Add a valid mobile number before sending a text."
        : "Add a valid email address before sending an email."
    );
  }

  if (input.customerId != null) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("id", input.customerId)
      .maybeSingle();
    if (customerError) throw customerError;
    if (!customer) throw new Error("The customer was not found in this workspace.");

    const { data: preferences } = await supabase
      .from("customer_communication_preferences")
      .select("sms_allowed,email_allowed")
      .eq("organization_id", input.organizationId)
      .eq("customer_id", input.customerId)
      .maybeSingle();
    if (
      (input.channel === "sms" && preferences?.sms_allowed === false) ||
      (input.channel === "email" && preferences?.email_allowed === false)
    ) {
      throw new Error(`This customer has opted out of ${input.channel} messages.`);
    }
  }

  const settings = await getCommunicationSettings(supabase, input.organizationId);
  const scheduledFor = getNextPermittedSendTime({
    requestedAt: input.scheduledFor,
    timeZone: settings?.timezone ?? undefined,
    quietHoursStart: settings?.quiet_hours_start ?? undefined,
    quietHoursEnd: settings?.quiet_hours_end ?? undefined,
  });
  let body = input.body.trim();

  if (
    input.includeDocumentLink &&
    (input.relatedType === "quote" || input.relatedType === "invoice") &&
    input.relatedId
  ) {
    const link = await createDocumentShareLink({
      supabase,
      organizationId: input.organizationId,
      documentType: input.relatedType,
      documentId: input.relatedId,
      createdBy: input.initiatedBy,
      requestUrl: input.requestUrl,
    });
    body = body.includes("{{documentLink}}")
      ? body.replace(/{{\s*documentLink\s*}}/g, link)
      : `${body}\n\nView securely: ${link}`;
  }

  const row = {
    id: randomUUID(),
    organization_id: input.organizationId,
    customer_id: input.customerId ?? null,
    channel: input.channel,
    message_kind: input.kind,
    recipient,
    subject: input.channel === "email" ? input.subject?.trim() || null : null,
    body,
    related_type: input.relatedType ?? null,
    related_id: input.relatedId ?? null,
    status: "queued",
    scheduled_for: scheduledFor.toISOString(),
    next_attempt_at: scheduledFor.toISOString(),
    idempotency_key: input.idempotencyKey,
    occurrence_key: input.occurrence ?? null,
    initiated_by: input.initiatedBy ?? null,
  };
  const { data, error } = await supabase
    .from("customer_messages")
    .insert(row)
    .select("id,status,scheduled_for,channel,related_type,related_id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing, error: existingError } = await supabase
        .from("customer_messages")
        .select("id,status,scheduled_for,channel,related_type,related_id")
        .eq("organization_id", input.organizationId)
        .eq("idempotency_key", input.idempotencyKey)
        .single();
      if (existingError) throw existingError;
      return { message: existing, duplicate: true };
    }
    throw error;
  }

  return { message: data, duplicate: false };
}

function getProviderMode(environment: NodeJS.ProcessEnv = process.env) {
  const configuredMode = environment.CUSTOMER_MESSAGING_MODE?.trim().toLowerCase();

  return configuredMode === "live"
    ? "live"
    : configuredMode === "test"
      ? "test"
      : "disabled";
}

async function sendSms(row: Record<string, unknown>, settings: CommunicationSettingsRow | null) {
  const apiKey =
    process.env.CUSTOMER_SMS_TELNYX_API_KEY?.trim() ||
    process.env.AI_RECEPTIONIST_TELNYX_API_KEY?.trim() ||
    "";
  const senderMode = settings?.sms_sender_mode;
  const from = senderMode === "business_name" || senderMode === "business_mobile"
    ? settings?.sms_sender_value?.trim() || ""
    : settings?.sms_from_number?.trim() || process.env.CUSTOMER_SMS_FROM_NUMBER?.trim() || "";
  const messagingProfileId =
    process.env.CUSTOMER_SMS_TELNYX_MESSAGING_PROFILE_ID?.trim() ||
    process.env.AI_RECEPTIONIST_TELNYX_MESSAGING_PROFILE_ID?.trim() ||
    "";

  if (!apiKey || !from || (senderMode === "business_name" && !messagingProfileId)) {
    throw new Error("RoundHQ SMS is not configured.");
  }

  const response = await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: row.recipient, text: row.body, ...(messagingProfileId ? { messaging_profile_id: messagingProfileId } : {}) }),
    signal: AbortSignal.timeout(15_000),
  });
  const responseBody = (await response.json().catch(() => null)) as
    | { data?: { id?: string }; errors?: Array<{ detail?: string }> }
    | null;

  if (!response.ok) {
    throw new Error(responseBody?.errors?.[0]?.detail || `Telnyx returned ${response.status}.`);
  }

  return responseBody?.data?.id ?? null;
}

async function sendEmail(row: Record<string, unknown>, settings: CommunicationSettingsRow | null) {
  const emailSettings = normalizeDocumentEmailSettings({
    emailFromName: settings?.email_from_name || process.env.CUSTOMER_EMAIL_FROM_NAME,
    emailFromAddress:
      settings?.email_from_address || process.env.CUSTOMER_EMAIL_FROM_ADDRESS,
    emailReplyTo: settings?.email_reply_to || process.env.CUSTOMER_EMAIL_REPLY_TO,
    smtpHost: process.env.CUSTOMER_EMAIL_SMTP_HOST,
    smtpPort: Number(process.env.CUSTOMER_EMAIL_SMTP_PORT ?? 587),
    smtpSecure: process.env.CUSTOMER_EMAIL_SMTP_SECURE === "true",
    smtpUsername: process.env.CUSTOMER_EMAIL_SMTP_USERNAME,
    smtpPassword: process.env.CUSTOMER_EMAIL_SMTP_PASSWORD,
  });

  if (!emailSettings.smtpHost || !emailSettings.smtpUsername || !emailSettings.smtpPassword) {
    throw new Error("RoundHQ customer email is not configured.");
  }

  await sendEmailWithFallback({
    settings: emailSettings,
    mailOptions: {
      from: getDocumentEmailFromValue(emailSettings),
      to: String(row.recipient),
      replyTo: emailSettings.emailReplyTo || undefined,
      subject: String(row.subject || "Message from RoundHQ"),
      text: String(row.body || ""),
      html: buildEmailHtmlBody(String(row.body || "")),
    },
  });
  return null;
}

export async function processCustomerMessageById(
  messageId: string,
  supabase = createServiceRoleClient()
) {
  const { data, error } = await supabase
    .from("customer_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "queued") return data;
  if (new Date(data.scheduled_for).getTime() > Date.now()) return data;

  const claimedAt = new Date();
  const leaseUntil = new Date(claimedAt.getTime() + 60_000);
  const { data: claimed, error: claimError } = await supabase
    .from("customer_messages")
    .update({ next_attempt_at: leaseUntil.toISOString(), updated_at: claimedAt.toISOString() })
    .eq("id", data.id)
    .eq("status", "queued")
    .lte("next_attempt_at", claimedAt.toISOString())
    .select("*")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return data;

  const mode = getProviderMode();
  const settings = await getCommunicationSettings(supabase, data.organization_id);

  try {
    if (mode === "disabled") {
      throw new Error("Customer messaging is disabled until provider setup is complete.");
    }

    if (data.channel === "sms") {
      await requireSmsEntitlement(supabase, data.organization_id);
    }

    const providerMessageId =
      mode === "test"
        ? `test_${randomUUID()}`
        : data.channel === "sms"
          ? await sendSms(data, settings)
          : await sendEmail(data, settings);
    const sentAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("customer_messages")
      .update({
        status: "sent",
        provider: data.channel === "sms" ? "telnyx" : "smtp",
        provider_message_id: providerMessageId,
        sent_at: sentAt,
        failure_reason: null,
        attempt_count: Number(data.attempt_count ?? 0) + 1,
        updated_at: sentAt,
      })
      .eq("id", data.id)
      .eq("status", "queued")
      .select("*")
      .single();
    if (updateError) throw updateError;
    if (data.channel === "sms" && mode === "live") {
      await recordSmsUsage({
        supabase,
        organizationId: data.organization_id,
        customerMessageId: data.id,
        customerId: data.customer_id,
        initiatedBy: data.initiated_by,
        providerMessageId,
        recipient: data.recipient,
      });
    }
    return updated;
  } catch (sendError) {
    const attempts = Number(data.attempt_count ?? 0) + 1;
    const retryAt = new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000);
    const failureReason =
      sendError instanceof Error ? sendError.message.slice(0, 500) : "Provider failure";
    const failedAt = attempts >= 3 ? new Date().toISOString() : null;
    const { error: failureUpdateError } = await supabase
      .from("customer_messages")
      .update({
        status: attempts >= 3 ? "failed" : "queued",
        attempt_count: attempts,
        next_attempt_at: retryAt.toISOString(),
        failure_reason: failureReason,
        failed_at: failedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (failureUpdateError) throw failureUpdateError;
    throw new Error(failureReason);
  }
}

export async function processDueCustomerMessages(limit = 50) {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("customer_messages")
    .select("id")
    .eq("status", "queued")
    .lte("scheduled_for", now)
    .lte("next_attempt_at", now)
    .order("scheduled_for", { ascending: true })
    .limit(Math.min(100, Math.max(1, limit)));
  if (error) throw error;

  const results = [];
  for (const message of data ?? []) {
    try {
      results.push({ id: message.id, ok: true, data: await processCustomerMessageById(message.id, supabase) });
    } catch (error) {
      results.push({ id: message.id, ok: false, error: error instanceof Error ? error.message : "Failed" });
    }
  }
  return results;
}

export function hashDocumentShareToken(token: string) {
  return tokenHash(token);
}
