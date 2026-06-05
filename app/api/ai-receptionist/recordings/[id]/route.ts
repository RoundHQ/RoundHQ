import { NextResponse, type NextRequest } from "next/server";
import { getAiReceptionistPrivateSettings } from "@/lib/ai-receptionist-private-settings";
import { getTelnyxRecordingPlaybackHeaders } from "@/lib/ai-receptionist/providers";
import { getAiReceptionistRecordingForPlayback } from "@/lib/ai-receptionist/recordings";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const organizationId = await ensureWorkspace(supabase, user);
  const dataClient = isSupabaseServiceRoleConfigured()
    ? createServiceRoleClient()
    : supabase;
  const recording = await getAiReceptionistRecordingForPlayback(
    dataClient,
    organizationId,
    decodeURIComponent(id)
  );

  if (!recording) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  const recordingUrl = recording.recording_url;

  if (!recordingUrl) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  const settings = await getAiReceptionistPrivateSettings(
    dataClient,
    organizationId
  );
  const headers =
    recording.provider === "telnyx" && settings
      ? getTelnyxRecordingPlaybackHeaders(settings)
      : {};
  const providerResponse = await fetch(recordingUrl, {
    headers,
    cache: "no-store",
  });

  if (!providerResponse.ok || !providerResponse.body) {
    return NextResponse.json(
      { error: "Unable to fetch recording." },
      { status: 502 }
    );
  }

  return new Response(providerResponse.body, {
    status: 200,
    headers: {
      "content-type":
        providerResponse.headers.get("content-type") ?? "audio/mpeg",
      "cache-control": "private, no-store",
    },
  });
}
