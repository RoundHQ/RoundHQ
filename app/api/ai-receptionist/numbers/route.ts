import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import {
  getOrCreateAiReceptionistSettings,
  isValidAiReceptionistPhoneNumber,
  type AiReceptionistPhoneProvisioningStatus,
  type AiReceptionistPhoneSetupMode,
} from "@/lib/ai-receptionist-settings";
import { isCustomerFeatureEnabled } from "@/lib/customer-account";
import { readRequestTextWithLimit } from "@/lib/ai-receptionist/request-limits";
import {
  TelnyxPlatformApiError,
  createTelnyxNumberOrder,
  findTelnyxNumberOrderByReference,
  getMissingTelnyxPlatformSettings,
  getTelnyxPlatformConfig,
  searchAvailableTelnyxPhoneNumbers,
  type TelnyxManagedNumberOrder,
} from "@/lib/ai-receptionist/telnyx-platform";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import { getWorkspaceAdminAccess } from "@/lib/workspace-admin";

export const runtime = "nodejs";

const NUMBER_SETUP_BODY_LIMIT = 8 * 1024;
const PROVISIONING_SELECT = [
  "organization_id",
  "phone_setup_mode",
  "existing_business_phone_number",
  "telnyx_phone_number",
  "telnyx_phone_number_id",
  "telnyx_number_order_id",
  "telnyx_provisioning_status",
  "telnyx_provisioning_reference",
  "telnyx_provisioning_error",
].join(",");

type ProvisioningRow = {
  organization_id: string;
  phone_setup_mode: string | null;
  existing_business_phone_number: string | null;
  telnyx_phone_number: string | null;
  telnyx_phone_number_id: string | null;
  telnyx_number_order_id: string | null;
  telnyx_provisioning_status: string | null;
  telnyx_provisioning_reference: string | null;
  telnyx_provisioning_error: string | null;
};

type AuthorizedContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  adminSupabase: ReturnType<typeof createServiceRoleClient>;
  organizationId: string;
};

type AuthorizationResult =
  | { ok: true; context: AuthorizedContext }
  | { ok: false; response: NextResponse };

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function normalizeProvisioningStatus(
  value: string | null | undefined,
  phoneNumber: string
): AiReceptionistPhoneProvisioningStatus {
  if (
    value === "ordering" ||
    value === "pending" ||
    value === "action_required" ||
    value === "active" ||
    value === "failed"
  ) {
    return value;
  }

  return phoneNumber ? "active" : "not_configured";
}

function normalizeSetupMode(value: string | null | undefined) {
  return value === "call_forwarding" ? "call_forwarding" : "new_number";
}

function buildPhoneSetupResponse(row: ProvisioningRow) {
  const phoneNumber = getText(row.telnyx_phone_number);

  return {
    phoneNumber,
    setupMode: normalizeSetupMode(row.phone_setup_mode),
    existingBusinessPhoneNumber: getText(row.existing_business_phone_number),
    provisioningStatus: normalizeProvisioningStatus(
      row.telnyx_provisioning_status,
      phoneNumber
    ),
    provisioningError: getText(row.telnyx_provisioning_error),
  };
}

function isSameOriginMutation(request: NextRequest) {
  const origin = request.headers.get("origin")?.trim();

  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const expectedHost =
      request.headers.get("x-forwarded-host")?.trim() ||
      request.headers.get("host")?.trim() ||
      requestUrl.host;

    return originUrl.host === expectedHost;
  } catch {
    return false;
  }
}

async function authorizeNumberSetup(): Promise<AuthorizationResult> {
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

  const organizationId = await ensureWorkspace(supabase, user);
  const [canManage, featureEnabled] = await Promise.all([
    getWorkspaceAdminAccess(supabase, organizationId, user),
    isCustomerFeatureEnabled(supabase, organizationId, "aiReceptionist"),
  ]);

  if (!canManage) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Workspace administrator access is required." },
        { status: 403 }
      ),
    };
  }

  if (!featureEnabled) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "AI Receptionist is not enabled for this workspace." },
        { status: 403 }
      ),
    };
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "RoundHQ phone provisioning is not fully configured yet." },
        { status: 503 }
      ),
    };
  }

  return {
    ok: true,
    context: {
      supabase,
      adminSupabase: createServiceRoleClient(),
      organizationId,
    },
  };
}

