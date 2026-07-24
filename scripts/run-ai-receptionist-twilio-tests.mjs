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
  buildTwilioSignature,
  parseTwilioFormBody,
} = require(path.join(projectRoot, "lib", "ai-receptionist", "twilio", "index.ts"));
const {
  handleCallStatusWebhook,
  handleIncomingCallWebhook,
  handleRecordingCompleteWebhook,
} = require(
  path.join(projectRoot, "lib", "ai-receptionist", "twilio", "webhooks.ts")
);
const {
  getAiReceptionistCallMetadata,
} = require(path.join(projectRoot, "lib", "ai-receptionist-leads.ts"));
const {
  getAiReceptionistCallHistory,
  getAiReceptionistDashboardStats,
} = require(path.join(projectRoot, "lib", "ai-receptionist", "call-logs.ts"));
const {
  getAiReceptionistPrivateSettings,
} = require(path.join(projectRoot, "lib", "ai-receptionist-private-settings.ts"));

const organizationAId = "00000000-0000-4000-8000-000000000001";
const organizationBId = "00000000-0000-4000-8000-000000000002";
const authToken = "twilio-test-token";
const accountSid = "AC1234567890abcdef";
const twilioPhoneNumber = "+441234567890";
const twilioPhoneNumberB = "+441234567891";

