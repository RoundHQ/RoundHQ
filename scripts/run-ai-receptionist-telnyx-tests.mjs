import assert from "node:assert/strict";
import crypto from "node:crypto";
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

process.env.AI_RECEPTIONIST_SECRET_ENCRYPTION_KEY =
  "roundhq-ai-receptionist-test-secret";

const {
  encryptAiReceptionistSecretForStorage,
  decryptAiReceptionistSecretFromStorage,
} = require(path.join(
  projectRoot,
  "lib",
  "ai-receptionist",
  "secret-encryption.ts"
));
const {
  getAiReceptionistCallMetadata,
} = require(path.join(projectRoot, "lib", "ai-receptionist-leads.ts"));
const {
  getAiReceptionistRecordingForPlayback,
} = require(path.join(projectRoot, "lib", "ai-receptionist", "recordings.ts"));
const {
  handleTelnyxCallStatus,
  handleTelnyxIncomingCall,
  handleTelnyxRecordingComplete,
} = require(path.join(
  projectRoot,
  "lib",
  "ai-receptionist",
  "providers",
  "telnyx.ts"
));
const {
  sendAiReceptionistSms,
} = require(path.join(
  projectRoot,
  "lib",
  "ai-receptionist",
  "providers",
  "index.ts"
));

const organizationAId = "00000000-0000-4000-8000-000000000001";
const organizationBId = "00000000-0000-4000-8000-000000000002";
const telnyxPhoneNumberA = "+441234567890";
const telnyxPhoneNumberB = "+441234567891";
const telnyxApiKey = "KEY-test-telnyx-secret";
const encryptedTelnyxApiKey = encryptAiReceptionistSecretForStorage(telnyxApiKey);
const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const telnyxPublicKey = publicKey.export({
  type: "spki",
  format: "pem",
}).toString();

assert.notEqual(encryptedTelnyxApiKey, telnyxApiKey);
assert.match(encryptedTelnyxApiKey, /^enc:v1:/);
assert.equal(
  decryptAiReceptionistSecretFromStorage(encryptedTelnyxApiKey),
  telnyxApiKey,
  "Telnyx API key should be encrypted at rest and decryptable server-side"
);

