import type { SupabaseClient } from "@supabase/supabase-js";
import { createAiReceptionistLeadFromPayload } from "@/lib/ai-receptionist-leads";
import {
  updateAiReceptionistCallLog,
  upsertAiReceptionistCallLog,
} from "@/lib/ai-receptionist/call-logs";
import type { AiReceptionistPrivateSettings } from "@/lib/ai-receptionist-settings";
import {
  buildAiReceptionistRealtimeSessionConfig,
  buildAiReceptionistSummaries,
  buildRealtimeLeadPayload,
  createEmptyAiReceptionistLeadState,
  detectAiReceptionistEmergency,
  formatAiReceptionistRealtimeTranscript,
  hasSufficientAiReceptionistLeadInfo,
  normalizeAiReceptionistLeadState,
  normalizeAiReceptionistTranscriptEntries,
  reduceTranscriptToLeadState,
  type AiReceptionistLeadState,
  type AiReceptionistRealtimeTranscriptEntry,
} from "@/lib/ai-receptionist/realtime/session";

export type AiReceptionistRealtimeSessionStartPayload = {
  call_sid?: string;
  callSid?: string;
  caller_phone?: string;
  callerPhone?: string;
  twilio_phone_number?: string;
  twilioPhoneNumber?: string;
  account_sid?: string;
  accountSid?: string;
};

export type AiReceptionistRealtimeCompletionPayload = {
  call_sid?: string;
  callSid?: string;
  session_id?: string;
  sessionId?: string;
  caller_phone?: string;
  callerPhone?: string;
  twilio_phone_number?: string;
  twilioPhoneNumber?: string;
  account_sid?: string;
  accountSid?: string;
  duration_seconds?: number | string | null;
  durationSeconds?: number | string | null;
  outcome?: string;
  transcript?: string;
  transcript_entries?: unknown;
  transcriptEntries?: unknown;
  structured_data?: unknown;
  structuredData?: unknown;
  recording_url?: string;
  recordingUrl?: string;
  raw_payload?: Record<string, unknown>;
  rawPayload?: Record<string, unknown>;
};

type HandlerResult =
  | {
      ok: true;
      status: number;
      body: Record<string, unknown>;
    }
  | {
      ok: false;
      status: number;
      body: {
        error: string;
      };
    };

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getDurationSeconds(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }

  if (typeof value === "string" && value.trim()) {
    const numericValue = Number(value.trim());

    if (Number.isFinite(numericValue) && numericValue >= 0) {
      return Math.round(numericValue);
    }
  }

  return null;
}

function buildFallbackTranscriptEntry(
  transcript: string
): AiReceptionistRealtimeTranscriptEntry[] {
  return transcript.trim()
    ? [
        {
          speaker: "caller",
          text: transcript.trim(),
          atSeconds: 0,
        },
      ]
    : [];
}

function normalizeCompletionPayload(
  payload: AiReceptionistRealtimeCompletionPayload
) {
  const transcriptEntries =
    normalizeAiReceptionistTranscriptEntries(
      payload.transcript_entries ?? payload.transcriptEntries
    ) || [];
  const fallbackTranscript = getText(payload.transcript);
  const entries =
    transcriptEntries.length > 0
      ? transcriptEntries
      : buildFallbackTranscriptEntry(fallbackTranscript);
  const initialState = normalizeAiReceptionistLeadState(
    payload.structured_data ?? payload.structuredData
  );
  const state = reduceTranscriptToLeadState(entries, {
    ...createEmptyAiReceptionistLeadState(),
    ...initialState,
  });
  const callerPhone = getText(payload.caller_phone ?? payload.callerPhone);

  if (!state.phone && callerPhone) {
    state.phone = callerPhone;
  }

  return {
    callSid: getText(payload.call_sid ?? payload.callSid),
    sessionId: getText(payload.session_id ?? payload.sessionId),
    callerPhone,
    twilioPhoneNumber: getText(
      payload.twilio_phone_number ?? payload.twilioPhoneNumber
    ),
    accountSid: getText(payload.account_sid ?? payload.accountSid),
    durationSeconds: getDurationSeconds(
      payload.duration_seconds ?? payload.durationSeconds
    ),
    outcome: getText(payload.outcome) || "completed",
    recordingUrl: getText(payload.recording_url ?? payload.recordingUrl),
    transcriptEntries: entries,
    state,
    rawPayload: payload.raw_payload ?? payload.rawPayload ?? {},
  };
}

