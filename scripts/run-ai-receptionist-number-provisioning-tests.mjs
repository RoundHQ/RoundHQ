import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const projectRoot = process.cwd();
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      path.join(projectRoot, request.slice(2)),
      parent,
      isMain,
      options
    );
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypescript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: true,
    },
  });

  module._compile(compiled.outputText, filename);
};

const {
  TelnyxPlatformApiError,
  createTelnyxNumberOrder,
  getMissingTelnyxPlatformSettings,
  getOrCreateTelnyxNumberOrder,
  getTelnyxPlatformConfig,
  searchAvailableTelnyxPhoneNumbers,
} = require(path.join(
  projectRoot,
  "lib",
  "ai-receptionist",
  "telnyx-platform.ts"
));

const config = {
  apiKey: "KEY-platform-secret",
  publicKey: "platform-public-key",
  connectionId: "connection-123",
  messagingProfileId: "messaging-123",
  billingGroupId: "billing-123",
};

assert.deepEqual(getMissingTelnyxPlatformSettings(config), []);
assert.deepEqual(
  getMissingTelnyxPlatformSettings({
    ...config,
    apiKey: "",
    publicKey: "",
  }),
  ["AI_RECEPTIONIST_TELNYX_API_KEY", "AI_RECEPTIONIST_TELNYX_PUBLIC_KEY"]
);
assert.deepEqual(
  getTelnyxPlatformConfig({
    AI_RECEPTIONIST_TELNYX_API_KEY: " key ",
    AI_RECEPTIONIST_TELNYX_PUBLIC_KEY: " public ",
    AI_RECEPTIONIST_TELNYX_CONNECTION_ID: " connection ",
    AI_RECEPTIONIST_TELNYX_MESSAGING_PROFILE_ID: " messaging ",
    AI_RECEPTIONIST_TELNYX_BILLING_GROUP_ID: " billing ",
  }),
  {
    apiKey: "key",
    publicKey: "public",
    connectionId: "connection",
    messagingProfileId: "messaging",
    billingGroupId: "billing",
  }
);

await assert.rejects(
  searchAvailableTelnyxPhoneNumbers({
    config: { ...config, apiKey: "" },
    query: "Birmingham",
  }),
  (error) =>
    error instanceof TelnyxPlatformApiError &&
    error.status === 503 &&
    /not configured/i.test(error.message)
);

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

let searchRequest = null;
const searchResults = await searchAvailableTelnyxPhoneNumbers({
  config,
  query: "Birmingham",
  limit: 6,
  fetchImpl: async (url, options) => {
    searchRequest = { url: String(url), options };
    return jsonResponse({
      data: [
        {
          phone_number: "+441215551111",
          region_information: [
            { region_type: "locality", region_name: "Birmingham" },
          ],
          cost_information: {
            upfront_cost: "1.00",
            monthly_cost: "2.00",
            currency: "GBP",
          },
          features: [{ name: "voice" }, { name: "sms" }],
        },
        {
          phone_number: "+441215551112",
          features: [{ name: "sms" }],
        },
      ],
    });
  },
});

assert.equal(searchResults.length, 1);
assert.deepEqual(searchResults[0], {
  phoneNumber: "+441215551111",
  locality: "Birmingham",
  upfrontCost: "1.00",
  monthlyCost: "2.00",
  currency: "GBP",
});
const searchUrl = new URL(searchRequest.url);
assert.equal(searchUrl.pathname, "/v2/available_phone_numbers");
assert.equal(searchUrl.searchParams.get("filter[country_code]"), "GB");
assert.equal(searchUrl.searchParams.get("filter[locality]"), "Birmingham");
assert.equal(searchUrl.searchParams.get("filter[phone_number_type]"), "local");
assert.deepEqual(searchUrl.searchParams.getAll("filter[features][]"), ["voice"]);
assert.equal(searchRequest.options.headers.authorization, "Bearer KEY-platform-secret");

