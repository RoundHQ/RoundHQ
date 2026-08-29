import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const schedulerPath = path.join(process.cwd(), "lib", "scheduling", "quote-scheduler.ts");
const source = fs.readFileSync(schedulerPath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  },
});
const cjsModule = { exports: {} };

vm.runInNewContext(compiled.outputText, {
  exports: cjsModule.exports,
  module: cjsModule,
  require,
  console,
  Date,
  Intl,
  Math,
  Number,
  String,
  Set,
  Array,
  Object,
  Boolean,
});

const {
  DEFAULT_AUTO_SCHEDULING_SETTINGS,
  buildSchedulingEmailDrafts,
  chooseSchedulingSlot,
  normalizeAutoSchedulingSettings,
} = cjsModule.exports;

function settings(overrides = {}) {
  return normalizeAutoSchedulingSettings({
    ...DEFAULT_AUTO_SCHEDULING_SETTINGS,
    enabled: true,
    mode: "auto",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    workingHours: {
      ...DEFAULT_AUTO_SCHEDULING_SETTINGS.workingHours,
      Monday: { enabled: true, start: "09:00", end: "17:00" },
      Tuesday: { enabled: true, start: "09:00", end: "17:00" },
      Wednesday: { enabled: true, start: "09:00", end: "17:00" },
      Thursday: { enabled: true, start: "09:00", end: "17:00" },
      Friday: { enabled: true, start: "09:00", end: "17:00" },
    },
    unavailableWindows: [],
    allowServiceRoundDays: true,
    defaultTravelBufferMinutes: 15,
    postcodeGrouping: "outward",
    ...overrides,
  });
}

function quote(overrides = {}) {
  return {
    id: "quote-1",
    quoteNumber: "Q-0001",
    customerId: 1,
    customerName: "Jane Smith",
    customerAddress: "10 Green Lane",
    customerPostcode: "G75 1AA",
    workType: "Hedge cutting",
    estimatedDurationMinutes: 90,
    ...overrides,
  };
}

function decide(options = {}) {
  return chooseSchedulingSlot({
    settings: settings(options.settings),
    quote: quote(options.quote),
    jobs: options.jobs ?? [],
    serviceRoundDateKeys: options.serviceRoundDateKeys ?? [],
    now: new Date("2026-05-18T08:00:00"),
    searchDays: options.searchDays ?? 10,
  });
}

const enabledDecision = decide();
assert.equal(enabledDecision.status, "scheduled", "auto scheduling should schedule");
assert.equal(enabledDecision.slot?.date, "2026-05-18", "first valid day should be chosen");

const disabledDecision = decide({ settings: { enabled: false, mode: "off" } });
assert.equal(disabledDecision.status, "skipped", "off mode should skip");
assert.equal(disabledDecision.reason, "off");

const suggestDecision = decide({ settings: { mode: "suggest" } });
assert.equal(suggestDecision.status, "suggested", "suggest mode should not schedule");

const workTypeDecision = decide({
  jobs: [
    {
      id: "job-hedge",
      title: "Hedge cutting - Alex",
      date: "2026-05-21",
      startTime: "09:00",
      finishTime: "10:00",
      workType: "Hedge cutting",
      quoteIds: [],
    },
  ],
});
assert.equal(
  workTypeDecision.slot?.date,
  "2026-05-21",
  "same work type day should be preferred"
);
assert.equal(workTypeDecision.reason, "same_work_type");

const locationDecision = decide({
  quote: { workType: "Pressure washing", customerPostcode: "G75 1AA" },
  jobs: [
    {
      id: "job-nearby",
      title: "Garden clearance",
      date: "2026-05-20",
      startTime: "10:00",
      finishTime: "11:00",
      workType: "Garden clearance",
      postcode: "G75 9BB",
      quoteIds: [],
    },
  ],
});
assert.equal(locationDecision.slot?.date, "2026-05-20", "nearby postcode day should be preferred");
assert.equal(locationDecision.reason, "location_grouping");

const serviceRoundAllowed = decide({
  settings: { workingDays: ["Monday"], allowServiceRoundDays: true },
  serviceRoundDateKeys: ["2026-05-18"],
});
assert.equal(serviceRoundAllowed.status, "scheduled", "service round days can be allowed");

const serviceRoundBlocked = decide({
  settings: { workingDays: ["Monday", "Tuesday"], allowServiceRoundDays: false },
  serviceRoundDateKeys: ["2026-05-18"],
});
assert.equal(serviceRoundBlocked.slot?.date, "2026-05-19", "blocked service round day should be skipped");

const noSlot = decide({
  settings: {
    workingDays: ["Monday"],
    workingHours: {
      ...DEFAULT_AUTO_SCHEDULING_SETTINGS.workingHours,
      Monday: { enabled: true, start: "09:00", end: "10:00" },
    },
  },
  quote: { estimatedDurationMinutes: 180 },
});
assert.equal(noSlot.status, "manual_required", "job too long should need manual scheduling");

const duplicate = decide({
  jobs: [
    {
      id: "job-existing",
      title: "Quoted Work - Jane",
      date: "2026-05-18",
      quoteIds: ["quote-1"],
    },
  ],
});
assert.equal(duplicate.status, "skipped", "duplicate quote acceptance should not schedule twice");
assert.equal(duplicate.reason, "already_scheduled");

const missingEstimate = decide({ quote: { estimatedDurationMinutes: null } });
assert.equal(missingEstimate.status, "manual_required", "missing estimate should need manual scheduling");
assert.equal(missingEstimate.reason, "missing_estimated_time");

const conflict = decide({
  jobs: [
    {
      id: "job-conflict",
      title: "Existing job",
      date: "2026-05-18",
      startTime: "09:00",
      finishTime: "11:00",
      quoteIds: [],
    },
  ],
});
assert.equal(conflict.slot?.startTime, "11:15", "existing jobs and buffer should be avoided");

const databaseTimeConflict = decide({
  jobs: [
    {
      id: "job-database-time-conflict",
      title: "Existing Supabase job",
      date: "2026-05-18",
      startTime: "09:00:00",
      finishTime: "11:00:00",
      quoteIds: [],
    },
  ],
});
assert.equal(
  databaseTimeConflict.slot?.startTime,
  "11:15",
  "database time values with seconds should be avoided"
);

const emailDrafts = buildSchedulingEmailDrafts({
  quote: quote(),
  decision: enabledDecision,
  businessName: "RoundHQ Demo",
  businessEmail: "demo@roundhq.co.uk",
  businessPhone: "01355 555 555",
});
assert.match(emailDrafts.customerMessage, /approximately|approximate/i, "customer email should mention approximate timing");
assert.match(emailDrafts.customerMessage, /between 09:00 and 09:30/, "customer email should use a 30-minute arrival window");
assert.match(emailDrafts.operatorMessage, /Estimated time: 1h 30m/, "operator email should include estimate");
assert.match(emailDrafts.operatorMessage, /Reason:/, "operator email should include slot reason");

const schedulePageSource = fs.readFileSync(
  path.join(process.cwd(), "components", "jobs", "schedule-page.tsx"),
  "utf8"
);
assert.match(schedulePageSource, /Email schedule confirmation/);
assert.match(schedulePageSource, /sendCustomerConfirmation/);

const jobsAppSource = fs.readFileSync(
  path.join(process.cwd(), "components", "jobs-app.tsx"),
  "utf8"
);
assert.match(jobsAppSource, /sendOperator: false/);
assert.match(jobsAppSource, /Sent schedule confirmation by email/);

console.log("Scheduling tests passed.");
