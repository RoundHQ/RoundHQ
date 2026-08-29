import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadTypeScriptModule(relativePath, aliases = {}) {
  const filePath = path.join(process.cwd(), relativePath);
  const source = fs.readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      esModuleInterop: true,
    },
  });
  const cjsModule = { exports: {} };
  const localRequire = (specifier) =>
    Object.hasOwn(aliases, specifier) ? aliases[specifier] : require(specifier);
  vm.runInNewContext(compiled.outputText, {
    exports: cjsModule.exports,
    module: cjsModule,
    require: localRequire,
    console,
    Date,
    Intl,
    Math,
    Number,
    String,
    Set,
    Map,
    Array,
    Object,
    Boolean,
    URL,
    process,
  });
  return cjsModule.exports;
}

const dates = loadTypeScriptModule("lib/dates.ts");
const urls = loadTypeScriptModule("lib/urls.ts");
const recurring = loadTypeScriptModule("lib/recurring-invoices.ts");
const followUp = loadTypeScriptModule("lib/follow-up.ts");
const vat = loadTypeScriptModule("lib/vat-threshold.ts");
const messaging = loadTypeScriptModule("lib/messaging/core.ts", {
  "@/lib/dates": dates,
});
const paymentProvider = loadTypeScriptModule("lib/payments/provider.ts");

assert.equal(dates.formatUkDate("2026-07-04"), "04/07/2026");
assert.equal(dates.getBusinessIsoDate("2026-07-31T23:30:00.000Z"), "2026-08-01");
assert.equal(dates.getBusinessIsoDate("2026-12-31T23:30:00.000Z"), "2026-12-31");
assert.equal(dates.addCalendarDays("2026-12-31", 1), "2027-01-01");
assert.equal(
  dates.zonedLocalDateTimeToUtc("2026-03-28", "18:00").toISOString(),
  "2026-03-28T18:00:00.000Z"
);
assert.equal(
  dates.zonedLocalDateTimeToUtc("2026-03-29", "18:00").toISOString(),
  "2026-03-29T17:00:00.000Z"
);
assert.equal(
  dates.zonedLocalDateTimeToUtc("2026-10-24", "18:00").toISOString(),
  "2026-10-24T17:00:00.000Z"
);
assert.equal(
  dates.zonedLocalDateTimeToUtc("2026-10-25", "18:00").toISOString(),
  "2026-10-25T18:00:00.000Z"
);

const productionEnvironment = {
  NEXT_PUBLIC_SITE_URL: "https://www.roundhq.co.uk/",
};
assert.equal(
  urls.getCanonicalBaseUrl(null, productionEnvironment),
  "https://www.roundhq.co.uk"
);
assert.equal(
  urls.buildCanonicalUrl("dashboard?page=quotes", null, productionEnvironment),
  "https://www.roundhq.co.uk/dashboard?page=quotes"
);
assert.equal(
  urls.buildSecureDocumentUrl("a/b ?", null, productionEnvironment),
  "https://www.roundhq.co.uk/share/a%2Fb%20%3F"
);
assert.equal(urls.getSafeInternalPath("//attacker.example"), "/dashboard");
assert.equal(urls.getSafeInternalPath("https://attacker.example"), "/dashboard");
assert.equal(urls.getSafeInternalPath("/dashboard?page=invoices#paid"), "/dashboard?page=invoices#paid");
assert.equal(urls.isSafePublicOrigin("https://www.roundhq.co.uk"), true);
assert.equal(urls.isSafePublicOrigin("http://localhost:3000"), false);

const stripeRequestKey = paymentProvider.getPaymentRequestIdempotencyKey({
  organizationId: "org-1",
  invoiceId: "invoice-1",
  provider: "stripe",
  amount: 125.5,
  version: "2026-08-11T10:00:00.000Z",
});
assert.equal(stripeRequestKey.length, 64);
assert.equal(
  stripeRequestKey,
  paymentProvider.getPaymentRequestIdempotencyKey({
    organizationId: "org-1",
    invoiceId: "invoice-1",
    provider: "stripe",
    amount: 125.5,
    version: "2026-08-11T10:00:00.000Z",
  })
);
assert.notEqual(
  stripeRequestKey,
  paymentProvider.getPaymentRequestIdempotencyKey({
    organizationId: "org-2",
    invoiceId: "invoice-1",
    provider: "stripe",
    amount: 125.5,
    version: "2026-08-11T10:00:00.000Z",
  })
);
assert.equal(paymentProvider.mapGoCardlessPaymentRequestStatus("paid_out"), "paid");
assert.equal(paymentProvider.mapGoCardlessPaymentRequestStatus("charged_back"), "failed");

