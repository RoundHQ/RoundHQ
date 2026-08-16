import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isCustomerFeatureEnabled } from "@/lib/customer-account";
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
import {
  buildOpenAiRealtimeSipUri,
  encodeRoundHqCallReference,
  getOpenAiRealtimeSipConfig,
} from "@/lib/ai-receptionist/realtime/openai-sip";
import {
  createEmptyAiReceptionistLeadState,
  formatAiReceptionistRealtimeTranscript,
  reduceTranscriptToLeadState,
  type AiReceptionistRealtimeTranscriptEntry,
} from "@/lib/ai-receptionist/realtime/session";
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
  parentCallControlId: string;
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

function decodeTelnyxClientState(payload: Record<string, unknown>) {
  const encodedState = getFirstText(payload, ["client_state"]);

  if (!encodedState) {
    return {} as Record<string, unknown>;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(encodedState, "base64").toString("utf8")
    ) as unknown;

    return decoded && typeof decoded === "object" && !Array.isArray(decoded)
      ? (decoded as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function buildTelnyxClientState(
  call: TelnyxCall,
  parentCallControlId = call.parentCallControlId
) {
  return Buffer.from(
    JSON.stringify({
      called_number: call.calledNumber,
      caller_number: call.callerNumber,
      ...(parentCallControlId
        ? { parent_call_control_id: parentCallControlId }
        : {}),
    }),
    "utf8"
  ).toString("base64");
}

export function getTelnyxWebhookEventType(rawBody: string) {
  return parseTelnyxWebhookBody(rawBody)?.eventType ?? "";
}

export function getParentCallControlIdFromTelnyxWebhook(rawBody: string) {
  const event = parseTelnyxWebhookBody(rawBody);

  return event
    ? getFirstText(decodeTelnyxClientState(event.payload), [
        "parent_call_control_id",
      ])
    : "";
}

export function getCalledNumberFromTelnyxWebhook(rawBody: string) {
  const event = parseTelnyxWebhookBody(rawBody);

  if (!event) {
    return "";
  }

  return (
    getFirstText(event.payload, [
      "to",
      "to_number",
      "called_number",
      "destination_number",
    ]) ||
    getFirstText(decodeTelnyxClientState(event.payload), ["called_number"])
  );
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
  const clientState = decodeTelnyxClientState(event.payload);

  return {
    eventId: event.id,
    eventType: event.eventType,
    callControlId,
    callSessionId: getFirstText(event.payload, ["call_session_id"]) || callControlId,
    parentCallControlId: getFirstText(clientState, ["parent_call_control_id"]),
    callerNumber:
      getFirstText(event.payload, [
        "from",
        "from_number",
        "caller_number",
      ]) || getFirstText(clientState, ["caller_number"]),
    calledNumber:
      getFirstText(event.payload, [
        "to",
        "to_number",
        "called_number",
        "destination_number",
      ]) || getFirstText(clientState, ["called_number"]),
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
    transcriptionStatus: transcript
      ? "completed"
      : event.eventType === "call.recording.transcription.saved"
        ? getFirstText(event.payload, ["transcription_status", "status"]) ||
          "failed"
        : event.eventType === "call.recording.error"
          ? "failed"
          : getFirstText(event.payload, ["transcription_status"]) || "pending",
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
    const errorBody = await response.text();
    let detail = errorBody.trim();

    try {
      const parsed = JSON.parse(errorBody) as {
        errors?: Array<{ detail?: unknown; title?: unknown }>;
      };
      const providerError = parsed.errors?.[0];
      detail = getText(providerError?.detail) || getText(providerError?.title) || detail;
    } catch {
      // Keep the provider's plain-text response when it is not JSON.
    }

    const safeDetail = detail.replace(/\s+/g, " ").slice(0, 500);
    throw new Error(
      `Telnyx API returned ${response.status}${safeDetail ? `: ${safeDetail}` : "."}`
    );
  }

  return response;
}

function buildTelnyxCommandId(callControlId: string, action: string) {
  const digest = crypto
    .createHash("sha256")
    .update(`${callControlId}:${action}`)
    .digest("hex")
    .slice(0, 32);

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    digest.slice(12, 16),
    digest.slice(16, 20),
    digest.slice(20),
  ].join("-");
}

async function startTelnyxVoicemailGreeting(options: {
  settings: AiReceptionistPrivateSettings;
  call: TelnyxCall;
  fetchImpl?: typeof fetch;
}) {
  const callControlId = encodeURIComponent(options.call.callControlId);
  const clientState = buildTelnyxClientState(options.call);

  await telnyxApiRequest({
    apiKey: options.settings.telnyxApiKey,
    path: `/calls/${callControlId}/actions/answer`,
    body: {
      client_state: clientState,
      command_id: buildTelnyxCommandId(options.call.callControlId, "answer"),
    },
    fetchImpl: options.fetchImpl,
  });
  await telnyxApiRequest({
    apiKey: options.settings.telnyxApiKey,
    path: `/calls/${callControlId}/actions/speak`,
    body: {
      payload: buildVoicemailPrompt(options.settings),
      language: "en-GB",
      voice: "female",
      client_state: clientState,
      command_id: buildTelnyxCommandId(options.call.callControlId, "speak"),
    },
    fetchImpl: options.fetchImpl,
  });
}

async function startTelnyxVoicemailRecording(options: {
  settings: AiReceptionistPrivateSettings;
  call: TelnyxCall;
  fetchImpl?: typeof fetch;
}) {
  const callControlId = encodeURIComponent(options.call.callControlId);

  await telnyxApiRequest({
    apiKey: options.settings.telnyxApiKey,
    path: `/calls/${callControlId}/actions/record_start`,
    body: {
      format: "mp3",
      channels: "single",
      recording_track: "inbound",
      play_beep: true,
      max_length: 300,
      timeout_secs: 8,
      trim: "trim-silence",
      transcription: true,
      transcription_engine: "B",
      transcription_language: "en-GB",
      client_state: buildTelnyxClientState(options.call),
      command_id: buildTelnyxCommandId(options.call.callControlId, "record"),
    },
    fetchImpl: options.fetchImpl,
  });
}

async function startTelnyxRealtimeConversation(options: {
  settings: AiReceptionistPrivateSettings;
  call: TelnyxCall;
  fetchImpl?: typeof fetch;
}) {
  const config = getOpenAiRealtimeSipConfig();

  if (!config) {
    throw new Error("OpenAI Realtime SIP is not configured.");
  }

  const callControlId = encodeURIComponent(options.call.callControlId);
  const clientState = buildTelnyxClientState(options.call);
  const targetLegClientState = buildTelnyxClientState(
    options.call,
    options.call.callControlId
  );
  const callReference = encodeRoundHqCallReference(
    options.call.callControlId
  );

  await telnyxApiRequest({
    apiKey: options.settings.telnyxApiKey,
    path: `/calls/${callControlId}/actions/answer`,
    body: {
      client_state: clientState,
      command_id: buildTelnyxCommandId(options.call.callControlId, "answer"),
    },
    fetchImpl: options.fetchImpl,
  });
  await telnyxApiRequest({
    apiKey: options.settings.telnyxApiKey,
    path: `/calls/${callControlId}/actions/transfer`,
    body: {
      to: buildOpenAiRealtimeSipUri(config.projectId),
      timeout_secs: 20,
      time_limit_secs: 600,
      park_after_unbridge: "self",
      sip_transport_protocol: "TLS",
      media_encryption: "SRTP",
      target_leg_client_state: targetLegClientState,
      custom_headers: [
        {
          name: "X-RoundHQ-Call-ID",
          value: callReference,
        },
      ],
      sip_headers: [
        {
          name: "User-to-User",
          value: callReference,
        },
      ],
      command_id: buildTelnyxCommandId(options.call.callControlId, "transfer"),
    },
    fetchImpl: options.fetchImpl,
  });
}

async function startTelnyxRealtimeRecording(options: {
  settings: AiReceptionistPrivateSettings;
  call: TelnyxCall;
  fetchImpl?: typeof fetch;
}) {
  const callControlId = encodeURIComponent(options.call.callControlId);

  await telnyxApiRequest({
    apiKey: options.settings.telnyxApiKey,
    path: `/calls/${callControlId}/actions/record_start`,
    body: {
      format: "mp3",
      channels: "dual",
      recording_track: "both",
      play_beep: false,
      max_length: 600,
      timeout_secs: 0,
      trim: "trim-silence",
      transcription: true,
      transcription_engine: "B",
      transcription_language: "en-GB",
      client_state: buildTelnyxClientState(options.call),
      command_id: buildTelnyxCommandId(
        options.call.callControlId,
        "realtime-record"
      ),
    },
    fetchImpl: options.fetchImpl,
  });
}


function parseTelnyxDualChannelTranscript(
  transcript: string,
  callType: "voicemail" | "realtime"
) {
  const markers = Array.from(
    transcript.matchAll(/\bchannel\s+(\d+)\s*:\s*/gi)
  );

  if (markers.length === 0) {
    return [] as AiReceptionistRealtimeTranscriptEntry[];
  }

  return markers
    .map((marker, index): AiReceptionistRealtimeTranscriptEntry | null => {
      const channel = Number(marker[1]);
      const start = (marker.index ?? 0) + marker[0].length;
      const end = markers[index + 1]?.index ?? transcript.length;
      const text = transcript.slice(start, end).trim();

      if (!text) {
        return null;
      }

      return {
        speaker:
          callType === "voicemail" || channel !== 0 ? "caller" : "ai",
        text,
        atSeconds: 0,
      };
    })
    .filter(
      (entry): entry is AiReceptionistRealtimeTranscriptEntry => Boolean(entry)
    );
}

function prepareTelnyxTranscript(
  transcript: string,
  callType: "voicemail" | "realtime"
) {
  const rawTranscript = transcript.trim();
  const channelEntries = parseTelnyxDualChannelTranscript(
    rawTranscript,
    callType
  );
  const transcriptEntries =
    channelEntries.length > 0
      ? channelEntries
      : rawTranscript
        ? [
            {
              speaker: callType === "voicemail" ? "caller" : "system",
              text: rawTranscript,
              atSeconds: 0,
            } satisfies AiReceptionistRealtimeTranscriptEntry,
          ]
        : [];
  return {
    transcriptEntries,
    formattedTranscript:
      channelEntries.length > 0
        ? formatAiReceptionistRealtimeTranscript(transcriptEntries)
        : rawTranscript,
  };
}

function buildTelnyxLeadPayload(
  recording: TelnyxRecording,
  callType: "voicemail" | "realtime"
) {
  const preparedTranscript = prepareTelnyxTranscript(
    recording.transcript,
    callType
  );
  const state = reduceTranscriptToLeadState(
    preparedTranscript.transcriptEntries,
    createEmptyAiReceptionistLeadState()
  );
  const transcript = preparedTranscript.formattedTranscript;
  const transcriptionFailed =
    !transcript && recording.transcriptionStatus.toLowerCase() === "failed";
  const callLabel =
    callType === "realtime" ? "AI Receptionist call" : "Voicemail recording";
  const fallbackDescription = transcriptionFailed
    ? `${callLabel} received. Transcription failed or is not available yet.`
    : `${callLabel} received. Caller transcript is not available yet.`;
  const description = state.job_description || fallbackDescription;

  return {
    customer_name: state.name,
    phone: recording.callerNumber,
    caller_phone: recording.callerNumber,
    address: state.address,
    service_required: state.service_required,
    job_description: description,
    ai_summary:
      description.length > 240
        ? `${description.slice(0, 237).trim()}...`
        : description,
    transcript,
    transcript_entries: preparedTranscript.transcriptEntries,
    recording_id: recording.callControlId,
    call_duration_seconds: recording.durationSeconds ?? undefined,
    source: "Voicemail",
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
  const event = parseTelnyxWebhookBody(context.rawBody);

  if (!event) {
    return {
      ok: false as const,
      response: jsonResult({ error: "Send a valid Telnyx webhook payload." }, 400),
    };
  }

  const calledNumber = getCalledNumberFromTelnyxWebhook(context.rawBody);
  const settings = await findAiReceptionistSettingsForTelnyxWebhook(
    context.supabase,
    calledNumber,
    getCallControlId(event)
  );

  if (!settings || settings.telephonyProvider !== "telnyx") {
    return {
      ok: false as const,
      response: jsonResult({ error: "Unknown Telnyx phone number or call." }, 403),
    };
  }

  const featureEnabled = await isCustomerFeatureEnabled(
    context.supabase,
    settings.organizationId,
    "aiReceptionist"
  );

  if (!featureEnabled) {
    return {
      ok: false as const,
      response: jsonResult(
        { error: "AI Receptionist is not enabled for this workspace." },
        403
      ),
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
  const liveAiConfigured = false;

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
      callType: liveAiConfigured ? "realtime" : "voicemail",
      callStatus: call.callStatus || "incoming",
      aiSummaries: undefined,
      rawPayload: call.rawPayload,
    }
  );

  if (!validated.settings.enabled) {
    return jsonResult({ ok: true, skipped: "disabled" });
  }

  try {
    if (liveAiConfigured) {
      await startTelnyxRealtimeConversation({
        settings: validated.settings,
        call,
        fetchImpl: context.fetchImpl,
      });
      await updateAiReceptionistCallLog(
        context.supabase,
        validated.settings.organizationId,
        call.callControlId,
        {
          callType: "realtime",
          callStatus: "realtime-transfer-requested",
          outcome: "conversation_pending",
        }
      );
    } else {
      await startTelnyxVoicemailGreeting({
        settings: validated.settings,
        call,
        fetchImpl: context.fetchImpl,
      });
    }
  } catch (error) {
    if (liveAiConfigured) {
      try {
        await startTelnyxVoicemailGreeting({
          settings: validated.settings,
          call,
          fetchImpl: context.fetchImpl,
        });
        await updateAiReceptionistCallLog(
          context.supabase,
          validated.settings.organizationId,
          call.callControlId,
          {
            callType: "voicemail",
            callStatus: "live-ai-fallback",
            outcome: "transcription_pending",
            aiSummaries: {
              live_ai_status: "transfer_failed",
              live_ai_error:
                error instanceof Error && error.message.trim()
                  ? error.message
                  : "Unable to transfer the call to OpenAI Realtime.",
            },
          }
        );
        return jsonResult({ ok: true, fallback: "voicemail" });
      } catch {
        // The failure below records the original live-transfer error.
      }
    }

    await updateAiReceptionistCallLog(
      context.supabase,
      validated.settings.organizationId,
      call.callControlId,
      {
        notificationStatus: "failed",
        notificationError:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to start the Telnyx receptionist flow.",
      }
    );

    return jsonResult(
      { ok: false, error: "Unable to start the receptionist call flow." },
      502
    );
  }

  return jsonResult({ ok: true, mode: liveAiConfigured ? "realtime" : "voicemail" });
}

export async function handleTelnyxSpeakEnded(
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
      callerNumber: call.callerNumber || undefined,
      twilioPhoneNumber: call.calledNumber || undefined,
      callType: "voicemail",
      callStatus: "greeting-complete",
      outcome: "transcription_pending",
      rawPayload: call.rawPayload,
    }
  );

  if (!validated.settings.enabled) {
    return jsonResult({ ok: true, skipped: "disabled" });
  }

  try {
    await startTelnyxVoicemailRecording({
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
            : "Unable to start Telnyx voicemail recording.",
      }
    );

    return jsonResult(
      { ok: false, error: "Unable to start voicemail recording." },
      502
    );
  }

  return jsonResult({ ok: true, recordingStarted: true });
}

