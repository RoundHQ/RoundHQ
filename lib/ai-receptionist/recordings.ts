import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiReceptionistCallLogRow } from "@/lib/ai-receptionist/call-logs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getTelnyxRecordingIdFromCallLog(
  row: Pick<AiReceptionistCallLogRow, "provider" | "raw_payload">
) {
  if (row.provider !== "telnyx") {
    return "";
  }

  return (
    getText(row.raw_payload?.recording_id) ||
    getText(row.raw_payload?.recording_sid)
  );
}

export async function getAiReceptionistRecordingForPlayback(
  supabase: SupabaseClient,
  organizationId: string,
  recordingId: string
) {
  const trimmedRecordingId = recordingId.trim();

  if (!trimmedRecordingId) {
    return null;
  }

  const selectColumns =
    "id,organization_id,provider,call_sid,recording_url,lead_id,raw_payload";
  let row: AiReceptionistCallLogRow | null = null;

  if (UUID_PATTERN.test(trimmedRecordingId)) {
    const { data } = await supabase
      .from("ai_receptionist_call_logs")
      .select(selectColumns)
      .eq("organization_id", organizationId)
      .eq("id", trimmedRecordingId)
      .maybeSingle();

    row = (data as unknown as AiReceptionistCallLogRow | null) ?? null;
  }

  if (!row) {
    const { data } = await supabase
      .from("ai_receptionist_call_logs")
      .select(selectColumns)
      .eq("organization_id", organizationId)
      .eq("call_sid", trimmedRecordingId)
      .maybeSingle();

    row = (data as unknown as AiReceptionistCallLogRow | null) ?? null;
  }

  if (
    !row ||
    (!row.recording_url && !getTelnyxRecordingIdFromCallLog(row))
  ) {
    return null;
  }

  return row;
}