const deletedAt = "2026-08-11T10:00:00.000Z";
const schedule = { id: "schedule-1", isActive: true, nextSendDate: "2026-08-11" };
const deactivated = recurring.deactivateRecurringInvoiceSchedule(schedule, deletedAt);
assert.equal(deactivated.isActive, false);
assert.equal(deactivated.deletedAt, deletedAt);
assert.equal(
  recurring.deactivateRecurringInvoiceSchedule(deactivated, "2026-08-12T00:00:00.000Z").deletedAt,
  deletedAt
);
assert.deepEqual(
  recurring.getDueRecurringInvoiceSchedules(
    [
      schedule,
      { id: "inactive", isActive: false, nextSendDate: "2026-08-10" },
      { id: "deleted", isActive: true, deletedAt, nextSendDate: "2026-08-10" },
      { id: "future", isActive: true, nextSendDate: "2026-08-12" },
    ],
    "2026-08-11"
  ).map((entry) => entry.id),
  ["schedule-1"]
);
const issuedInvoices = [{ id: "invoice-1", paid: true }];
recurring.deactivateRecurringInvoiceSchedule(schedule, deletedAt);
assert.deepEqual(issuedInvoices, [{ id: "invoice-1", paid: true }]);

const quote = {
  id: "quote-1",
  date: "2026-08-01",
  sentAt: "2026-08-03T10:00:00.000Z",
  status: "Sent",
  total: 120,
  customerName: "Jamie",
};
assert.equal(followUp.isQuoteEligibleForFollowUp(quote, "2026-08-05", 3), false);
assert.equal(followUp.isQuoteEligibleForFollowUp(quote, "2026-08-06", 3), true);
assert.equal(followUp.isQuoteEligibleForFollowUp({ ...quote, status: "Approved", sentAt: undefined }, "2026-08-20", 3), false);
assert.equal(followUp.isQuoteEligibleForFollowUp(quote, "2026-08-20", 3, true), false);
assert.equal(
  followUp.isInvoiceEligibleForFollowUp(
    { ...quote, status: "Unpaid", dueDate: "2026-08-08" },
    "2026-08-10",
    2
  ),
  true
);
assert.equal(
  followUp.isInvoiceEligibleForFollowUp(
    { ...quote, status: "Voided", dueDate: "2026-08-01" },
    "2026-08-10",
    0
  ),
  false
);

const vatInvoices = [
  { id: "start", date: "2025-08-12", status: "Paid", total: 40_000 },
  { id: "end", date: "2026-08-11", status: "Sent", total: 40_000, refundedAmount: 5_000 },
  { id: "before", date: "2025-08-11", status: "Paid", total: 100_000 },
  { id: "draft", date: "2026-08-01", status: "Draft", total: 100_000 },
  { id: "void", date: "2026-08-01", status: "Paid", total: 100_000, voidedAt: "2026-08-02" },
];
const vatWindow = vat.getRollingVatWindow("2026-08-11");
assert.equal(vatWindow.start, "2025-08-12");
assert.equal(vatWindow.end, "2026-08-11");
assert.equal(vat.calculateRollingTaxableTurnover(vatInvoices, "2026-08-11"), 75_000);
assert.equal(vat.getVatThresholdSnapshot({ invoices: vatInvoices, asOfIsoDate: "2026-08-11" }).status, "Getting close");
assert.equal(
  vat.getVatThresholdSnapshot({
    invoices: [{ id: "equal", date: "2026-08-11", status: "Paid", total: 90_000 }],
    asOfIsoDate: "2026-08-11",
  }).status,
  "VAT limit reached"
);
assert.equal(
  vat.getVatThresholdSnapshot({
    invoices: [{ id: "low", date: "2026-08-11", status: "Paid", total: 10_000 }],
    asOfIsoDate: "2026-08-11",
  }).status,
  "OK"
);

assert.equal(messaging.normalizeSmsPhoneNumber("07700 900 123"), "+447700900123");
assert.equal(messaging.normalizeSmsPhoneNumber("not a phone"), "");
assert.equal(messaging.normalizeEmailAddress(" Person@Example.COM "), "person@example.com");
assert.equal(
  messaging.renderMessageTemplate("Hi {{ customerName }} on {{serviceDate}}", {
    customerName: "Ailsa",
    serviceDate: "12/08/2026",
  }),
  "Hi Ailsa on 12/08/2026"
);
const messageKey = messaging.getMessageIdempotencyKey({
  organizationId: "org-1",
  customerId: 1,
  channel: "sms",
  kind: "service_reminder",
  relatedType: "job",
  relatedId: "job-1",
  occurrence: "2026-08-12",
});
assert.equal(
  messageKey,
  messaging.getMessageIdempotencyKey({
    organizationId: "org-1",
    customerId: 1,
    channel: "sms",
    kind: "service_reminder",
    relatedType: "job",
    relatedId: "job-1",
    occurrence: "2026-08-12",
  })
);
assert.notEqual(
  messageKey,
  messaging.getMessageIdempotencyKey({
    organizationId: "org-1",
    customerId: 1,
    channel: "sms",
    kind: "service_reminder",
    relatedType: "job",
    relatedId: "job-1",
    occurrence: "2026-08-13",
  })
);
assert.equal(
  messaging.isInsideQuietHours({
    date: new Date("2026-08-11T20:30:00.000Z"),
    timeZone: "Europe/London",
    quietHoursStart: "20:00",
    quietHoursEnd: "08:00",
  }),
  true
);
assert.equal(
  messaging.isInsideQuietHours({
    date: new Date("2026-08-11T12:00:00.000Z"),
    timeZone: "Europe/London",
    quietHoursStart: "20:00",
    quietHoursEnd: "08:00",
  }),
  false
);

