import type {
  SupabaseClient,
} from "@supabase/supabase-js";
import type {
  CustomerLead,
  CustomerLeadActivity,
  CustomerLeadSource,
  CustomerType,
} from "@/components/jobs/types";
import { buildCustomerLeadFromPayload } from "@/lib/customer-leads";
import { mapCustomerLeadToWriteRow } from "@/lib/supabase/customer-leads-data";

export const AI_RECEPTIONIST_SOURCE: CustomerLeadSource = "ai_receptionist";
export const AI_RECEPTIONIST_SOURCE_LABEL = "AI Receptionist";
export const AI_RECEPTIONIST_ACTIVITY_TYPE = "ai_receptionist_call";

export type AiReceptionistCallMetadata = {
  ai_summary?: string;
  ai_summary_short?: string;
  ai_summary_medium?: string;
  ai_summary_detailed?: string;
  transcript?: string;
  transcript_entries?: unknown[];
  recording_id?: string;
  recording_url?: string;
  recording_status?: string;
  provider?: string;
  call_duration_seconds?: number;
  caller_phone?: string;
  call_outcome?: string;
  priority?: string;
  urgency?: string;
  emergency_detected?: boolean;
  emergency_keywords?: string[];
  created_by: string;
};

type BuildAiReceptionistLeadOptions = {
  fallbackId?: string;
  activityId?: string;
};

export type BuildAiReceptionistLeadResult =
  | {
      ok: true;
      lead: CustomerLead;
    }
  | {
      ok: false;
      error: string;
    };

export type CreateAiReceptionistLeadResult =
  | {
      ok: true;
      lead: CustomerLead;
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

const NAME_KEYS = ["customer_name", "customerName", "name"];
const PHONE_KEYS = ["phone", "phone_number", "phoneNumber", "telephone"];
const EMAIL_KEYS = ["email", "email_address", "emailAddress"];
const ADDRESS_KEYS = ["address", "site_address", "siteAddress"];
const TOWN_KEYS = ["town", "city"];
const POSTCODE_KEYS = ["postcode", "post_code", "postCode"];
const CUSTOMER_TYPE_KEYS = ["customer_type", "customerType"];
const SERVICE_KEYS = ["service_required", "serviceRequired", "service"];
const JOB_DESCRIPTION_KEYS = [
  "job_description",
  "jobDescription",
  "message",
  "notes",
  "details",
];
const AI_SUMMARY_KEYS = ["ai_summary", "aiSummary", "summary"];
const AI_SUMMARY_SHORT_KEYS = ["ai_summary_short", "aiSummaryShort", "short_summary"];
const AI_SUMMARY_MEDIUM_KEYS = [
  "ai_summary_medium",
  "aiSummaryMedium",
  "medium_summary",
];
const AI_SUMMARY_DETAILED_KEYS = [
  "ai_summary_detailed",
  "aiSummaryDetailed",
  "detailed_summary",
];
const TRANSCRIPT_KEYS = ["transcript", "call_transcript", "callTranscript"];
const TRANSCRIPT_ENTRIES_KEYS = ["transcript_entries", "transcriptEntries"];
const RECORDING_ID_KEYS = ["recording_id", "recordingId", "call_sid", "callSid"];
const RECORDING_URL_KEYS = ["recording_url", "recordingUrl"];
const RECORDING_STATUS_KEYS = ["recording_status", "recordingStatus", "transcription_status", "transcriptionStatus"];
const PROVIDER_KEYS = ["provider", "telephony_provider", "telephonyProvider"];
const CALL_DURATION_KEYS = [
  "call_duration_seconds",
  "callDurationSeconds",
  "duration_seconds",
  "durationSeconds",
];
const CALLER_PHONE_KEYS = ["caller_phone", "callerPhone", ...PHONE_KEYS];
const CALL_OUTCOME_KEYS = ["call_outcome", "callOutcome", "outcome"];
const PRIORITY_KEYS = ["priority", "lead_priority", "leadPriority"];
const URGENCY_KEYS = ["urgency"];
const EMERGENCY_DETECTED_KEYS = ["emergency_detected", "emergencyDetected"];
const EMERGENCY_KEYWORDS_KEYS = ["emergency_keywords", "emergencyKeywords"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizePayloadValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map(normalizePayloadValue);
  }

  return value;
}

function normalizePayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      normalizePayloadValue(value),
    ])
  );
}

function getTextValues(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmedValue = value.trim();
    return trimmedValue ? [trimmedValue] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(getTextValues);
  }

  return [];
}

function getRawTextValues(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(getRawTextValues);
  }

  return [];
}

function getFirstText(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = getTextValues(payload[key])[0];

    if (value) {
      return value;
    }
  }

  return undefined;
}

