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
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      strict: true,
    },
  });

  module._compile(compiled.outputText, filename);
};
require.extensions[".tsx"] = require.extensions[".ts"];

const {
  AI_RECEPTIONIST_ACTIVITY_TYPE,
  AI_RECEPTIONIST_SOURCE,
  AI_RECEPTIONIST_SOURCE_LABEL,
  buildAiReceptionistLeadFromPayload,
  formatAiReceptionistCallDuration,
  getAiReceptionistCallMetadata,
} = require(path.join(projectRoot, "lib", "ai-receptionist-leads.ts"));
const {
  mapCustomerLeadRowToLead,
  mapCustomerLeadToWriteRow,
} = require(path.join(projectRoot, "lib", "supabase", "customer-leads-data.ts"));
const { getSourceLabel } = require(
  path.join(projectRoot, "components", "jobs", "customer-leads-page.tsx")
);
const { POST } = require(
  path.join(projectRoot, "app", "api", "ai-receptionist", "leads", "route.ts")
);

function build(payload, suffix) {
  return buildAiReceptionistLeadFromPayload(payload, {
    fallbackId: `00000000-0000-4000-8000-00000000000${suffix}`,
    activityId: `activity-${suffix}`,
  });
}

const fullPayloadResult = build(
  {
    customer_name: "John Smith",
    phone: "07712 345678",
    email: "john@example.com",
    address: "12 High Street",
    town: "Birmingham",
    postcode: "B1 1AA",
    customer_type: "Residential",
    service_required: "Garden maintenance",
    job_description: "Customer wants regular lawn mowing and hedge trimming.",
    ai_summary: "Customer is looking for fortnightly garden maintenance.",
    transcript: "Caller: Hi, I need someone to cut my grass...",
    recording_url: "https://example.com/recordings/call-1.mp3",
    call_duration_seconds: 180,
    source: "AI Receptionist",
    preferred_time: "Morning",
  },
  1
);

assert.equal(fullPayloadResult.ok, true, "full payload should create a lead");
const fullPayloadLead = fullPayloadResult.lead;
assert.equal(fullPayloadLead.id, "00000000-0000-4000-8000-000000000001");
assert.equal(fullPayloadLead.name, "John Smith");
assert.equal(fullPayloadLead.phone, "07712 345678");
assert.equal(fullPayloadLead.email, "john@example.com");
assert.equal(fullPayloadLead.address, "12 High Street");
assert.equal(fullPayloadLead.town, "Birmingham");
assert.equal(fullPayloadLead.postcode, "B1 1AA");
assert.equal(fullPayloadLead.customerType, "Residential");
assert.equal(fullPayloadLead.service, "Garden maintenance");
assert.equal(
  fullPayloadLead.message,
  "Customer wants regular lawn mowing and hedge trimming."
);
assert.equal(fullPayloadLead.status, "new");
assert.equal(fullPayloadLead.source, AI_RECEPTIONIST_SOURCE);
assert.equal(fullPayloadLead.rawPayload?.preferred_time, "Morning");
assert.equal(fullPayloadLead.rawPayload?.source, AI_RECEPTIONIST_SOURCE);
assert.equal(fullPayloadLead.activityHistory.length, 1);
assert.equal(fullPayloadLead.activityHistory[0].title, "AI Receptionist Call");
assert.equal(
  fullPayloadLead.activityHistory[0].type,
  AI_RECEPTIONIST_ACTIVITY_TYPE
);
assert.ok(
  fullPayloadLead.activityHistory.some(
    (entry) => entry.title === "AI Receptionist Call"
  ),
  "activity should be visible on the lead"
);
assert.equal(getSourceLabel(fullPayloadLead.source), "AI Receptionist");
assert.equal(
  formatAiReceptionistCallDuration(180),
  "3m 0s",
  "call duration should use the activity display format"
);

