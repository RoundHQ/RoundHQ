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
  getTelnyxRecordingIdFromCallLog,
} = require(path.join(projectRoot, "lib", "ai-receptionist", "recordings.ts"));
const {
  getTelnyxRecordingDownloadUrl,
} = require(path.join(projectRoot, "lib", "ai-receptionist", "telnyx-platform.ts"));
const {
  handleTelnyxCallStatus,
  handleTelnyxIncomingCall,
  handleTelnyxRecordingComplete,
  handleTelnyxWebhook,
} = require(path.join(
  projectRoot,
  "lib",
  "ai-receptionist",
  "providers",
  "telnyx.ts"
));
const {
  decodeRoundHqCallReference,
} = require(path.join(
  projectRoot,
  "lib",
  "ai-receptionist",
  "realtime",
  "openai-sip.ts"
));
const {
  handleOpenAiRealtimeIncomingCall,
} = require(path.join(
  projectRoot,
  "lib",
  "ai-receptionist",
  "realtime",
  "openai-sip-handler.ts"
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

assert.equal(
  getTelnyxRecordingIdFromCallLog({
    provider: "telnyx",
    raw_payload: { recording_id: "recording-from-webhook" },
  }),
  "recording-from-webhook"
);

const recordingApiRequests = [];
const refreshedRecordingUrl = await getTelnyxRecordingDownloadUrl({
  config: {
    apiKey: telnyxApiKey,
    publicKey: telnyxPublicKey,
    connectionId: "telnyx-app-1",
    messagingProfileId: "messaging-profile-1",
    billingGroupId: "",
  },
  recordingId: "recording-from-webhook",
  fetchImpl: async (url, options) => {
    recordingApiRequests.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        data: {
          id: "recording-from-webhook",
          download_urls: {
            mp3: "https://recordings.example.test/fresh.mp3?signature=current",
          },
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  },
});
assert.equal(
  refreshedRecordingUrl,
  "https://recordings.example.test/fresh.mp3?signature=current"
);
assert.equal(
  recordingApiRequests[0].url,
  "https://api.telnyx.com/v2/recordings/recording-from-webhook"
);
assert.equal(
  recordingApiRequests[0].options.headers.authorization,
  `Bearer ${telnyxApiKey}`
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
function buildClientState(calledNumber) {
  return Buffer.from(
    JSON.stringify({ called_number: calledNumber }),
    "utf8"
  ).toString("base64");
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
assert.equal(telnyxApiCalls.length, 2, "incoming call should answer and play the greeting");
assert.equal(
  telnyxApiCalls[0].options.headers.authorization,
  `Bearer ${telnyxApiKey}`
);

const speakEndedBody = buildTelnyxBody("call.speak.ended", "event-speak-a", {
  call_control_id: "call-a",
  call_session_id: "session-a",
  client_state: buildClientState(telnyxPhoneNumberA),
});
const speakEndedResponse = await handleTelnyxWebhook(
  context({
    tables: incomingTables,
    rawBody: speakEndedBody,
    fetchImpl: async (url, options) => {
      telnyxApiCalls.push({ url: String(url), options });
      return okJsonResponse();
    },
  })
);
assert.equal(speakEndedResponse.status, 200);
assert.equal(telnyxApiCalls.length, 3, "recording should start after the greeting ends");
const recordRequest = telnyxApiCalls[2];
const recordRequestBody = JSON.parse(recordRequest.options.body);
assert.match(recordRequest.url, /\/record_start$/);
assert.equal(recordRequestBody.transcription, true);
assert.equal(recordRequestBody.transcription_language, "en-GB");
assert.equal(recordRequestBody.recording_track, "inbound");
assert.equal(
  JSON.parse(Buffer.from(recordRequestBody.client_state, "base64").toString("utf8"))
    .called_number,
  telnyxPhoneNumberA
);
assert.ok(recordRequestBody.command_id, "recording command should be idempotent");

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

const previousOpenAiApiKey = process.env.OPENAI_API_KEY;
const previousOpenAiProjectId = process.env.OPENAI_PROJECT_ID;
const previousOpenAiWebhookSecret = process.env.OPENAI_WEBHOOK_SECRET;
process.env.OPENAI_API_KEY = "sk-roundhq-test";
process.env.OPENAI_PROJECT_ID = "proj_roundhq_test";
process.env.OPENAI_WEBHOOK_SECRET = "whsec_roundhq_test";

const liveTables = createTables();
liveTables.ai_receptionist_settings[0].realtime_enabled = true;
const liveApiCalls = [];
const liveIncomingBody = buildTelnyxBody("call.initiated", "event-live-a", {
  call_control_id: "call-live-a",
  call_session_id: "session-live-a",
  from: "+447700900099",
  to: telnyxPhoneNumberA,
  call_status: "initiated",
});
const liveIncomingResponse = await handleTelnyxWebhook(
  context({
    tables: liveTables,
    rawBody: liveIncomingBody,
    fetchImpl: async (url, options) => {
      liveApiCalls.push({ url: String(url), options });
      return okJsonResponse();
    },
  })
);
assert.equal(liveIncomingResponse.status, 200);
assert.equal(liveIncomingResponse.body.mode, "realtime");
assert.equal(liveApiCalls.length, 3);
assert.match(liveApiCalls[0].url, /\/answer$/);
assert.match(liveApiCalls[1].url, /\/record_start$/);
assert.match(liveApiCalls[2].url, /\/transfer$/);

const liveRecordBody = JSON.parse(liveApiCalls[1].options.body);
assert.equal(liveRecordBody.recording_track, "both");
assert.equal(liveRecordBody.channels, "dual");
assert.equal(liveRecordBody.play_beep, false);
assert.equal(liveRecordBody.transcription, true);

const liveTransferBody = JSON.parse(liveApiCalls[2].options.body);
assert.equal(
  liveTransferBody.to,
  "sip:proj_roundhq_test@sip.api.openai.com;transport=tls"
);
assert.equal(liveTransferBody.sip_transport_protocol, "TLS");
assert.equal(liveTransferBody.media_encryption, "SRTP");
assert.equal(
  decodeRoundHqCallReference(liveTransferBody.sip_headers[0].value),
  "call-live-a"
);
const liveTargetState = JSON.parse(
  Buffer.from(liveTransferBody.target_leg_client_state, "base64").toString(
    "utf8"
  )
);
assert.equal(liveTargetState.parent_call_control_id, "call-live-a");
assert.equal(liveTargetState.called_number, telnyxPhoneNumberA);
assert.equal(liveTables.ai_receptionist_call_logs[0].call_type, "realtime");
assert.equal(
  liveTables.ai_receptionist_call_logs[0].call_status,
  "realtime-transfer-requested"
);

const acceptedOpenAiCalls = [];
const rejectedOpenAiCalls = [];
const greetedOpenAiCalls = [];
const openAiIncomingOptions = {
  supabase: createFakeSupabase(liveTables),
  data: {
    call_id: "rtc_live_a",
    sip_headers: liveTransferBody.sip_headers,
  },
  config: {
    apiKey: "sk-roundhq-test",
    projectId: "proj_roundhq_test",
    webhookSecret: "whsec_roundhq_test",
    model: "gpt-realtime-2.1",
    voice: "marin",
  },
  acceptCall: async (callId, payload) => {
    acceptedOpenAiCalls.push({ callId, payload });
  },
  rejectCall: async (callId, statusCode) => {
    rejectedOpenAiCalls.push({ callId, statusCode });
  },
  sendInitialGreeting: async (callId) => {
    greetedOpenAiCalls.push(callId);
  },
};
const openAiIncomingResponse = await handleOpenAiRealtimeIncomingCall(
  openAiIncomingOptions
);
assert.equal(openAiIncomingResponse.status, 200);
assert.equal(openAiIncomingResponse.body.accepted, true);
assert.equal(acceptedOpenAiCalls.length, 1);
assert.equal(acceptedOpenAiCalls[0].callId, "rtc_live_a");
assert.equal(acceptedOpenAiCalls[0].payload.model, "gpt-realtime-2.1");
assert.deepEqual(greetedOpenAiCalls, ["rtc_live_a"]);
assert.deepEqual(rejectedOpenAiCalls, []);
assert.equal(liveTables.ai_receptionist_call_logs[0].session_id, "rtc_live_a");
assert.equal(liveTables.ai_receptionist_call_logs[0].call_status, "openai-accepted");
assert.equal(
  liveTables.ai_receptionist_call_logs[0].ai_summaries.live_ai_status,
  "openai_accepted"
);

const duplicateOpenAiResponse = await handleOpenAiRealtimeIncomingCall(
  openAiIncomingOptions
);
assert.equal(duplicateOpenAiResponse.body.duplicate, true);
assert.equal(acceptedOpenAiCalls.length, 1);

const liveTargetLegBody = buildTelnyxBody(
  "call.initiated",
  "event-live-target",
  {
    call_control_id: "call-live-target",
    call_session_id: "session-live-target",
    client_state: liveTransferBody.target_leg_client_state,
    state: "parked",
  }
);
const liveTargetResponse = await handleTelnyxWebhook(
  context({
    tables: liveTables,
    rawBody: liveTargetLegBody,
    fetchImpl: async () => {
      throw new Error("The transferred target leg must not start another call flow.");
    },
  })
);
assert.equal(liveTargetResponse.status, 200);
assert.equal(liveTables.ai_receptionist_call_logs.length, 1);
assert.equal(liveTables.ai_receptionist_call_logs[0].call_sid, "call-live-a");

const acceptFailureTables = structuredClone(liveTables);
acceptFailureTables.ai_receptionist_call_logs[0].session_id = null;
acceptFailureTables.ai_receptionist_call_logs[0].ai_summaries = {};
await assert.rejects(
  handleOpenAiRealtimeIncomingCall({
    ...openAiIncomingOptions,
    supabase: createFakeSupabase(acceptFailureTables),
    data: {
      ...openAiIncomingOptions.data,
      call_id: "rtc_live_accept_failure",
    },
    acceptCall: async () => {
      throw new Error("OpenAI accept test failure.");
    },
    sendInitialGreeting: undefined,
  }),
  /OpenAI accept test failure/
);
assert.equal(
  acceptFailureTables.ai_receptionist_call_logs[0].call_status,
  "openai-accept-failed"
);
assert.equal(
  acceptFailureTables.ai_receptionist_call_logs[0].ai_summaries.live_ai_status,
  "openai_accept_failed"
);
assert.match(
  acceptFailureTables.ai_receptionist_call_logs[0].ai_summaries.live_ai_error,
  /OpenAI accept test failure/
);


const liveFallbackTables = createTables();
liveFallbackTables.ai_receptionist_settings[0].realtime_enabled = true;
const liveFallbackSetupCalls = [];
const liveFallbackIncomingBody = buildTelnyxBody(
  "call.initiated",
  "event-live-fallback",
  {
    call_control_id: "call-live-fallback",
    call_session_id: "session-live-fallback",
    from: "+447700900098",
    to: telnyxPhoneNumberA,
    call_status: "initiated",
  }
);
await handleTelnyxWebhook(
  context({
    tables: liveFallbackTables,
    rawBody: liveFallbackIncomingBody,
    fetchImpl: async (url, options) => {
      liveFallbackSetupCalls.push({ url: String(url), options });
      return okJsonResponse();
    },
  })
);
const fallbackTransferBody = JSON.parse(
  liveFallbackSetupCalls[2].options.body
);
const failedTargetBody = buildTelnyxBody(
  "call.hangup",
  "event-live-fallback-target",
  {
    call_control_id: "call-live-fallback-target",
    call_session_id: "session-live-fallback-target",
    client_state: fallbackTransferBody.target_leg_client_state,
    call_status: "hangup",
  }
);
const fallbackApiCalls = [];
const failedTargetResponse = await handleTelnyxWebhook(
  context({
    tables: liveFallbackTables,
    rawBody: failedTargetBody,
    fetchImpl: async (url, options) => {
      fallbackApiCalls.push({ url: String(url), options });
      return okJsonResponse();
    },
  })
);
assert.equal(failedTargetResponse.status, 200);
assert.equal(failedTargetResponse.body.fallback, "voicemail");
assert.equal(fallbackApiCalls.length, 2);
assert.match(fallbackApiCalls[0].url, /call-live-fallback\/actions\/answer$/);
assert.match(fallbackApiCalls[1].url, /call-live-fallback\/actions\/speak$/);
assert.equal(liveFallbackTables.ai_receptionist_call_logs[0].call_type, "voicemail");
assert.equal(liveFallbackTables.ai_receptionist_call_logs[0].call_status, "live-ai-fallback");
assert.equal(
  liveFallbackTables.ai_receptionist_call_logs[0].ai_summaries.live_ai_status,
  "openai_not_accepted"
);
assert.equal(
  liveFallbackTables.ai_receptionist_call_logs[0].ai_summaries.telnyx_hangup_cause,
  ""
);
assert.equal(liveFallbackTables.ai_receptionist_call_logs[0].ended_at, null);
if (previousOpenAiApiKey === undefined) {
  delete process.env.OPENAI_API_KEY;
} else {
  process.env.OPENAI_API_KEY = previousOpenAiApiKey;
}
if (previousOpenAiProjectId === undefined) {
  delete process.env.OPENAI_PROJECT_ID;
} else {
  process.env.OPENAI_PROJECT_ID = previousOpenAiProjectId;
}
if (previousOpenAiWebhookSecret === undefined) {
  delete process.env.OPENAI_WEBHOOK_SECRET;
} else {
  process.env.OPENAI_WEBHOOK_SECRET = previousOpenAiWebhookSecret;
}

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

const disabledFeatureTables = createTables();
disabledFeatureTables.customer_account_settings[0].feature_access.aiReceptionist = false;
const disabledFeatureResponse = await handleTelnyxIncomingCall(
  context({
    tables: disabledFeatureTables,
    rawBody: incomingBody,
    fetchImpl: async () => okJsonResponse(),
  })
);
assert.equal(disabledFeatureResponse.status, 403);
assert.match(String(disabledFeatureResponse.body.error), /not enabled/i);
assert.equal(disabledFeatureTables.ai_receptionist_call_logs.length, 0);

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

const asynchronousTables = createTables();
const asynchronousIncomingBody = buildTelnyxBody(
  "call.initiated",
  "event-async-incoming",
  {
    call_control_id: "call-async",
    call_session_id: "session-async",
    from: "+447700900010",
    to: telnyxPhoneNumberA,
  }
);
await handleTelnyxWebhook(
  context({
    tables: asynchronousTables,
    rawBody: asynchronousIncomingBody,
    fetchImpl: async () => okJsonResponse(),
  })
);
const asynchronousRecordingBody = buildTelnyxBody(
  "call.recording.saved",
  "event-async-recording",
  {
    call_control_id: "call-async",
    call_session_id: "session-async",
    recording_id: "recording-async",
    recording_urls: {
      mp3: "https://api.telnyx.com/recordings/recording-async.mp3",
    },
    duration_millis: 61000,
    client_state: buildClientState(telnyxPhoneNumberA),
  }
);
const asynchronousRecordingResponse = await handleTelnyxWebhook(
  context({
    tables: asynchronousTables,
    rawBody: asynchronousRecordingBody,
  })
);
assert.equal(asynchronousRecordingResponse.status, 200);
assert.equal(asynchronousRecordingResponse.body.pending, true);
assert.equal(
  asynchronousTables.customer_leads.length,
  0,
  "recording callback should wait for the asynchronous transcript"
);
assert.equal(
  asynchronousTables.ai_receptionist_call_logs[0].recording_url,
  "https://api.telnyx.com/recordings/recording-async.mp3"
);

const asynchronousTranscriptBody = buildTelnyxBody(
  "call.recording.transcription.saved",
  "event-async-transcript",
  {
    call_control_id: "call-async",
    call_session_id: "session-async",
    recording_id: "recording-async",
    recording_transcription_id: "transcription-async",
    status: "completed",
    transcription_text:
      "My name is Sarah Jones. I need gutter cleaning at 14 Station Road.",
    client_state: buildClientState(telnyxPhoneNumberA),
  }
);
const asynchronousTranscriptResponse = await handleTelnyxWebhook(
  context({
    tables: asynchronousTables,
    rawBody: asynchronousTranscriptBody,
  })
);
assert.equal(asynchronousTranscriptResponse.status, 200);
assert.equal(asynchronousTables.customer_leads.length, 1);
assert.equal(asynchronousTables.customer_leads[0].service, "Gutter cleaning");
assert.equal(asynchronousTables.customer_leads[0].phone, "+447700900010");
assert.equal(
  asynchronousTables.ai_receptionist_call_logs[0].recording_url,
  "https://api.telnyx.com/recordings/recording-async.mp3",
  "transcription callback should preserve recording details from the earlier event"
);
assert.equal(
  asynchronousTables.ai_receptionist_call_logs[0].lead_id,
  asynchronousTranscriptResponse.body.leadId
);

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

recordingAccessTables.ai_receptionist_call_logs.push({
  id: "log-c",
  organization_id: organizationAId,
  provider: "telnyx",
  call_sid: "recording-access-c",
  recording_url: null,
  raw_payload: { recording_id: "provider-recording-c" },
});
const recordingC = await getAiReceptionistRecordingForPlayback(
  createFakeSupabase(recordingAccessTables),
  organizationAId,
  "recording-access-c"
);
assert.equal(
  getTelnyxRecordingIdFromCallLog(recordingC),
  "provider-recording-c",
  "playback should work from a stored Telnyx recording ID even without a webhook URL"
);

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
