import { buildOpenAiInputAudioAppendEvent } from "@/lib/ai-receptionist/realtime/openai";

export type TwilioMediaStreamStartEvent = {
  event: "start";
  streamSid: string;
  start: {
    callSid?: string;
    accountSid?: string;
    customParameters?: Record<string, string>;
  };
};

export type TwilioMediaStreamMediaEvent = {
  event: "media";
  streamSid: string;
  media: {
    payload: string;
    timestamp?: string;
  };
};

export type TwilioMediaStreamStopEvent = {
  event: "stop";
  streamSid: string;
  stop?: {
    callSid?: string;
    accountSid?: string;
  };
};

export type TwilioMediaStreamEvent =
  | TwilioMediaStreamStartEvent
  | TwilioMediaStreamMediaEvent
  | TwilioMediaStreamStopEvent;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeTwilioMediaStreamEvent(
  value: unknown
): TwilioMediaStreamEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  const event = getText(value.event);
  const streamSid = getText(value.streamSid);

  if (!streamSid) {
    return null;
  }

  if (event === "start" && isRecord(value.start)) {
    const start = value.start;
    const customParameters = isRecord(start.customParameters)
      ? Object.fromEntries(
          Object.entries(start.customParameters)
            .map(([key, entry]) => [key, getText(entry)])
            .filter(([, entry]) => entry)
        )
      : {};

    return {
      event: "start",
      streamSid,
      start: {
        callSid: getText(start.callSid) || undefined,
        accountSid: getText(start.accountSid) || undefined,
        customParameters,
      },
    };
  }

  if (event === "media" && isRecord(value.media)) {
    const payload = getText(value.media.payload);

    if (!payload) {
      return null;
    }

    return {
      event: "media",
      streamSid,
      media: {
        payload,
        timestamp: getText(value.media.timestamp) || undefined,
      },
    };
  }

  if (event === "stop") {
    return {
      event: "stop",
      streamSid,
      stop: isRecord(value.stop)
        ? {
            callSid: getText(value.stop.callSid) || undefined,
            accountSid: getText(value.stop.accountSid) || undefined,
          }
        : undefined,
    };
  }

  return null;
}

export function buildOpenAiAudioAppendEventFromTwilio(
  event: TwilioMediaStreamMediaEvent
) {
  return buildOpenAiInputAudioAppendEvent(event.media.payload);
}

export function buildTwilioMediaEventFromOpenAiDelta(options: {
  streamSid: string;
  delta: string;
}) {
  return {
    event: "media",
    streamSid: options.streamSid,
    media: {
      payload: options.delta,
    },
  };
}

export function buildTwilioClearAudioEvent(streamSid: string) {
  return {
    event: "clear",
    streamSid,
  };
}