const fullPayloadMetadata = getAiReceptionistCallMetadata(
  fullPayloadLead.activityHistory[0]
);
assert.ok(fullPayloadMetadata, "AI activity should expose structured metadata");
assert.equal(
  fullPayloadMetadata.ai_summary,
  "Customer is looking for fortnightly garden maintenance."
);
assert.equal(
  fullPayloadMetadata.transcript,
  "Caller: Hi, I need someone to cut my grass..."
);
assert.equal(
  fullPayloadMetadata.recording_url,
  "https://example.com/recordings/call-1.mp3"
);
assert.equal(fullPayloadMetadata.call_duration_seconds, 180);
assert.equal(fullPayloadMetadata.caller_phone, "07712 345678");
assert.equal(fullPayloadMetadata.created_by, AI_RECEPTIONIST_SOURCE_LABEL);
assert.match(fullPayloadLead.activityHistory[0].detail, /Transcript captured/);
assert.match(fullPayloadLead.activityHistory[0].detail, /Recording URL/);
assert.match(fullPayloadLead.activityHistory[0].detail, /3m 0s/);

const fullPayloadWriteRow = mapCustomerLeadToWriteRow(fullPayloadLead);
const rehydratedLead = mapCustomerLeadRowToLead({
  ...fullPayloadWriteRow,
  created_at: fullPayloadLead.createdAt,
  updated_at: fullPayloadLead.updatedAt,
});
const rehydratedMetadata = getAiReceptionistCallMetadata(
  rehydratedLead.activityHistory[0]
);
assert.equal(
  rehydratedMetadata?.transcript,
  fullPayloadMetadata.transcript,
  "activity metadata should survive database row mapping"
);

const minimalPayloadResult = build(
  {
    customer_name: "Jane Green",
    phone: "0121 555 1000",
    extra_optional_field: "kept for raw payload",
  },
  2
);

assert.equal(
  minimalPayloadResult.ok,
  true,
  "name and phone alone should create a lead"
);
const minimalPayloadLead = minimalPayloadResult.lead;
assert.equal(minimalPayloadLead.name, "Jane Green");
assert.equal(minimalPayloadLead.phone, "0121 555 1000");
assert.equal(minimalPayloadLead.email, undefined);
assert.equal(minimalPayloadLead.service, undefined);
assert.equal(minimalPayloadLead.message, "");
assert.equal(minimalPayloadLead.customerType, "Residential");
assert.equal(minimalPayloadLead.source, AI_RECEPTIONIST_SOURCE);
assert.equal(
  minimalPayloadLead.rawPayload?.extra_optional_field,
  "kept for raw payload"
);
assert.equal(
  getAiReceptionistCallMetadata(minimalPayloadLead.activityHistory[0])
    ?.recording_url,
  undefined,
  "missing recording URL should not create recording metadata"
);

const largeTranscript = `Caller: ${"large transcript body ".repeat(2400)}`;
assert.ok(
  largeTranscript.length >= 50000,
  "large transcript fixture should meet the minimum size"
);
const largeTranscriptResult = build(
  {
    customer_name: "Long Call Customer",
    phone: "07700 900123",
    transcript: largeTranscript,
  },
  5
);

assert.equal(largeTranscriptResult.ok, true);
assert.equal(
  getAiReceptionistCallMetadata(largeTranscriptResult.lead.activityHistory[0])
    ?.transcript,
  largeTranscript,
  "large transcripts should be stored without truncation"
);

const nullRecordingResult = build(
  {
    customer_name: "No Recording Customer",
    phone: "07700 900456",
    transcript: "Caller did not consent to recording.",
    recording_url: null,
  },
  6
);

assert.equal(nullRecordingResult.ok, true);
const nullRecordingMetadata = getAiReceptionistCallMetadata(
  nullRecordingResult.lead.activityHistory[0]
);
assert.equal(nullRecordingMetadata?.recording_url, undefined);
assert.doesNotMatch(
  nullRecordingResult.lead.activityHistory[0].detail,
  /Recording URL/
);