function buildSettingsRow(organization_id, telnyx_phone_number, business_name) {
  return {
    organization_id,
    enabled: true,
    business_name,
    greeting_message:
      "Hello, thanks for calling {{business_name}}. Please leave a message.",
    fallback_phone_number: "+447700900000",
    notification_email: "",
    telephony_provider: "telnyx",
    telnyx_api_key: encryptedTelnyxApiKey,
    telnyx_connection_id: "telnyx-app-1",
    telnyx_messaging_profile_id: "messaging-profile-1",
    telnyx_public_key: telnyxPublicKey,
    telnyx_phone_number,
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_phone_number: "",
    realtime_enabled: false,
    transfer_to_number: "",
    new_lead_sms_enabled: false,
    new_lead_sms_phone_number: "",
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
    ai_receptionist_settings: [
      buildSettingsRow(organizationAId, telnyxPhoneNumberA, "RoundHQ Test Co A"),
      buildSettingsRow(organizationBId, telnyxPhoneNumberB, "RoundHQ Test Co B"),
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

    for (const [key, value] of this.filters) {
      rows = rows.filter((row) => row[key] === value);
    }

    for (const key of this.notNullFilters) {
      rows = rows.filter((row) => row[key] !== null && row[key] !== undefined);
    }

    return this.limitValue == null ? rows : rows.slice(0, this.limitValue);
  }

  execute() {
    if (this.operation === "upsert") {
      const rows = this.tables[this.table];
      const row = this.payload;
      const index = rows.findIndex(
        (entry) =>
          entry.organization_id === row.organization_id &&
          entry.call_sid === row.call_sid
      );

      if (index >= 0) {
        rows[index] = { ...rows[index], ...row };
      } else {
        rows.push({
          id: `log-${rows.length + 1}`,
          created_at: new Date().toISOString(),
          ...row,
        });
      }

      return {
        data: this.single ? rows[index >= 0 ? index : rows.length - 1] : rows,
        error: null,
      };
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

function buildTelnyxBody(eventType, id, payload) {
  return JSON.stringify({
    data: {
      id,
      event_type: eventType,
      payload,
    },
  });
}

function signedHeaders(rawBody, options = {}) {
  const timestamp =
    options.timestamp ?? Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .sign(null, Buffer.from(`${timestamp}|${rawBody}`), privateKey)
    .toString("base64");

  return new Headers({
    "telnyx-timestamp": timestamp,
    "telnyx-signature-ed25519": options.signature ?? signature,
  });
}

function context({ tables, rawBody, headers = signedHeaders(rawBody), fetchImpl }) {
  return {
    supabase: createFakeSupabase(tables),
    rawBody,
    headers,
    baseUrl: "https://example.com",
    fetchImpl,
  };
}

function okJsonResponse(body = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

const incomingTables = createTables();
const telnyxApiCalls = [];
const incomingBody = buildTelnyxBody("call.initiated", "event-incoming-a", {
  call_control_id: "call-a",
  call_session_id: "session-a",
  from: "+447700900001",
  to: telnyxPhoneNumberA,
  call_status: "initiated",
});
const incomingResponse = await handleTelnyxIncomingCall(
  context({
    tables: incomingTables,
    rawBody: incomingBody,
    fetchImpl: async (url, options) => {
      telnyxApiCalls.push({ url: String(url), options });
      return okJsonResponse();
    },
  })
);

assert.equal(incomingResponse.status, 200);
assert.equal(incomingTables.ai_receptionist_call_logs.length, 1);
assert.equal(incomingTables.ai_receptionist_call_logs[0].organization_id, organizationAId);
assert.equal(incomingTables.ai_receptionist_call_logs[0].provider, "telnyx");
assert.equal(telnyxApiCalls.length, 3, "incoming call should answer, speak, and record");
assert.equal(
  telnyxApiCalls[0].options.headers.authorization,
  `Bearer ${telnyxApiKey}`
);

const incomingBTables = createTables();
const incomingBBody = buildTelnyxBody("call.initiated", "event-incoming-b", {
  call_control_id: "call-b",
  call_session_id: "session-b",
  from: "+447700900002",
  to: telnyxPhoneNumberB,
  call_status: "initiated",
});
const incomingBResponse = await handleTelnyxIncomingCall(
  context({
    tables: incomingBTables,
    rawBody: incomingBBody,
    fetchImpl: async () => okJsonResponse(),
  })
);
assert.equal(incomingBResponse.status, 200);
assert.equal(incomingBTables.ai_receptionist_call_logs[0].organization_id, organizationBId);

const unknownTables = createTables();
const unknownBody = buildTelnyxBody("call.initiated", "event-unknown", {
  call_control_id: "call-unknown",
  from: "+447700900003",
  to: "+441234560000",
});
const unknownResponse = await handleTelnyxIncomingCall(
  context({ tables: unknownTables, rawBody: unknownBody })
);
assert.equal(unknownResponse.status, 403);
assert.equal(unknownTables.ai_receptionist_call_logs.length, 0);

const invalidSignatureResponse = await handleTelnyxIncomingCall(
  context({
    tables: createTables(),
    rawBody: incomingBody,
    headers: signedHeaders(incomingBody, { signature: "bad-signature" }),
  })
);
assert.equal(invalidSignatureResponse.status, 403);
assert.match(String(invalidSignatureResponse.body.error), /signature/i);

const recordingTables = createTables();
const recordingBody = buildTelnyxBody("call.recording.saved", "event-recording-a", {
  call_control_id: "call-recording-a",
  call_session_id: "session-recording-a",
  from: "+447700900004",
  to: telnyxPhoneNumberA,
  recording_id: "recording-a",
  recording_urls: {
    mp3: "https://api.telnyx.com/recordings/recording-a.mp3",
  },
  duration_millis: 180000,
  transcription_text:
    "My name is John Smith. I need hedge trimming at 12 High Street.",
});
const recordingResponse = await handleTelnyxRecordingComplete(
  context({ tables: recordingTables, rawBody: recordingBody })
);

assert.equal(recordingResponse.status, 200);
assert.equal(recordingTables.customer_leads.length, 1);
assert.equal(recordingTables.customer_leads[0].organization_id, organizationAId);
assert.equal(recordingTables.customer_leads[0].source, "ai_receptionist");
assert.equal(recordingTables.customer_leads[0].service, "Hedge trimming");
assert.equal(recordingTables.ai_receptionist_call_logs[0].recording_url, "https://api.telnyx.com/recordings/recording-a.mp3");
assert.equal(recordingTables.ai_receptionist_call_logs[0].lead_id, recordingResponse.body.leadId);
const metadata = getAiReceptionistCallMetadata(
  recordingTables.customer_leads[0].activity_history[0]
);
assert.equal(metadata.recording_id, "call-recording-a");
assert.equal(metadata.recording_url, undefined, "raw provider recording URL should not be exposed in lead activity");
assert.equal(metadata.provider, "telnyx");
assert.match(metadata.transcript, /John Smith/);

const duplicateTables = createTables();
const firstDuplicateResponse = await handleTelnyxRecordingComplete(
  context({ tables: duplicateTables, rawBody: recordingBody })
);
const secondDuplicateResponse = await handleTelnyxRecordingComplete(
  context({ tables: duplicateTables, rawBody: recordingBody })
);
assert.equal(firstDuplicateResponse.status, 200);
assert.equal(secondDuplicateResponse.status, 200);
assert.equal(secondDuplicateResponse.body.duplicate, true);
assert.equal(
  duplicateTables.customer_leads.length,
  1,
  "duplicate Telnyx recording callback should not create a duplicate lead"
);

const failedTranscriptTables = createTables();
const failedTranscriptBody = buildTelnyxBody("call.recording.saved", "event-recording-failed", {
  call_control_id: "call-recording-failed",
  call_session_id: "session-recording-failed",
  from: "+447700900005",
  to: telnyxPhoneNumberA,
  recording_id: "recording-failed",
  recording_url: "https://api.telnyx.com/recordings/failed.mp3",
  transcription_status: "failed",
});
const failedTranscriptResponse = await handleTelnyxRecordingComplete(
  context({ tables: failedTranscriptTables, rawBody: failedTranscriptBody })
);
assert.equal(failedTranscriptResponse.status, 200);
assert.equal(failedTranscriptTables.customer_leads.length, 1);
assert.match(
  failedTranscriptTables.customer_leads[0].message,
  /Transcription failed/i,
  "transcription failure should still create a basic lead"
);
assert.equal(
  getAiReceptionistCallMetadata(
    failedTranscriptTables.customer_leads[0].activity_history[0]
  ).recording_status,
  "failed"
);

const statusTables = createTables();
const statusBody = buildTelnyxBody("call.hangup", "event-status-a", {
  call_control_id: "call-status-a",
  call_session_id: "session-status-a",
  from: "+447700900006",
  to: telnyxPhoneNumberA,
  call_status: "hangup",
});
const statusResponse = await handleTelnyxCallStatus(
  context({ tables: statusTables, rawBody: statusBody })
);
assert.equal(statusResponse.status, 200);
assert.equal(statusTables.ai_receptionist_call_logs[0].call_status, "hangup");
assert.equal(statusTables.ai_receptionist_call_logs[0].provider_event_id, "event-status-a");

const recordingAccessTables = createTables();
recordingAccessTables.ai_receptionist_call_logs.push(
  {
    id: "log-a",
    organization_id: organizationAId,
    provider: "telnyx",
    call_sid: "recording-access-a",
    recording_url: "https://api.telnyx.com/recordings/a.mp3",
  },
  {
    id: "log-b",
    organization_id: organizationBId,
    provider: "telnyx",
    call_sid: "recording-access-b",
    recording_url: "https://api.telnyx.com/recordings/b.mp3",
  }
);
const recordingA = await getAiReceptionistRecordingForPlayback(
  createFakeSupabase(recordingAccessTables),
  organizationAId,
  "recording-access-a"
);
const recordingBFromA = await getAiReceptionistRecordingForPlayback(
  createFakeSupabase(recordingAccessTables),
  organizationAId,
  "recording-access-b"
);
assert.equal(recordingA.recording_url, "https://api.telnyx.com/recordings/a.mp3");
assert.equal(recordingBFromA, null, "customer A should not access customer B recordings");

const smsTables = createTables();
const smsCalls = [];
const smsResult = await sendAiReceptionistSms({
  organisationId: organizationAId,
  to: "+447700900007",
  message: "Test SMS",
  relatedLeadId: "lead-a",
  supabase: createFakeSupabase(smsTables),
  fetchImpl: async (url, options) => {
    smsCalls.push({ url: String(url), options });
    return okJsonResponse({ data: { id: "sms-1" } });
  },
});
assert.equal(smsResult.ok, true);
assert.equal(smsResult.providerMessageId, "sms-1");
assert.match(smsCalls[0].url, /\/v2\/messages$/);
assert.equal(smsCalls[0].options.headers.authorization, `Bearer ${telnyxApiKey}`);
assert.equal(JSON.parse(smsCalls[0].options.body).messaging_profile_id, "messaging-profile-1");

console.log("AI Receptionist Telnyx tests passed.");
