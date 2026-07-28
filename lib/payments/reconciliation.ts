import type {
  Customer,
  CustomerPaymentFingerprint,
  Invoice,
  MonthlyPayment,
  PaymentIgnoreRule,
  PaymentMatchingRule,
  PaymentReconciliationAllocation,
  PaymentReconciliationMatchStatus,
  ScheduledJob,
  StatementImportRowRecord,
  VisitLog,
} from "@/components/jobs/types";

export type ParsedStatementRow = {
  id: string;
  rowIndex: number;
  transactionDate: string;
  description: string;
  customerNameFromStatement: string;
  amount: number;
  transactionId?: string;
  rawRow: Record<string, string>;
  transactionFingerprint: string;
};

export type StatementParseResult = {
  rows: ParsedStatementRow[];
  warnings: string[];
  skippedOutgoingRows: number;
};

export type ReconciliationReviewRow = ParsedStatementRow & {
  suggestedCustomerId: number | null;
  selectedCustomerId: number | null;
  matchConfidence: number;
  matchReason: string;
  matchStatus: PaymentReconciliationMatchStatus;
  duplicateOfPaymentId?: string;
  usedRuleIds: string[];
  suggestedAllocations: PaymentReconciliationAllocation[];
  selectedAllocations: PaymentReconciliationAllocation[];
  learnMatch: boolean;
};

export type BuildReviewRowsOptions = {
  rows: ParsedStatementRow[];
  customers: Customer[];
  visits: VisitLog[];
  invoices: Invoice[];
  monthlyPayments: MonthlyPayment[];
  monthlyPaymentMonths?: string[];
  scheduledJobs?: ScheduledJob[];
  matchingRules: PaymentMatchingRule[];
  ignoreRules: PaymentIgnoreRule[];
  fingerprints?: CustomerPaymentFingerprint[];
  existingImportRows?: StatementImportRowRecord[];
  defaultLearnMatch?: boolean;
  today?: Date;
};

export type ConfirmedReconciliationRow = ReconciliationReviewRow & {
  selectedCustomerId: number;
  selectedAllocations: PaymentReconciliationAllocation[];
};

export type AcceptedProfilePaymentDateUpdate = {
  type: "monthly_payment" | "visit";
  customerId: number;
  targetId: string;
  paymentDate: string;
};

export function getAcceptedProfilePaymentDateUpdate(
  row: ReconciliationReviewRow,
  allocation: PaymentReconciliationAllocation
): AcceptedProfilePaymentDateUpdate | null {
  if (
    row.selectedCustomerId == null ||
    allocation.isPartial === true ||
    !allocation.targetId ||
    (allocation.type !== "monthly_payment" && allocation.type !== "visit")
  ) {
    return null;
  }

  const paymentDate = getDateOnly(allocation.paymentDate ?? row.transactionDate);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    return null;
  }

  return {
    type: allocation.type,
    customerId: row.selectedCustomerId,
    targetId: allocation.targetId,
    paymentDate,
  };
}

type StatementColumnKey =
  | keyof Omit<ParsedStatementRow, "id" | "rowIndex" | "rawRow" | "transactionFingerprint">
  | "debitAmount"
  | "transactionType";

