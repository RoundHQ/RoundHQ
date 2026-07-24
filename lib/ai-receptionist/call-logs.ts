import type { SupabaseClient } from "@supabase/supabase-js";

export type AiReceptionistCallLogWrite = {
  provider?: "telnyx" | "twilio" | string;
  providerEventId?: string;
  callSid: string;
  accountSid?: string;
  callerNumber?: string;
  twilioPhoneNumber?: string;
  callType?: "voicemail" | "realtime";
  sessionId?: string;
  recordingUrl?: string;
  durationSeconds?: number | null;
  transcript?: string;
  transcriptEntries?: unknown[];
  structuredData?: Record<string, unknown>;
  aiSummaries?: Record<string, unknown>;
  leadId?: string | null;
  callStatus?: string;
  outcome?: string;
  priority?: "normal" | "high" | string;
  emergencyDetected?: boolean;
  emergencyKeywords?: string[];
  answeredAt?: string | null;
  endedAt?: string | null;
  dropOff?: boolean;
  escalated?: boolean;
  aiSuccess?: boolean;
  notificationStatus?: string;
  notificationError?: string | null;
  rawPayload?: Record<string, unknown>;
};

export type AiReceptionistDashboardStats = {
  todayCalls: number;
  leadsCreated: number;
  missedCalls: number;
  averageCallDurationSeconds: number;
  aiSuccessRate: number;
  escalatedCalls: number;
  dropOffRate: number;
  emergencyCalls: number;
  schemaReady: boolean;
  schemaError?: string;
};

export type AiReceptionistCallLogRow = {
  id?: string;
  organization_id: string;
  provider?: string | null;
  provider_event_id?: string | null;
  call_sid: string;
  account_sid: string | null;
  caller_number: string | null;
  twilio_phone_number: string | null;
  call_type?: string | null;
  session_id?: string | null;
  recording_url: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  transcript_entries?: unknown[] | null;
  structured_data?: Record<string, unknown> | null;
  ai_summaries?: Record<string, unknown> | null;
  lead_id: string | null;
  call_status: string | null;
  outcome?: string | null;
  priority?: string | null;
  emergency_detected?: boolean | null;
  emergency_keywords?: string[] | null;
  answered_at?: string | null;
  ended_at?: string | null;
  drop_off?: boolean | null;
  escalated?: boolean | null;
  ai_success?: boolean | null;
  notification_status: string | null;
  notification_error: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function getText(value: string | null | undefined) {
  return value?.trim() || null;
}

function mapCallLogWriteToRow(
  organizationId: string,
  value: AiReceptionistCallLogWrite
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    organization_id: organizationId,
    call_sid: value.callSid,
  };

  const textFields: Array<[
    keyof AiReceptionistCallLogWrite,
    string,
    string | undefined,
  ]> = [
    ["provider", "provider", "twilio"],
    ["providerEventId", "provider_event_id", undefined],
    ["accountSid", "account_sid", undefined],
    ["callerNumber", "caller_number", undefined],
    ["twilioPhoneNumber", "twilio_phone_number", undefined],
    ["callType", "call_type", "voicemail"],
    ["sessionId", "session_id", undefined],
    ["recordingUrl", "recording_url", undefined],
    ["transcript", "transcript", undefined],
    ["callStatus", "call_status", undefined],
    ["outcome", "outcome", undefined],
    ["priority", "priority", "normal"],
    ["answeredAt", "answered_at", undefined],
    ["endedAt", "ended_at", undefined],
    ["notificationStatus", "notification_status", undefined],
    ["notificationError", "notification_error", undefined],
  ];

  textFields.forEach(([sourceKey, destinationKey, fallback]) => {
    const sourceValue = value[sourceKey];

    if (sourceValue !== undefined) {
      row[destinationKey] =
        getText(typeof sourceValue === "string" ? sourceValue : null) ??
        fallback ??
        null;
    }
  });

  if (value.durationSeconds !== undefined) {
    row.duration_seconds =
      typeof value.durationSeconds === "number" &&
      Number.isFinite(value.durationSeconds)
        ? Math.max(0, Math.round(value.durationSeconds))
        : null;
  }

  if (value.transcriptEntries !== undefined) {
    row.transcript_entries = Array.isArray(value.transcriptEntries)
      ? value.transcriptEntries
      : [];
  }

  if (value.structuredData !== undefined) {
    row.structured_data = value.structuredData;
  }

  if (value.aiSummaries !== undefined) {
    row.ai_summaries = value.aiSummaries;
  }

  if (value.leadId !== undefined) {
    row.lead_id = value.leadId || null;
  }

  if (value.emergencyDetected !== undefined) {
    row.emergency_detected = Boolean(value.emergencyDetected);
  }

  if (value.emergencyKeywords !== undefined) {
    row.emergency_keywords = Array.isArray(value.emergencyKeywords)
      ? value.emergencyKeywords
      : [];
  }

  if (value.dropOff !== undefined) {
    row.drop_off = Boolean(value.dropOff);
  }

  if (value.escalated !== undefined) {
    row.escalated = Boolean(value.escalated);
  }

  if (value.aiSuccess !== undefined) {
    row.ai_success = Boolean(value.aiSuccess);
  }

  if (value.rawPayload !== undefined) {
    row.raw_payload = value.rawPayload;
  }

  return row;
}

