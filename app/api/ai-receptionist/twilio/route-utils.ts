import { NextResponse, type NextRequest } from "next/server";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { readRequestTextWithLimit } from "@/lib/ai-receptionist/request-limits";
import type { TwilioWebhookResponse } from "@/lib/ai-receptionist/twilio/webhooks";

const AI_RECEPTIONIST_TWILIO_MAX_BODY_BYTES = 128 * 1024;

export function getPublicWebhookUrl(request: NextRequest) {
  const configuredBaseUrl = process.env.AI_RECEPTIONIST_PUBLIC_BASE_URL?.trim();
  const requestUrl = new URL(request.url);

  if (configuredBaseUrl) {
    const baseUrl = new URL(configuredBaseUrl);
    baseUrl.pathname = requestUrl.pathname;
    baseUrl.search = requestUrl.search;
    return baseUrl.toString();
  }

  const forwardedHost =
    request.headers.get("x-forwarded-host")?.trim() ||
    request.headers.get("host")?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.trim() ||
    requestUrl.protocol.replace(/:$/, "");

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}${requestUrl.pathname}${requestUrl.search}`;
  }

  return requestUrl.toString();
}

export function getPublicWebhookBaseUrl(request: NextRequest) {
  const configuredBaseUrl = process.env.AI_RECEPTIONIST_PUBLIC_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const publicUrl = new URL(getPublicWebhookUrl(request));
  return publicUrl.origin;
}

export function getPublicWebhookWebSocketBaseUrl(request: NextRequest) {
  const configuredUrl =
    process.env.AI_RECEPTIONIST_REALTIME_WS_URL?.trim() ||
    process.env.AI_RECEPTIONIST_PUBLIC_BASE_URL?.trim();

  if (configuredUrl) {
    const url = new URL(configuredUrl);
    url.protocol = url.protocol === "http:" ? "ws:" : "wss:";
    return url.origin;
  }

  const publicUrl = new URL(getPublicWebhookBaseUrl(request));
  publicUrl.protocol = publicUrl.protocol === "http:" ? "ws:" : "wss:";
  return publicUrl.origin;
}

export async function buildTwilioWebhookContext(request: NextRequest) {
  if (!isSupabaseServiceRoleConfigured()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Supabase service role credentials are required for Twilio webhooks.",
        },
        { status: 503 }
      ),
    };
  }

  const rawBody = await readRequestTextWithLimit(
    request,
    AI_RECEPTIONIST_TWILIO_MAX_BODY_BYTES
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
      url: getPublicWebhookUrl(request),
      rawBody: rawBody.text,
      signature: request.headers.get("x-twilio-signature")?.trim() ?? "",
      baseUrl: getPublicWebhookBaseUrl(request),
      websocketBaseUrl: getPublicWebhookWebSocketBaseUrl(request),
      organizationId: request.nextUrl.searchParams.get("organization_id"),
    },
  };
}

export function toNextResponse(response: TwilioWebhookResponse) {
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "content-type":
        response.contentType === "text/xml"
          ? "text/xml; charset=utf-8"
          : "application/json; charset=utf-8",
    },
  });
}
