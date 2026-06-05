import crypto from "node:crypto";
import type { AiReceptionistPrivateSettings } from "@/lib/ai-receptionist-settings";

export type TwilioWebhookParams = URLSearchParams;

export type TwilioRecordingCallback = {
  callSid: string;
  accountSid: string;
  callerNumber: string;
  twilioPhoneNumber: string;
  recordingUrl: string;
  recordingSid: string;
  durationSeconds: number | null;
  transcript: string;
  transcriptionStatus: string;
  callStatus: string;
  rawPayload: Record<string, string>;
};

export type TwilioCallStatusCallback = {
  callSid: string;
  accountSid: string;
  callerNumber: string;
  twilioPhoneNumber: string;
  callStatus: string;
  rawPayload: Record<string, string>;
};

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

function getText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderTemplate(value: string, settings: AiReceptionistPrivateSettings) {
  return value.replace(
    /{{\s*business_name\s*}}/g,
    settings.businessName || "the business"
  );
}

function paramsToSortedPairs(params: TwilioWebhookParams) {
  return [...params.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    const keyComparison = leftKey.localeCompare(rightKey);
    return keyComparison === 0 ? leftValue.localeCompare(rightValue) : keyComparison;
  });
}

export function parseTwilioFormBody(body: string): TwilioWebhookParams {
  return new URLSearchParams(body);
}

export function twilioParamsToRecord(params: TwilioWebhookParams) {
  return Object.fromEntries(params.entries());
}

export function buildTwilioSignature(url: string, params: TwilioWebhookParams, authToken: string) {
  const signatureBase = paramsToSortedPairs(params).reduce(
    (body, [key, value]) => `${body}${key}${value}`,
    url
  );

  return crypto
    .createHmac("sha1", authToken)
    .update(signatureBase)
    .digest("base64");
}

export function validateTwilioSignature(options: {
  url: string;
  params: TwilioWebhookParams;
  authToken: string;
  signature: string;
}) {
  const expectedSignature = buildTwilioSignature(
    options.url,
    options.params,
    options.authToken
  );
  const provided = Buffer.from(options.signature);
  const expected = Buffer.from(expectedSignature);

  return (
    provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected)
  );
}

export function buildIncomingCallTwiML(options: {
  settings: AiReceptionistPrivateSettings;
  recordingCallbackUrl: string;
  callStatusCallbackUrl: string;
}) {
  const greeting = renderTemplate(
    options.settings.greetingMessage,
    options.settings
  );
  const consent = renderTemplate(options.settings.consentMessage, options.settings);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Say>${xmlEscape(greeting)}</Say>`,
    "  <Pause length=\"1\" />",
    `  <Say>${xmlEscape(consent)}</Say>`,
    "  <Pause length=\"1\" />",
    "  <Say>Please leave your name, phone number, address, and a short description of the work after the tone. When you are finished, hang up.</Say>",
    `  <Record playBeep="true" maxLength="300" timeout="8" trim="trim-silence" recordingStatusCallback="${xmlEscape(options.recordingCallbackUrl)}" recordingStatusCallbackMethod="POST" transcribe="true" transcribeCallback="${xmlEscape(options.recordingCallbackUrl)}" />`,
    "  <Say>Thanks. Your message has been saved.</Say>",
    "</Response>",
  ].join("\n");
}

export function buildRealtimeIncomingCallTwiML(options: {
  settings: AiReceptionistPrivateSettings;
  mediaStreamUrl: string;
  callStatusCallbackUrl: string;
}) {
  const greeting = renderTemplate(
    options.settings.greetingMessage,
    options.settings
  );
  const consent = renderTemplate(options.settings.consentMessage, options.settings);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Say>${xmlEscape(greeting)}</Say>`,
    "  <Pause length=\"1\" />",
    `  <Say>${xmlEscape(consent)}</Say>`,
    "  <Connect>",
    `    <Stream url="${xmlEscape(options.mediaStreamUrl)}">`,
    `      <Parameter name="organization_id" value="${xmlEscape(
      options.settings.organizationId
    )}" />`,
    `      <Parameter name="call_status_callback_url" value="${xmlEscape(
      options.callStatusCallbackUrl
    )}" />`,
    "      <Parameter name=\"provider\" value=\"twilio\" />",
    "      <Parameter name=\"mode\" value=\"realtime\" />",
    "    </Stream>",
    "  </Connect>",
    "</Response>",
  ].join("\n");
}