const HEADER_ALIASES: Record<string, StatementColumnKey> = {
  date: "transactionDate",
  transactiondate: "transactionDate",
  paiddate: "transactionDate",
  paymentdate: "transactionDate",
  description: "description",
  reference: "description",
  paymentreference: "description",
  bankreference: "description",
  details: "description",
  narrative: "description",
  amount: "amount",
  value: "amount",
  transactionamount: "amount",
  credit: "amount",
  credits: "amount",
  creditamount: "amount",
  paidin: "amount",
  paidinamount: "amount",
  moneyin: "amount",
  moneyinamount: "amount",
  received: "amount",
  receipts: "amount",
  debit: "debitAmount",
  debits: "debitAmount",
  debitamount: "debitAmount",
  paidout: "debitAmount",
  paidoutamount: "debitAmount",
  moneyout: "debitAmount",
  moneyoutamount: "debitAmount",
  withdrawal: "debitAmount",
  withdrawals: "debitAmount",
  paymentout: "debitAmount",
  out: "debitAmount",
  customer: "customerNameFromStatement",
  name: "customerNameFromStatement",
  payer: "customerNameFromStatement",
  payee: "customerNameFromStatement",
  transactionid: "transactionId",
  id: "transactionId",
  type: "transactionType",
  transactiontype: "transactionType",
  direction: "transactionType",
  drcr: "transactionType",
  debitcredit: "transactionType",
  creditdebit: "transactionType",
};

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeStatementText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizePostcode(value: string | null | undefined) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function toDateInputValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  const ukMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (ukMatch) {
    const year = ukMatch[3].length === 2 ? `20${ukMatch[3]}` : ukMatch[3];
    return `${year}-${ukMatch[2].padStart(2, "0")}-${ukMatch[1].padStart(2, "0")}`;
  }

  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
}

function parseAmount(value: string) {
  const negative = /\((.*)\)/.test(value) || value.trim().startsWith("-");
  const normalized = value.replace(/[(),\u00a3$,]/g, "").replace(/[^\d.-]/g, "");
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(Math.abs(parsed) * (negative ? -100 : 100)) / 100;
}

function isOutgoingTransactionType(value: string) {
  const normalized = normalizeStatementText(value);

  return (
    normalized === "d" ||
    normalized === "dr" ||
    normalized.includes("debit") ||
    normalized.includes("withdrawal") ||
    normalized.includes("paid out") ||
    normalized.includes("payment out") ||
    normalized.includes("money out")
  );
}

function csvToRows(csvText: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      if (row.some((value) => value.trim())) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value.trim())) {
    rows.push(row);
  }

  return rows;
}

export function getTransactionFingerprint(input: {
  transactionDate: string;
  description: string;
  customerNameFromStatement?: string;
  amount: number;
  transactionId?: string;
}) {
  const parts = [
    input.transactionId?.trim() || "",
    input.transactionDate,
    input.amount.toFixed(2),
    normalizeStatementText(input.description),
    normalizeStatementText(input.customerNameFromStatement),
  ];

  return parts.join("|");
}

export function parseStatementCsv(csvText: string): StatementParseResult {
  const warnings: string[] = [];
  const csvRows = csvToRows(csvText);

  if (csvRows.length < 2) {
    return {
      rows: [],
      warnings: ["The CSV file did not contain any transaction rows."],
      skippedOutgoingRows: 0,
    };
  }

  const headers = csvRows[0];
  const columnMap = new Map<StatementColumnKey, number>();

  headers.forEach((header, index) => {
    const mappedKey = HEADER_ALIASES[normalizeHeader(header)];
    if (mappedKey && !columnMap.has(mappedKey)) {
      columnMap.set(mappedKey, index);
    }
  });

  if (!columnMap.has("transactionDate")) {
    warnings.push("No date column was found. Expected Date, Transaction Date, or Paid Date.");
  }
  if (!columnMap.has("description")) {
    warnings.push("No description/reference column was found.");
  }
  if (!columnMap.has("amount")) {
    warnings.push("No amount/credit/paid in column was found.");
  }

  const getColumnValue = (row: string[], key: StatementColumnKey) => {
    const index = columnMap.get(key);
    return index == null ? "" : row[index] ?? "";
  };

  let skippedOutgoingRows = 0;
  const rows = csvRows.slice(1).map((row, index) => {
    const rawRow = headers.reduce<Record<string, string>>((record, header, headerIndex) => {
      record[header || `Column ${headerIndex + 1}`] = row[headerIndex] ?? "";
      return record;
    }, {});
    const transactionDate = toDateInputValue(getColumnValue(row, "transactionDate"));
    const description = getColumnValue(row, "description");
    const customerNameFromStatement = getColumnValue(row, "customerNameFromStatement");
    const incomingAmount = parseAmount(getColumnValue(row, "amount"));
    const outgoingAmount = parseAmount(getColumnValue(row, "debitAmount"));
    const transactionType = getColumnValue(row, "transactionType");
    const amount =
      columnMap.has("debitAmount") && outgoingAmount > 0 && incomingAmount <= 0
        ? -outgoingAmount
        : isOutgoingTransactionType(transactionType)
        ? -Math.abs(incomingAmount)
        : incomingAmount;
    const transactionId = getColumnValue(row, "transactionId") || undefined;
    const transactionFingerprint = getTransactionFingerprint({
      transactionDate,
      description,
      customerNameFromStatement,
      amount,
      transactionId,
    });

    return {
      id: `row-${index + 1}-${transactionFingerprint}`,
      rowIndex: index + 1,
      transactionDate,
      description,
      customerNameFromStatement,
      amount,
      transactionId,
      rawRow,
      transactionFingerprint,
    };
  }).filter((row) => {
    const hasContent = row.transactionDate || row.description || row.amount !== 0;

    if (!hasContent) {
      return false;
    }

    if (row.amount <= 0) {
      skippedOutgoingRows += 1;
      return false;
    }

    return true;
  });

  return { rows, warnings, skippedOutgoingRows };
}