async function getProvisioningRow(context: AuthorizedContext) {
  const { data, error } = await context.adminSupabase
    .from("ai_receptionist_settings")
    .select(PROVISIONING_SELECT)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (error) {
    throw new TelnyxPlatformApiError(
      "The managed-number database update has not been applied yet.",
      503
    );
  }

  if (!data) {
    throw new TelnyxPlatformApiError(
      "AI Receptionist settings could not be created for this workspace.",
      500
    );
  }

  return data as unknown as ProvisioningRow;
}

async function persistNumberOrder(
  context: AuthorizedContext,
  order: TelnyxManagedNumberOrder,
  setupMode: AiReceptionistPhoneSetupMode,
  existingBusinessPhoneNumber: string
) {
  const { data, error } = await context.adminSupabase
    .from("ai_receptionist_settings")
    .update({
      telephony_provider: "telnyx",
      phone_setup_mode: setupMode,
      existing_business_phone_number:
        setupMode === "call_forwarding" ? existingBusinessPhoneNumber : "",
      telnyx_phone_number: order.phoneNumber,
      telnyx_phone_number_id: order.phoneNumberId,
      telnyx_number_order_id: order.orderId,
      telnyx_provisioning_status: order.provisioningStatus,
      telnyx_provisioning_error:
        order.provisioningStatus === "action_required"
          ? "Additional telecom verification is required. RoundHQ support will contact you."
          : "",
    })
    .eq("organization_id", context.organizationId)
    .select(PROVISIONING_SELECT)
    .maybeSingle();

  if (error || !data) {
    throw new TelnyxPlatformApiError(
      "The number was ordered, but RoundHQ could not finish saving it. Retry to recover the existing order.",
      500
    );
  }

  revalidatePath("/dashboard");
  return data as unknown as ProvisioningRow;
}

async function refreshProvisioningOrder(
  context: AuthorizedContext,
  row: ProvisioningRow
) {
  const reference = getText(row.telnyx_provisioning_reference);

  if (!reference) {
    return row;
  }

  const order = await findTelnyxNumberOrderByReference({
    customerReference: reference,
  });

  if (!order) {
    return row;
  }

  return persistNumberOrder(
    context,
    order,
    normalizeSetupMode(row.phone_setup_mode),
    getText(row.existing_business_phone_number)
  );
}

function toErrorResponse(error: unknown, fallback: string) {
  const message =
    error instanceof Error && error.message.trim() ? error.message : fallback;
  const status =
    error instanceof TelnyxPlatformApiError ? error.status : 500;

  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeNumberSetup();

    if (!authorization.ok) {
      return authorization.response;
    }

    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (query.length > 80) {
      return NextResponse.json(
        { error: "Search text must be 80 characters or fewer." },
        { status: 400 }
      );
    }

    const numbers = await searchAvailableTelnyxPhoneNumbers({ query, limit: 8 });

    return NextResponse.json({
      numbers: numbers.map((number) => ({
        phoneNumber: number.phoneNumber,
        locality: number.locality,
      })),
    });
  } catch (error) {
    return toErrorResponse(error, "Unable to search for phone numbers.");
  }
}

