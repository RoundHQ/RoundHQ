import { NextResponse, type NextRequest } from "next/server";
import {
  AI_RECEPTIONIST_SOURCE_LABEL,
  buildAiReceptionistLeadFromPayload,
  createAiReceptionistLeadFromPayload,
} from "@/lib/ai-receptionist-leads";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { readRequestTextWithLimit } from "@/lib/ai-receptionist/request-limits";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import { isCustomerFeatureEnabled } from "@/lib/customer-account";

export const runtime = "nodejs";
const AI_RECEPTIONIST_LEAD_MAX_BODY_BYTES = 512 * 1024;

type AuthorizedSupabaseClient =
  | ReturnType<typeof createServiceRoleClient>
  | Awaited<ReturnType<typeof createClient>>;

type AuthResult =
  | {
      ok: true;
      supabase: AuthorizedSupabaseClient;
      organizationId: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getExpectedInternalToken() {
  return (
    process.env.AI_RECEPTIONIST_INTAKE_TOKEN?.trim() ||
    process.env.AI_RECEPTIONIST_LEAD_TOKEN?.trim() ||
    ""
  );
}

function getRequestInternalToken(request: NextRequest) {
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

function getOrganizationId(request: NextRequest, payload: Record<string, unknown>) {
  return (
    request.headers.get("x-roundhq-organization-id")?.trim() ||
    getText(payload.organization_id) ||
    getText(payload.organizationId) ||
    ""
  );
}

async function authorizeRequest(
  request: NextRequest,
  payload: Record<string, unknown>
): Promise<AuthResult> {
  const expectedToken = getExpectedInternalToken();
  const providedToken = getRequestInternalToken(request);

  if (expectedToken || providedToken) {
    if (!expectedToken || providedToken !== expectedToken) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "AI Receptionist intake token is invalid." },
          { status: 401 }
        ),
      };
    }

    if (!isSupabaseServiceRoleConfigured()) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error:
              "Supabase service role credentials are required for AI Receptionist intake.",
          },
          { status: 503 }
        ),
      };
    }

    const organizationId = getOrganizationId(request, payload);

    if (!organizationId) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error:
              "organization_id is required for token-authenticated AI Receptionist intake.",
          },
          { status: 400 }
        ),
      };
    }

    if (!isUuid(organizationId)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "organization_id must be a valid UUID." },
          { status: 400 }
        ),
      };
    }

    return {
      ok: true,
      supabase: createServiceRoleClient(),
      organizationId,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Login required." }, { status: 401 }),
    };
  }

  return {
    ok: true,
    supabase,
    organizationId: await ensureWorkspace(supabase, user),
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await readRequestTextWithLimit(
      request,
      AI_RECEPTIONIST_LEAD_MAX_BODY_BYTES
    );

    if (!rawBody.ok) {
      return NextResponse.json(
        { error: rawBody.error },
        { status: rawBody.status }
      );
    }

    const body = JSON.parse(rawBody.text || "null") as unknown;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Send a valid JSON object." },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;
    const validationResult = buildAiReceptionistLeadFromPayload(payload);

    if (!validationResult.ok) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const auth = await authorizeRequest(request, payload);

    if (!auth.ok) {
      return auth.response;
    }

    const featureEnabled = await isCustomerFeatureEnabled(
      auth.supabase,
      auth.organizationId,
      "aiReceptionist"
    );

    if (!featureEnabled) {
      return NextResponse.json(
        { error: "AI Receptionist is not enabled for this workspace." },
        { status: 403 }
      );
    }

    const result = await createAiReceptionistLeadFromPayload({
      supabase: auth.supabase,
      organizationId: auth.organizationId,
      payload,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      id: result.lead.id,
      source: AI_RECEPTIONIST_SOURCE_LABEL,
      status: "New",
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Send a valid JSON object." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to create the AI Receptionist lead.",
      },
      { status: 500 }
    );
  }
}
