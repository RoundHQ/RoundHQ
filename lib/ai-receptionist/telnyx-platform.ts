const TELNYX_API_BASE_URL = "https://api.telnyx.com/v2";
const TELNYX_REQUEST_TIMEOUT_MS = 15_000;

export type TelnyxPlatformConfig = {
  apiKey: string;
  publicKey: string;
  connectionId: string;
  messagingProfileId: string;
  billingGroupId: string;
};

export type TelnyxAvailablePhoneNumber = {
  phoneNumber: string;
  locality: string;
  upfrontCost: string;
  monthlyCost: string;
  currency: string;
};

export type TelnyxManagedNumberOrder = {
  orderId: string;
  phoneNumberId: string;
  phoneNumber: string;
  providerStatus: string;
  provisioningStatus: "pending" | "action_required" | "active";
  requirementsMet: boolean;
};

type TelnyxNumberOrderData = {
  id?: unknown;
  status?: unknown;
  requirements_met?: unknown;
  phone_numbers?: unknown;
};

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getTelnyxErrorMessage(body: unknown, fallback: string) {
  const candidate = getObject(body);
  const errors = Array.isArray(candidate.errors) ? candidate.errors : [];
  const firstError = getObject(errors[0]);

  return (
    getText(firstError.detail) ||
    getText(firstError.title) ||
    getText(candidate.error) ||
    fallback
  );
}

export function getTelnyxPlatformConfig(
  environment: NodeJS.ProcessEnv = process.env
): TelnyxPlatformConfig {
  return {
    apiKey: environment.AI_RECEPTIONIST_TELNYX_API_KEY?.trim() ?? "",
    publicKey: environment.AI_RECEPTIONIST_TELNYX_PUBLIC_KEY?.trim() ?? "",
    connectionId:
      environment.AI_RECEPTIONIST_TELNYX_CONNECTION_ID?.trim() ?? "",
    messagingProfileId:
      environment.AI_RECEPTIONIST_TELNYX_MESSAGING_PROFILE_ID?.trim() ?? "",
    billingGroupId:
      environment.AI_RECEPTIONIST_TELNYX_BILLING_GROUP_ID?.trim() ?? "",
  };
}

export function getMissingTelnyxPlatformSettings(
  config: TelnyxPlatformConfig
) {
  return [
    !config.apiKey ? "AI_RECEPTIONIST_TELNYX_API_KEY" : "",
    !config.publicKey ? "AI_RECEPTIONIST_TELNYX_PUBLIC_KEY" : "",
    !config.connectionId ? "AI_RECEPTIONIST_TELNYX_CONNECTION_ID" : "",
  ].filter(Boolean);
}

export function isTelnyxPlatformConfigured(config = getTelnyxPlatformConfig()) {
  return getMissingTelnyxPlatformSettings(config).length === 0;
}

export class TelnyxPlatformApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "TelnyxPlatformApiError";
    this.status = status;
  }
}

