import { NextResponse, type NextRequest } from "next/server";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { readRequestTextWithLimit } from "@/lib/ai-receptionist/request-limits";

const AI_RECEPTIONIST_TELNYX_MAX_BODY_BYTES = 256 * 1024;

export function getTelnyxPublicWebhookBaseUrl(request: NextRequest) {
  const configuredBaseUrl = process.env.AI_RECEPTIONIST_PUBLIC_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const requestUrl = new URL(request.url);
  const forwardedHost =
    request.headers.get("x-forwarded-host")?.trim() ||
    request.headers.get("host")?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.trim() ||
    requestUrl.protocol.replace(/:$/, "");

  return forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;
}

export async function buildTelnyxWebhookContext(request: NextRequest) {
  if (!isSupabaseServiceRoleConfigured()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Supabase service role credentials are required for Telnyx webhooks.",
        },
        { status: 503 }
      ),
    };
  }

  const rawBody = await readRequestTextWithLimit(
    request,
    AI_RECEPTIONIST_TELNYX_MAX_BODY_BYTES
  );

  if (!rawBody.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: rawBody.error },
        { status: rawBody.status }
      ),
    };
  }

  return {
    ok: true as const,
    context: {
      supabase: createServiceRoleClient(),
      rawBody: rawBody.text,
      headers: request.headers,
      baseUrl: getTelnyxPublicWebhookBaseUrl(request),
    },
  };
}

export function toTelnyxNextResponse(response: {
  status: number;
  body: Record<string, unknown>;
}) {
  return NextResponse.json(response.body, { status: response.status });
}
