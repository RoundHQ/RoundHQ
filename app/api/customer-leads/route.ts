import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildCustomerLeadFromPayload } from "@/lib/customer-leads";
import { mapCustomerLeadToWriteRow } from "@/lib/supabase/customer-leads-data";

export const runtime = "nodejs";

type CorsResult = {
  headers: HeadersInit;
  isAllowed: boolean;
};

function getCorsHeaders(request: Request): CorsResult {
  const origin = request.headers.get("origin");
  const allowedOrigins = (process.env.LEAD_FORM_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const isAllowed =
    allowedOrigins.length === 0 ||
    !origin ||
    allowedOrigins.includes(origin);
  const allowedOrigin = isAllowed
    ? origin ?? "*"
    : allowedOrigins[0] ?? "null";

  return {
    isAllowed,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, X-RoundHQ-Lead-Token",
      "Access-Control-Max-Age": "86400",
    },
  };
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase is not configured for lead intake.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getPayloadText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function appendPayloadValue(
  payload: Record<string, unknown>,
  key: string,
  value: string
) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return;
  }

  const currentValue = payload[key];

  if (currentValue == null) {
    payload[key] = trimmedValue;
    return;
  }

  payload[key] = Array.isArray(currentValue)
    ? [...currentValue, trimmedValue]
    : [currentValue, trimmedValue];
}

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as unknown;
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  }

  const formData = await request.formData();
  const payload: Record<string, unknown> = {};

  formData.forEach((value, key) => {
    appendPayloadValue(payload, key, typeof value === "string" ? value : value.name);
  });

  return payload;
}

function isSpamPayload(payload: Record<string, unknown>) {
  const honeypotValue =
    getPayloadText(payload.companyWebsite) ||
    getPayloadText(payload.websiteUrl) ||
    getPayloadText(payload.botField);

  return Boolean(honeypotValue);
}

function hasRequiredLeadDetails(payload: Record<string, unknown>) {
  return Boolean(
    getPayloadText(payload.message) ||
      getPayloadText(payload["your-message"]) ||
      getPayloadText(payload["job-description"]) ||
      getPayloadText(payload.jobDescription) ||
      getPayloadText(payload.job) ||
      getPayloadText(payload.enquiry) ||
      getPayloadText(payload.details) ||
      getPayloadText(payload.email) ||
      getPayloadText(payload["your-email"]) ||
      getPayloadText(payload.phone) ||
      getPayloadText(payload["phone-number"]) ||
      getPayloadText(payload.phoneNumber) ||
      getPayloadText(payload.telephone) ||
      getPayloadText(payload["your-tel"]) ||
      getPayloadText(payload["your-phone"])
  );
}

function hasValidFormToken(
  request: Request,
  payload: Record<string, unknown>
) {
  const expectedToken = process.env.LEAD_FORM_SECRET?.trim();

  if (!expectedToken) {
    return true;
  }

  const providedToken =
    request.headers.get("x-roundhq-lead-token")?.trim() ||
    getPayloadText(payload.formToken);

  return providedToken === expectedToken;
}

export async function OPTIONS(request: Request) {
  const cors = getCorsHeaders(request);
  return new NextResponse(null, {
    status: cors.isAllowed ? 204 : 403,
    headers: cors.headers,
  });
}

export async function POST(request: Request) {
  const cors = getCorsHeaders(request);

  if (!cors.isAllowed) {
    return NextResponse.json(
      { error: "This form origin is not allowed." },
      { status: 403, headers: cors.headers }
    );
  }

  try {
    const payload = await readPayload(request);

    if (!hasValidFormToken(request, payload)) {
      return NextResponse.json(
        { error: "The lead form token is invalid." },
        { status: 401, headers: cors.headers }
      );
    }

    if (isSpamPayload(payload)) {
      return NextResponse.json(
        { ok: true, skipped: true },
        { headers: cors.headers }
      );
    }

    if (!hasRequiredLeadDetails(payload)) {
      return NextResponse.json(
        { error: "Add a message, email address, or phone number." },
        { status: 400, headers: cors.headers }
      );
    }

    const lead = buildCustomerLeadFromPayload(
      {
        ...payload,
        source: payload.source ?? "website",
      },
      crypto.randomUUID()
    );
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("customer_leads")
      .insert(mapCustomerLeadToWriteRow(lead));

    if (error) {
      return NextResponse.json(
        {
          error:
            "Unable to save the enquiry. Check that the customer_leads SQL setup has been run.",
        },
        { status: 500, headers: cors.headers }
      );
    }

    return NextResponse.json(
      { ok: true, id: lead.id },
      { headers: cors.headers }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to save the enquiry.",
      },
      { status: 500, headers: cors.headers }
    );
  }
}