function buildSettingsRow(organization_id, twilio_phone_number, business_name) {
  return {
    organization_id,
    enabled: true,
    business_name,
    greeting_message:
      "Hello, thanks for calling {{business_name}}. Please leave a message.",
    fallback_phone_number: "",
    notification_email: "",
    twilio_account_sid: accountSid,
    twilio_auth_token: authToken,
    twilio_phone_number,
    business_hours_enabled: false,
    business_hours: {},
    questions_to_ask: ["Can I take your name?"],
    emergency_keywords: ["urgent"],
    consent_message: "This call may be recorded and transcribed.",
    lead_source_label: "AI Receptionist",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function createTables() {
  return {
    customer_account_settings: [
      {
        organization_id: organizationAId,
        feature_access: { aiReceptionist: true },
      },
      {
        organization_id: organizationBId,
        feature_access: { aiReceptionist: true },
      },
    ],
    ai_receptionist_settings: [
      buildSettingsRow(organizationAId, twilioPhoneNumber, "RoundHQ Test Co A"),
      buildSettingsRow(organizationBId, twilioPhoneNumberB, "RoundHQ Test Co B"),
    ],
    ai_receptionist_call_logs: [],
    customer_leads: [],
  };
}

class FakeBuilder {
  constructor(tables, table) {
    this.tables = tables;
    this.table = table;
    this.filters = [];
    this.notNullFilters = [];
    this.limitValue = null;
    this.orderKey = null;
    this.orderAscending = true;
    this.operation = "select";
    this.payload = null;
    this.single = false;
  }

  select() {
    return this;
  }

  eq(key, value) {
    this.filters.push([key, value]);
    return this;
  }

  gte(key, value) {
    this.filters.push([key, value, "gte"]);
    return this;
  }

  not(key, operator, value) {
    if (operator === "is" && value === null) {
      this.notNullFilters.push(key);
    }
    return this;
  }

  limit(value) {
    this.limitValue = value;
    return this;
  }

  order(key, options = {}) {
    this.orderKey = key;
    this.orderAscending = Boolean(options.ascending);
    return this;
  }

  insert(payload) {
    const rows = Array.isArray(payload) ? payload : [payload];
    this.tables[this.table].push(...rows);
    return Promise.resolve({ data: rows, error: null });
  }

  upsert(payload) {
    this.operation = "upsert";
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  maybeSingle() {
    this.single = true;
    return this.execute();
  }

  then(resolve, reject) {
    return Promise.resolve(this.execute()).then(resolve, reject);
  }

  getRows() {
    let rows = this.tables[this.table] ?? [];

    for (const [key, value, operator] of this.filters) {
      if (operator === "gte") {
        rows = rows.filter((row) => String(row[key] ?? "") >= String(value));
      } else {
        rows = rows.filter((row) => row[key] === value);
      }
    }

    for (const key of this.notNullFilters) {
      rows = rows.filter((row) => row[key] !== null && row[key] !== undefined);
    }

    if (this.orderKey) {
      rows = [...rows].sort((left, right) => {
        const leftValue = String(left[this.orderKey] ?? "");
        const rightValue = String(right[this.orderKey] ?? "");
        return this.orderAscending
          ? leftValue.localeCompare(rightValue)
          : rightValue.localeCompare(leftValue);
      });
    }

    return this.limitValue == null ? rows : rows.slice(0, this.limitValue);
  }

  execute() {
    if (this.operation === "upsert") {
      const rows = this.tables[this.table];
      const row = this.payload;
      const index = rows.findIndex((entry) => {
        if (this.table === "ai_receptionist_call_logs") {
          return (
            entry.organization_id === row.organization_id &&
            entry.call_sid === row.call_sid
          );
        }

        return entry.organization_id === row.organization_id;
      });

      if (index >= 0) {
        rows[index] = { ...rows[index], ...row };
      } else {
        rows.push(row);
      }

      return { data: this.single ? rows[index >= 0 ? index : rows.length - 1] : rows, error: null };
    }

    if (this.operation === "update") {
      const rows = this.getRows();
      rows.forEach((row) => Object.assign(row, this.payload));
      return { data: this.single ? rows[0] ?? null : rows, error: null };
    }

    const rows = this.getRows();
    return { data: this.single ? rows[0] ?? null : rows, error: null };
  }
}

function createFakeSupabase(tables) {
  return {
    from(table) {
      return new FakeBuilder(tables, table);
    },
  };
}

function signedContext({
  tables,
  pathName,
  params,
  signature = null,
  organizationId: contextOrganizationId = organizationAId,
  includeOrganizationId = true,
}) {
  const rawBody = params.toString();
  const query = includeOrganizationId
    ? `?organization_id=${contextOrganizationId}`
    : "";
  const url = `https://example.com${pathName}${query}`;

  return {
    supabase: createFakeSupabase(tables),
    url,
    rawBody,
    signature:
      signature ?? buildTwilioSignature(url, parseTwilioFormBody(rawBody), authToken),
    baseUrl: "https://example.com",
    organizationId: includeOrganizationId ? contextOrganizationId : null,
  };
}

const incomingTables = createTables();
const incomingParams = new URLSearchParams({
  AccountSid: accountSid,
  CallSid: "CA-incoming",
  From: "07712345678",
  To: twilioPhoneNumber,
  CallStatus: "ringing",
});
const incomingResponse = await handleIncomingCallWebhook(
  signedContext({
    tables: incomingTables,
    pathName: "/api/ai-receptionist/twilio/incoming-call",
    params: incomingParams,
    includeOrganizationId: false,
  })
);

assert.equal(incomingResponse.status, 200, "incoming call should return TwiML");
assert.equal(incomingResponse.contentType, "text/xml");
assert.match(incomingResponse.body, /<Record/);
assert.match(incomingResponse.body, /This call may be recorded and transcribed/);
assert.match(incomingResponse.body, /recording-complete/);
assert.equal(incomingTables.ai_receptionist_call_logs.length, 1);
assert.equal(incomingTables.ai_receptionist_call_logs[0].call_sid, "CA-incoming");
assert.equal(
  incomingTables.ai_receptionist_call_logs[0].organization_id,
  organizationAId,
  "customer A inbound call should create a call log only in customer A"
);

const incomingBTables = createTables();
const incomingBParams = new URLSearchParams({
  AccountSid: accountSid,
  CallSid: "CA-incoming-b",
  From: "07712345679",
  To: twilioPhoneNumberB,
  CallStatus: "ringing",
});
const incomingBResponse = await handleIncomingCallWebhook(
  signedContext({
    tables: incomingBTables,
    pathName: "/api/ai-receptionist/twilio/incoming-call",
    params: incomingBParams,
    includeOrganizationId: false,
  })
);

assert.equal(incomingBResponse.status, 200);
assert.equal(incomingBTables.ai_receptionist_call_logs.length, 1);
assert.equal(
  incomingBTables.ai_receptionist_call_logs[0].organization_id,
  organizationBId,
  "customer B inbound call should create a call log only in customer B"
);

const unknownNumberTables = createTables();
const unknownNumberParams = new URLSearchParams({
  AccountSid: accountSid,
  CallSid: "CA-unknown-number",
  From: "07712345670",
  To: "+441234560000",
  CallStatus: "ringing",
});
const unknownNumberResponse = await handleIncomingCallWebhook(
  signedContext({
    tables: unknownNumberTables,
    pathName: "/api/ai-receptionist/twilio/incoming-call",
    params: unknownNumberParams,
    includeOrganizationId: false,
  })
);

assert.equal(unknownNumberResponse.status, 403);
assert.equal(unknownNumberTables.ai_receptionist_call_logs.length, 0);
assert.equal(unknownNumberTables.customer_leads.length, 0);

const invalidSignatureResponse = await handleIncomingCallWebhook(
  signedContext({
    tables: createTables(),
    pathName: "/api/ai-receptionist/twilio/incoming-call",
    params: incomingParams,
    signature: "bad-signature",
  })
);
assert.equal(invalidSignatureResponse.status, 403);
assert.match(invalidSignatureResponse.body, /Invalid Twilio signature/);

const recordingTables = createTables();
const recordingParams = new URLSearchParams({
  AccountSid: accountSid,
  CallSid: "CA-recording",
  From: "07712345678",
  To: twilioPhoneNumber,
  RecordingSid: "RE-recording",
  RecordingUrl: "https://api.twilio.com/recording.mp3",
  RecordingDuration: "180",
  TranscriptionText:
    "My name is John Smith. I need hedge trimming at 12 High Street. Please call me back.",
});
const recordingResponse = await handleRecordingCompleteWebhook(
  signedContext({
    tables: recordingTables,
    pathName: "/api/ai-receptionist/twilio/recording-complete",
    params: recordingParams,
    includeOrganizationId: false,
  })
);
const recordingBody = JSON.parse(recordingResponse.body);

assert.equal(recordingResponse.status, 200);
assert.equal(recordingTables.customer_leads.length, 1, "recording should create a lead");
assert.equal(recordingTables.ai_receptionist_call_logs.length, 1);
assert.equal(recordingTables.ai_receptionist_call_logs[0].lead_id, recordingBody.leadId);
assert.equal(recordingTables.ai_receptionist_call_logs[0].transcript, recordingParams.get("TranscriptionText"));
assert.equal(recordingTables.customer_leads[0].organization_id, organizationAId);

const createdLead = recordingTables.customer_leads[0];
assert.equal(createdLead.source, "ai_receptionist");
assert.equal(createdLead.status, "new");
assert.equal(createdLead.phone, "07712345678");
assert.equal(createdLead.service, "Hedge trimming");
assert.match(createdLead.message, /hedge trimming/i);
const metadata = getAiReceptionistCallMetadata(createdLead.activity_history[0]);
assert.equal(metadata.transcript, recordingParams.get("TranscriptionText"));
assert.equal(metadata.recording_url, "https://api.twilio.com/recording.mp3");
assert.equal(metadata.call_duration_seconds, 180);

const recordingBTables = createTables();
const recordingBParams = new URLSearchParams({
  AccountSid: accountSid,
  CallSid: "CA-recording-b",
  From: "07712345679",
  To: twilioPhoneNumberB,
  RecordingSid: "RE-recording-b",
  RecordingUrl: "https://api.twilio.com/recording-b.mp3",
  RecordingDuration: "60",
  TranscriptionText:
    "My name is Bea Jones. I need grass cutting at 5 Church Road.",
});
const recordingBResponse = await handleRecordingCompleteWebhook(
  signedContext({
    tables: recordingBTables,
    pathName: "/api/ai-receptionist/twilio/recording-complete",
    params: recordingBParams,
    includeOrganizationId: false,
  })
);

assert.equal(recordingBResponse.status, 200);
assert.equal(recordingBTables.customer_leads.length, 1);
assert.equal(
  recordingBTables.customer_leads[0].organization_id,
  organizationBId,
  "customer B recording should create a lead only in customer B"
);

const duplicateRecordingTables = createTables();
const duplicateRecordingParams = new URLSearchParams({
  AccountSid: accountSid,
  CallSid: "CA-duplicate-recording",
  From: "07712345672",
  To: twilioPhoneNumber,
  RecordingSid: "RE-duplicate-recording",
  RecordingUrl: "https://api.twilio.com/duplicate-recording.mp3",
  RecordingDuration: "45",
  TranscriptionText: "My name is Dan. I need a quote for gutter cleaning.",
});
const firstDuplicateRecordingResponse = await handleRecordingCompleteWebhook(
  signedContext({
    tables: duplicateRecordingTables,
    pathName: "/api/ai-receptionist/twilio/recording-complete",
    params: duplicateRecordingParams,
    includeOrganizationId: false,
  })
);
const secondDuplicateRecordingResponse = await handleRecordingCompleteWebhook(
  signedContext({
    tables: duplicateRecordingTables,
    pathName: "/api/ai-receptionist/twilio/recording-complete",
    params: duplicateRecordingParams,
    includeOrganizationId: false,
  })
);
const secondDuplicateBody = JSON.parse(secondDuplicateRecordingResponse.body);

assert.equal(firstDuplicateRecordingResponse.status, 200);
assert.equal(secondDuplicateRecordingResponse.status, 200);
assert.equal(secondDuplicateBody.duplicate, true);
assert.equal(
  duplicateRecordingTables.customer_leads.length,
  1,
  "duplicate recording callback should not create a duplicate lead"
);

const crossTenantDuplicateTables = createTables();
crossTenantDuplicateTables.ai_receptionist_call_logs.push({
  organization_id: organizationAId,
  call_sid: "CA-cross-tenant-lead",
  account_sid: accountSid,
  caller_number: "07712345673",
  twilio_phone_number: twilioPhoneNumber,
  recording_url: null,
  duration_seconds: null,
  transcript: null,
  lead_id: "lead-owned-by-b",
  call_status: "recording-complete",
  notification_status: null,
  notification_error: null,
  raw_payload: {},
  created_at: "2026-06-05T09:00:00.000Z",
});
crossTenantDuplicateTables.customer_leads.push({
  id: "lead-owned-by-b",
  organization_id: organizationBId,
  activity_history: [],
  raw_payload: {},
  message: "",
  notes: "",
  extracted_data: {},
});
const crossTenantDuplicateParams = new URLSearchParams({
  AccountSid: accountSid,
  CallSid: "CA-cross-tenant-lead",
  From: "07712345673",
  To: twilioPhoneNumber,
  RecordingSid: "RE-cross-tenant-lead",
  RecordingUrl: "https://api.twilio.com/cross-tenant.mp3",
  RecordingDuration: "40",
  TranscriptionText: "This transcript must not be written to customer B.",
});
const crossTenantDuplicateResponse = await handleRecordingCompleteWebhook(
  signedContext({
    tables: crossTenantDuplicateTables,
    pathName: "/api/ai-receptionist/twilio/recording-complete",
    params: crossTenantDuplicateParams,
    includeOrganizationId: false,
  })
);

assert.equal(crossTenantDuplicateResponse.status, 200);
assert.equal(
  crossTenantDuplicateTables.customer_leads[0].message,
  "",
  "duplicate callback should not update a lead outside the resolved account"
);

const missingTranscriptTables = createTables();
const missingTranscriptParams = new URLSearchParams({
  AccountSid: accountSid,
  CallSid: "CA-no-transcript",
  From: "07700000000",
  To: twilioPhoneNumber,
  RecordingSid: "RE-no-transcript",
  RecordingUrl: "https://api.twilio.com/no-transcript.mp3",
  RecordingDuration: "30",
});
const missingTranscriptResponse = await handleRecordingCompleteWebhook(
  signedContext({
    tables: missingTranscriptTables,
    pathName: "/api/ai-receptionist/twilio/recording-complete",
    params: missingTranscriptParams,
  })
);

assert.equal(missingTranscriptResponse.status, 200);
assert.equal(missingTranscriptTables.customer_leads.length, 1);
assert.match(
  missingTranscriptTables.customer_leads[0].message,
  /Transcript is not available yet/
);
assert.equal(
  getAiReceptionistCallMetadata(
    missingTranscriptTables.customer_leads[0].activity_history[0]
  ).transcript,
  undefined
);

const missingRecordingTables = createTables();
const missingRecordingParams = new URLSearchParams({
  AccountSid: accountSid,
  CallSid: "CA-missing-recording",
  From: "07700000001",
  To: twilioPhoneNumber,
});
const missingRecordingResponse = await handleRecordingCompleteWebhook(
  signedContext({
    tables: missingRecordingTables,
    pathName: "/api/ai-receptionist/twilio/recording-complete",
    params: missingRecordingParams,
  })
);

assert.equal(missingRecordingResponse.status, 400);
assert.equal(missingRecordingTables.customer_leads.length, 0);
assert.equal(missingRecordingTables.ai_receptionist_call_logs.length, 1);

const callStatusTables = createTables();
const callStatusParams = new URLSearchParams({
  AccountSid: accountSid,
  CallSid: "CA-status",
  From: "07700000002",
  To: twilioPhoneNumber,
  CallStatus: "no-answer",
});
const callStatusResponse = await handleCallStatusWebhook(
  signedContext({
    tables: callStatusTables,
    pathName: "/api/ai-receptionist/twilio/call-status",
    params: callStatusParams,
  })
);

assert.equal(callStatusResponse.status, 200);
assert.equal(callStatusTables.ai_receptionist_call_logs[0].call_status, "no-answer");

const scopedTables = createTables();
scopedTables.ai_receptionist_call_logs.push(
  {
    id: "log-a",
    organization_id: organizationAId,
    call_sid: "CA-scoped-a",
    account_sid: accountSid,
    caller_number: "07700000003",
    twilio_phone_number: twilioPhoneNumber,
    recording_url: "https://api.twilio.com/a.mp3",
    duration_seconds: 120,
    transcript: "Customer A transcript",
    lead_id: "lead-a",
    call_status: "completed",
    outcome: "lead_captured",
    priority: "normal",
    notification_status: null,
    notification_error: null,
    raw_payload: {},
    created_at: "2026-06-05T09:00:00.000Z",
  },
  {
    id: "log-b",
    organization_id: organizationBId,
    call_sid: "CA-scoped-b",
    account_sid: accountSid,
    caller_number: "07700000004",
    twilio_phone_number: twilioPhoneNumberB,
    recording_url: "https://api.twilio.com/b.mp3",
    duration_seconds: 240,
    transcript: "Customer B transcript",
    lead_id: "lead-b",
    call_status: "completed",
    outcome: "lead_captured",
    priority: "normal",
    notification_status: null,
    notification_error: null,
    raw_payload: {},
    created_at: "2026-06-05T09:05:00.000Z",
  }
);

const scopedSupabase = createFakeSupabase(scopedTables);
const historyA = await getAiReceptionistCallHistory(scopedSupabase, organizationAId);
assert.deepEqual(
  historyA.items.map((item) => item.callSid),
  ["CA-scoped-a"],
  "customer A call history should not include customer B calls"
);

const statsA = await getAiReceptionistDashboardStats(
  scopedSupabase,
  organizationAId,
  new Date("2026-06-05T12:00:00.000Z")
);
assert.equal(statsA.todayCalls, 1);
assert.equal(statsA.leadsCreated, 1);

const settingsA = await getAiReceptionistPrivateSettings(
  scopedSupabase,
  organizationAId
);
assert.equal(settingsA.organizationId, organizationAId);
assert.equal(settingsA.twilioPhoneNumber, twilioPhoneNumber);
assert.notEqual(settingsA.twilioPhoneNumber, twilioPhoneNumberB);

console.log("AI Receptionist Twilio tests passed.");
