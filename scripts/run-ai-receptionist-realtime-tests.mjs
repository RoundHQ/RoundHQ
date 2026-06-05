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
  buildAiReceptionistRealtimeSessionConfig,
  buildAiReceptionistRealtimeSystemPrompt,
  detectAiReceptionistEmergency,
  formatAiReceptionistRealtimeTranscript,
  isAiReceptionistBusinessOpen,
  updateAiReceptionistLeadStateFromTranscript,
  createEmptyAiReceptionistLeadState,
} = require(
  path.join(projectRoot, "lib", "ai-receptionist", "realtime", "session.ts")
);
const {
  buildOpenAiRealtimeSessionUpdateEvent,
} = require(
  path.join(projectRoot, "lib", "ai-receptionist", "realtime", "openai.ts")
);
const {
  buildOpenAiAudioAppendEventFromTwilio,
  buildTwilioMediaEventFromOpenAiDelta,
  normalizeTwilioMediaStreamEvent,
} = require(
  path.join(projectRoot, "lib", "ai-receptionist", "realtime", "twilio-media.ts")
);
const {
  handleRealtimeSessionComplete,
  handleRealtimeSessionStart,
} = require(
  path.join(projectRoot, "lib", "ai-receptionist", "realtime", "handlers.ts")
);
const {
  buildRealtimeIncomingCallTwiML,
} = require(path.join(projectRoot, "lib", "ai-receptionist", "twilio", "index.ts"));
const {
  getAiReceptionistCallMetadata,
} = require(path.join(projectRoot, "lib", "ai-receptionist-leads.ts"));
const {
  getRealtimeRouteContext,
} = require(
  path.join(
    projectRoot,
    "app",
    "api",
    "ai-receptionist",
    "realtime",
    "route-utils.ts"
  )
);

const organizationId = "00000000-0000-4000-8000-000000000001";

const businessHours = {
  monday: { enabled: true, start: "08:00", end: "17:00" },
  tuesday: { enabled: true, start: "08:00", end: "17:00" },
  wednesday: { enabled: true, start: "08:00", end: "17:00" },
  thursday: { enabled: true, start: "08:00", end: "17:00" },
  friday: { enabled: true, start: "08:00", end: "17:00" },
  saturday: { enabled: false, start: "09:00", end: "13:00" },
  sunday: { enabled: false, start: "09:00", end: "13:00" },
};

const settings = {
  organizationId,
  enabled: true,
  businessName: "Cleancut Garden & Property Maintenance",
  greetingMessage:
    "Hello, thanks for calling {{business_name}}. I can take your details.",
  fallbackPhoneNumber: "",
  notificationEmail: "",
  twilioAccountSid: "AC1234567890abcdef",
  twilioPhoneNumber: "+441234567890",
  twilioAuthToken: "twilio-secret",
  twilioAuthTokenConfigured: true,
  realtimeEnabled: true,
  transferToNumber: "+447700900123",
  businessHoursEnabled: true,
  businessHours,
  questionsToAsk: [
    "Can I take your name?",
    "What service do you need?",
    "What is the property address?",
  ],
  emergencyKeywords: ["urgent", "dangerous tree", "fallen tree"],
  consentMessage: "This call may be recorded and transcribed.",
  leadSourceLabel: "AI Receptionist",
  createdAt: null,
  updatedAt: null,
  exists: true,
  schemaReady: true,
};

function createTables() {
  return {
    ai_receptionist_call_logs: [],
    customer_leads: [],
  };
}