function getFirstRawText(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = getRawTextValues(payload[key])[0];

    if (value) {
      return value;
    }
  }

  return undefined;
}

function getFirstArray(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return payload[key] as unknown[];
    }
  }

  return undefined;
}

function getFirstBoolean(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      if (["true", "yes", "1"].includes(value.trim().toLowerCase())) {
        return true;
      }

      if (["false", "no", "0"].includes(value.trim().toLowerCase())) {
        return false;
      }
    }
  }

  return undefined;
}

function setTextValue(
  payload: Record<string, unknown>,
  key: string,
  value: string | undefined
) {
  if (value) {
    payload[key] = value;
  }
}

function normalizeCustomerType(value: string | undefined): CustomerType | undefined {
  const normalizedValue = value?.toLowerCase();

  if (normalizedValue?.includes("commercial")) {
    return "Commercial";
  }

  if (normalizedValue?.includes("residential")) {
    return "Residential";
  }

  return undefined;
}

function getCallDurationSeconds(payload: Record<string, unknown>) {
  const value = CALL_DURATION_KEYS.map((key) => payload[key]).find(
    (entry) => entry !== undefined && entry !== null && entry !== ""
  );

  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number(value.trim());

    if (Number.isFinite(parsedValue) && parsedValue >= 0) {
      return Math.round(parsedValue);
    }
  }

  return undefined;
}

