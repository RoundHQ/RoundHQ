import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";
import crypto from "node:crypto";
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

if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: crypto.webcrypto,
    configurable: true,
  });
}

const {
  buildReconciliationReviewRows,
  createLearnedRuleFromRow,
  getImportSummary,
  isConfirmedReconciliationRow,
  parseStatementCsv,
} = require(path.join(projectRoot, "lib", "payments", "reconciliation.ts"));

function customer(overrides = {}) {
  return {
    id: 1,
    name: "John Smith",
    address: "10 Green Lane",
    postcode: "G75 1AA",
    isGrassCuttingCustomer: true,
    week: "Week 1",
    day: "Monday",
    customerType: "Residential",
    cutFrequency: "Fortnightly",
    grassCutAmount: 25,
    paymentMethod: "Cash",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function visit(overrides = {}) {
  return {
    id: "visit-1",
    customerId: 1,
    visitDate: "2026-06-01",
    status: "completed",
    paidAt: null,
    priceAtVisit: 25,
    ...overrides,
  };
}

const parseResult = parseStatementCsv(
  "Transaction Date,Payment Reference,Credit,Payer\n25/06/2026,J SMITH G75 1AA,50.00,John Smith\n"
);
assert.equal(parseResult.warnings.length, 0, "flexible headers should parse");
assert.equal(parseResult.rows.length, 1, "one statement row should parse");
assert.equal(parseResult.rows[0].transactionDate, "2026-06-25");
assert.equal(parseResult.rows[0].amount, 50);

const incomeOnlyResult = parseStatementCsv(
  "Date,Description,Credit,Debit\n25/06/2026,Customer payment,40.00,\n26/06/2026,Fuel station,,25.00\n27/06/2026,Negative amount,-12.00,\n"
);
assert.equal(incomeOnlyResult.rows.length, 1, "outgoing statement rows should be filtered out");
assert.equal(incomeOnlyResult.rows[0].description, "Customer payment");
assert.equal(incomeOnlyResult.skippedOutgoingRows, 2, "debit and negative rows should be counted as skipped outgoing rows");

const typedDebitResult = parseStatementCsv(
  "Date,Description,Amount,Transaction Type\n25/06/2026,Customer payment,45.00,Credit\n26/06/2026,Parts supplier,18.00,Debit\n"
);
assert.equal(typedDebitResult.rows.length, 1, "positive debit rows should still be filtered when the statement has a type column");
assert.equal(typedDebitResult.rows[0].amount, 45);
assert.equal(typedDebitResult.skippedOutgoingRows, 1);

const customers = [
  customer(),
  customer({
    id: 2,
    name: "Jane Brown",
    address: "41 Market Street",
    postcode: "G74 2BB",
    grassCutAmount: 30,
  }),
];

const matchedRows = buildReconciliationReviewRows({
  rows: parseResult.rows,
  customers,
  visits: [visit(), visit({ id: "visit-2", visitDate: "2026-06-15" })],
  invoices: [],
  monthlyPayments: [],
  matchingRules: [],
  ignoreRules: [],
});
assert.equal(matchedRows[0].selectedCustomerId, 1, "customer should match by name/postcode");
assert.equal(matchedRows[0].matchStatus, "matched");
assert.equal(matchedRows[0].selectedAllocations.length, 2, "GBP 50 should split across two GBP 25 visits");

const visitDatePaymentRows = buildReconciliationReviewRows({
  rows: parseStatementCsv("Date,Description,Amount\n20/06/2026,John Smith,25\n").rows,
  customers,
  visits: [
    visit({ id: "visit-older", visitDate: "2026-06-01" }),
    visit({ id: "visit-18", visitDate: "2026-06-18" }),
  ],
  invoices: [],
  monthlyPayments: [],
  matchingRules: [],
  ignoreRules: [],
});
assert.equal(
  visitDatePaymentRows[0].selectedAllocations[0].targetId,
  "visit-18",
  "payment on 20/06 should update the nearest unpaid visit on 18/06"
);
assert.equal(visitDatePaymentRows[0].selectedAllocations[0].paymentDate, "2026-06-20");

const numericVisitIdRows = buildReconciliationReviewRows({
  rows: parseStatementCsv("Date,Description,Amount\n20/06/2026,John Smith,25\n").rows,
  customers,
  visits: [visit({ id: 101, visitDate: "2026-06-18" })],
  invoices: [],
  monthlyPayments: [],
  matchingRules: [],
  ignoreRules: [],
});
assert.equal(
  numericVisitIdRows[0].selectedAllocations[0].targetId,
  "101",
  "numeric database visit ids should be passed through as string targets for reconciliation saves"
);

const scheduledJobRows = buildReconciliationReviewRows({
  rows: parseStatementCsv("Date,Description,Amount\n25/06/2026,FIELD SERVICE REF 777 G99 9ZZ,25\n").rows,
  customers,
  visits: [visit()],
  invoices: [],
  monthlyPayments: [],
  scheduledJobs: [
    {
      id: "job-1",
      title: "One off service at Field Service REF 777",
      date: "2026-06-20",
      notes: "Access via side gate",
      customerId: 2,
      customerName: "Jane Brown",
      postcode: "G99 9ZZ",
      type: "One Off",
      status: "Scheduled",
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  matchingRules: [],
  ignoreRules: [],
});
assert.equal(scheduledJobRows[0].selectedCustomerId, 2, "service schedule should be used as a fallback match");
assert.equal(scheduledJobRows[0].matchStatus, "possible_match");
assert.match(scheduledJobRows[0].matchReason, /Service schedule/);

const monthlyPaymentRows = buildReconciliationReviewRows({
  rows: parseStatementCsv("Date,Description,Amount\n25/06/2026,John Smith monthly,25\n").rows,
  customers: [customer({ paymentMethod: "Monthly", grassCutAmount: 25 })],
  visits: [
    visit({ id: "monthly-visit-1", visitDate: "2026-06-03" }),
    visit({ id: "monthly-visit-2", visitDate: "2026-06-17" }),
  ],
  invoices: [],
  monthlyPayments: [],
  monthlyPaymentMonths: ["2026-05-01", "2026-06-01", "2026-07-01"],
  matchingRules: [],
  ignoreRules: [],
});
assert.equal(
  monthlyPaymentRows[0].selectedAllocations[0].type,
  "monthly_payment",
  "monthly-plan customers should allocate to unpaid monthly payment slots"
);
assert.equal(
  monthlyPaymentRows[0].selectedAllocations[0].targetId,
  "2026-06-01",
  "monthly payments should apply to the payment date month before older unpaid months"
);
assert.equal(
  monthlyPaymentRows[0].selectedAllocations.some((allocation) => allocation.type === "visit"),
  false,
  "monthly payments should not be split across individual visits"
);

const partialRows = buildReconciliationReviewRows({
  rows: parseStatementCsv("Date,Description,Amount\n25/06/2026,John Smith,20\n").rows,
  customers,
  visits: [visit()],
  invoices: [],
  monthlyPayments: [],
  matchingRules: [],
  ignoreRules: [],
});
assert.equal(partialRows[0].selectedAllocations[0].isPartial, true, "GBP 20 against GBP 25 should be partial");

const creditRows = buildReconciliationReviewRows({
  rows: parseStatementCsv("Date,Description,Amount\n25/06/2026,John Smith,60\n").rows,
  customers,
  visits: [visit(), visit({ id: "visit-2", visitDate: "2026-06-15" })],
  invoices: [],
  monthlyPayments: [],
  matchingRules: [],
  ignoreRules: [],
});
assert.equal(
  creditRows[0].selectedAllocations.some((allocation) => allocation.type === "credit" && allocation.amount === 10),
  true,
  "overpayment should create credit allocation"
);

const ignoredRows = buildReconciliationReviewRows({
  rows: parseStatementCsv("Date,Description,Amount\n25/06/2026,BANK CHARGE,5\n").rows,
  customers,
  visits: [],
  invoices: [],
  monthlyPayments: [],
  matchingRules: [],
  ignoreRules: [
    {
      id: "ignore-1",
      matchType: "description_contains",
      matchValue: "BANK CHARGE",
      isEnabled: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
});
assert.equal(ignoredRows[0].matchStatus, "ignored", "ignore rules should mark rows ignored");

const learnedRule = createLearnedRuleFromRow({
  row: matchedRows[0],
  customerId: 1,
  createdBy: "user-1",
});
assert.equal(learnedRule.customerId, 1);
assert.equal(learnedRule.isEnabled, true);

const learnedRows = buildReconciliationReviewRows({
  rows: parseStatementCsv("Date,Description,Amount\n25/06/2026,JS REF 8821,25\n").rows,
  customers,
  visits: [visit()],
  invoices: [],
  monthlyPayments: [],
  matchingRules: [
    {
      ...learnedRule,
      matchType: "description_contains",
      matchValue: "JS REF",
      confidenceWeight: 96,
    },
  ],
  ignoreRules: [],
});
assert.equal(learnedRows[0].selectedCustomerId, 1, "learned rule should match future rows");
assert.equal(learnedRows[0].matchStatus, "matched");

const duplicateRows = buildReconciliationReviewRows({
  rows: parseResult.rows,
  customers,
  visits: [],
  invoices: [],
  monthlyPayments: [],
  matchingRules: [],
  ignoreRules: [],
  existingImportRows: [
    {
      id: "existing-row",
      statementImportId: "import-1",
      transactionDate: parseResult.rows[0].transactionDate,
      description: parseResult.rows[0].description,
      amount: parseResult.rows[0].amount,
      allocations: [],
      matchConfidence: 100,
      matchReason: "Imported",
      matchStatus: "matched",
      status: "imported",
      rawRow: parseResult.rows[0].rawRow,
      transactionFingerprint: parseResult.rows[0].transactionFingerprint,
      createdAt: "2026-06-25T00:00:00.000Z",
    },
  ],
});
assert.equal(duplicateRows[0].matchStatus, "already_imported", "duplicate imported rows should be blocked");

const tenantRows = buildReconciliationReviewRows({
  rows: parseStatementCsv("Date,Description,Amount\n25/06/2026,OTHER TENANT REF,25\n").rows,
  customers: [customers[0]],
  visits: [],
  invoices: [],
  monthlyPayments: [],
  matchingRules: [
    {
      id: "foreign-rule",
      customerId: 999,
      matchType: "description_contains",
      matchValue: "OTHER TENANT",
      confidenceWeight: 99,
      useCount: 0,
      isEnabled: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  ignoreRules: [],
});
assert.equal(tenantRows[0].selectedCustomerId, null, "rules for customers outside the workspace dataset should be ignored");
assert.equal(tenantRows[0].matchStatus, "no_match");

const summary = getImportSummary([...matchedRows, ...ignoredRows, ...duplicateRows]);
assert.equal(summary.totalRows, 3);
assert.equal(summary.matchedRows, 1);
assert.equal(summary.ignoredRows, 1);
assert.equal(summary.alreadyImportedRows, 1);
assert.equal(isConfirmedReconciliationRow(matchedRows[0]), true, "matched row with allocations is confirmable");

console.log("Payment reconciliation tests passed.");