function getDurationSeconds(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? Math.round(numericValue)
    : null;
}

export function normalizeTwilioRecordingCallback(
  params: TwilioWebhookParams
): TwilioRecordingCallback {
  const recordingUrl = getText(params.get("RecordingUrl"));
  const transcript =
    getText(params.get("TranscriptionText")) ||
    getText(params.get("transcription_text")) ||
    getText(params.get("Transcript"));

  return {
    callSid: getText(params.get("CallSid")),
    accountSid: getText(params.get("AccountSid")),
    callerNumber: getText(params.get("From")) || getText(params.get("Caller")),
    twilioPhoneNumber: getText(params.get("To")) || getText(params.get("Called")),
    recordingUrl,
    recordingSid: getText(params.get("RecordingSid")),
    durationSeconds: getDurationSeconds(
      getText(params.get("RecordingDuration")) ||
        getText(params.get("Duration")) ||
        getText(params.get("CallDuration"))
    ),
    transcript,
    transcriptionStatus:
      getText(params.get("TranscriptionStatus")) ||
      (transcript ? "completed" : ""),
    callStatus:
      getText(params.get("CallStatus")) ||
      getText(params.get("RecordingStatus")) ||
      "",
    rawPayload: twilioParamsToRecord(params),
  };
}

export function normalizeTwilioCallStatusCallback(
  params: TwilioWebhookParams
): TwilioCallStatusCallback {
  return {
    callSid: getText(params.get("CallSid")),
    accountSid: getText(params.get("AccountSid")),
    callerNumber: getText(params.get("From")) || getText(params.get("Caller")),
    twilioPhoneNumber: getText(params.get("To")) || getText(params.get("Called")),
    callStatus: getText(params.get("CallStatus")),
    rawPayload: twilioParamsToRecord(params),
  };
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
  const labelled = extractLabelledValue(transcript, [
    "name",
    "my name",
    "customer name",
  ]);

  if (labelled) {
    return labelled;
  }

  return (
    transcript.match(/\b(?:my name is|i am|i'm|this is)\s+([a-z][a-z' -]{1,50})/i)?.[1]?.trim() ??
    ""
  );
}

function inferAddress(transcript: string) {
  const labelled = extractLabelledValue(transcript, [
    "address",
    "property address",
    "site address",
  ]);

  if (labelled) {
    return labelled;
  }

  return (
    transcript.match(
      /\b\d{1,5}\s+[a-z0-9' -]+\s+(?:street|st|road|rd|avenue|ave|drive|dr|lane|ln|close|court|place|gardens|crescent|terrace|way|view|park)\b[^.\n]*/i
    )?.[0]?.trim() ?? ""
  );
}

function inferServiceRequired(transcript: string) {
  return SERVICE_KEYWORDS.find(([pattern]) => pattern.test(transcript))?.[1] ?? "";
}

function buildAiSummary(transcript: string, callerNumber: string) {
  if (!transcript.trim()) {
    return callerNumber
      ? `Voicemail received from ${callerNumber}. Transcript is not available yet.`
      : "Voicemail received. Transcript is not available yet.";
  }

  return transcript.length > 240
    ? `${transcript.slice(0, 237).trim()}...`
    : transcript.trim();
}

export function buildVoicemailLeadPayload(options: {
  recording: TwilioRecordingCallback;
  settings: AiReceptionistPrivateSettings;
}) {
  const transcript = options.recording.transcript.trim();
  const fallbackDescription = options.recording.recordingUrl
    ? "Voicemail recording received. Transcript is not available yet."
    : "AI Receptionist voicemail received.";
  const jobDescription = transcript || fallbackDescription;
  const callerNumber = options.recording.callerNumber;

  return {
    customer_name: inferName(transcript),
    phone: callerNumber,
    caller_phone: callerNumber,
    address: inferAddress(transcript),
    service_required: inferServiceRequired(transcript),
    job_description: jobDescription,
    ai_summary: buildAiSummary(transcript, callerNumber),
    transcript,
    recording_url: options.recording.recordingUrl || undefined,
    call_duration_seconds: options.recording.durationSeconds ?? undefined,
    source: options.settings.leadSourceLabel || "AI Receptionist",
    twilio_call_sid: options.recording.callSid,
    twilio_recording_sid: options.recording.recordingSid,
  };
}