let numericSearchUrl = "";
await searchAvailableTelnyxPhoneNumbers({
  config,
  query: "0121",
  fetchImpl: async (url) => {
    numericSearchUrl = String(url);
    return jsonResponse({ data: [] });
  },
});
assert.equal(
  new URL(numericSearchUrl).searchParams.get(
    "filter[phone_number][starts_with]"
  ),
  "+44121"
);

let recoveredRequestCount = 0;
const recoveredOrder = await getOrCreateTelnyxNumberOrder({
  config,
  phoneNumber: "+441215551111",
  customerReference: "roundhq:organization-1:attempt-1",
  fetchImpl: async (url, options) => {
    recoveredRequestCount += 1;
    assert.equal(options.method, "GET");
    assert.match(String(url), /filter%5Bcustomer_reference%5D/);
    return jsonResponse({
      data: [
        {
          id: "order-existing",
          status: "pending",
          requirements_met: true,
          phone_numbers: [
            {
              id: "number-existing",
              phone_number: "+441215551111",
              status: "success",
            },
          ],
        },
      ],
    });
  },
});
assert.equal(recoveredRequestCount, 1, "an existing order must prevent a second purchase");
assert.equal(recoveredOrder.orderId, "order-existing");
assert.equal(recoveredOrder.provisioningStatus, "active");

let orderBody = null;
const createdOrder = await createTelnyxNumberOrder({
  config,
  phoneNumber: "+441215551113",
  customerReference: "roundhq:organization-1:attempt-2",
  fetchImpl: async (url, options) => {
    assert.equal(String(url), "https://api.telnyx.com/v2/number_orders");
    assert.equal(options.method, "POST");
    orderBody = JSON.parse(options.body);
    return jsonResponse({
      data: {
        id: "order-created",
        status: "pending",
        requirements_met: true,
        phone_numbers: [
          {
            id: "number-created",
            phone_number: "+441215551113",
            status: "pending",
          },
        ],
      },
    });
  },
});
assert.deepEqual(orderBody, {
  phone_numbers: [{ phone_number: "+441215551113" }],
  connection_id: "connection-123",
  customer_reference: "roundhq:organization-1:attempt-2",
  messaging_profile_id: "messaging-123",
  billing_group_id: "billing-123",
});
assert.equal(createdOrder.orderId, "order-created");
assert.equal(createdOrder.phoneNumberId, "number-created");
assert.equal(createdOrder.provisioningStatus, "pending");

const actionRequiredOrder = await createTelnyxNumberOrder({
  config,
  phoneNumber: "+441215551114",
  customerReference: "roundhq:organization-1:attempt-3",
  fetchImpl: async () =>
    jsonResponse({
      data: {
        id: "order-review",
        requirements_met: false,
        phone_numbers: [
          {
            id: "number-review",
            phone_number: "+441215551114",
            status: "pending",
          },
        ],
      },
    }),
});
assert.equal(actionRequiredOrder.provisioningStatus, "action_required");

const routeSource = fs.readFileSync(
  path.join(
    projectRoot,
    "app",
    "api",
    "ai-receptionist",
    "numbers",
    "route.ts"
  ),
  "utf8"
);
assert.match(routeSource, /getWorkspaceAdminAccess/);
assert.match(routeSource, /isCustomerFeatureEnabled/);
assert.match(routeSource, /adminSupabase/);
assert.match(routeSource, /telnyx_provisioning_reference/);
assert.match(routeSource, /findTelnyxNumberOrderByReference/);

const migrationSource = fs.readFileSync(
  path.join(projectRoot, "supabase", "ai_receptionist_managed_numbers.sql"),
  "utf8"
);
assert.match(migrationSource, /protect_ai_receptionist_managed_number_fields/);
assert.match(migrationSource, /auth\.role\(\) = 'service_role'/);
assert.match(migrationSource, /provisioning_reference_unique_idx/);

console.log("AI Receptionist managed-number provisioning tests passed.");