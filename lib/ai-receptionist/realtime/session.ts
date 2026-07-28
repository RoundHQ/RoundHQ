import {
  AI_RECEPTIONIST_DAY_KEYS,
  type AiReceptionistDayKey,
  type AiReceptionistPrivateSettings,
  type AiReceptionistSettings,
} from "@/lib/ai-receptionist-settings";

export type AiReceptionistRealtimeSpeaker = "ai" | "caller" | "system";

export type AiReceptionistRealtimeTranscriptEntry = {
  speaker: AiReceptionistRealtimeSpeaker;
  text: string;
  atSeconds: number;
  timestamp?: string;
};

export type AiReceptionistLeadState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  service_required: string;
  job_description: string;
};

export type AiReceptionistEmergencySignal = {
  emergencyDetected: boolean;
  matchedKeywords: string[];
  priority: "normal" | "high";
};

export type AiReceptionistSummarySet = {
  short: string;
  medium: string;
  detailed: string;
};

export type AiReceptionistRealtimeSessionConfig = {
  type: "realtime";
  model: string;
  voice: string;
  instructions: string;
  inputAudioFormat: "g711_ulaw";
  outputAudioFormat: "g711_ulaw";
  turnDetection: {
    type: "server_vad";
    threshold: number;
    silenceDurationMs: number;
  };
};

const DAY_BY_INDEX: AiReceptionistDayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const DEFAULT_REALTIME_MODEL = "gpt-realtime-2.1";
const DEFAULT_REALTIME_VOICE = "marin";
const ADDITIONAL_EMERGENCY_KEYWORDS = [
  "dangerous tree",
  "fallen tree",
  "unsafe",
];
const SERVICE_KEYWORDS: Array<[RegExp, string]> = [
  [/\bhedge\b|\btrim(?:ming)?\b/i, "Hedge trimming"],
  [/\bgrass\b|\blawn\b|\bmow(?:ing)?\b|\bcut(?:ting)?\b/i, "Garden maintenance"],
  [/\bgutter\b/i, "Gutter cleaning"],
  [/\bpressure\b|\bjet\s*wash/i, "Pressure washing"],
  [/\bpvc\b|\bupvc\b|\bfascia\b|\bsoffit\b/i, "PVC cleaning"],
  [/\bturf\b/i, "Turf laying"],
  [/\bovergrown\b/i, "Overgrown garden"],
  [/\bgarden\b|\bmaintenance\b/i, "Garden maintenance"],
  [/\bclean(?:ing)?\b/i, "Cleaning"],
  [/\bquote\b|\bestimate\b/i, "Quote request"],
];

export function createEmptyAiReceptionistLeadState(): AiReceptionistLeadState {
  return {
    name: "",
    phone: "",
    email: "",
    address: "",
    service_required: "",
    job_description: "",
  };
}

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sentenceCase(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue
    ? `${trimmedValue[0].toUpperCase()}${trimmedValue.slice(1)}`
    : "";
}

function renderTemplate(value: string, settings: Pick<AiReceptionistSettings, "businessName">) {
  return value.replace(
    /{{\s*business_name\s*}}/g,
    settings.businessName || "the business"
  );
}

function parseMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

