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
    return originalResolveFilename.call(this, path.join(projectRoot, request.slice(2)), parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypescript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, strict: true },
  });
  module._compile(compiled.outputText, filename);
};

const { SMS_PRICE_PER_MESSAGE_PENCE, canUseSms, formatSmsPrice } = require(
  path.join(projectRoot, "lib", "messaging", "sms-billing.ts")
);
const { getDefaultCustomerAccountSettings, mapCustomerAccountSettingsRow } = require(
  path.join(projectRoot, "lib", "customer-account.ts")
);

assert.equal(SMS_PRICE_PER_MESSAGE_PENCE, 10);
assert.equal(formatSmsPrice(10), "£0.10");
assert.equal(canUseSms({ smsBillingEnabled: false, smsTermsAccepted: false }), false);
assert.equal(canUseSms({ smsBillingEnabled: true, smsTermsAccepted: false }), false);
assert.equal(canUseSms({ smsBillingEnabled: false, smsTermsAccepted: true }), false);
assert.equal(canUseSms({ smsBillingEnabled: true, smsTermsAccepted: true }), true);

const defaults = getDefaultCustomerAccountSettings();
assert.equal(defaults.smsBillingEnabled, false, "existing accounts must default to SMS off");
assert.equal(defaults.smsTermsAccepted, false, "existing accounts must not have consent");
assert.equal(defaults.smsPricePerMessagePence, 10);

const mapped = mapCustomerAccountSettingsRow({
  account_status: "active",
  disabled_reason: null,
  feature_access: {},
  internal_notes: null,
  support_priority: "standard",
  sms_billing_enabled: true,
  sms_terms_accepted: true,
  sms_terms_accepted_at: "2026-08-24T12:00:00.000Z",
  sms_terms_accepted_by: "user-1",
  sms_price_per_message_pence: 10,
  updated_at: null,
});
assert.equal(canUseSms(mapped), true);
assert.equal(mapped.smsTermsAcceptedBy, "user-1");

const migration = fs.readFileSync(path.join(projectRoot, "supabase", "20260824_paid_sms_billing.sql"), "utf8");
assert.match(migration, /sms_billing_enabled boolean not null default false/);
assert.match(migration, /sms_terms_accepted boolean not null default false/);
assert.match(migration, /create table if not exists public\.sms_usage_records/);
assert.match(migration, /unique \(customer_message_id\)/);
assert.match(migration, /Members read SMS usage records/);

const messageRoute = fs.readFileSync(path.join(projectRoot, "app", "api", "customer-messages", "route.ts"), "utf8");
assert.match(messageRoute, /SmsEntitlementError/);
assert.match(messageRoute, /status: 403/);

const deliveryService = fs.readFileSync(path.join(projectRoot, "lib", "messaging", "server.ts"), "utf8");
assert.match(deliveryService, /requireSmsEntitlement\(supabase, input\.organizationId\)/);
assert.match(deliveryService, /requireSmsEntitlement\(supabase, data\.organization_id\)/);
assert.match(deliveryService, /recordSmsUsage/);

console.log("Paid SMS billing entitlement tests passed.");