class FakeBuilder {
  constructor(tables, table) {
    this.tables = tables;
    this.table = table;
    this.filters = [];
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

  order(key, options = {}) {
    this.orderKey = key;
    this.orderAscending = Boolean(options.ascending);
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

    for (const [key, value, operator] of this.filters) {
      if (operator === "gte") {
        rows = rows.filter((row) => String(row[key] ?? "") >= String(value));
      } else {
        rows = rows.filter((row) => row[key] === value);
      }
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
      const index = rows.findIndex(
        (entry) =>
          entry.organization_id === row.organization_id &&
          entry.call_sid === row.call_sid
      );

      if (index >= 0) {
        rows[index] = { ...rows[index], ...row };
      } else {
        rows.push(row);
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

assert.equal(
  isAiReceptionistBusinessOpen(settings, new Date(2026, 5, 4, 9, 42)),
  true,
  "business should be open during configured Thursday hours"
);
assert.equal(
  isAiReceptionistBusinessOpen(settings, new Date(2026, 5, 4, 19, 0)),
  false,
  "business should be closed outside configured Thursday hours"
);

const closedPrompt = buildAiReceptionistRealtimeSystemPrompt(settings, {
  now: new Date(2026, 5, 4, 19, 0),
});
assert.match(closedPrompt, /Cleancut Garden/);
assert.match(closedPrompt, /office is currently closed/i);
assert.match(closedPrompt, /Never promise appointments/);

let leadState = createEmptyAiReceptionistLeadState();
leadState = updateAiReceptionistLeadStateFromTranscript(leadState, {
  speaker: "caller",
  text:
    "My name is John Smith. My phone is 07712 345678. I need my hedge cut at 12 High Street.",
});
assert.equal(leadState.name, "John Smith");
assert.equal(leadState.phone, "07712 345678");
assert.equal(leadState.service_required, "Hedge trimming");
assert.match(leadState.address, /12 High Street/i);

const transcript = formatAiReceptionistRealtimeTranscript([
  { speaker: "ai", text: "Hello, thanks for calling.", atSeconds: 1 },
  { speaker: "caller", text: "Hi, I need my hedge cut.", atSeconds: 4 },
]);
assert.match(transcript, /\[00:01\]\nAI:/);
assert.match(transcript, /\[00:04\]\nCaller:/);

const emergency = detectAiReceptionistEmergency(
  "There is an urgent dangerous tree leaning over the driveway.",
  settings.emergencyKeywords
);
assert.equal(emergency.emergencyDetected, true);
assert.equal(emergency.priority, "high");
assert.ok(emergency.matchedKeywords.includes("dangerous tree"));

const sessionConfig = buildAiReceptionistRealtimeSessionConfig(settings, {
  now: new Date(2026, 5, 4, 9, 42),
});
const openAiEvent = buildOpenAiRealtimeSessionUpdateEvent(sessionConfig);
assert.equal(openAiEvent.type, "session.update");
assert.equal(openAiEvent.session.audio.input.format.type, "audio/pcmu");
assert.match(openAiEvent.session.instructions, /structured data live/);

const realtimeTwiML = buildRealtimeIncomingCallTwiML({
  settings,
  mediaStreamUrl:
    "wss://roundhq.example.com/api/ai-receptionist/twilio/realtime-media",
  callStatusCallbackUrl:
    "https://roundhq.example.com/api/ai-receptionist/twilio/call-status",
});
assert.match(realtimeTwiML, /<Connect>/);
assert.match(realtimeTwiML, /<Stream url="wss:\/\/roundhq\.example\.com/);
assert.match(realtimeTwiML, /mode" value="realtime"/);

const twilioMediaEvent = normalizeTwilioMediaStreamEvent({
  event: "media",
  streamSid: "MZ-stream",
  media: {
    payload: "base64-audio",
    timestamp: "123",
  },
});
assert.equal(twilioMediaEvent.event, "media");
assert.deepEqual(buildOpenAiAudioAppendEventFromTwilio(twilioMediaEvent), {
  type: "input_audio_buffer.append",
  audio: "base64-audio",
});
assert.deepEqual(buildTwilioMediaEventFromOpenAiDelta({
  streamSid: "MZ-stream",
  delta: "base64-ai-audio",
}), {
  event: "media",
  streamSid: "MZ-stream",
  media: {
    payload: "base64-ai-audio",
  },
});

const startTables = createTables();
const startResult = await handleRealtimeSessionStart({
  supabase: createFakeSupabase(startTables),
  settings,
  payload: {
    call_sid: "CA-start",
    caller_phone: "07712345678",
    twilio_phone_number: settings.twilioPhoneNumber,
  },
  now: new Date(2026, 5, 4, 9, 42),
});
assert.equal(startResult.status, 200);
assert.equal(startTables.ai_receptionist_call_logs.length, 1);
assert.equal(startTables.ai_receptionist_call_logs[0].call_type, "realtime");
assert.equal(startTables.ai_receptionist_call_logs[0].call_sid, "CA-start");

const completeTables = createTables();
const completeResult = await handleRealtimeSessionComplete({
  supabase: createFakeSupabase(completeTables),
  settings,
  payload: {
    call_sid: "CA-realtime",
    caller_phone: "07712345678",
    duration_seconds: 180,
    outcome: "lead_captured",
    transcript_entries: [
      {
        speaker: "ai",
        text: "Hello, thanks for calling Cleancut.",
        atSeconds: 1,
      },
      {
        speaker: "caller",
        text:
          "My name is John Smith. I urgently need hedge trimming at 12 High Street.",
        atSeconds: 4,
      },
    ],
  },
});
assert.equal(completeResult.status, 200);
assert.equal(completeTables.customer_leads.length, 1);
assert.equal(completeTables.ai_receptionist_call_logs[0].lead_id, completeResult.body.leadId);
assert.equal(completeTables.ai_receptionist_call_logs[0].emergency_detected, true);
assert.equal(completeTables.ai_receptionist_call_logs[0].priority, "high");
assert.match(completeTables.ai_receptionist_call_logs[0].transcript, /Caller:/);
assert.equal(
  completeTables.ai_receptionist_call_logs[0].structured_data.name,
  "John Smith"
);
assert.match(completeTables.ai_receptionist_call_logs[0].ai_summaries.detailed, /John Smith/);

const createdLead = completeTables.customer_leads[0];
assert.equal(createdLead.source, "ai_receptionist");
assert.equal(createdLead.status, "new");
assert.equal(createdLead.phone, "07712345678");
assert.equal(createdLead.extracted_data.priority, "high");
const metadata = getAiReceptionistCallMetadata(createdLead.activity_history[0]);
assert.equal(metadata.priority, "high");
assert.equal(metadata.emergency_detected, true);
assert.match(metadata.ai_summary_detailed, /John Smith/);
assert.match(metadata.transcript, /\[00:04\]\nCaller:/);

const partialTables = createTables();
const partialResult = await handleRealtimeSessionComplete({
  supabase: createFakeSupabase(partialTables),
  settings,
  payload: {
    call_sid: "CA-partial",
    caller_phone: "07700000000",
    transcript_entries: [
      {
        speaker: "caller",
        text: "I need grass cutting at 44 Park Road.",
        atSeconds: 2,
      },
    ],
  },
});
assert.equal(partialResult.status, 200);
assert.equal(partialTables.customer_leads.length, 1);
assert.equal(partialTables.customer_leads[0].service, "Garden maintenance");

const hangupTables = createTables();
const hangupResult = await handleRealtimeSessionComplete({
  supabase: createFakeSupabase(hangupTables),
  settings,
  payload: {
    call_sid: "CA-hangup",
    caller_phone: "07700000001",
    duration_seconds: 2,
  },
});
assert.equal(hangupResult.status, 200);
assert.equal(hangupResult.body.leadCreated, false);
assert.equal(hangupTables.customer_leads.length, 0);
assert.equal(hangupTables.ai_receptionist_call_logs[0].drop_off, true);

const invalidResult = await handleRealtimeSessionComplete({
  supabase: createFakeSupabase(createTables()),
  settings,
  payload: {
    caller_phone: "07700000002",
    transcript: "No call SID.",
  },
});
assert.equal(invalidResult.status, 400);
assert.match(invalidResult.body.error, /call_sid/);

const previousRealtimeToken = process.env.AI_RECEPTIONIST_REALTIME_TOKEN;
const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const previousFallbackOrganizationId =
  process.env.AI_RECEPTIONIST_ORGANIZATION_ID;
process.env.AI_RECEPTIONIST_REALTIME_TOKEN = "expected-realtime-token";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
process.env.AI_RECEPTIONIST_ORGANIZATION_ID =
  "00000000-0000-4000-8000-000000000099";
const missingOrganizationContext = await getRealtimeRouteContext(
  new Request("http://localhost/api/ai-receptionist/realtime/session", {
    method: "POST",
    headers: {
      authorization: "Bearer expected-realtime-token",
    },
  }),
  {
    call_sid: "CA-no-org",
  }
);
assert.equal(missingOrganizationContext.ok, false);
assert.equal(missingOrganizationContext.response.status, 400);
assert.match(
  (await missingOrganizationContext.response.json()).error,
  /organization_id is required/i
);
if (previousRealtimeToken === undefined) {
  delete process.env.AI_RECEPTIONIST_REALTIME_TOKEN;
} else {
  process.env.AI_RECEPTIONIST_REALTIME_TOKEN = previousRealtimeToken;
}
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

console.log("AI Receptionist realtime tests passed.");