export function isAiReceptionistBusinessOpen(
  settings: Pick<AiReceptionistSettings, "businessHoursEnabled" | "businessHours">,
  now = new Date()
) {
  if (!settings.businessHoursEnabled) {
    return true;
  }

  const day = DAY_BY_INDEX[now.getDay()];
  const hours = settings.businessHours[day];

  if (!hours?.enabled) {
    return false;
  }

  const startMinutes = parseMinutes(hours.start);
  const endMinutes = parseMinutes(hours.end);

  if (startMinutes === null || endMinutes === null) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

export function buildAiReceptionistRealtimeSystemPrompt(
  settings: AiReceptionistPrivateSettings | AiReceptionistSettings,
  options: {
    now?: Date;
  } = {}
) {
  const businessName = settings.businessName || "this business";
  const questions = settings.questionsToAsk
    .map((question, index) => `${index + 1}. ${question}`)
    .join("\n");
  const emergencyKeywords = [
    ...settings.emergencyKeywords,
    ...ADDITIONAL_EMERGENCY_KEYWORDS,
  ]
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .join(", ");
  const isOpen = isAiReceptionistBusinessOpen(settings, options.now);
  const openingLine = isOpen
    ? renderTemplate(settings.greetingMessage, settings)
    : "Our office is currently closed, but I can take your details and someone will contact you.";

  return [
    `You are the AI virtual receptionist for ${businessName}.`,
    "",
    "Your job is to:",
    "- Greet callers warmly and professionally, and clearly identify yourself as an AI virtual receptionist in your first turn.",
    "- Deliver the recording and transcription consent message in your first turn.",
    "- Collect lead information for a gardening, landscaping, cleaning, or trades business.",
    "- Ask the configured questions naturally, only when the answer is not already known.",
    "- Keep responses short enough for a phone call.",
    "- Never invent services.",
    "- Never promise appointments.",
    "- Never provide prices unless they are explicitly configured in the caller context.",
    "- Before ending, briefly confirm the caller's name, contact number, address, and requested work when available.",
    "- If the caller describes immediate danger or a life-threatening emergency, say that you are not an emergency service and advise them to call 999 or 112. Do not promise an urgent response from the business.",
    "",
    `Opening line: ${openingLine}`,
    `Consent message: ${renderTemplate(settings.consentMessage, settings)}`,
    "",
    "Collect this structured data live:",
    JSON.stringify(createEmptyAiReceptionistLeadState(), null, 2),
    "",
    "Configured questions:",
    questions || "1. Can I take your name?",
    "",
    `Emergency keywords to watch: ${emergencyKeywords || "urgent, emergency"}`,
    "",
    "If an emergency keyword is detected without immediate danger, stay calm, collect the details, and mark the enquiry as high priority. Do not attempt a transfer or guarantee a response time.",
  ].join("\n");
}

export function buildAiReceptionistRealtimeSessionConfig(
  settings: AiReceptionistPrivateSettings | AiReceptionistSettings,
  options: {
    now?: Date;
    model?: string;
    voice?: string;
  } = {}
): AiReceptionistRealtimeSessionConfig {
  return {
    type: "realtime",
    model:
      options.model?.trim() ||
      process.env.OPENAI_REALTIME_MODEL?.trim() ||
      DEFAULT_REALTIME_MODEL,
    voice:
      options.voice?.trim() ||
      process.env.OPENAI_REALTIME_VOICE?.trim() ||
      DEFAULT_REALTIME_VOICE,
    instructions: buildAiReceptionistRealtimeSystemPrompt(settings, {
      now: options.now,
    }),
    inputAudioFormat: "g711_ulaw",
    outputAudioFormat: "g711_ulaw",
    turnDetection: {
      type: "server_vad",
      threshold: 0.5,
      silenceDurationMs: 450,
    },
  };
}

function extractLabelledValue(text: string, labels: string[]) {
  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escapedLabel}\\s*[:\\-]\\s*([^\\n.]+)`, "i");
    const match = text.match(pattern);

    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return "";
}

function inferName(text: string) {
  const labelled = extractLabelledValue(text, [
    "name",
    "customer name",
    "caller name",
  ]);

  if (labelled) {
    return labelled;
  }

  return (
    text.match(/\b(?:my name is|i am|i'm|this is|it's)\s+([a-z][a-z' -]{1,50})/i)?.[1]?.trim() ??
    ""
  );
}

function inferPhone(text: string) {
  return (
    text.match(/(?:\+?\d[\d\s().-]{6,}\d)/)?.[0]?.replace(/\s+/g, " ").trim() ??
    ""
  );
}

function inferEmail(text: string) {
  return text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0]?.trim() ?? "";
}

function inferAddress(text: string) {
  const labelled = extractLabelledValue(text, [
    "address",
    "property address",
    "site address",
  ]);

  if (labelled) {
    return labelled;
  }

  return (
    text.match(
      /\b\d{1,5}\s+[a-z0-9' -]+\s+(?:street|st|road|rd|avenue|ave|drive|dr|lane|ln|close|court|place|gardens|crescent|terrace|way|view|park)\b[^.\n]*/i
    )?.[0]?.trim() ?? ""
  );
}

function inferService(text: string) {
  const labelled = extractLabelledValue(text, [
    "service",
    "service required",
    "work required",
    "job",
  ]);

  if (labelled) {
    return labelled;
  }

  return SERVICE_KEYWORDS.find(([pattern]) => pattern.test(text))?.[1] ?? "";
}

export function updateAiReceptionistLeadStateFromTranscript(
  currentState: AiReceptionistLeadState,
  entry: Pick<AiReceptionistRealtimeTranscriptEntry, "speaker" | "text">
): AiReceptionistLeadState {
  if (entry.speaker !== "caller") {
    return currentState;
  }

  const text = entry.text.trim();

  if (!text) {
    return currentState;
  }

  const nextState = {
    ...currentState,
  };
  const inferredName = inferName(text);
  const inferredPhone = inferPhone(text);
  const inferredEmail = inferEmail(text);
  const inferredAddress = inferAddress(text);
  const inferredService = inferService(text);

  if (!nextState.name && inferredName) {
    nextState.name = sentenceCase(inferredName);
  }

  if (!nextState.phone && inferredPhone) {
    nextState.phone = inferredPhone;
  }

  if (!nextState.email && inferredEmail) {
    nextState.email = inferredEmail.toLowerCase();
  }

  if (!nextState.address && inferredAddress) {
    nextState.address = inferredAddress;
  }

  if (!nextState.service_required && inferredService) {
    nextState.service_required = inferredService;
  }

  nextState.job_description = [nextState.job_description, text]
    .filter(Boolean)
    .join(nextState.job_description ? "\n" : "");

  return nextState;
}

export function normalizeAiReceptionistLeadState(value: unknown) {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    name: getText(record.name || record.customer_name || record.customerName),
    phone: getText(record.phone || record.phone_number || record.phoneNumber),
    email: getText(record.email || record.email_address || record.emailAddress),
    address: getText(record.address || record.site_address || record.siteAddress),
    service_required: getText(
      record.service_required || record.serviceRequired || record.service
    ),
    job_description: getText(
      record.job_description ||
        record.jobDescription ||
        record.description ||
        record.notes
    ),
  };
}

export function reduceTranscriptToLeadState(
  entries: AiReceptionistRealtimeTranscriptEntry[],
  initialState = createEmptyAiReceptionistLeadState()
) {
  return entries.reduce(
    (state, entry) => updateAiReceptionistLeadStateFromTranscript(state, entry),
    initialState
  );
}

export function normalizeAiReceptionistTranscriptEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry): AiReceptionistRealtimeTranscriptEntry | null => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const speaker = getText(record.speaker).toLowerCase();
      const text = getText(record.text || record.message || record.transcript);
      const atSecondsValue =
        typeof record.atSeconds === "number"
          ? record.atSeconds
          : typeof record.at_seconds === "number"
            ? record.at_seconds
            : Number(record.atSeconds ?? record.at_seconds ?? record.offset ?? 0);

      if (!text || !["ai", "caller", "system"].includes(speaker)) {
        return null;
      }

      return {
        speaker: speaker as AiReceptionistRealtimeSpeaker,
        text,
        atSeconds: Number.isFinite(atSecondsValue)
          ? Math.max(0, Math.round(atSecondsValue))
          : 0,
        timestamp: getText(record.timestamp) || undefined,
      };
    })
    .filter((entry): entry is AiReceptionistRealtimeTranscriptEntry =>
      Boolean(entry)
    );
}

function formatTranscriptTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(
    2,
    "0"
  )}`;
}