export async function handleRealtimeSessionStart(options: {
  supabase: SupabaseClient;
  settings: AiReceptionistPrivateSettings;
  payload: AiReceptionistRealtimeSessionStartPayload;
  now?: Date;
}): Promise<HandlerResult> {
  const callSid = getText(options.payload.call_sid ?? options.payload.callSid);

  if (!callSid) {
    return {
      ok: false,
      status: 400,
      body: { error: "call_sid is required." },
    };
  }

  if (!options.settings.enabled) {
    return {
      ok: false,
      status: 403,
      body: { error: "AI Receptionist is not enabled for this business." },
    };
  }

  const sessionConfig = buildAiReceptionistRealtimeSessionConfig(
    options.settings,
    {
      now: options.now,
    }
  );

  await upsertAiReceptionistCallLog(
    options.supabase,
    options.settings.organizationId,
    {
      callSid,
      accountSid: getText(options.payload.account_sid ?? options.payload.accountSid),
      callerNumber: getText(
        options.payload.caller_phone ?? options.payload.callerPhone
      ),
      twilioPhoneNumber: getText(
        options.payload.twilio_phone_number ??
          options.payload.twilioPhoneNumber
      ),
      callType: "realtime",
      callStatus: "realtime-session-started",
      answeredAt: new Date().toISOString(),
      rawPayload: options.payload as Record<string, unknown>,
    }
  );

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      callSid,
      session: sessionConfig,
      transferToNumber: options.settings.transferToNumber || null,
    },
  };
}

export async function handleRealtimeSessionComplete(options: {
  supabase: SupabaseClient;
  settings: AiReceptionistPrivateSettings;
  payload: AiReceptionistRealtimeCompletionPayload;
}): Promise<HandlerResult> {
  const normalizedPayload = normalizeCompletionPayload(options.payload);

  if (!normalizedPayload.callSid) {
    return {
      ok: false,
      status: 400,
      body: { error: "call_sid is required." },
    };
  }

  const transcript = formatAiReceptionistRealtimeTranscript(
    normalizedPayload.transcriptEntries
  );
  const emergency = detectAiReceptionistEmergency(
    transcript,
    options.settings.emergencyKeywords
  );
  const summaries = buildAiReceptionistSummaries({
    state: normalizedPayload.state,
    transcript,
    emergency,
  });
  const shouldCreateLead = hasSufficientAiReceptionistLeadInfo(
    normalizedPayload.state,
    transcript,
    normalizedPayload.callerPhone
  );
  const outcome = shouldCreateLead
    ? normalizedPayload.outcome
    : normalizedPayload.outcome === "completed"
      ? "caller_hung_up"
      : normalizedPayload.outcome;

  await upsertAiReceptionistCallLog(
    options.supabase,
    options.settings.organizationId,
    {
      callSid: normalizedPayload.callSid,
      accountSid: normalizedPayload.accountSid,
      callerNumber: normalizedPayload.callerPhone,
      twilioPhoneNumber: normalizedPayload.twilioPhoneNumber,
      callType: "realtime",
      sessionId: normalizedPayload.sessionId,
      recordingUrl: normalizedPayload.recordingUrl,
      durationSeconds: normalizedPayload.durationSeconds,
      transcript,
      transcriptEntries: normalizedPayload.transcriptEntries,
      structuredData:
        normalizedPayload.state as unknown as Record<string, unknown>,
      aiSummaries: summaries,
      callStatus: "realtime-complete",
      outcome,
      priority: emergency.priority,
      emergencyDetected: emergency.emergencyDetected,
      emergencyKeywords: emergency.matchedKeywords,
      endedAt: new Date().toISOString(),
      dropOff: !shouldCreateLead,
      escalated: emergency.emergencyDetected,
      aiSuccess: false,
      rawPayload: normalizedPayload.rawPayload,
    }
  );

  if (!shouldCreateLead) {
    return {
      ok: true,
      status: 200,
      body: {
        ok: true,
        leadCreated: false,
        outcome,
        emergencyDetected: emergency.emergencyDetected,
      },
    };
  }

  const leadPayload = buildRealtimeLeadPayload({
    settings: options.settings,
    state: normalizedPayload.state as AiReceptionistLeadState,
    transcriptEntries: normalizedPayload.transcriptEntries,
    callerPhone: normalizedPayload.callerPhone,
    callSid: normalizedPayload.callSid,
    durationSeconds: normalizedPayload.durationSeconds,
    outcome,
    recordingUrl: normalizedPayload.recordingUrl,
  });
  const leadResult = await createAiReceptionistLeadFromPayload({
    supabase: options.supabase,
    organizationId: options.settings.organizationId,
    payload: leadPayload,
  });

  if (!leadResult.ok) {
    await updateAiReceptionistCallLog(
      options.supabase,
      options.settings.organizationId,
      normalizedPayload.callSid,
      {
        notificationStatus: "failed",
        notificationError: leadResult.error,
      }
    );

    return {
      ok: false,
      status: leadResult.status,
      body: { error: leadResult.error },
    };
  }

  await updateAiReceptionistCallLog(
    options.supabase,
    options.settings.organizationId,
    normalizedPayload.callSid,
    {
      leadId: leadResult.lead.id,
      aiSuccess: true,
      dropOff: false,
    }
  );

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      leadCreated: true,
      leadId: leadResult.lead.id,
      outcome,
      emergencyDetected: emergency.emergencyDetected,
      priority: emergency.priority,
    },
  };
}