export async function POST(request: NextRequest) {
  let context: AuthorizedContext | null = null;
  let provisioningReference = "";

  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json(
        { error: "This request did not originate from RoundHQ." },
        { status: 403 }
      );
    }

    const authorization = await authorizeNumberSetup();

    if (!authorization.ok) {
      return authorization.response;
    }

    context = authorization.context;
    const rawBody = await readRequestTextWithLimit(
      request,
      NUMBER_SETUP_BODY_LIMIT
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
        { error: "Send valid phone setup details." },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;
    const setupMode: AiReceptionistPhoneSetupMode =
      getText(payload.setupMode) === "call_forwarding"
        ? "call_forwarding"
        : "new_number";
    const existingBusinessPhoneNumber = getText(
      payload.existingBusinessPhoneNumber
    );
    const selectedPhoneNumber = getText(payload.phoneNumber);

    if (
      setupMode === "call_forwarding" &&
      (!existingBusinessPhoneNumber ||
        !isValidAiReceptionistPhoneNumber(existingBusinessPhoneNumber))
    ) {
      return NextResponse.json(
        { error: "Enter the existing business number you want to forward." },
        { status: 400 }
      );
    }

    if (
      setupMode === "new_number" &&
      (!selectedPhoneNumber ||
        !isValidAiReceptionistPhoneNumber(selectedPhoneNumber))
    ) {
      return NextResponse.json(
        { error: "Choose an available phone number first." },
        { status: 400 }
      );
    }

    const config = getTelnyxPlatformConfig();

    if (getMissingTelnyxPlatformSettings(config).length > 0) {
      throw new TelnyxPlatformApiError(
        "RoundHQ phone provisioning is not configured yet.",
        503
      );
    }

    const settings = await getOrCreateAiReceptionistSettings(
      context.supabase,
      context.organizationId
    );

    if (!settings.schemaReady) {
      throw new TelnyxPlatformApiError(
        settings.schemaError || "AI Receptionist settings are not ready.",
        503
      );
    }

    let row = await getProvisioningRow(context);

    if (getText(row.telnyx_phone_number)) {
      return NextResponse.json(buildPhoneSetupResponse(row));
    }

    if (
      row.telnyx_provisioning_status === "ordering" ||
      row.telnyx_provisioning_status === "pending" ||
      row.telnyx_provisioning_status === "action_required"
    ) {
      row = await refreshProvisioningOrder(context, row);
      return NextResponse.json(buildPhoneSetupResponse(row));
    }

    provisioningReference =
      getText(row.telnyx_provisioning_reference) ||
      `roundhq:${context.organizationId}:${randomUUID()}`;
    const claim = await context.adminSupabase
      .from("ai_receptionist_settings")
      .update({
        phone_setup_mode: setupMode,
        existing_business_phone_number:
          setupMode === "call_forwarding"
            ? existingBusinessPhoneNumber
            : "",
        telnyx_provisioning_status: "ordering",
        telnyx_provisioning_reference: provisioningReference,
        telnyx_provisioning_error: "",
      })
      .eq("organization_id", context.organizationId)
      .in("telnyx_provisioning_status", ["not_configured", "failed"])
      .select(PROVISIONING_SELECT)
      .maybeSingle();

    if (claim.error) {
      throw new TelnyxPlatformApiError(
        "RoundHQ could not start phone-number setup.",
        500
      );
    }

    if (!claim.data) {
      row = await getProvisioningRow(context);
      return NextResponse.json(buildPhoneSetupResponse(row), { status: 409 });
    }

    const existingOrder = await findTelnyxNumberOrderByReference({
      config,
      customerReference: provisioningReference,
    });

    if (existingOrder) {
      row = await persistNumberOrder(
        context,
        existingOrder,
        setupMode,
        existingBusinessPhoneNumber
      );
      return NextResponse.json(buildPhoneSetupResponse(row));
    }

    let phoneNumberToOrder = selectedPhoneNumber;

    if (setupMode === "call_forwarding") {
      const availableNumbers = await searchAvailableTelnyxPhoneNumbers({
        config,
        limit: 8,
      });
      phoneNumberToOrder = availableNumbers[0]?.phoneNumber ?? "";
    } else {
      const exactMatches = await searchAvailableTelnyxPhoneNumbers({
        config,
        query: selectedPhoneNumber,
        limit: 8,
      });
      phoneNumberToOrder =
        exactMatches.find(
          (number) =>
            normalizePhone(number.phoneNumber) ===
            normalizePhone(selectedPhoneNumber)
        )?.phoneNumber ?? "";
    }

    if (!phoneNumberToOrder) {
      throw new TelnyxPlatformApiError(
        setupMode === "call_forwarding"
          ? "No immediately available UK forwarding number was found. Please try again shortly."
          : "That number is no longer available. Search again and choose another number.",
        409
      );
    }

    const order = await createTelnyxNumberOrder({
      config,
      phoneNumber: phoneNumberToOrder,
      customerReference: provisioningReference,
    });
    row = await persistNumberOrder(
      context,
      order,
      setupMode,
      existingBusinessPhoneNumber
    );

    return NextResponse.json(buildPhoneSetupResponse(row));
  } catch (error) {
    if (context && provisioningReference) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Unable to set up the receptionist number.";

      await context.adminSupabase
        .from("ai_receptionist_settings")
        .update({
          telnyx_provisioning_status: "failed",
          telnyx_provisioning_error: message,
        })
        .eq("organization_id", context.organizationId)
        .eq("telnyx_provisioning_reference", provisioningReference);
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Send valid phone setup details." },
        { status: 400 }
      );
    }

    return toErrorResponse(error, "Unable to set up the receptionist number.");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json(
        { error: "This request did not originate from RoundHQ." },
        { status: 403 }
      );
    }

    const authorization = await authorizeNumberSetup();

    if (!authorization.ok) {
      return authorization.response;
    }

    const row = await refreshProvisioningOrder(
      authorization.context,
      await getProvisioningRow(authorization.context)
    );

    return NextResponse.json(buildPhoneSetupResponse(row));
  } catch (error) {
    return toErrorResponse(error, "Unable to refresh the phone-number status.");
  }
}