function getTranscriptSpeakerLabel(speaker: AiReceptionistRealtimeSpeaker) {
  switch (speaker) {
    case "ai":
      return "AI";
    case "caller":
      return "Caller";
    default:
      return "System";
  }
}

export function formatAiReceptionistRealtimeTranscript(
  entries: AiReceptionistRealtimeTranscriptEntry[]
) {
  return entries
    .map((entry) =>
      [
        `[${formatTranscriptTime(entry.atSeconds)}]`,
        `${getTranscriptSpeakerLabel(entry.speaker)}:`,
        entry.text,
      ].join("\n")
    )
    .join("\n\n");
}

export function detectAiReceptionistEmergency(
  text: string,
  keywords: string[] = []
): AiReceptionistEmergencySignal {
  const normalizedText = text.toLowerCase();
  const matchedKeywords = Array.from(
    new Set(
      [...keywords, ...ADDITIONAL_EMERGENCY_KEYWORDS]
        .map((keyword) => keyword.trim().toLowerCase())
        .filter(Boolean)
        .filter((keyword) => normalizedText.includes(keyword))
    )
  );

  return {
    emergencyDetected: matchedKeywords.length > 0,
    matchedKeywords,
    priority: matchedKeywords.length > 0 ? "high" : "normal",
  };
}

