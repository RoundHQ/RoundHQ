import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAiReceptionistLeadFromPayload,
  formatAiReceptionistCallDuration,
} from "@/lib/ai-receptionist-leads";
import {
  getAiReceptionistCallLog,
  updateAiReceptionistCallLog,
  upsertAiReceptionistCallLog,
} from "@/lib/ai-receptionist/call-logs";
import {
  findAiReceptionistSettingsForTelnyxWebhook,
} from "@/lib/ai-receptionist-private-settings";
import type {
  AiReceptionistPrivateSettings,
} from "@/lib/ai-receptionist-settings";
import type {
  IncomingCallResult,
  RecordingCompleteResult,
  SendAiReceptionistSmsOptions,
  SendSmsResult,
  TelephonyProvider,
} from "@/lib/ai-receptionist/providers/types";

type TelnyxWebhookContext = {
  supabase: SupabaseClient;
  rawBody: string;
  headers: Headers;
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

type TelnyxEvent = {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
};

type TelnyxCall = {
  eventId: string;
  eventType: string;
  callControlId: string;
  callSessionId: string;
  callerNumber: string;
  calledNumber: string;
  callStatus: string;
  rawPayload: Record<string, unknown>;
};

type TelnyxRecording = TelnyxCall & {
  recordingId: string;
  recordingUrl: string;
  durationSeconds: number | null;
  transcript: string;
  transcriptionStatus: string;
};

const TELNYX_API_BASE_URL = "https://api.telnyx.com/v2";
const TELNYX_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const ED25519_SPKI_DER_PREFIX = "302a300506032b6570032100";
const SERVICE_KEYWORDS: Array<[RegExp, string]> = [
  [/\bhedge\b|\btrim(?:ming)?\b/i, "Hedge trimming"],
  [/\bgrass\b|\blawn\b|\bmow(?:ing)?\b|\bcut(?:ting)?\b/i, "Garden maintenance"],
  [/\bgutter\b/i, "Gutter cleaning"],
  [/\bpressure\b|\bjet\s*wash/i, "Pressure washing"],
  [/\bpvc\b|\bupvc\b|\bfascia\b|\bsoffit\b/i, "PVC cleaning"],
  [/\bturf\b/i, "Turf laying"],
  [/\bovergrown\b/i, "Overgrown garden"],
  [/\bgarden\b|\bmaintenance\b/i, "Garden maintenance"],
  [/\bquote\b|\bestimate\b/i, "Quote request"],
];

function getText(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as { phone_number?: unknown }).phone_number === "string"
  ) {
    return ((value as { phone_number: string }).phone_number ?? "").trim();
  }

  return "";
}

export function normalisePhoneNumber(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function parseTelnyxWebhookBody(rawBody: string): TelnyxEvent | null {
  try {
    const body = JSON.parse(rawBody) as {
      data?: {
        id?: unknown;
        event_type?: unknown;
        payload?: unknown;
      };
    };
    const payload =
      body.data?.payload &&
      typeof body.data.payload === "object" &&
      !Array.isArray(body.data.payload)
        ? (body.data.payload as Record<string, unknown>)
        : {};

    return {
      id: getText(body.data?.id),
      eventType: getText(body.data?.event_type),
      payload,
    };
  } catch {
    return null;
  }
}

function getFirstText(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = getText(payload[key]);

    if (value) {
      return value;
    }
  }

  return "";
}

export function getCalledNumberFromTelnyxWebhook(rawBody: string) {
  const event = parseTelnyxWebhookBody(rawBody);

  if (!event) {
    return "";
  }

  return getFirstText(event.payload, [
    "to",
    "to_number",
    "called_number",
    "destination_number",
  ]);
}

function getCallControlId(event: TelnyxEvent) {
  return (
    getFirstText(event.payload, ["call_control_id", "call_control_id_v2"]) ||
    getFirstText(event.payload, ["call_session_id"]) ||
    event.id
  );
}