async function telnyxPlatformRequest(options: {
  config: TelnyxPlatformConfig;
  path: string;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  fetchImpl?: typeof fetch;
}) {
  const response = await (options.fetchImpl ?? fetch)(
    `${TELNYX_API_BASE_URL}${options.path}`,
    {
      method: options.method ?? "GET",
      headers: {
        authorization: `Bearer ${options.config.apiKey}`,
        accept: "application/json",
        ...(options.body ? { "content-type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(TELNYX_REQUEST_TIMEOUT_MS),
    }
  );
  const responseBody = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new TelnyxPlatformApiError(
      getTelnyxErrorMessage(
        responseBody,
        `The phone-number provider returned ${response.status}.`
      ),
      response.status >= 400 && response.status < 500 ? 400 : 502
    );
  }

  return responseBody;
}

function isCompleteE164PhoneNumber(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}
function normalizeUkPhoneSearchPrefix(value: string) {
  const compact = value.replace(/[^\d+]/g, "");

  if (!compact) {
    return "";
  }

  if (compact.startsWith("+44")) {
    return compact;
  }

  if (compact.startsWith("44")) {
    return `+${compact}`;
  }

  if (compact.startsWith("0")) {
    return `+44${compact.slice(1)}`;
  }

  return compact.startsWith("+") ? compact : `+44${compact}`;
}

function getRegionName(value: unknown) {
  const regions = Array.isArray(value) ? value : [];
  const preferred = regions
    .map(getObject)
    .find((region) =>
      ["locality", "rate_center", "administrative_area"].includes(
        getText(region.region_type)
      )
    );

  return getText(preferred?.region_name);
}

function hasVoiceFeature(value: unknown) {
  const features = Array.isArray(value) ? value : [];

  return features.some((feature) => {
    if (typeof feature === "string") {
      return feature.toLowerCase() === "voice";
    }

    return getText(getObject(feature).name).toLowerCase() === "voice";
  });
}

export async function searchAvailableTelnyxPhoneNumbers(options: {
  config?: TelnyxPlatformConfig;
  query?: string;
  limit?: number;
  fetchImpl?: typeof fetch;
}) {
  const config = options.config ?? getTelnyxPlatformConfig();
  const missingSettings = getMissingTelnyxPlatformSettings(config);

  if (missingSettings.length > 0) {
    throw new TelnyxPlatformApiError(
      "RoundHQ phone provisioning is not configured yet.",
      503
    );
  }

  const query = options.query?.trim().slice(0, 80) ?? "";
  const limit = Math.max(1, Math.min(options.limit ?? 6, 20));
  const searchParams = new URLSearchParams({
    "filter[country_code]": "GB",
    "filter[phone_number_type]": "local",
    "filter[limit]": String(limit),
    "filter[best_effort]": "false",
    "filter[quickship]": "true",
    "filter[exclude_held_numbers]": "true",
  });
  searchParams.append("filter[features][]", "voice");

  if (query) {
    if (/[a-z]/i.test(query)) {
      searchParams.set("filter[locality]", query);
    } else {
      searchParams.set(
        "filter[phone_number][starts_with]",
        normalizeUkPhoneSearchPrefix(query)
      );
    }
  }

  const body = getObject(
    await telnyxPlatformRequest({
      config,
      path: `/available_phone_numbers?${searchParams.toString()}`,
      fetchImpl: options.fetchImpl,
    })
  );
  const data = Array.isArray(body.data) ? body.data : [];

  const voiceNumbers = data
    .map(getObject)
    .filter(
      (number) => getText(number.phone_number) && hasVoiceFeature(number.features)
    );
  const completeNumbers = voiceNumbers.filter((number) =>
    isCompleteE164PhoneNumber(getText(number.phone_number))
  );

  if (voiceNumbers.length > 0 && completeNumbers.length === 0) {
    throw new TelnyxPlatformApiError(
      "RoundHQ phone provisioning is not active yet. Please contact RoundHQ support.",
      503
    );
  }

  return completeNumbers
    .slice(0, limit)
    .map((number): TelnyxAvailablePhoneNumber => {
      const cost = getObject(number.cost_information);

      return {
        phoneNumber: getText(number.phone_number),
        locality: getRegionName(number.region_information),
        upfrontCost: getText(cost.upfront_cost),
        monthlyCost: getText(cost.monthly_cost),
        currency: getText(cost.currency),
      };
    });
}

function normalizePhoneNumberForComparison(value: string) {
  return value.replace(/\D/g, "");
}

export async function findExactAvailableTelnyxPhoneNumber(options: {
  config?: TelnyxPlatformConfig;
  phoneNumber: string;
  fetchImpl?: typeof fetch;
}) {
  const requestedPhoneNumber = normalizePhoneNumberForComparison(
    options.phoneNumber
  );

  if (
    !requestedPhoneNumber ||
    !isCompleteE164PhoneNumber(options.phoneNumber.replace(/\s/g, ""))
  ) {
    return null;
  }

  const matches = await searchAvailableTelnyxPhoneNumbers({
    config: options.config,
    query: options.phoneNumber,
    limit: 8,
    fetchImpl: options.fetchImpl,
  });

  return (
    matches.find(
      (number) =>
        normalizePhoneNumberForComparison(number.phoneNumber) ===
        requestedPhoneNumber
    ) ?? null
  );
}

function normalizeTelnyxNumberOrder(
  value: TelnyxNumberOrderData
): TelnyxManagedNumberOrder | null {
  const phoneNumbers = Array.isArray(value.phone_numbers)
    ? value.phone_numbers.map(getObject)
    : [];
  const phone = phoneNumbers.find((entry) => getText(entry.phone_number));

  if (!phone) {
    return null;
  }

  const providerStatus = (
    getText(phone.status) || getText(value.status) || "pending"
  ).toLowerCase();
  const requirementsMet =
    value.requirements_met !== false && phone.requirements_met !== false;
  const active =
    requirementsMet &&
    ["success", "complete", "completed", "active"].includes(providerStatus);

  return {
    orderId: getText(value.id),
    phoneNumberId: getText(phone.id),
    phoneNumber: getText(phone.phone_number),
    providerStatus,
    provisioningStatus: !requirementsMet
      ? "action_required"
      : active
        ? "active"
        : "pending",
    requirementsMet,
  };
}

export async function findTelnyxNumberOrderByReference(options: {
  config?: TelnyxPlatformConfig;
  customerReference: string;
  fetchImpl?: typeof fetch;
}) {
  const config = options.config ?? getTelnyxPlatformConfig();
  const searchParams = new URLSearchParams({
    "filter[customer_reference]": options.customerReference,
    "page[size]": "10",
  });
  const body = getObject(
    await telnyxPlatformRequest({
      config,
      path: `/number_orders?${searchParams.toString()}`,
      fetchImpl: options.fetchImpl,
    })
  );
  const orders = Array.isArray(body.data) ? body.data.map(getObject) : [];

  for (const order of orders) {
    const normalized = normalizeTelnyxNumberOrder(order);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export async function createTelnyxNumberOrder(options: {
  config?: TelnyxPlatformConfig;
  phoneNumber: string;
  customerReference: string;
  fetchImpl?: typeof fetch;
}) {
  const config = options.config ?? getTelnyxPlatformConfig();
  const body: Record<string, unknown> = {
    phone_numbers: [{ phone_number: options.phoneNumber }],
    connection_id: config.connectionId,
    customer_reference: options.customerReference,
  };

  if (config.messagingProfileId) {
    body.messaging_profile_id = config.messagingProfileId;
  }

  if (config.billingGroupId) {
    body.billing_group_id = config.billingGroupId;
  }

  const response = getObject(
    await telnyxPlatformRequest({
      config,
      path: "/number_orders",
      method: "POST",
      body,
      fetchImpl: options.fetchImpl,
    })
  );
  const normalized = normalizeTelnyxNumberOrder(
    getObject(response.data) as TelnyxNumberOrderData
  );

  if (!normalized) {
    throw new TelnyxPlatformApiError(
      "The phone-number provider accepted the order but did not return a number."
    );
  }

  return normalized;
}

export async function getOrCreateTelnyxNumberOrder(options: {
  config?: TelnyxPlatformConfig;
  phoneNumber: string;
  customerReference: string;
  fetchImpl?: typeof fetch;
}) {
  const existing = await findTelnyxNumberOrderByReference(options);

  if (existing) {
    return existing;
  }

  return createTelnyxNumberOrder(options);
}