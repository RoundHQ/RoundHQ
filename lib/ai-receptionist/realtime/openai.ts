import type { AiReceptionistRealtimeSessionConfig } from "@/lib/ai-receptionist/realtime/session";

export type OpenAiRealtimeSessionUpdateEvent = {
  type: "session.update";
  session: {
    type: "realtime";
    instructions: string;
    audio: {
      input: {
        format: {
          type: "audio/pcmu";
        };
      };
      output: {
        format: {
          type: "audio/pcmu";
        };
        voice: string;
      };
    };
    turn_detection: {
      type: "server_vad";
      threshold: number;
      silence_duration_ms: number;
    };
  };
};

export function getOpenAiRealtimeModel(config: AiReceptionistRealtimeSessionConfig) {
  return config.model;
}

export function buildOpenAiRealtimeWebSocketUrl(options: {
  model?: string;
  callId?: string;
}) {
  const url = new URL("wss://api.openai.com/v1/realtime");

  if (options.callId?.trim()) {
    url.searchParams.set("call_id", options.callId.trim());
  } else {
    url.searchParams.set("model", options.model?.trim() || "gpt-realtime-2");
  }

  return url.toString();
}

export function buildOpenAiRealtimeSessionUpdateEvent(
  config: AiReceptionistRealtimeSessionConfig
): OpenAiRealtimeSessionUpdateEvent {
  return {
    type: "session.update",
    session: {
      type: "realtime",
      instructions: config.instructions,
      audio: {
        input: {
          format: {
            type: "audio/pcmu",
          },
        },
        output: {
          format: {
            type: "audio/pcmu",
          },
          voice: config.voice,
        },
      },
      turn_detection: {
        type: config.turnDetection.type,
        threshold: config.turnDetection.threshold,
        silence_duration_ms: config.turnDetection.silenceDurationMs,
      },
    },
  };
}

export function buildOpenAiInputAudioAppendEvent(base64Audio: string) {
  return {
    type: "input_audio_buffer.append",
    audio: base64Audio,
  };
}

export function buildOpenAiResponseCreateEvent() {
  return {
    type: "response.create",
  };
}

export function isOpenAiRealtimeAudioDeltaEvent(event: Record<string, unknown>) {
  return (
    event.type === "response.output_audio.delta" &&
    typeof event.delta === "string" &&
    event.delta.length > 0
  );
}