function normalizeRecordingUrl(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function formatAiReceptionistCallDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s`;
}

function buildAiReceptionistCallMetadata(
  payload: Record<string, unknown>,
  callerPhone: string | undefined
): AiReceptionistCallMetadata {
  const metadata: AiReceptionistCallMetadata = {
    created_by: AI_RECEPTIONIST_SOURCE_LABEL,
  };
  const aiSummary = getFirstText(payload, AI_SUMMARY_KEYS);
  const aiSummaryShort = getFirstText(payload, AI_SUMMARY_SHORT_KEYS);
  const aiSummaryMedium = getFirstText(payload, AI_SUMMARY_MEDIUM_KEYS);
  const aiSummaryDetailed = getFirstRawText(payload, AI_SUMMARY_DETAILED_KEYS);
  const transcript = getFirstRawText(payload, TRANSCRIPT_KEYS);
  const transcriptEntries = getFirstArray(payload, TRANSCRIPT_ENTRIES_KEYS);
  const recordingId = getFirstText(payload, RECORDING_ID_KEYS);
  const recordingUrl = normalizeRecordingUrl(
    getFirstText(payload, RECORDING_URL_KEYS)
  );
  const recordingStatus = getFirstText(payload, RECORDING_STATUS_KEYS);
  const provider = getFirstText(payload, PROVIDER_KEYS);
  const callDurationSeconds = getCallDurationSeconds(payload);
  const payloadCallerPhone = getFirstText(payload, CALLER_PHONE_KEYS);
  const callOutcome = getFirstText(payload, CALL_OUTCOME_KEYS);
  const priority = getFirstText(payload, PRIORITY_KEYS);
  const urgency = getFirstText(payload, URGENCY_KEYS);
  const emergencyDetected = getFirstBoolean(payload, EMERGENCY_DETECTED_KEYS);
  const emergencyKeywords = getFirstArray(payload, EMERGENCY_KEYWORDS_KEYS)
    ?.map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (aiSummary) {
    metadata.ai_summary = aiSummary;
  }

  if (aiSummaryShort) {
    metadata.ai_summary_short = aiSummaryShort;
  }

  if (aiSummaryMedium) {
    metadata.ai_summary_medium = aiSummaryMedium;
  }

  if (aiSummaryDetailed) {
    metadata.ai_summary_detailed = aiSummaryDetailed;
  }

  if (transcript) {
    metadata.transcript = transcript;
  }

  if (transcriptEntries) {
    metadata.transcript_entries = transcriptEntries;
  }

  if (recordingId) {
    metadata.recording_id = recordingId;
  }

  if (recordingUrl) {
    metadata.recording_url = recordingUrl;
  }

  if (recordingStatus) {
    metadata.recording_status = recordingStatus;
  }

  if (provider) {
    metadata.provider = provider;
  }

  if (callDurationSeconds !== undefined) {
    metadata.call_duration_seconds = callDurationSeconds;
  }

  if (payloadCallerPhone || callerPhone) {
    metadata.caller_phone = payloadCallerPhone ?? callerPhone;
  }

  if (callOutcome) {
    metadata.call_outcome = callOutcome;
  }

  if (priority) {
    metadata.priority = priority;
  }

  if (urgency) {
    metadata.urgency = urgency;
  }

  if (emergencyDetected !== undefined) {
    metadata.emergency_detected = emergencyDetected;
  }

  if (emergencyKeywords?.length) {
    metadata.emergency_keywords = emergencyKeywords;
  }

  return metadata;
}

function buildAiReceptionistActivityDetail(
  metadata: AiReceptionistCallMetadata
) {
  const sections = [
    metadata.ai_summary ? `AI summary:\n${metadata.ai_summary}` : "",
    metadata.ai_summary_short
      ? `Short summary:\n${metadata.ai_summary_short}`
      : "",
    metadata.ai_summary_detailed
      ? `Detailed summary:\n${metadata.ai_summary_detailed}`
      : "",
    metadata.call_duration_seconds !== undefined
      ? `Call duration: ${formatAiReceptionistCallDuration(
          metadata.call_duration_seconds
        )}`
      : "",
    metadata.caller_phone ? `Phone: ${metadata.caller_phone}` : "",
    metadata.priority ? `Priority: ${metadata.priority}` : "",
    metadata.call_outcome ? `Outcome: ${metadata.call_outcome}` : "",
    metadata.emergency_detected ? "Emergency detected." : "",
    metadata.transcript ? "Transcript captured." : "",
    metadata.recording_status?.toLowerCase() === "failed"
      ? "Transcription failed."
      : "",
    metadata.recording_id ? "Recording available." : "",
    metadata.recording_url ? `Recording URL: ${metadata.recording_url}` : "",
    metadata.created_by ? `Created by: ${metadata.created_by}` : "",
  ].filter(Boolean);

  return sections.length > 0
    ? sections.join("\n\n")
    : "Lead captured by AI Receptionist.";
}

function getOptionalMetadataText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getOptionalMetadataNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : undefined;
}

function getOptionalMetadataBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function getOptionalMetadataStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
    : undefined;
}

export function getAiReceptionistCallMetadata(activity: {
  type?: string;
  metadata?: Record<string, unknown>;
}): AiReceptionistCallMetadata | null {
  if (
    activity.type !== AI_RECEPTIONIST_ACTIVITY_TYPE ||
    !activity.metadata ||
    typeof activity.metadata !== "object" ||
    Array.isArray(activity.metadata)
  ) {
    return null;
  }

  return {
    ai_summary: getOptionalMetadataText(activity.metadata.ai_summary),
    ai_summary_short: getOptionalMetadataText(
      activity.metadata.ai_summary_short
    ),
    ai_summary_medium: getOptionalMetadataText(
      activity.metadata.ai_summary_medium
    ),
    ai_summary_detailed: getOptionalMetadataText(
      activity.metadata.ai_summary_detailed
    ),
    transcript: getOptionalMetadataText(activity.metadata.transcript),
    transcript_entries: Array.isArray(activity.metadata.transcript_entries)
      ? activity.metadata.transcript_entries
      : undefined,
    recording_id: getOptionalMetadataText(activity.metadata.recording_id),
    recording_url: normalizeRecordingUrl(
      getOptionalMetadataText(activity.metadata.recording_url)
    ),
    recording_status: getOptionalMetadataText(activity.metadata.recording_status),
    provider: getOptionalMetadataText(activity.metadata.provider),
    call_duration_seconds: getOptionalMetadataNumber(
      activity.metadata.call_duration_seconds
    ),
    caller_phone: getOptionalMetadataText(activity.metadata.caller_phone),
    call_outcome: getOptionalMetadataText(activity.metadata.call_outcome),
    priority: getOptionalMetadataText(activity.metadata.priority),
    urgency: getOptionalMetadataText(activity.metadata.urgency),
    emergency_detected: getOptionalMetadataBoolean(
      activity.metadata.emergency_detected
    ),
    emergency_keywords: getOptionalMetadataStringArray(
      activity.metadata.emergency_keywords
    ),
    created_by:
      getOptionalMetadataText(activity.metadata.created_by) ??
      AI_RECEPTIONIST_SOURCE_LABEL,
  };
}

function buildLeadBuilderPayload(payload: Record<string, unknown>) {
  const normalizedPayload = normalizePayload(payload);
  const customerName = getFirstText(normalizedPayload, NAME_KEYS);
  const phone = getFirstText(normalizedPayload, PHONE_KEYS);
  const email = getFirstText(normalizedPayload, EMAIL_KEYS);
  const address = getFirstText(normalizedPayload, ADDRESS_KEYS);
  const town = getFirstText(normalizedPayload, TOWN_KEYS);
  const postcode = getFirstText(normalizedPayload, POSTCODE_KEYS);
  const customerType = normalizeCustomerType(
    getFirstText(normalizedPayload, CUSTOMER_TYPE_KEYS)
  );
  const serviceRequired = getFirstText(normalizedPayload, SERVICE_KEYS);
  const jobDescription = getFirstText(normalizedPayload, JOB_DESCRIPTION_KEYS);
  const priority = getFirstText(normalizedPayload, PRIORITY_KEYS);
  const urgency = getFirstText(normalizedPayload, URGENCY_KEYS);
  const leadPayload: Record<string, unknown> = {
    ...normalizedPayload,
    source: AI_RECEPTIONIST_SOURCE,
  };

  setTextValue(leadPayload, "name", customerName);
  setTextValue(leadPayload, "customerName", customerName);
  setTextValue(leadPayload, "phone", phone);
  setTextValue(leadPayload, "email", email);
  setTextValue(leadPayload, "address", address);
  setTextValue(leadPayload, "town", town);
  setTextValue(leadPayload, "postcode", postcode);
  setTextValue(leadPayload, "service", serviceRequired);
  setTextValue(leadPayload, "serviceRequired", serviceRequired);
  setTextValue(leadPayload, "jobDescription", jobDescription);
  setTextValue(leadPayload, "message", jobDescription);
  setTextValue(leadPayload, "notes", jobDescription);

  if (customerType) {
    leadPayload.customerType = customerType;
  }

  return {
    leadPayload,
    customerName,
    phone,
    email,
    address,
    town,
    postcode,
    customerType,
    serviceRequired,
    jobDescription,
    priority,
    urgency,
  };
}

export function buildAiReceptionistLeadFromPayload(
  payload: unknown,
  options: BuildAiReceptionistLeadOptions = {}
): BuildAiReceptionistLeadResult {
  if (!isRecord(payload)) {
    return {
      ok: false,
      error: "Send a JSON object.",
    };
  }

  const {
    leadPayload,
    customerName,
    phone,
    email,
    address,
    town,
    postcode,
    customerType,
    serviceRequired,
    jobDescription,
    priority,
    urgency,
  } = buildLeadBuilderPayload(payload);

  if (!customerName && !phone) {
    return {
      ok: false,
      error: "Add a customer name or phone number.",
    };
  }

  const lead = buildCustomerLeadFromPayload(leadPayload, options.fallbackId);
  const metadata = buildAiReceptionistCallMetadata(payload, phone);
  const activity: CustomerLeadActivity = {
    id: options.activityId ?? crypto.randomUUID(),
    type: AI_RECEPTIONIST_ACTIVITY_TYPE,
    occurredAt: lead.submittedAt,
    title: "AI Receptionist Call",
    detail: buildAiReceptionistActivityDetail(metadata),
    metadata,
  };

  return {
    ok: true,
    lead: {
      ...lead,
      source: AI_RECEPTIONIST_SOURCE,
      status: "new",
      name: customerName ?? lead.name,
      email: email ?? lead.email,
      phone: phone ?? lead.phone,
      address: address ?? lead.address,
      town: town ?? lead.town,
      postcode: postcode ?? lead.postcode,
      customerType: customerType ?? lead.customerType,
      service: serviceRequired ?? lead.service,
      message: jobDescription ?? lead.message,
      notes: jobDescription ?? lead.notes,
      extractedData: {
        ...lead.extractedData,
        name: customerName ?? lead.extractedData.name,
        email: email ?? lead.extractedData.email,
        phone: phone ?? lead.extractedData.phone,
        address: address ?? lead.extractedData.address,
        town: town ?? lead.extractedData.town,
        postcode: postcode ?? lead.extractedData.postcode,
        customerType: customerType ?? lead.extractedData.customerType,
        service: serviceRequired ?? lead.extractedData.service,
        notes: jobDescription ?? lead.extractedData.notes,
        priority:
          priority?.toLowerCase() === "high" ||
          urgency?.toLowerCase() === "high"
            ? "high"
            : lead.extractedData.priority,
        urgency: urgency ?? lead.extractedData.urgency,
      },
      activityHistory: [activity, ...lead.activityHistory].slice(0, 80),
    },
  };
}

export async function createAiReceptionistLeadFromPayload(options: {
  supabase: SupabaseClient;
  organizationId: string;
  payload: unknown;
  fallbackId?: string;
  activityId?: string;
}): Promise<CreateAiReceptionistLeadResult> {
  const result = buildAiReceptionistLeadFromPayload(options.payload, {
    fallbackId: options.fallbackId,
    activityId: options.activityId,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      status: 400,
    };
  }

  const { error } = await options.supabase.from("customer_leads").insert({
    ...mapCustomerLeadToWriteRow(result.lead),
    organization_id: options.organizationId,
  });

  if (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "";

    return {
      ok: false,
      error: error.message || "Unable to create the AI Receptionist lead.",
      status: code === "23503" ? 403 : 500,
    };
  }

  return {
    ok: true,
    lead: result.lead,
  };
}