function normalizeTelnyxCall(event: TelnyxEvent): TelnyxCall {
  const callControlId = getCallControlId(event);

  return {
    eventId: event.id,
    eventType: event.eventType,
    callControlId,
    callSessionId: getFirstText(event.payload, ["call_session_id"]) || callControlId,
    callerNumber: getFirstText(event.payload, [
      "from",
      "from_number",
      "caller_number",
    ]),
    calledNumber: getFirstText(event.payload, [
      "to",
      "to_number",
      "called_number",
      "destination_number",
    ]),
    callStatus: getFirstText(event.payload, ["call_status", "state"]) || event.eventType,
    rawPayload: event.payload,
  };
}

function getDurationSeconds(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value > 1000 ? value / 1000 : value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());

    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed > 1000 ? parsed / 1000 : parsed);
    }
  }

  return null;
}

function getRecordingUrl(payload: Record<string, unknown>) {
  const directUrl = getFirstText(payload, [
    "recording_url",
    "recordingUrl",
    "download_url",
    "media_url",
  ]);

  if (directUrl) {
    return directUrl;
  }

  const urls = payload.recording_urls;

  if (urls && typeof urls === "object" && !Array.isArray(urls)) {
    return (
      getFirstText(urls as Record<string, unknown>, ["mp3", "wav"]) ||
      Object.values(urls as Record<string, unknown>)
        .map(getText)
        .find(Boolean) ||
      ""
    );
  }

  return "";
}

function normalizeTelnyxRecording(event: TelnyxEvent): TelnyxRecording {
  const call = normalizeTelnyxCall(event);
  const transcript =
    getFirstText(event.payload, [
      "transcription_text",
      "transcript",
      "transcription",
    ]) || "";

  return {
    ...call,
    recordingId:
      getFirstText(event.payload, ["recording_id", "recording_sid"]) ||
      call.callControlId,
    recordingUrl: getRecordingUrl(event.payload),
    durationSeconds: getDurationSeconds(
      event.payload.duration_secs ??
        event.payload.duration_seconds ??
        event.payload.duration_millis ??
        event.payload.recording_duration
    ),
    transcript,
    transcriptionStatus:
      getFirstText(event.payload, ["transcription_status"]) ||
      (transcript ? "completed" : "failed"),
  };
}

function createPublicKey(publicKey: string) {
  const trimmedKey = publicKey.trim();

  if (trimmedKey.startsWith("-----BEGIN")) {
    return crypto.createPublicKey(trimmedKey);
  }

  const hex = trimmedKey.replace(/^0x/i, "");

  if (/^[a-f0-9]{64}$/i.test(hex)) {
    return crypto.createPublicKey({
      key: Buffer.from(`${ED25519_SPKI_DER_PREFIX}${hex}`, "hex"),
      format: "der",
      type: "spki",
    });
  }

  const decoded = Buffer.from(trimmedKey, "base64");

  if (decoded.length === 32) {
    return crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from(ED25519_SPKI_DER_PREFIX, "hex"),
        decoded,
      ]),
      format: "der",
      type: "spki",
    });
  }

  return crypto.createPublicKey({
    key: decoded,
    format: "der",
    type: "spki",
  });
}

function getSignatureBuffer(signature: string) {
  const trimmedSignature = signature.trim();

  if (/^[a-f0-9]+$/i.test(trimmedSignature) && trimmedSignature.length % 2 === 0) {
    return Buffer.from(trimmedSignature, "hex");
  }

  return Buffer.from(trimmedSignature, "base64");
}