export async function getAiReceptionistCallLog(
  supabase: SupabaseClient,
  organizationId: string,
  callSid: string
) {
  const { data, error } = await supabase
    .from("ai_receptionist_call_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("call_sid", callSid)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data as unknown as AiReceptionistCallLogRow | null;
}

export async function upsertAiReceptionistCallLog(
  supabase: SupabaseClient,
  organizationId: string,
  value: AiReceptionistCallLogWrite
) {
  const row = mapCallLogWriteToRow(organizationId, value);
  const { data, error } = await supabase
    .from("ai_receptionist_call_logs")
    .upsert(row, {
      onConflict: "organization_id,call_sid",
    })
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as AiReceptionistCallLogRow | null;
}

export async function updateAiReceptionistCallLog(
  supabase: SupabaseClient,
  organizationId: string,
  callSid: string,
  value: Partial<AiReceptionistCallLogWrite>
) {
  const row = mapCallLogWriteToRow(organizationId, {
    callSid,
    ...value,
  });
  const payload = Object.fromEntries(
    Object.entries(row).filter(
      ([key]) => !["organization_id", "call_sid"].includes(key)
    )
  );

  if (Object.keys(payload).length === 0) {
    return getAiReceptionistCallLog(supabase, organizationId, callSid);
  }

  const { data, error } = await supabase
    .from("ai_receptionist_call_logs")
    .update(payload)
    .eq("organization_id", organizationId)
    .eq("call_sid", callSid)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as AiReceptionistCallLogRow | null;
}

export async function getAiReceptionistDashboardStats(
  supabase: SupabaseClient,
  organizationId: string,
  now = new Date()
): Promise<AiReceptionistDashboardStats> {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("ai_receptionist_call_logs")
    .select(
      "lead_id,recording_url,call_status,duration_seconds,outcome,emergency_detected,drop_off,escalated,ai_success,created_at"
    )
    .eq("organization_id", organizationId)
    .gte("created_at", startOfDay.toISOString());

  if (error) {
    return {
      todayCalls: 0,
      leadsCreated: 0,
      missedCalls: 0,
      averageCallDurationSeconds: 0,
      aiSuccessRate: 0,
      escalatedCalls: 0,
      dropOffRate: 0,
      emergencyCalls: 0,
      schemaReady: false,
      schemaError: error.message,
    };
  }

  const rows = (Array.isArray(data) ? data : []) as Array<{
    lead_id: string | null;
    recording_url: string | null;
    call_status: string | null;
    duration_seconds?: number | null;
    outcome?: string | null;
    emergency_detected?: boolean | null;
    drop_off?: boolean | null;
    escalated?: boolean | null;
    ai_success?: boolean | null;
  }>;
  const missedStatuses = new Set(["busy", "failed", "no-answer", "canceled"]);
  const durationRows = rows.filter(
    (row) =>
      typeof row.duration_seconds === "number" &&
      Number.isFinite(row.duration_seconds)
  );
  const leadsCreated = rows.filter((row) => Boolean(row.lead_id)).length;
  const successRows = rows.filter((row) => row.ai_success || Boolean(row.lead_id));
  const dropOffRows = rows.filter((row) => row.drop_off);

  return {
    todayCalls: rows.length,
    leadsCreated,
    missedCalls: rows.filter(
      (row) =>
        missedStatuses.has((row.call_status ?? "").toLowerCase()) ||
        (!row.recording_url && !row.lead_id)
    ).length,
    averageCallDurationSeconds:
      durationRows.length > 0
        ? Math.round(
            durationRows.reduce(
              (total, row) => total + Number(row.duration_seconds ?? 0),
              0
            ) / durationRows.length
          )
        : 0,
    aiSuccessRate:
      rows.length > 0 ? Math.round((successRows.length / rows.length) * 100) : 0,
    escalatedCalls: rows.filter((row) => row.escalated).length,
    dropOffRate:
      rows.length > 0 ? Math.round((dropOffRows.length / rows.length) * 100) : 0,
    emergencyCalls: rows.filter((row) => row.emergency_detected).length,
    schemaReady: true,
  };
}

export type AiReceptionistCallHistoryItem = {
  id: string;
  callSid: string;
  date: string;
  caller: string;
  durationSeconds: number | null;
  leadId: string | null;
  outcome: string;
  priority: string;
};

export async function getAiReceptionistCallHistory(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 50
): Promise<{
  items: AiReceptionistCallHistoryItem[];
  schemaReady: boolean;
  schemaError?: string;
}> {
  const { data, error } = await supabase
    .from("ai_receptionist_call_logs")
    .select(
      "id,call_sid,caller_number,duration_seconds,lead_id,outcome,call_status,priority,created_at"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return {
      items: [],
      schemaReady: false,
      schemaError: error.message,
    };
  }

  const rows = (Array.isArray(data) ? data : []) as AiReceptionistCallLogRow[];

  return {
    items: rows.map((row) => ({
      id: row.id || row.call_sid,
      callSid: row.call_sid,
      date: row.created_at || "",
      caller: row.caller_number || "Unknown caller",
      durationSeconds: row.duration_seconds,
      leadId: row.lead_id,
      outcome: row.outcome || row.call_status || "unknown",
      priority: row.priority || "normal",
    })),
    schemaReady: true,
  };
}