const recurringRoute = fs.readFileSync(
  path.join(process.cwd(), "app", "api", "recurring-invoices", "[id]", "route.ts"),
  "utf8"
);
assert.match(recurringRoute, /\.eq\("organization_id", organizationId\)/);
assert.match(recurringRoute, /\.is\("deleted_at", null\)/);
assert.match(recurringRoute, /alreadyDeleted: true/);
assert.match(recurringRoute, /recurring_invoice_events/);

const telnyxSource = fs.readFileSync(
  path.join(process.cwd(), "lib", "ai-receptionist", "providers", "telnyx.ts"),
  "utf8"
);
assert.match(telnyxSource, /const liveAiConfigured = false/);
assert.match(telnyxSource, /source: "Voicemail"/);

const twilioRealtimeRoute = fs.readFileSync(
  path.join(process.cwd(), "app", "api", "ai-receptionist", "twilio", "realtime-media", "route.ts"),
  "utf8"
);
assert.match(twilioRealtimeRoute, /status: 410/);

const paymentLinkRoute = fs.readFileSync(
  path.join(process.cwd(), "app", "api", "invoices", "payment-link", "route.ts"),
  "utf8"
);
assert.match(paymentLinkRoute, /ensureWorkspace\(supabase, user\)/);
assert.match(paymentLinkRoute, /\.eq\("organization_id", organizationId\)/);
assert.match(paymentLinkRoute, /idempotencyKey: paymentRequestKey/);

const migration = fs.readFileSync(
  path.join(process.cwd(), "supabase", "20260811_customer_communications.sql"),
  "utf8"
);
for (const table of [
  "communication_settings",
  "customer_messages",
  "document_share_tokens",
  "payment_requests",
  "payment_webhook_events",
]) {
  assert.match(
    migration,
    new RegExp(`create table if not exists public\\.${table}`)
  );
}
assert.match(migration, /invoice_id text not null references public\.invoices\(id\) on delete restrict/);
assert.doesNotMatch(migration, /''voicemail''|''Voicemail''/);
const quotePage = fs.readFileSync(
  path.join(process.cwd(), "components", "jobs", "quotes-page.tsx"),
  "utf8"
);
assert.match(quotePage, /onSendText: \(quoteId: string\) => void/);
assert.match(quotePage, /label: "Send by text"/);
assert.match(quotePage, /onSendText\(quote\.id\)/);

const invoicePage = fs.readFileSync(
  path.join(process.cwd(), "components", "jobs", "invoices-page.tsx"),
  "utf8"
);
assert.match(invoicePage, /onSendText: \(invoiceId: string\) => void/);
assert.match(invoicePage, /label: "Send by text"/);
assert.match(invoicePage, /onSendText\(invoice\.id\)/);

const workflowDialog = fs.readFileSync(
  path.join(process.cwd(), "components", "jobs", "workflow-message-dialog.tsx"),
  "utf8"
);
assert.match(workflowDialog, /allowedMethods\?: WorkflowMessageMethod\[\]/);
assert.match(workflowDialog, /allowedMethods\.map/);

const jobsApp = fs.readFileSync(
  path.join(process.cwd(), "components", "jobs-app.tsx"),
  "utf8"
);
assert.match(jobsApp, /job-completion:/);
assert.match(jobsApp, /const isCompleting = targetJob\.status !== "Completed"/);
assert.match(jobsApp, /sendScheduledJobCompletionText\(job, \{ retryFailed: true \}\)/);
assert.match(jobsApp, /manual-document:/);
assert.match(jobsApp, /allowedMethods: \["text"\]/);

const customerMessagesRoute = fs.readFileSync(
  path.join(process.cwd(), "app", "api", "customer-messages", "route.ts"),
  "utf8"
);
assert.match(customerMessagesRoute, /body\?\.retryFailed === true/);
assert.match(customerMessagesRoute, /\.eq\("organization_id", organizationId\)/);
assert.match(customerMessagesRoute, /\.eq\("status", "failed"\)/);

const customerMessageCronRoute = fs.readFileSync(
  path.join(process.cwd(), "app", "api", "cron", "customer-messages", "route.ts"),
  "utf8"
);
assert.match(customerMessageCronRoute, /process\.env\.CRON_SECRET/);
assert.match(customerMessageCronRoute, /export const GET = processCustomerMessageQueue/);
assert.match(customerMessageCronRoute, /export const POST = processCustomerMessageQueue/);

console.log("Backlog regression tests passed.");