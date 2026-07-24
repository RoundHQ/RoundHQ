import { NextResponse, type NextRequest } from "next/server";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { getAiReceptionistPrivateSettings } from "@/lib/ai-receptionist-private-settings";
import { readRequestTextWithLimit } from "@/lib/ai-receptionist/request-limits";
import { isCustomerFeatureEnabled } from "@/lib/customer-account";

const AI_RECEPTIONIST_REALTIME_MAX_BODY_BYTES = 512 * 1024;

function getExpectedRealtimeToken() {
  return (
    process.env.AI_RECEPTIONIST_REALTIME_TOKEN?.trim() ||
    process.env.AI_RECEPTIONIST_INTAKE_TOKEN?.trim() ||
    process.env.AI_RECEPTIONIST_LEAD_TOKEN?.trim() ||
    ""
  );
}

function getRequestToken(request: NextRequest) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);

  return (
    bearerMatch?.[1]?.trim() ||
    request.headers.get("x-roundhq-ai-receptionist-token")?.trim() ||
    ""
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function getRealtimeRouteContext(
  request: NextRequest,
  payload: Record<string, unknown>
) {
  const expectedToken = getExpectedRealtimeToken();
  const providedToken = getRequestToken(request);

  if (!expectedToken || providedToken !== expectedToken) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "AI Receptionist realtime token is invalid." },
        { status: 401 }
      ),
    };
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Supabase service role credentials are required for AI Receptionist realtime.",
        },
        { status: 503 }
      ),
    };
  }

  const organizationId =
    request.headers.get("x-roundhq-organization-id")?.trim() ||
    getText(payload.organization_id) ||
    getText(payload.organizationId) ||
    "";

  if (!organizationId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "organization_id is required." },
        { status: 400 }
      ),
    };
  }

  if (!isUuid(organizationId)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "organization_id must be a valid UUID." },
        { status: 400 }
      ),
    };
  }

  const supabase = createServiceRoleClient();
  const featureEnabled = await isCustomerFeatureEnabled(
    supabase,
    organizationId,
    "aiReceptionist"
  );

  if (!featureEnabled) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "AI Receptionist is not enabled for this workspace." },
        { status: 403 }
      ),
    };
  }

  const settings = await getAiReceptionistPrivateSettings(
    supabase,
    organizationId
  );

  if (!settings) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "AI Receptionist settings are not configured." },
        { status: 404 }
      ),
    };
  }

  return {
    ok: true as const,
    supabase,
    settings,
  };
}

export async function parseRealtimeJsonRequest(request: NextRequest) {
  const rawBody = await readRequestTextWithLimit(
    request,
    AI_RECEPTIONIST_REALTIME_MAX_BODY_BYTES
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

  let body: unknown = null;

  try {
    body = JSON.parse(rawBody.text || "null") as unknown;
  } catch {
    body = null;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Send a valid JSON object." },
        { status: 400 }
      ),
    };
  }

  return {
    ok: true as const,
    payload: body as Record<string, unknown>,
  };
}