function tokenOverlapScore(left: string, right: string) {
  const leftTokens = new Set(normalizeStatementText(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeStatementText(right).split(" ").filter(Boolean));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let matches = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      matches += 1;
    }
  });

  return matches / Math.max(leftTokens.size, rightTokens.size);
}

function amountMatches(left: number | undefined, right: number | undefined, tolerance = 0.01) {
  if (left == null || right == null) {
    return false;
  }

  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function getSearchHaystack(row: ParsedStatementRow) {
  return normalizeStatementText(
    [row.description, row.customerNameFromStatement].filter(Boolean).join(" ")
  );
}

function getCustomerSearchFields(customer: Customer) {
  return {
    name: normalizeStatementText(customer.name),
    address: normalizeStatementText(customer.address),
    postcode: normalizePostcode(customer.postcode),
    siteAddress: normalizeStatementText(customer.siteAddress),
    sitePostcode: normalizePostcode(customer.sitePostcode),
  };
}

function ruleMatches(row: ParsedStatementRow, rule: PaymentMatchingRule | PaymentIgnoreRule) {
  const description = normalizeStatementText(row.description);
  const customerName = normalizeStatementText(row.customerNameFromStatement);
  const matchValue = normalizeStatementText(rule.matchValue);

  if (!rule.isEnabled || !matchValue) {
    return false;
  }

  switch (rule.matchType) {
    case "description_contains":
    case "reference_contains":
    case "address_contains":
    case "postcode_contains":
      return description.includes(matchValue);
    case "customer_contains":
      return customerName.includes(matchValue);
    case "amount_equals":
      return amountMatches(row.amount, Number.parseFloat(rule.matchValue));
    default:
      return false;
  }
}

function getRuleMatchCandidates(row: ParsedStatementRow, rules: PaymentMatchingRule[]) {
  return rules
    .filter((rule) => ruleMatches(row, rule))
    .map((rule) => ({
      customerId: rule.customerId,
      score: Math.min(99, Math.max(50, rule.confidenceWeight)),
      reason: `Previous learned rule matched "${rule.matchValue}".`,
      ruleId: rule.id,
    }));
}

function getCustomerMatchCandidates(row: ParsedStatementRow, customers: Customer[]) {
  const haystack = getSearchHaystack(row);
  const candidates: Array<{ customerId: number; score: number; reason: string; ruleId?: string }> = [];

  for (const customer of customers) {
    const fields = getCustomerSearchFields(customer);

    if (fields.name && haystack.includes(fields.name)) {
      candidates.push({
        customerId: customer.id,
        score: 92,
        reason: `Exact customer name matched "${customer.name}".`,
      });
      continue;
    }

    if (fields.postcode && normalizePostcode(haystack).includes(fields.postcode)) {
      candidates.push({
        customerId: customer.id,
        score: 88,
        reason: `Postcode matched ${customer.postcode}.`,
      });
      continue;
    }

    if (fields.address && haystack.includes(fields.address)) {
      candidates.push({
        customerId: customer.id,
        score: 84,
        reason: "Exact address matched the bank description.",
      });
      continue;
    }

    if (fields.sitePostcode && normalizePostcode(haystack).includes(fields.sitePostcode)) {
      candidates.push({
        customerId: customer.id,
        score: 82,
        reason: `Site postcode matched ${customer.sitePostcode}.`,
      });
      continue;
    }

    const addressScore = Math.max(
      tokenOverlapScore(haystack, customer.address),
      tokenOverlapScore(haystack, customer.siteAddress ?? "")
    );
    if (addressScore >= 0.55) {
      candidates.push({
        customerId: customer.id,
        score: Math.round(65 + addressScore * 20),
        reason: "Address words matched the bank description.",
      });
      continue;
    }

    const nameScore = tokenOverlapScore(haystack, customer.name);
    if (nameScore >= 0.5) {
      candidates.push({
        customerId: customer.id,
        score: Math.round(55 + nameScore * 25),
        reason: "Customer name looked similar to the bank description.",
      });
    }
  }

  return candidates;
}

function getScheduledJobMatchCandidates(
  row: ParsedStatementRow,
  customers: Customer[],
  scheduledJobs: ScheduledJob[]
) {
  const haystack = getSearchHaystack(row);
  const haystackPostcode = normalizePostcode(haystack);
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const candidates: Array<{ customerId: number; score: number; reason: string; ruleId?: string }> = [];

  for (const job of scheduledJobs) {
    if (job.status === "Cancelled") {
      continue;
    }

    const linkedCustomer =
      job.customerId != null
        ? customersById.get(job.customerId) ?? null
        : customers.find(
            (customer) =>
              normalizeStatementText(customer.name) ===
              normalizeStatementText(job.customerName)
          ) ?? null;

    if (!linkedCustomer) {
      continue;
    }

    const jobCustomerName = normalizeStatementText(job.customerName);
    const jobPostcode = normalizePostcode(job.postcode);
    const jobSearchText = normalizeStatementText(
      [job.customerName, job.title, job.notes, job.postcode].filter(Boolean).join(" ")
    );

    if (jobCustomerName && haystack.includes(jobCustomerName)) {
      candidates.push({
        customerId: linkedCustomer.id,
        score: 86,
        reason: `Service schedule customer name matched "${job.customerName}".`,
      });
      continue;
    }

    if (jobPostcode && haystackPostcode.includes(jobPostcode)) {
      candidates.push({
        customerId: linkedCustomer.id,
        score: 84,
        reason: `Service schedule postcode matched ${job.postcode}.`,
      });
      continue;
    }

    const scheduleScore = tokenOverlapScore(haystack, jobSearchText);
    if (scheduleScore >= 0.45) {
      candidates.push({
        customerId: linkedCustomer.id,
        score: Math.round(60 + scheduleScore * 30),
        reason: `Service schedule matched "${job.title}".`,
      });
    }
  }

  return candidates;
}

function getFingerprintCandidates(
  row: ParsedStatementRow,
  customers: Customer[],
  fingerprints: CustomerPaymentFingerprint[]
) {
  const haystack = getSearchHaystack(row);

  return fingerprints.flatMap((fingerprint) => {
    const customer = customers.find((entry) => entry.id === fingerprint.customerId);
    if (!customer) {
      return [];
    }

    const reference = normalizeStatementText(fingerprint.typicalReference);
    const referenceMatched = Boolean(reference && haystack.includes(reference));
    const amountMatched = amountMatches(row.amount, fingerprint.typicalAmount);

    if (!referenceMatched && !amountMatched) {
      return [];
    }

    return [{
      customerId: fingerprint.customerId,
      score: Math.min(90, 55 + Math.round(fingerprint.confidenceScore * 0.35) + (referenceMatched ? 12 : 0) + (amountMatched ? 8 : 0)),
      reason: "Customer payment fingerprint matched previous payment behaviour.",
    }];
  });
}

function chooseMatch(
  candidates: Array<{ customerId: number; score: number; reason: string; ruleId?: string }>
) {
  if (candidates.length === 0) {
    return {
      customerId: null,
      confidence: 0,
      reason: "No customer, address, postcode, reference, or learned rule matched.",
      status: "no_match" as PaymentReconciliationMatchStatus,
      usedRuleIds: [] as string[],
    };
  }

  const grouped = new Map<number, { score: number; reasons: string[]; ruleIds: string[] }>();
  candidates.forEach((candidate) => {
    const existing = grouped.get(candidate.customerId) ?? { score: 0, reasons: [], ruleIds: [] };
    existing.score = Math.min(99, Math.max(existing.score, candidate.score));
    existing.reasons.push(candidate.reason);
    if (candidate.ruleId) {
      existing.ruleIds.push(candidate.ruleId);
    }
    grouped.set(candidate.customerId, existing);
  });

  const ranked = Array.from(grouped.entries())
    .map(([customerId, value]) => ({ customerId, ...value }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const second = ranked[1];

  if (second && best.score - second.score < 8) {
    return {
      customerId: best.customerId,
      confidence: best.score,
      reason: `Multiple customers had similar confidence. Best: ${best.reasons[0]}`,
      status: "needs_review" as PaymentReconciliationMatchStatus,
      usedRuleIds: best.ruleIds,
    };
  }

  const status: PaymentReconciliationMatchStatus =
    best.score >= 90 ? "matched" : best.score >= 65 ? "possible_match" : "needs_review";

  return {
    customerId: best.customerId,
    confidence: best.score,
    reason: best.reasons[0],
    status,
    usedRuleIds: best.ruleIds,
  };
}

function getExistingDuplicate(
  row: ParsedStatementRow,
  customerId: number | null,
  options: Pick<BuildReviewRowsOptions, "visits" | "monthlyPayments" | "invoices" | "existingImportRows" | "customers">
) {
  const importDuplicate = options.existingImportRows?.find((existingRow) =>
    existingRow.transactionFingerprint === row.transactionFingerprint &&
    existingRow.status !== "ignored" &&
    existingRow.status !== "already_imported" &&
    existingRow.status !== "undone"
  );

  if (importDuplicate) {
    return importDuplicate.createdPaymentId || importDuplicate.id;
  }

  if (customerId == null) {
    return undefined;
  }

  const customer = options.customers.find((entry) => entry.id === customerId);
  const sameStoredDate = (storedDate: string | null | undefined) =>
    Boolean(storedDate && storedDate.startsWith(row.transactionDate));
  const duplicateVisit = options.visits.find((visit) =>
    visit.customerId === customerId &&
    Boolean(visit.paidAt) &&
    sameStoredDate(visit.paidAt) &&
    amountMatches(Number(visit.priceAtVisit ?? customer?.grassCutAmount ?? 0), row.amount)
  );

  if (duplicateVisit) {
    return `visit:${duplicateVisit.id}`;
  }

  const duplicateMonthlyPayment = options.monthlyPayments.find((payment) =>
    payment.customerId === customerId &&
    sameStoredDate(payment.paymentDate)
  );

  if (duplicateMonthlyPayment && amountMatches(getMonthlyPlanAmount(customer), row.amount)) {
    return `monthly:${duplicateMonthlyPayment.id}`;
  }

  const duplicateInvoice = options.invoices.find((invoice) =>
    invoice.customerId === customerId &&
    invoice.status === "Paid" &&
    amountMatches(invoice.total, row.amount) &&
    (
      invoice.stripePaymentCompletedAt?.startsWith(row.transactionDate) ||
      invoice.date === row.transactionDate ||
      invoice.dueDate === row.transactionDate
    )
  );

  return duplicateInvoice ? `invoice:${duplicateInvoice.id}` : undefined;
}

function getMonthlyPlanAmount(customer: Customer | undefined) {
  return Number(customer?.grassCutAmount ?? 0);
}

function getDateOnly(value: string | null | undefined) {
  return String(value ?? "").slice(0, 10);
}

function getUnpaidVisits(customer: Customer, visits: VisitLog[], paymentDate: string) {
  return visits
    .filter((visit) =>
      visit.customerId === customer.id &&
      visit.status === "completed" &&
      !visit.paidAt
    )
    .sort((left, right) => {
      const leftDate = getDateOnly(left.visitDate);
      const rightDate = getDateOnly(right.visitDate);
      const leftIsBeforePayment = leftDate <= paymentDate;
      const rightIsBeforePayment = rightDate <= paymentDate;

      if (leftIsBeforePayment !== rightIsBeforePayment) {
        return leftIsBeforePayment ? -1 : 1;
      }

      if (leftIsBeforePayment && rightIsBeforePayment) {
        return rightDate.localeCompare(leftDate);
      }

      return leftDate.localeCompare(rightDate);
    });
}

function getUnpaidInvoices(customer: Customer, invoices: Invoice[]) {
  return invoices
    .filter((invoice) =>
      invoice.customerId === customer.id &&
      !["Paid", "Declined"].includes(invoice.status)
    )
    .sort((left, right) => (left.dueDate ?? left.date).localeCompare(right.dueDate ?? right.date));
}

function getUnpaidMonthlyPaymentMonths(
  customer: Customer,
  monthlyPayments: MonthlyPayment[],
  monthlyPaymentMonths: string[],
  paymentDate: string
) {
  if ((customer.paymentMethod ?? "Monthly") !== "Monthly") {
    return [];
  }

  const paymentMonth = `${paymentDate.slice(0, 7)}-01`;
  const paidMonths = new Set(
    monthlyPayments
      .filter(
        (payment) =>
          payment.customerId === customer.id &&
          Boolean(payment.paymentDate)
      )
      .map((payment) => payment.paymentMonth.slice(0, 10))
  );

  return monthlyPaymentMonths
    .filter((month) => !paidMonths.has(month.slice(0, 10)))
    .sort((left, right) => {
      const leftMonth = left.slice(0, 10);
      const rightMonth = right.slice(0, 10);

      if (leftMonth === paymentMonth) {
        return -1;
      }

      if (rightMonth === paymentMonth) {
        return 1;
      }

      return leftMonth.localeCompare(rightMonth);
    });
}

export function suggestAllocations(options: {
  row: ParsedStatementRow;
  customer: Customer | null;
  visits: VisitLog[];
  invoices: Invoice[];
  monthlyPayments?: MonthlyPayment[];
  monthlyPaymentMonths?: string[];
}) {
  const { row, customer, visits, invoices } = options;
  const allocations: PaymentReconciliationAllocation[] = [];

  if (!customer || row.amount <= 0) {
    return allocations;
  }

  let remaining = row.amount;

  if (remaining > 0 && (customer.paymentMethod ?? "Monthly") === "Monthly") {
    const monthlyPlanAmount = getMonthlyPlanAmount(customer);

    if (monthlyPlanAmount > 0) {
      for (const paymentMonth of getUnpaidMonthlyPaymentMonths(
        customer,
        options.monthlyPayments ?? [],
        options.monthlyPaymentMonths ?? [],
        row.transactionDate
      )) {
        if (remaining <= 0) {
          break;
        }

        const allocationAmount = Math.min(remaining, monthlyPlanAmount);
        if (allocationAmount <= 0) {
          continue;
        }

        allocations.push({
          id: `monthly-${customer.id}-${paymentMonth}`,
          type: "monthly_payment",
          targetId: paymentMonth,
          targetLabel: `${paymentMonth.slice(0, 7)} monthly plan`,
          amount: Math.round(allocationAmount * 100) / 100,
          paymentDate: row.transactionDate,
          serviceDate: paymentMonth,
          isPartial: allocationAmount < monthlyPlanAmount,
        });
        remaining = Math.round((remaining - allocationAmount) * 100) / 100;
      }
    }
  }

  if (remaining > 0 && (customer.paymentMethod ?? "Monthly") !== "Monthly") {
    for (const visit of getUnpaidVisits(customer, visits, row.transactionDate)) {
      if (remaining <= 0) {
        break;
      }

      const visitAmount = Number(visit.priceAtVisit ?? customer.grassCutAmount ?? 0);
      const allocationAmount = Math.min(remaining, visitAmount);
      if (allocationAmount <= 0) {
        continue;
      }

      allocations.push({
        id: `visit-${visit.id}`,
        type: "visit",
        targetId: String(visit.id),
        targetLabel: `Visit ${getDateOnly(visit.visitDate)}`,
        amount: Math.round(allocationAmount * 100) / 100,
        paymentDate: row.transactionDate,
        serviceDate: getDateOnly(visit.visitDate),
        isPartial: allocationAmount < visitAmount,
      });
      remaining = Math.round((remaining - allocationAmount) * 100) / 100;
    }
  }

  const unpaidInvoices = getUnpaidInvoices(customer, invoices);

  for (const invoice of unpaidInvoices) {
    if (remaining <= 0) {
      break;
    }

    const invoiceAmount = Math.min(remaining, Number(invoice.total || 0));
    if (invoiceAmount <= 0) {
      continue;
    }

    allocations.push({
      id: `invoice-${invoice.id}`,
      type: "invoice",
      targetId: invoice.id,
      targetLabel: `${invoice.invoiceNumber} (${invoice.dueDate ?? invoice.date})`,
      amount: Math.round(invoiceAmount * 100) / 100,
      paymentDate: row.transactionDate,
      serviceDate: invoice.date,
      isPartial: invoiceAmount < Number(invoice.total || 0),
    });
    remaining = Math.round((remaining - invoiceAmount) * 100) / 100;
  }

  if (remaining > 0) {
    allocations.push({
      id: `credit-${row.id}`,
      type: "credit",
      targetLabel: "Customer credit",
      amount: Math.round(remaining * 100) / 100,
      paymentDate: row.transactionDate,
      isOverpayment: allocations.length > 0,
    });
  }

  if (allocations.length === 0) {
    allocations.push({
      id: `on-account-${row.id}`,
      type: "on_account",
      targetLabel: "Payment on account",
      amount: row.amount,
      paymentDate: row.transactionDate,
    });
  }

  return allocations;
}

export function buildReconciliationReviewRows(options: BuildReviewRowsOptions) {
  return options.rows.map<ReconciliationReviewRow>((row) => {
    const ignoredByRule = options.ignoreRules.find((rule) => ruleMatches(row, rule));

    if (ignoredByRule || row.amount <= 0) {
      return {
        ...row,
        suggestedCustomerId: null,
        selectedCustomerId: null,
        matchConfidence: ignoredByRule ? 100 : 0,
        matchReason: ignoredByRule
          ? `Ignored by rule "${ignoredByRule.matchValue}".`
          : "Only incoming payments can be imported.",
        matchStatus: "ignored",
        usedRuleIds: [],
        suggestedAllocations: [],
        selectedAllocations: [],
        learnMatch: false,
      };
    }

    const workspaceCustomerIds = new Set(options.customers.map((customer) => customer.id));
    const customerCandidates = getCustomerMatchCandidates(row, options.customers);
    const scheduledJobCandidates =
      customerCandidates.length === 0
        ? getScheduledJobMatchCandidates(
            row,
            options.customers,
            options.scheduledJobs ?? []
          )
        : [];
    const candidates = [
      ...getRuleMatchCandidates(row, options.matchingRules),
      ...customerCandidates,
      ...scheduledJobCandidates,
      ...getFingerprintCandidates(row, options.customers, options.fingerprints ?? []),
    ].filter((candidate) => workspaceCustomerIds.has(candidate.customerId));
    const match = chooseMatch(candidates);
    const duplicateId = getExistingDuplicate(row, match.customerId, options);
    const customer =
      match.customerId != null
        ? options.customers.find((entry) => entry.id === match.customerId) ?? null
        : null;
    const allocations = duplicateId
      ? []
      : suggestAllocations({
          row,
          customer,
          visits: options.visits,
          invoices: options.invoices,
          monthlyPayments: options.monthlyPayments,
          monthlyPaymentMonths: options.monthlyPaymentMonths,
        });

    return {
      ...row,
      suggestedCustomerId: match.customerId,
      selectedCustomerId: match.customerId,
      matchConfidence: match.confidence,
      matchReason: duplicateId ? "A matching payment already exists." : match.reason,
      matchStatus: duplicateId ? "already_imported" : match.status,
      duplicateOfPaymentId: duplicateId,
      usedRuleIds: match.usedRuleIds,
      suggestedAllocations: allocations,
      selectedAllocations: allocations,
      learnMatch: options.defaultLearnMatch ?? true,
    };
  });
}

export function createLearnedRuleFromRow(options: {
  row: ReconciliationReviewRow;
  customerId: number;
  createdBy?: string;
}) {
  const sourceValue =
    options.row.customerNameFromStatement.trim() ||
    options.row.description.trim();
  const matchValue = sourceValue.slice(0, 120);
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    customerId: options.customerId,
    matchType: options.row.customerNameFromStatement.trim()
      ? "customer_contains"
      : "description_contains",
    matchValue,
    confidenceWeight: 96,
    createdBy: options.createdBy,
    lastUsedAt: now,
    useCount: 1,
    isEnabled: true,
    createdAt: now,
    updatedAt: now,
  } satisfies PaymentMatchingRule;
}

export function getImportSummary(rows: ReconciliationReviewRow[]) {
  return rows.reduce(
    (summary, row) => {
      summary.totalRows += 1;
      summary.totalSelectedValue += row.matchStatus !== "ignored" && row.matchStatus !== "already_imported"
        ? row.amount
        : 0;

      if (row.matchStatus === "matched") summary.matchedRows += 1;
      if (row.matchStatus === "possible_match") summary.possibleRows += 1;
      if (row.matchStatus === "needs_review" || row.matchStatus === "no_match") summary.unmatchedRows += 1;
      if (row.matchStatus === "already_imported") summary.alreadyImportedRows += 1;
      if (row.matchStatus === "ignored") summary.ignoredRows += 1;

      return summary;
    },
    {
      totalRows: 0,
      matchedRows: 0,
      possibleRows: 0,
      unmatchedRows: 0,
      alreadyImportedRows: 0,
      ignoredRows: 0,
      totalSelectedValue: 0,
    }
  );
}

export function isConfirmedReconciliationRow(
  row: ReconciliationReviewRow
): row is ConfirmedReconciliationRow {
  return (
    row.selectedCustomerId != null &&
    row.matchStatus !== "ignored" &&
    row.matchStatus !== "already_imported" &&
    row.selectedAllocations.length > 0
  );
}