export async function handleTelnyxRecordingComplete(
  context: TelnyxWebhookContext
): Promise<RecordingCompleteResult> {
  const validated = await getValidatedTelnyxSettings(context);

  if (!validated.ok) {
    return validated.response;
  }

  const webhookRecording = normalizeTelnyxRecording(validated.event);

  if (!webhookRecording.callControlId) {
    return jsonResult({ error: "call_control_id is required." }, 400);
  }

  const callLogId =
    webhookRecording.parentCallControlId || webhookRecording.callControlId;
  const existingCallLog = await getAiReceptionistCallLog(
    context.supabase,
    validated.settings.organizationId,
    callLogId
  );
  const recording: TelnyxRecording = {
    ...webhookRecording,
    callControlId: callLogId,
    callerNumber:
      webhookRecording.callerNumber || existingCallLog?.caller_number || "",
    calledNumber:
      webhookRecording.calledNumber ||
      existingCallLog?.twilio_phone_number ||
      validated.settings.telnyxPhoneNumber,
    recordingUrl:
      webhookRecording.recordingUrl || existingCallLog?.recording_url || "",
    durationSeconds:
      webhookRecording.durationSeconds ?? existingCallLog?.duration_seconds ?? null,
    transcript:
      webhookRecording.transcript || existingCallLog?.transcript || "",
  };
  const existingLeadId = existingCallLog?.lead_id ?? null;
  const callType =
    existingCallLog?.call_type === "realtime" ? "realtime" : "voicemail";
  const preparedTranscript = prepareTelnyxTranscript(
    recording.transcript,
    callType
  );
  const isTranscriptionEvent =
    recording.eventType === "call.recording.transcription.saved";
  const transcriptionFailed =
    recording.transcriptionStatus.toLowerCase() === "failed" ||
    recording.eventType === "call.recording.error" ||
    (isTranscriptionEvent && !recording.transcript);
  const awaitingTranscription =
    !recording.transcript && !transcriptionFailed && !existingLeadId;
  const outcome = existingLeadId
    ? existingCallLog?.outcome || "lead_captured"
    : recording.transcript
      ? "lead_captured"
      : transcriptionFailed
        ? "transcription_failed"
        : "transcription_pending";

  await upsertAiReceptionistCallLog(
    context.supabase,
    validated.settings.organizationId,
    {
      provider: "telnyx",
      providerEventId: recording.eventId,
      callSid: recording.callControlId,
      accountSid: validated.settings.telnyxConnectionId,
      callerNumber: recording.callerNumber || undefined,
      twilioPhoneNumber: recording.calledNumber || undefined,
      callType,
      recordingUrl: recording.recordingUrl || undefined,
      durationSeconds: recording.durationSeconds ?? undefined,
      transcript: preparedTranscript.formattedTranscript || undefined,
      transcriptEntries: preparedTranscript.transcriptEntries,
      leadId: existingLeadId || undefined,
      callStatus: recording.eventType || "recording-complete",
      outcome,
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

  if (awaitingTranscription) {
    return jsonResult({
      ok: true,
      pending: true,
      transcriptionStatus: "pending",
    });
  }

  if (transcriptionFailed) {
    recording.transcriptionStatus = "failed";
  }

  const leadPayload = buildTelnyxLeadPayload(recording, callType);
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
      outcome: recording.transcript ? "lead_captured" : "transcription_failed",
      aiSuccess: Boolean(recording.transcript),
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

  const callLogId = call.parentCallControlId || call.callControlId;
  const existingCallLog = await getAiReceptionistCallLog(
    context.supabase,
    validated.settings.organizationId,
    callLogId
  );
  const isAnswered = validated.event.eventType === "call.answered";
  const isEnded = ["call.hangup", "call.bridged.hangup"].includes(
    validated.event.eventType
  );
  const shouldFallbackToVoicemail = Boolean(
    call.parentCallControlId &&
      isEnded &&
      existingCallLog?.call_type === "realtime" &&
      !existingCallLog.session_id &&
      validated.settings.enabled
  );
  const existingAiSummaries =
    existingCallLog?.ai_summaries &&
    typeof existingCallLog.ai_summaries === "object" &&
    !Array.isArray(existingCallLog.ai_summaries)
      ? existingCallLog.ai_summaries
      : {};
  const recordingAlreadyRequested =
    existingAiSummaries.live_recording_requested === true;
  const shouldStartRealtimeRecording = Boolean(
    validated.event.eventType === "call.bridged" &&
      existingCallLog?.call_type === "realtime" &&
      validated.settings.enabled &&
      !recordingAlreadyRequested
  );


  await upsertAiReceptionistCallLog(
    context.supabase,
    validated.settings.organizationId,
    {
      provider: "telnyx",
      providerEventId: call.eventId,
      callSid: callLogId,
      accountSid: validated.settings.telnyxConnectionId,
      callerNumber: call.callerNumber || undefined,
      twilioPhoneNumber: call.calledNumber || undefined,
      callType:
        existingCallLog?.call_type === "realtime"
          ? "realtime"
          : "voicemail",
      callStatus: call.callStatus || "status-callback",
      answeredAt: isAnswered
        ? existingCallLog?.answered_at || new Date().toISOString()
        : undefined,
      endedAt:
        isEnded && !call.parentCallControlId
          ? new Date().toISOString()
          : undefined,
      rawPayload: call.rawPayload,
    }
  );

  if (shouldStartRealtimeRecording) {
    try {
      await startTelnyxRealtimeRecording({
        settings: validated.settings,
        call,
        fetchImpl: context.fetchImpl,
      });
      await updateAiReceptionistCallLog(
        context.supabase,
        validated.settings.organizationId,
        callLogId,
        {
          aiSummaries: {
            ...existingAiSummaries,
            live_recording_requested: true,
            live_recording_call_control_id: call.callControlId,
          },
        }
      );
    } catch (error) {
      await updateAiReceptionistCallLog(
        context.supabase,
        validated.settings.organizationId,
        callLogId,
        {
          callStatus: "realtime-recording-failed",
          notificationStatus: "failed",
          notificationError:
            error instanceof Error && error.message.trim()
              ? error.message
              : "Unable to record the live AI conversation.",
        }
      );

      return jsonResult(
        { ok: false, error: "Unable to start live call recording." },
        502
      );
    }
  }

  if (shouldFallbackToVoicemail) {
    const originalCall: TelnyxCall = {
      ...call,
      callControlId: callLogId,
      parentCallControlId: "",
    };

    try {
      await startTelnyxVoicemailGreeting({
        settings: validated.settings,
        call: originalCall,
        fetchImpl: context.fetchImpl,
      });
      await updateAiReceptionistCallLog(
        context.supabase,
        validated.settings.organizationId,
        callLogId,
        {
          callType: "voicemail",
          callStatus: "live-ai-fallback",
          outcome: "transcription_pending",
          endedAt: null,
          aiSummaries: {
            live_ai_status: "openai_not_accepted",
            live_ai_error:
              "OpenAI did not accept the transferred SIP call before the target leg ended.",
            telnyx_hangup_cause: getFirstText(call.rawPayload, [
              "hangup_cause",
            ]),
            telnyx_hangup_source: getFirstText(call.rawPayload, [
              "hangup_source",
            ]),
            telnyx_sip_hangup_cause: getFirstText(call.rawPayload, [
              "sip_hangup_cause",
            ]),
          },
        }
      );
      return jsonResult({ ok: true, fallback: "voicemail" });
    } catch (error) {
      await updateAiReceptionistCallLog(
        context.supabase,
        validated.settings.organizationId,
        callLogId,
        {
          notificationStatus: "failed",
          notificationError:
            error instanceof Error && error.message.trim()
              ? error.message
              : "Unable to start voicemail after the live AI transfer failed.",
        }
      );
      return jsonResult(
        { ok: false, error: "Unable to start the voicemail fallback." },
        502
      );
    }
  }

  return jsonResult({ ok: true });
}

export async function handleTelnyxWebhook(
  context: TelnyxWebhookContext
): Promise<IncomingCallResult | RecordingCompleteResult> {
  const eventType = getTelnyxWebhookEventType(context.rawBody);

  if (
    eventType === "call.initiated" &&
    !getParentCallControlIdFromTelnyxWebhook(context.rawBody)
  ) {
    return handleTelnyxIncomingCall(context);
  }

  if (eventType === "call.speak.ended") {
    return handleTelnyxSpeakEnded(context);
  }

  if (
    eventType === "call.recording.saved" ||
    eventType === "call.recording.transcription.saved" ||
    eventType === "call.recording.error"
  ) {
    return handleTelnyxRecordingComplete(context);
  }

  return handleTelnyxCallStatus(context);
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