const unsafeRecordingResult = build(
  {
    customer_name: "Unsafe Recording Customer",
    phone: "07700 900789",
    recording_url: "javascript:alert(1)",
  },
  7
);

assert.equal(unsafeRecordingResult.ok, true);
const unsafeRecordingMetadata = getAiReceptionistCallMetadata(
  unsafeRecordingResult.lead.activityHistory[0]
);
assert.equal(
  unsafeRecordingMetadata?.recording_url,
  undefined,
  "non-http recording URLs should not be exposed in activity metadata"
);
assert.doesNotMatch(
  unsafeRecordingResult.lead.activityHistory[0].detail,
  /javascript:/i
);

const invalidPayloadResult = build({}, 3);
assert.equal(invalidPayloadResult.ok, false, "empty payload should be rejected");
assert.match(invalidPayloadResult.error, /customer name or phone/i);

const invalidBodyResult = build([], 4);
assert.equal(
  invalidBodyResult.ok,
  false,
  "non-object payload should be rejected"
);

const invalidRouteResponse = await POST(
  new Request("http://localhost/api/ai-receptionist/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  })
);
assert.equal(invalidRouteResponse.status, 400, "route should return 400");
assert.match(
  (await invalidRouteResponse.json()).error,
  /customer name or phone/i
);

const previousIntakeToken = process.env.AI_RECEPTIONIST_INTAKE_TOKEN;
process.env.AI_RECEPTIONIST_INTAKE_TOKEN = "expected-intake-token";
const unauthenticatedRouteResponse = await POST(
  new Request("http://localhost/api/ai-receptionist/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      customer_name: "Public Caller",
      phone: "07700 900000",
    }),
  })
);
assert.equal(
  unauthenticatedRouteResponse.status,
  401,
  "public requests should not create arbitrary AI leads without the intake token"
);
if (previousIntakeToken === undefined) {
  delete process.env.AI_RECEPTIONIST_INTAKE_TOKEN;
} else {
  process.env.AI_RECEPTIONIST_INTAKE_TOKEN = previousIntakeToken;
}

const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const previousFallbackOrganizationId =
  process.env.AI_RECEPTIONIST_ORGANIZATION_ID;
process.env.AI_RECEPTIONIST_INTAKE_TOKEN = "expected-intake-token";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
process.env.AI_RECEPTIONIST_ORGANIZATION_ID =
  "00000000-0000-4000-8000-000000000099";
const fallbackOrganizationRouteResponse = await POST(
  new Request("http://localhost/api/ai-receptionist/leads", {
    method: "POST",
    headers: {
      "authorization": "Bearer expected-intake-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      customer_name: "Fallback Org Caller",
      phone: "07700 900002",
    }),
  })
);
assert.equal(
  fallbackOrganizationRouteResponse.status,
  400,
  "token-authenticated intake should not fall back to an environment organization id"
);
assert.match(
  (await fallbackOrganizationRouteResponse.json()).error,
  /organization_id is required/i
);
if (previousSupabaseUrl === undefined) {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
} else {
  process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
}
if (previousServiceRoleKey === undefined) {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
} else {
  process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
}
if (previousFallbackOrganizationId === undefined) {
  delete process.env.AI_RECEPTIONIST_ORGANIZATION_ID;
} else {
  process.env.AI_RECEPTIONIST_ORGANIZATION_ID =
    previousFallbackOrganizationId;
}
if (previousIntakeToken === undefined) {
  delete process.env.AI_RECEPTIONIST_INTAKE_TOKEN;
} else {
  process.env.AI_RECEPTIONIST_INTAKE_TOKEN = previousIntakeToken;
}

const oversizedRouteResponse = await POST(
  new Request("http://localhost/api/ai-receptionist/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      customer_name: "Oversized Payload",
      phone: "07700 900001",
      transcript: "x".repeat(530000),
    }),
  })
);
assert.equal(oversizedRouteResponse.status, 413);

console.log("AI Receptionist lead intake tests passed.");