export function validateTelnyxWebhookSignature(options: {
  rawBody: string;
  headers: Headers;
  verificationKey: string;
  now?: Date;
}) {
  const signature =
    options.headers.get("telnyx-signature-ed25519") ??
    options.headers.get("x-telnyx-signature-ed25519") ??
    "";
  const timestamp =
    options.headers.get("telnyx-timestamp") ??
    options.headers.get("x-telnyx-timestamp") ??
    "";
  const timestampSeconds = Number(timestamp);

  if (!signature || !timestamp || !Number.isFinite(timestampSeconds)) {
    return {
      ok: false,
      error: "Missing Telnyx webhook signature.",
    };
  }

  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);

  if (
    Math.abs(nowSeconds - timestampSeconds) >
    TELNYX_SIGNATURE_TOLERANCE_SECONDS
  ) {
    return {
      ok: false,
      error: "Telnyx webhook signature timestamp is outside the allowed window.",
    };
  }

  try {
    const verified = crypto.verify(
      null,
      Buffer.from(`${timestamp}|${options.rawBody}`),
      createPublicKey(options.verificationKey),
      getSignatureBuffer(signature)
    );

    return verified
      ? { ok: true }
      : { ok: false, error: "Invalid Telnyx webhook signature." };
  } catch {
    return {
      ok: false,
      error: "Invalid Telnyx webhook signature.",
    };
  }
}

function renderTemplate(value: string, settings: AiReceptionistPrivateSettings) {
  return value.replace(
    /{{\s*business_name\s*}}/g,
    settings.businessName || "the business"
  );
}

