import type {
  AiReceptionistPrivateSettings,
  AiReceptionistSettings,
} from "@/lib/ai-receptionist-settings";
import { buildAiReceptionistRealtimeSystemPrompt } from "@/lib/ai-receptionist/realtime/session";

const DEFAULT_OPENAI_REALTIME_MODEL = "gpt-realtime-2.1";
const DEFAULT_OPENAI_REALTIME_VOICE = "marin";
const ROUNDHQ_CALL_HEADER = "x-roundhq-call-id";
const USER_TO_USER_HEADER = "user-to-user";

export type OpenAiRealtimeSipConfig = {
  apiKey: string;
  projectId: string;
  webhookSecret: string;
  model: string;
  voice: string;
};

export type OpenAiRealtimeSipReadiness = {
  ready: boolean;
  apiKeyConfigured: boolean;
  apiKeyValid: boolean;
  projectIdConfigured: boolean;
  projectIdValid: boolean;
  webhookSecretConfigured: boolean;
};

export type OpenAiRealtimeIncomingCall = {
  callId: string;
  sipHeaders: Array<{
    name: string;
    value: string;
  }>;
};

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getOpenAiRealtimeSipReadiness(
  environment: NodeJS.ProcessEnv = process.env
): OpenAiRealtimeSipReadiness {
  const apiKey = getText(environment.OPENAI_API_KEY);
  const projectId = getText(environment.OPENAI_PROJECT_ID);
  const webhookSecret = getText(environment.OPENAI_WEBHOOK_SECRET);
  const apiKeyConfigured = Boolean(apiKey);
  const apiKeyValid = apiKey.startsWith("sk-");
  const projectIdConfigured = Boolean(projectId);
  const projectIdValid = projectId.startsWith("proj_");
  const webhookSecretConfigured = Boolean(webhookSecret);

  return {
    ready:
      apiKeyConfigured &&
      apiKeyValid &&
      projectIdConfigured &&
      projectIdValid &&
      webhookSecretConfigured,
    apiKeyConfigured,
    apiKeyValid,
    projectIdConfigured,
    projectIdValid,
    webhookSecretConfigured,
  };
}

export function getOpenAiRealtimeSipConfig(
  environment: NodeJS.ProcessEnv = process.env
): OpenAiRealtimeSipConfig | null {
  const apiKey = getText(environment.OPENAI_API_KEY);
  const projectId = getText(environment.OPENAI_PROJECT_ID);
  const webhookSecret = getText(environment.OPENAI_WEBHOOK_SECRET);
  const readiness = getOpenAiRealtimeSipReadiness(environment);

  if (!readiness.ready) {
    return null;
  }

  return {
    apiKey,
    projectId,
    webhookSecret,
    model:
      getText(environment.OPENAI_REALTIME_MODEL) ||
      DEFAULT_OPENAI_REALTIME_MODEL,
    voice:
      getText(environment.OPENAI_REALTIME_VOICE) ||
      DEFAULT_OPENAI_REALTIME_VOICE,
  };
}

export function buildOpenAiRealtimeSipUri(projectId: string) {
  const normalizedProjectId = projectId.trim();

  if (!normalizedProjectId.startsWith("proj_")) {
    throw new Error("A valid OpenAI project ID is required for SIP calls.");
  }

  return `sip:${normalizedProjectId}@sip.api.openai.com;transport=tls`;
}

export function encodeRoundHqCallReference(callControlId: string) {
  const normalizedCallControlId = callControlId.trim();

  if (!normalizedCallControlId) {
    throw new Error("A Telnyx call control ID is required.");
  }

  return `rhq.${Buffer.from(normalizedCallControlId, "utf8").toString(
    "base64url"
  )}`;
}

export function decodeRoundHqCallReference(value: string) {
  const normalizedValue = value.trim().split(";")[0]?.trim() ?? "";

  if (!normalizedValue.startsWith("rhq.")) {
    return "";
  }

  try {
    return Buffer.from(normalizedValue.slice(4), "base64url")
      .toString("utf8")
      .trim();
  } catch {
    return "";
  }
}

function normalizeSipHeaders(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((header) => {
      if (!header || typeof header !== "object" || Array.isArray(header)) {
        return null;
      }

      const candidate = header as Record<string, unknown>;
      const name = getText(candidate.name);
      const headerValue = getText(candidate.value);

      return name && headerValue ? { name, value: headerValue } : null;
    })
    .filter(
      (header): header is { name: string; value: string } => Boolean(header)
    );
}

export function normalizeOpenAiRealtimeIncomingCall(
  value: unknown
): OpenAiRealtimeIncomingCall | null {
  const candidate =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const callId = getText(candidate.call_id ?? candidate.callId);

  if (!callId) {
    return null;
  }

  return {
    callId,
    sipHeaders: normalizeSipHeaders(
      candidate.sip_headers ?? candidate.sipHeaders
    ),
  };
}

export function getRoundHqCallReferenceFromSipHeaders(
  headers: OpenAiRealtimeIncomingCall["sipHeaders"]
) {
  for (const preferredHeader of [
    ROUNDHQ_CALL_HEADER,
    USER_TO_USER_HEADER,
  ]) {
    const matchingHeader = headers.find(
      (header) => header.name.trim().toLowerCase() === preferredHeader
    );
    const reference = matchingHeader
      ? decodeRoundHqCallReference(matchingHeader.value)
      : "";

    if (reference) {
      return reference;
    }
  }

  return "";
}

export function buildOpenAiRealtimeCallAcceptPayload(
  settings: AiReceptionistPrivateSettings | AiReceptionistSettings,
  config: Pick<OpenAiRealtimeSipConfig, "model" | "voice">
) {
  return {
    type: "realtime" as const,
    model: config.model,
    instructions: buildAiReceptionistRealtimeSystemPrompt(settings),
    output_modalities: ["audio"] as Array<"audio">,
    max_output_tokens: 256,
    audio: {
      input: {
        turn_detection: {
          type: "server_vad" as const,
          threshold: 0.5,
          silence_duration_ms: 500,
          create_response: true,
          interrupt_response: true,
          idle_timeout_ms: 10_000,
        },
      },
      output: {
        voice: config.voice,
        speed: 1,
      },
    },
  };
}

export function buildOpenAiRealtimeInitialGreetingEvent() {
  return {
    type: "response.create" as const,
    response: {
      instructions:
        "Begin the phone call now. Deliver the configured opening line and recording consent naturally, then ask the first unanswered question. Keep this first turn brief.",
    },
  };
}
