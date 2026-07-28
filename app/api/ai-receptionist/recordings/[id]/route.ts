import { NextResponse, type NextRequest } from "next/server";
import { getAiReceptionistPrivateSettings } from "@/lib/ai-receptionist-private-settings";
import {
  getAiReceptionistRecordingForPlayback,
  getTelnyxRecordingIdFromCallLog,
} from "@/lib/ai-receptionist/recordings";
import { getTelnyxRecordingDownloadUrl } from "@/lib/ai-receptionist/telnyx-platform";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import { isCustomerFeatureEnabled } from "@/lib/customer-account";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
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
  const featureEnabled = await isCustomerFeatureEnabled(
    supabase,
    organizationId,
    "aiReceptionist"
  );

  if (!featureEnabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

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

  let recordingUrl = recording.recording_url ?? "";

  if (recording.provider === "telnyx") {
    const settings = await getAiReceptionistPrivateSettings(
      dataClient,
      organizationId
    );
    const providerRecordingId = getTelnyxRecordingIdFromCallLog(recording);

    if (settings && providerRecordingId) {
      try {
        recordingUrl = await getTelnyxRecordingDownloadUrl({
          config: {
            apiKey: settings.telnyxApiKey,
            publicKey: settings.telnyxPublicKey,
            connectionId: settings.telnyxConnectionId,
            messagingProfileId: settings.telnyxMessagingProfileId,
            billingGroupId: "",
          },
          recordingId: providerRecordingId,
        });
      } catch {
        // The webhook URL remains a short-lived fallback for recent calls.
      }
    }
  }

  if (!recordingUrl) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  let providerResponse: Response;

  try {
    const range = request.headers.get("range");
    providerResponse = await fetch(recordingUrl, {
      headers: range ? { range } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch recording." },
      { status: 502 }
    );
  }

  if (!providerResponse.ok || !providerResponse.body) {
    return NextResponse.json(
      { error: "Unable to fetch recording." },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers({
    "content-type":
      providerResponse.headers.get("content-type") ?? "audio/mpeg",
    "cache-control": "private, no-store",
    "accept-ranges": providerResponse.headers.get("accept-ranges") ?? "bytes",
  });

  for (const headerName of ["content-length", "content-range"]) {
    const headerValue = providerResponse.headers.get(headerName);

    if (headerValue) {
      responseHeaders.set(headerName, headerValue);
    }
  }

  return new Response(providerResponse.body, {
    status: providerResponse.status,
    headers: responseHeaders,
  });
}