function buildVoicemailPrompt(settings: AiReceptionistPrivateSettings) {
  return [
    renderTemplate(settings.greetingMessage, settings),
    renderTemplate(settings.consentMessage, settings),
    "Please leave your name, phone number, address, and a short description of the work you need. We'll get back to you as soon as possible.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function telnyxApiRequest(options: {
  apiKey: string;
  path: string;
  body: Record<string, unknown>;
  fetchImpl?: typeof fetch;
}) {
  const response = await (options.fetchImpl ?? fetch)(
    `${TELNYX_API_BASE_URL}${options.path}`,
    {
      method: "POST",
      headers: {
        "authorization": `Bearer ${options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(options.body),
    }
  );

  if (!response.ok) {
    throw new Error(`Telnyx API returned ${response.status}.`);
  }

  return response;
}

async function startTelnyxVoicemailFlow(options: {
  settings: AiReceptionistPrivateSettings;
  call: TelnyxCall;
  fetchImpl?: typeof fetch;
}) {
  const callControlId = encodeURIComponent(options.call.callControlId);

  await telnyxApiRequest({
    apiKey: options.settings.telnyxApiKey,
    path: `/calls/${callControlId}/actions/answer`,
    body: {},
    fetchImpl: options.fetchImpl,
  });
  await telnyxApiRequest({
    apiKey: options.settings.telnyxApiKey,
    path: `/calls/${callControlId}/actions/speak`,
    body: {
      payload: buildVoicemailPrompt(options.settings),
      language: "en-GB",
      voice: "female",
    },
    fetchImpl: options.fetchImpl,
  });
  await telnyxApiRequest({
    apiKey: options.settings.telnyxApiKey,
    path: `/calls/${callControlId}/actions/record_start`,
    body: {
      format: "mp3",
      channels: "single",
      play_beep: true,
      max_length: 300,
    },
    fetchImpl: options.fetchImpl,
  });
}

function extractLabelledValue(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`\\b${label}\\s*[:\\-]\\s*([^\\n.]+)`, "i");
    const match = text.match(pattern);

    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return "";
}

function inferName(transcript: string) {
  return (
    extractLabelledValue(transcript, ["name", "my name", "customer name"]) ||
    transcript.match(/\b(?:my name is|i am|i'm|this is)\s+([a-z][a-z' -]{1,50})/i)?.[1]?.trim() ||
    ""
  );
}

function inferAddress(transcript: string) {
  return (
    extractLabelledValue(transcript, [
      "address",
      "property address",
      "site address",
    ]) ||
    transcript.match(
      /\b\d{1,5}\s+[a-z0-9' -]+\s+(?:street|st|road|rd|avenue|ave|drive|dr|lane|ln|close|court|place|gardens|crescent|terrace|way|view|park)\b[^.\n]*/i
    )?.[0]?.trim() ||
    ""
  );
}

function inferServiceRequired(transcript: string) {
  return SERVICE_KEYWORDS.find(([pattern]) => pattern.test(transcript))?.[1] ?? "";
}

function buildAiSummary(recording: TelnyxRecording) {
  if (!recording.transcript.trim()) {
    return recording.transcriptionStatus === "failed"
      ? "Voicemail received. Transcription failed or is not available yet."
      : "Voicemail received. Transcript is not available yet.";
  }

  return recording.transcript.length > 240
    ? `${recording.transcript.slice(0, 237).trim()}...`
    : recording.transcript.trim();
}

function buildTelnyxVoicemailLeadPayload(recording: TelnyxRecording) {
  const transcript = recording.transcript.trim();
  const transcriptionFailed =
    !transcript && recording.transcriptionStatus.toLowerCase() === "failed";
  const fallbackDescription = transcriptionFailed
    ? "Voicemail recording received. Transcription failed or is not available yet."
    : "Voicemail recording received. Transcript is not available yet.";

  return {
    customer_name: inferName(transcript),
    phone: recording.callerNumber,
    caller_phone: recording.callerNumber,
    address: inferAddress(transcript),
    service_required: inferServiceRequired(transcript),
    job_description: transcript || fallbackDescription,
    ai_summary: buildAiSummary(recording),
    transcript,
    recording_id: recording.callControlId,
    call_duration_seconds: recording.durationSeconds ?? undefined,
    source: "AI Receptionist",
    provider: "telnyx",
    telnyx_call_control_id: recording.callControlId,
    telnyx_call_session_id: recording.callSessionId,
    telnyx_recording_id: recording.recordingId,
    transcription_status: recording.transcriptionStatus,
  };
}

function jsonResult(body: Record<string, unknown>, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    body,
  };
}

async function getValidatedTelnyxSettings(context: TelnyxWebhookContext) {
  const calledNumber = getCalledNumberFromTelnyxWebhook(context.rawBody);
  const settings = await findAiReceptionistSettingsForTelnyxWebhook(
    context.supabase,
    calledNumber
  );

  if (!settings || settings.telephonyProvider !== "telnyx") {
    return {
      ok: false as const,
      response: jsonResult({ error: "Unknown Telnyx phone number." }, 403),
    };
  }

  if (!settings.telnyxPublicKey || !settings.telnyxApiKey) {
    return {
      ok: false as const,
      response: jsonResult({ error: "Telnyx connection is not configured." }, 403),
    };
  }

  const signature = validateTelnyxWebhookSignature({
    rawBody: context.rawBody,
    headers: context.headers,
    verificationKey: settings.telnyxPublicKey,
  });

  if (!signature.ok) {
    return {
      ok: false as const,
      response: jsonResult(
        { error: signature.error ?? "Invalid Telnyx webhook signature." },
        403
      ),
    };
  }

  const event = parseTelnyxWebhookBody(context.rawBody);

  if (!event) {
    return {
      ok: false as const,
      response: jsonResult({ error: "Send a valid Telnyx webhook payload." }, 400),
    };
  }

  return {
    ok: true as const,
    settings,
    event,
  };
}

export async function handleTelnyxIncomingCall(
  context: TelnyxWebhookContext
): Promise<IncomingCallResult> {
  const validated = await getValidatedTelnyxSettings(context);

  if (!validated.ok) {
    return validated.response;
  }

  const call = normalizeTelnyxCall(validated.event);

  if (!call.callControlId) {
    return jsonResult({ error: "call_control_id is required." }, 400);
  }

  await upsertAiReceptionistCallLog(
    context.supabase,
    validated.settings.organizationId,
    {
      provider: "telnyx",
      providerEventId: call.eventId,
      callSid: call.callControlId,
      accountSid: validated.settings.telnyxConnectionId,
      callerNumber: call.callerNumber,
      twilioPhoneNumber: call.calledNumber,
      callType: "voicemail",
      callStatus: call.callStatus || "incoming",
      rawPayload: call.rawPayload,
    }
  );

  if (!validated.settings.enabled) {
    return jsonResult({ ok: true, skipped: "disabled" });
  }

  try {
    await startTelnyxVoicemailFlow({
      settings: validated.settings,
      call,
      fetchImpl: context.fetchImpl,
    });
  } catch (error) {
    await updateAiReceptionistCallLog(
      context.supabase,
      validated.settings.organizationId,
      call.callControlId,
      {
        notificationStatus: "failed",
        notificationError:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to start Telnyx voicemail flow.",
      }
    );

    return jsonResult({ ok: false, error: "Unable to start voicemail flow." }, 502);
  }

  return jsonResult({ ok: true });
}

export async function handleTelnyxRecordingComplete(
  context: TelnyxWebhookContext
): Promise<RecordingCompleteResult> {
  const validated = await getValidatedTelnyxSettings(context);

  if (!validated.ok) {
    return validated.response;
  }

  const recording = normalizeTelnyxRecording(validated.event);

  if (!recording.callControlId) {
    return jsonResult({ error: "call_control_id is required." }, 400);
  }

  const existingCallLog = await getAiReceptionistCallLog(
    context.supabase,
    validated.settings.organizationId,
    recording.callControlId
  );
  const existingLeadId = existingCallLog?.lead_id ?? null;

  await upsertAiReceptionistCallLog(
    context.supabase,
    validated.settings.organizationId,
    {
      provider: "telnyx",
      providerEventId: recording.eventId,
      callSid: recording.callControlId,
      accountSid: validated.settings.telnyxConnectionId,
      callerNumber: recording.callerNumber,
      twilioPhoneNumber: recording.calledNumber,
      callType: "voicemail",
      recordingUrl: recording.recordingUrl || existingCallLog?.recording_url || undefined,
      durationSeconds: recording.durationSeconds ?? existingCallLog?.duration_seconds,
      transcript: recording.transcript,
      leadId: existingLeadId,
      callStatus: recording.callStatus || "recording-complete",
      outcome: recording.transcript ? "lead_captured" : "transcription_failed",
      rawPayload: recording.rawPayload,
    }
  );

  if (existingLeadId) {
    return jsonResult({
      ok: true,
      leadId: existingLeadId,
      duplicate: true,
    });
  }

  const leadPayload = buildTelnyxVoicemailLeadPayload(recording);
  const leadResult = await createAiReceptionistLeadFromPayload({
    supabase: context.supabase,
    organizationId: validated.settings.organizationId,
    payload: leadPayload,
  });

  if (!leadResult.ok) {
    await updateAiReceptionistCallLog(
      context.supabase,
      validated.settings.organizationId,
      recording.callControlId,
      {
        notificationStatus: "failed",
        notificationError: leadResult.error,
      }
    );

    return jsonResult({ error: leadResult.error }, leadResult.status);
  }

  let notificationStatus = "skipped";
  let notificationError: string | null = null;

  if (
    validated.settings.newLeadSmsEnabled &&
    validated.settings.newLeadSmsPhoneNumber
  ) {
    const sms = await sendTelnyxSms(validated.settings, {
      organisationId: validated.settings.organizationId,
      to: validated.settings.newLeadSmsPhoneNumber,
      message: formatTelnyxLeadNotification({
        caller: recording.callerNumber,
        summary: String(leadPayload.ai_summary ?? ""),
        leadId: leadResult.lead.id,
        durationSeconds: recording.durationSeconds,
      }),
      relatedLeadId: leadResult.lead.id,
      supabase: context.supabase,
      fetchImpl: context.fetchImpl,
    });
    notificationStatus = sms.ok ? "sms_sent" : "failed";
    notificationError = sms.ok ? null : sms.error;
  }

  await updateAiReceptionistCallLog(
    context.supabase,
    validated.settings.organizationId,
    recording.callControlId,
    {
      leadId: leadResult.lead.id,
      notificationStatus,
      notificationError,
    }
  );

  return jsonResult({
    ok: true,
    leadId: leadResult.lead.id,
    transcriptionStatus: recording.transcriptionStatus,
  });
}

export async function handleTelnyxCallStatus(
  context: TelnyxWebhookContext
): Promise<IncomingCallResult> {
  const validated = await getValidatedTelnyxSettings(context);

  if (!validated.ok) {
    return validated.response;
  }

  const call = normalizeTelnyxCall(validated.event);

  if (!call.callControlId) {
    return jsonResult({ error: "call_control_id is required." }, 400);
  }

  await upsertAiReceptionistCallLog(
    context.supabase,
    validated.settings.organizationId,
    {
      provider: "telnyx",
      providerEventId: call.eventId,
      callSid: call.callControlId,
      accountSid: validated.settings.telnyxConnectionId,
      callerNumber: call.callerNumber,
      twilioPhoneNumber: call.calledNumber,
      callType: "voicemail",
      callStatus: call.callStatus || "status-callback",
      rawPayload: call.rawPayload,
    }
  );

  return jsonResult({ ok: true });
}

export async function sendTelnyxSms(
  settings: AiReceptionistPrivateSettings,
  options: SendAiReceptionistSmsOptions
): Promise<SendSmsResult> {
  if (settings.telephonyProvider !== "telnyx") {
    return {
      ok: false,
      error: "AI Receptionist SMS is only configured for Telnyx.",
    };
  }

  if (!settings.telnyxApiKey || !settings.telnyxPhoneNumber) {
    return {
      ok: false,
      error: "Telnyx SMS credentials are not configured.",
    };
  }

  const body: Record<string, unknown> = {
    from: settings.telnyxPhoneNumber,
    to: options.to,
    text: options.message,
  };

  if (settings.telnyxMessagingProfileId) {
    body.messaging_profile_id = settings.telnyxMessagingProfileId;
  }

  if (options.relatedLeadId) {
    body.webhook_url = undefined;
  }

  const response = await (options.fetchImpl ?? fetch)(
    `${TELNYX_API_BASE_URL}/messages`,
    {
      method: "POST",
      headers: {
        "authorization": `Bearer ${settings.telnyxApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    return {
      ok: false,
      error: `Telnyx SMS API returned ${response.status}.`,
    };
  }

  const responseBody = (await response.json().catch(() => null)) as {
    data?: { id?: string };
  } | null;

  return {
    ok: true,
    providerMessageId: responseBody?.data?.id,
  };
}

export const telnyxProvider: TelephonyProvider = {
  getProviderName() {
    return "telnyx";
  },
  normalisePhoneNumber: normalisePhoneNumber,
  validateWebhookSignature: validateTelnyxWebhookSignature,
  handleIncomingCall: handleTelnyxIncomingCall as TelephonyProvider["handleIncomingCall"],
  handleRecordingComplete:
    handleTelnyxRecordingComplete as TelephonyProvider["handleRecordingComplete"],
  async sendSms(options) {
    const { getAiReceptionistPrivateSettings } = await import(
      "@/lib/ai-receptionist-private-settings"
    );
    const { createServiceRoleClient } = await import("@/lib/supabase/admin");
    const supabase = options.supabase ?? createServiceRoleClient();
    const settings = await getAiReceptionistPrivateSettings(
      supabase,
      options.organisationId
    );

    if (!settings) {
      return {
        ok: false,
        error: "AI Receptionist settings are not configured.",
      };
    }

    return sendTelnyxSms(settings, options);
  },
};

export function getTelnyxRecordingPlaybackHeaders(
  settings: AiReceptionistPrivateSettings
): Record<string, string> {
  return settings.telnyxApiKey
    ? {
        "authorization": `Bearer ${settings.telnyxApiKey}`,
      }
    : {};
}

export function formatTelnyxLeadNotification(options: {
  caller: string;
  summary: string;
  leadId: string;
  durationSeconds?: number | null;
}) {
  return [
    "New AI Receptionist Lead",
    `Caller: ${options.caller || "Unknown"}`,
    `Summary: ${options.summary}`,
    `Lead Created: ${options.leadId}`,
    options.durationSeconds != null
      ? `Call Duration: ${formatAiReceptionistCallDuration(
          options.durationSeconds
        )}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
