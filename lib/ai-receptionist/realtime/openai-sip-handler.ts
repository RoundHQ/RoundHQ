import type { SupabaseClient } from "@supabase/supabase-js";
import { isCustomerFeatureEnabled } from "@/lib/customer-account";
import {
  getAiReceptionistCallLog,
  updateAiReceptionistCallLog,
} from "@/lib/ai-receptionist/call-logs";
import { findAiReceptionistSettingsForTelnyxWebhook } from "@/lib/ai-receptionist-private-settings";
import {
  buildOpenAiRealtimeCallAcceptPayload,
  getRoundHqCallReferenceFromSipHeaders,
  normalizeOpenAiRealtimeIncomingCall,
  type OpenAiRealtimeSipConfig,
} from "@/lib/ai-receptionist/realtime/openai-sip";

export type OpenAiRealtimeIncomingCallHandlerOptions = {
  supabase: SupabaseClient;
  data: unknown;
  config: OpenAiRealtimeSipConfig;
  acceptCall: (
    callId: string,
    payload: ReturnType<typeof buildOpenAiRealtimeCallAcceptPayload>
  ) => Promise<void>;
  rejectCall: (callId: string, statusCode: number) => Promise<void>;
  sendInitialGreeting?: (callId: string) => Promise<void>;
};

export type OpenAiRealtimeIncomingCallHandlerResult = {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
};

function result(body: Record<string, unknown>, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    body,
  };
}

async function rejectIncomingCall(
  rejectCall: OpenAiRealtimeIncomingCallHandlerOptions["rejectCall"],
  callId: string,
  statusCode = 603
) {
  try {
    await rejectCall(callId, statusCode);
  } catch (error) {
    console.error("Unable to reject an OpenAI Realtime SIP call.", error);
  }
}

export async function handleOpenAiRealtimeIncomingCall(
  options: OpenAiRealtimeIncomingCallHandlerOptions
): Promise<OpenAiRealtimeIncomingCallHandlerResult> {
  const incomingCall = normalizeOpenAiRealtimeIncomingCall(options.data);

  if (!incomingCall) {
    return result({ error: "The OpenAI incoming call is missing a call ID." }, 400);
  }

  const telnyxCallControlId = getRoundHqCallReferenceFromSipHeaders(
    incomingCall.sipHeaders
  );

  if (!telnyxCallControlId) {
    await rejectIncomingCall(options.rejectCall, incomingCall.callId);
    return result({
      ok: true,
      rejected: "missing-roundhq-call-reference",
    });
  }

  const settings = await findAiReceptionistSettingsForTelnyxWebhook(
    options.supabase,
    "",
    telnyxCallControlId
  );

  if (!settings || settings.telephonyProvider !== "telnyx") {
    await rejectIncomingCall(options.rejectCall, incomingCall.callId);
    return result({ ok: true, rejected: "unknown-call" });
  }

  const featureEnabled = await isCustomerFeatureEnabled(
    options.supabase,
    settings.organizationId,
    "aiReceptionist"
  );

  if (!featureEnabled || !settings.enabled || !settings.realtimeEnabled) {
    await rejectIncomingCall(options.rejectCall, incomingCall.callId);
    return result({ ok: true, rejected: "live-ai-disabled" });
  }

  const existingCall = await getAiReceptionistCallLog(
    options.supabase,
    settings.organizationId,
    telnyxCallControlId
  );

  if (existingCall?.session_id === incomingCall.callId) {
    return result({
      ok: true,
      duplicate: true,
      callId: incomingCall.callId,
    });
  }

  await options.acceptCall(
    incomingCall.callId,
    buildOpenAiRealtimeCallAcceptPayload(settings, options.config)
  );

  await updateAiReceptionistCallLog(
    options.supabase,
    settings.organizationId,
    telnyxCallControlId,
    {
      callType: "realtime",
      sessionId: incomingCall.callId,
      callStatus: "openai-accepted",
      answeredAt: new Date().toISOString(),
      outcome: "conversation_in_progress",
    }
  );

  if (options.sendInitialGreeting) {
    try {
      await options.sendInitialGreeting(incomingCall.callId);
    } catch (error) {
      console.error(
        "OpenAI accepted the call, but RoundHQ could not trigger the opening greeting.",
        error
      );
    }
  }

  return result({
    ok: true,
    accepted: true,
    callId: incomingCall.callId,
  });
}
