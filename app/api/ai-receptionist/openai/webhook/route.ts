import OpenAI from "openai";
import WebSocket from "ws";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  buildOpenAiRealtimeInitialGreetingEvent,
  getOpenAiRealtimeSipConfig,
} from "@/lib/ai-receptionist/realtime/openai-sip";
import { handleOpenAiRealtimeIncomingCall } from "@/lib/ai-receptionist/realtime/openai-sip-handler";

export const runtime = "nodejs";

function sendInitialGreeting(apiKey: string, callId: string) {
  return new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(
      `wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(callId)}`,
      {
        headers: {
          authorization: `Bearer ${apiKey}`,
        },
      }
    );
    let settled = false;
    const timeout = setTimeout(() => {
      finish(new Error("Timed out while waiting for the AI greeting audio."));
    }, 20_000);

    const finish = (error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (error) {
        socket.terminate();
        reject(error);
        return;
      }

      socket.close();
      resolve();
    };

    socket.once("open", () => {
      socket.send(
        JSON.stringify(buildOpenAiRealtimeInitialGreetingEvent()),
        (error) => {
          if (error) {
            finish(error);
          }
        }
      );
    });
    socket.on("message", (data) => {
      let event: {
        type?: unknown;
        error?: { message?: unknown };
        response?: { status?: unknown };
      };

      try {
        event = JSON.parse(data.toString()) as typeof event;
      } catch {
        return;
      }

      if (event.type === "error") {
        const message =
          typeof event.error?.message === "string"
            ? event.error.message
            : "OpenAI could not generate the opening greeting.";
        finish(new Error(message));
        return;
      }

      if (event.type === "response.done") {
        if (event.response?.status === "failed") {
          finish(new Error("OpenAI failed to complete the opening greeting."));
          return;
        }

        finish();
      }
    });
    socket.once("error", (error) => finish(error));
    socket.once("close", () => {
      if (!settled) {
        finish(new Error("OpenAI closed the greeting connection too early."));
      }
    });
  });
}

function liveAiCallsAreRetired() {
  return true;
}

export async function POST(request: Request) {
  if (liveAiCallsAreRetired()) {
    return Response.json(
      { error: "Live AI calls have been retired. Use the voicemail-to-lead flow." },
      { status: 410 }
    );
  }

  const config = getOpenAiRealtimeSipConfig();

  if (!config) {
    return Response.json(
      {
        error:
          "OpenAI Realtime SIP is not configured. Add the API key, project ID, and webhook secret.",
      },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const client = new OpenAI({
    apiKey: config.apiKey,
    project: config.projectId,
    webhookSecret: config.webhookSecret,
  });

  let event: Awaited<ReturnType<typeof client.webhooks.unwrap>>;

  try {
    event = await client.webhooks.unwrap(rawBody, request.headers);
  } catch (error) {
    console.error("Invalid OpenAI webhook signature.", error);
    return Response.json(
      { error: "Invalid OpenAI webhook signature." },
      { status: 400 }
    );
  }

  if (event.type !== "realtime.call.incoming") {
    return Response.json({ ok: true, ignored: event.type });
  }

  try {
    const response = await handleOpenAiRealtimeIncomingCall({
      supabase: createServiceRoleClient(),
      data: event.data,
      config,
      acceptCall: (callId, payload) =>
        client.realtime.calls.accept(callId, payload),
      rejectCall: (callId, statusCode) =>
        client.realtime.calls.reject(callId, {
          status_code: statusCode,
        }),
      sendInitialGreeting: (callId) =>
        sendInitialGreeting(config.apiKey, callId),
    });

    return Response.json(response.body, { status: response.status });
  } catch (error) {
    console.error("Unable to handle an OpenAI Realtime SIP call.", error);
    return Response.json(
      { error: "Unable to start the live AI conversation." },
      { status: 500 }
    );
  }
}