export function hasSufficientAiReceptionistLeadInfo(
  state: AiReceptionistLeadState,
  transcript: string,
  callerPhone = ""
) {
  const hasContact = Boolean(state.name || state.phone || callerPhone);
  const hasWork = Boolean(
    state.service_required ||
      state.job_description ||
      transcript.replace(/\s+/g, " ").trim()
  );

  return hasContact && hasWork;
}

export function buildAiReceptionistSummaries(options: {
  state: AiReceptionistLeadState;
  transcript: string;
  emergency: AiReceptionistEmergencySignal;
}) {
  const service = options.state.service_required || "General enquiry";
  const name = options.state.name || "Caller";
  const description = options.state.job_description || options.transcript;
  const compactDescription = description.replace(/\s+/g, " ").trim();
  const short = compactDescription
    ? `${name} called about ${service.toLowerCase()}.`
    : `${name} called RoundHQ via the AI Receptionist.`;
  const medium = compactDescription
    ? `${name} needs ${service.toLowerCase()}. ${compactDescription.slice(
        0,
        260
      )}${compactDescription.length > 260 ? "..." : ""}`
    : short;
  const detailedSections = [
    `Caller: ${name}`,
    `Service: ${service}`,
    options.state.phone ? `Phone: ${options.state.phone}` : "",
    options.state.email ? `Email: ${options.state.email}` : "",
    options.state.address ? `Address: ${options.state.address}` : "",
    compactDescription ? `Details: ${compactDescription}` : "",
    options.emergency.emergencyDetected
      ? `Emergency keywords: ${options.emergency.matchedKeywords.join(", ")}`
      : "",
  ].filter(Boolean);

  return {
    short,
    medium,
    detailed: detailedSections.join("\n"),
  };
}

export function buildRealtimeLeadPayload(options: {
  settings: AiReceptionistPrivateSettings | AiReceptionistSettings;
  state: AiReceptionistLeadState;
  transcriptEntries: AiReceptionistRealtimeTranscriptEntry[];
  callerPhone?: string;
  callSid?: string;
  durationSeconds?: number | null;
  outcome?: string;
  recordingUrl?: string;
}) {
  const transcript = formatAiReceptionistRealtimeTranscript(
    options.transcriptEntries
  );
  const callerPhone = options.callerPhone?.trim() || options.state.phone;
  const emergency = detectAiReceptionistEmergency(
    transcript,
    options.settings.emergencyKeywords
  );
  const summaries = buildAiReceptionistSummaries({
    state: options.state,
    transcript,
    emergency,
  });

  return {
    customer_name: options.state.name,
    phone: options.state.phone || callerPhone,
    email: options.state.email,
    address: options.state.address,
    service_required: options.state.service_required,
    job_description: options.state.job_description || transcript,
    ai_summary: summaries.medium,
    ai_summary_short: summaries.short,
    ai_summary_medium: summaries.medium,
    ai_summary_detailed: summaries.detailed,
    transcript,
    transcript_entries: options.transcriptEntries,
    recording_url: options.recordingUrl || undefined,
    call_duration_seconds: options.durationSeconds ?? undefined,
    caller_phone: callerPhone,
    source: options.settings.leadSourceLabel || "AI Receptionist",
    twilio_call_sid: options.callSid,
    call_outcome: options.outcome,
    priority: emergency.priority,
    urgency: emergency.priority === "high" ? "high" : "normal",
    emergency_detected: emergency.emergencyDetected,
    emergency_keywords: emergency.matchedKeywords,
    created_by: "AI Receptionist",
    realtime_session: true,
  };
}

export { AI_RECEPTIONIST_DAY_KEYS };
