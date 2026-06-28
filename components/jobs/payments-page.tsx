"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  buildPaymentYearMonths,
  formatStoredDate,
  getCustomerDisplayAddress,
  getConfiguredSeasonStartYear,
  getInputDateValue,
  getMonthlyPlanCharge,
  getSeasonCutSlotCount,
  getSeasonDateRange,
  getSeasonLabel,
  isDateInSeasonRange,
} from "./helpers";
import {
  DEFAULT_ROTATION_WEEKS,
  getEffectiveRotationWeeks,
  getRotationCycleLabel,
  getSelectedCycleDate,
  getWeekOptions,
  isCustomerDueOnDate,
  normalizeRotationWeeks,
} from "./rotation";
import type {
  Customer,
  CustomerCreditBalance,
  CustomerPaymentFingerprint,
  DayName,
  Invoice,
  MonthlyPayment,
  PaymentIgnoreRule,
  PaymentMatchingRule,
  RotationWeeks,
  ScheduledJob,
  StatementImportRecord,
  StatementImportRowRecord,
  VisitLog,
  WeekNumber,
} from "./types";
import {
  buildReconciliationReviewRows,
  getImportSummary,
  parseStatementCsv,
  suggestAllocations,
  type ReconciliationReviewRow,
} from "@/lib/payments/reconciliation";

type Props = {
  customers: Customer[];
  visits: VisitLog[];
  invoices: Invoice[];
  monthlyPayments: MonthlyPayment[];
  scheduledJobs: ScheduledJob[];
  statementImports: StatementImportRecord[];
  statementImportRows: StatementImportRowRecord[];
  paymentMatchingRules: PaymentMatchingRule[];
  paymentIgnoreRules: PaymentIgnoreRule[];
  customerPaymentFingerprints: CustomerPaymentFingerprint[];
  customerCredits: CustomerCreditBalance[];
  defaultRotationWeeks?: RotationWeeks;
  activeRotationWeeks?: RotationWeeks;
  weekOptions?: WeekNumber[];
  grassCutSeasonStart: string;
  grassCutSeasonEnd: string;
  monthlyPaymentsReady: boolean;
  reconciliationReady: boolean;
  pendingCashPaymentDates: Record<string, string>;
  onImportStatementRows: (
    fileName: string,
    reviewRows: ReconciliationReviewRow[],
    selectedRowIds: string[]
  ) => Promise<void>;
  onUndoStatementImport: (importId: string) => Promise<void>;
  onSavePaymentMatchingRule: (rule: PaymentMatchingRule) => Promise<void>;
  onDeletePaymentMatchingRule: (ruleId: string) => Promise<void>;
  onSavePaymentIgnoreRule: (rule: PaymentIgnoreRule) => Promise<void>;
  onDeletePaymentIgnoreRule: (ruleId: string) => Promise<void>;
  reconciliationOnly?: boolean;
  onSaveMonthlyPayment: (
    customerId: number,
    paymentMonth: string,
    paymentDate: string | null
  ) => Promise<void>;
  onSaveVisitCutDate: (
    visitId: string | number,
    cutDate: string
  ) => Promise<void>;
  onCreateVisitCutDate: (
    customerId: number,
    cutDate: string,
    paymentDate?: string | null
  ) => Promise<void>;
  onSaveVisitPaymentDate: (
    visitId: string | number,
    paymentDate: string | null
  ) => Promise<void>;
  onDeleteVisit: (visitId: string | number) => Promise<void>;
  onOpenCustomer: (customerId: number) => void;
};

const PAY_ON_DAY_PAYMENT_METHODS = new Set(["Cash", "On Day Transfer"]);
const DAY_FILTER_OPTIONS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
type WeekFilter = "all" | WeekNumber;
type DayFilter = "all" | DayName;
type PaymentSectionKey = "monthly" | "transfer" | "cash";
type OutstandingPaymentRow = {
  customerId: number;
  customerName: string;
  sectionKey: PaymentSectionKey;
  routeLabel: string;
  method: string;
  amount: number;
  dueFrom: string;
  missingItems: string[];
  detail: string;
};
type ReconciliationFilter =
  | "all"
  | "selected"
  | "matched"
  | "review"
  | "unmatched"
  | "duplicate"
  | "ignored";

function isPayOnDayCustomer(customer: Customer) {
  return PAY_ON_DAY_PAYMENT_METHODS.has(customer.paymentMethod ?? "Monthly");
}

function getReconciliationStatusLabel(row: ReconciliationReviewRow) {
  if (row.matchStatus === "matched") return "Matched";
  if (row.matchStatus === "possible_match") return "Possible";
  if (row.matchStatus === "needs_review") return "Review";
  if (row.matchStatus === "already_imported") return "Duplicate";
  if (row.matchStatus === "ignored") return "Ignored";
  return "No match";
}

function getReconciliationStatusClass(row: ReconciliationReviewRow) {
  if (row.matchStatus === "matched") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (row.matchStatus === "possible_match") {
    return "bg-sky-100 text-sky-700";
  }
  if (row.matchStatus === "needs_review") {
    return "bg-amber-100 text-amber-700";
  }
  if (row.matchStatus === "already_imported") {
    return "bg-slate-200 text-slate-600";
  }
  if (row.matchStatus === "ignored") {
    return "bg-purple-100 text-purple-700";
  }
  return "bg-rose-100 text-rose-700";
}

function getAllocationMode(row: ReconciliationReviewRow) {
  if (
    row.selectedAllocations.length > 0 &&
    row.selectedAllocations.every((allocation) => allocation.type === "credit")
  ) {
    return "credit";
  }

  if (
    row.selectedAllocations.length > 0 &&
    row.selectedAllocations.every((allocation) => allocation.type === "on_account")
  ) {
    return "on_account";
  }

  return "suggested";
}

function getNormalizedQuery(query: string) {
  return query.trim().toLowerCase();
}

function matchesSearch(customer: Customer, query: string) {
  const normalizedQuery = getNormalizedQuery(query);

  if (!normalizedQuery) {
    return true;
  }

  return (
    customer.name.toLowerCase().includes(normalizedQuery) ||
    getCustomerDisplayAddress(customer).toLowerCase().includes(normalizedQuery)
  );
}

function renderHighlightedText(value: string, query: string) {
  const normalizedQuery = getNormalizedQuery(query);

  if (!normalizedQuery || !value) {
    return value || "-";
  }

  const lowerValue = value.toLowerCase();
  const matchIndex = lowerValue.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return value;
  }

  const matchEnd = matchIndex + normalizedQuery.length;

  return (
    <>
      {value.slice(0, matchIndex)}
      <mark className="rounded bg-amber-200/80 px-1 text-slate-900">
        {value.slice(matchIndex, matchEnd)}
      </mark>
      {value.slice(matchEnd)}
    </>
  );
}

function getCustomerCardKey(sectionKey: string, customerId: number) {
  return `${sectionKey}:${customerId}`;
}

function formatDateForInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMoney(value: number | null | undefined) {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

function getDateFromInputValue(value: string | null | undefined) {
  const normalized = getInputDateValue(value);

  if (!normalized) {
    return null;
  }

  const [year, month, day] = normalized.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function getMonthlyOutstandingStartDate(monthKey: string) {
  const monthDate = getDateFromInputValue(monthKey);

  if (!monthDate) {
    return "";
  }

  return formatDateForInput(
    new Date(monthDate.getFullYear(), monthDate.getMonth() + 2, 1)
  );
}

function formatMonthLabel(monthKey: string) {
  const monthDate = getDateFromInputValue(monthKey);

  if (!monthDate) {
    return "Unknown month";
  }

  return monthDate.toLocaleString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export default function PaymentsPage({
  customers,
  visits,
  invoices,
  monthlyPayments,
  scheduledJobs,
  statementImports,
  statementImportRows,
  paymentMatchingRules,
  paymentIgnoreRules,
  customerPaymentFingerprints,
  customerCredits,
  defaultRotationWeeks = DEFAULT_ROTATION_WEEKS,
  activeRotationWeeks,
  weekOptions,
  grassCutSeasonStart,
  grassCutSeasonEnd,
  monthlyPaymentsReady,
  reconciliationReady,
  pendingCashPaymentDates,
  onImportStatementRows,
  onUndoStatementImport,
  onSavePaymentMatchingRule,
  onDeletePaymentMatchingRule,
  onSavePaymentIgnoreRule,
  onDeletePaymentIgnoreRule,
  reconciliationOnly = false,
  onSaveMonthlyPayment,
  onSaveVisitCutDate,
  onCreateVisitCutDate,
  onSaveVisitPaymentDate,
  onDeleteVisit,
  onOpenCustomer,
}: Props) {
  const [search, setSearch] = useState("");
  const [weekFilter, setWeekFilter] = useState<WeekFilter>("all");
  const [dayFilter, setDayFilter] = useState<DayFilter>("all");
  const [seasonStartYear, setSeasonStartYear] = useState(() =>
    getConfiguredSeasonStartYear(new Date(), grassCutSeasonStart)
  );
  const [draftDates, setDraftDates] = useState<Record<string, string>>({});
  const [draftCutDates, setDraftCutDates] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [removingVisitId, setRemovingVisitId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [highlightedCardKey, setHighlightedCardKey] = useState<string | null>(null);
  const [reconciliationFileName, setReconciliationFileName] = useState("");
  const [reconciliationRows, setReconciliationRows] = useState<
    ReconciliationReviewRow[]
  >([]);
  const [selectedReconciliationRowIds, setSelectedReconciliationRowIds] =
    useState<string[]>([]);
  const [reconciliationWarnings, setReconciliationWarnings] = useState<string[]>(
    []
  );
  const [reconciliationError, setReconciliationError] = useState<string | null>(
    null
  );
  const [reconciliationFilter, setReconciliationFilter] =
    useState<ReconciliationFilter>("all");
  const [isImportingStatement, setIsImportingStatement] = useState(false);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [newIgnoreRuleValue, setNewIgnoreRuleValue] = useState("");
  const customerCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalizedSearch = getNormalizedQuery(search);
  const normalizedDefaultRotationWeeks = normalizeRotationWeeks(defaultRotationWeeks);
  const routeRotationWeeks = normalizeRotationWeeks(
    activeRotationWeeks ?? normalizedDefaultRotationWeeks
  );
  const weekFilterOptions =
    weekOptions?.length ? weekOptions : getWeekOptions(routeRotationWeeks);
  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );
  const activeCustomerCredits = useMemo(
    () => customerCredits.filter((credit) => !credit.isReversed),
    [customerCredits]
  );
  const reconciliationSummary = useMemo(
    () => getImportSummary(reconciliationRows),
    [reconciliationRows]
  );
  const selectedReconciliationRows = useMemo(
    () =>
      reconciliationRows.filter((row) =>
        selectedReconciliationRowIds.includes(row.id)
      ),
    [reconciliationRows, selectedReconciliationRowIds]
  );
  const visibleReconciliationRows = useMemo(
    () =>
      reconciliationRows.filter((row) => {
        if (reconciliationFilter === "selected") {
          return selectedReconciliationRowIds.includes(row.id);
        }
        if (reconciliationFilter === "matched") {
          return row.matchStatus === "matched" || row.matchStatus === "possible_match";
        }
        if (reconciliationFilter === "review") {
          return row.matchStatus === "needs_review";
        }
        if (reconciliationFilter === "unmatched") {
          return row.matchStatus === "no_match";
        }
        if (reconciliationFilter === "duplicate") {
          return row.matchStatus === "already_imported";
        }
        if (reconciliationFilter === "ignored") {
          return row.matchStatus === "ignored";
        }

        return true;
      }),
    [reconciliationFilter, reconciliationRows, selectedReconciliationRowIds]
  );

  useEffect(() => {
    if (weekFilter !== "all" && !weekFilterOptions.includes(weekFilter)) {
      setWeekFilter("all");
    }
  }, [weekFilter, weekFilterOptions]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  function canImportReconciliationRow(row: ReconciliationReviewRow) {
    return (
      row.selectedCustomerId != null &&
      row.matchStatus !== "ignored" &&
      row.matchStatus !== "already_imported" &&
      row.selectedAllocations.length > 0
    );
  }

  async function handleStatementFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    setReconciliationError(null);
    setReconciliationFileName(file.name);

    try {
      const csvText = await file.text();
      const parsed = parseStatementCsv(csvText);
      const reviewRows = buildReconciliationReviewRows({
        rows: parsed.rows,
        customers,
        visits,
        invoices,
        monthlyPayments,
        monthlyPaymentMonths: paymentYearMonths.map((month) => month.key),
        scheduledJobs,
        matchingRules: paymentMatchingRules,
        ignoreRules: paymentIgnoreRules,
        fingerprints: customerPaymentFingerprints,
        existingImportRows: statementImportRows,
      });

      setReconciliationRows(reviewRows);
      setReconciliationWarnings([
        ...parsed.warnings,
        ...(parsed.skippedOutgoingRows > 0
          ? [
              `${parsed.skippedOutgoingRows} outgoing debit or expense row${
                parsed.skippedOutgoingRows === 1 ? " was" : "s were"
              } hidden from reconciliation.`,
            ]
          : []),
      ]);
      setSelectedReconciliationRowIds(
        reviewRows
          .filter((row) => row.matchStatus === "matched" && canImportReconciliationRow(row))
          .map((row) => row.id)
      );
      setReconciliationFilter("all");
    } catch (error) {
      setReconciliationRows([]);
      setSelectedReconciliationRowIds([]);
      setReconciliationWarnings([]);
      setReconciliationError(
        error instanceof Error
          ? error.message
          : "Unable to read the CSV statement."
      );
    } finally {
      event.target.value = "";
    }
  }

  function toggleReconciliationRow(rowId: string, selected: boolean) {
    setSelectedReconciliationRowIds((previous) => {
      const nextSelected = new Set(previous);

      if (selected) {
        nextSelected.add(rowId);
      } else {
        nextSelected.delete(rowId);
      }

      return Array.from(nextSelected);
    });
  }

  function setReconciliationRowCustomer(rowId: string, customerId: number | null) {
    setReconciliationRows((previous) =>
      previous.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        const customer = customerId == null ? null : customerById.get(customerId) ?? null;
        const allocations = suggestAllocations({
          row,
          customer,
          visits,
          invoices,
          monthlyPayments,
          monthlyPaymentMonths: paymentYearMonths.map((month) => month.key),
        });

        return {
          ...row,
          selectedCustomerId: customerId,
          selectedAllocations: allocations,
          matchStatus:
            customerId == null
              ? "no_match"
              : row.matchStatus === "already_imported" || row.matchStatus === "ignored"
              ? row.matchStatus
              : row.suggestedCustomerId === customerId && row.matchStatus !== "no_match"
              ? row.matchStatus
              : "needs_review",
          matchConfidence:
            customerId == null
              ? 0
              : row.suggestedCustomerId === customerId
              ? row.matchConfidence
              : Math.max(row.matchConfidence, 70),
          matchReason:
            customerId == null
              ? "No customer selected."
              : row.suggestedCustomerId === customerId
              ? row.matchReason
              : "Manually selected customer for this statement row.",
        };
      })
    );
  }

  function setReconciliationAllocationMode(
    rowId: string,
    mode: "suggested" | "credit" | "on_account"
  ) {
    setReconciliationRows((previous) =>
      previous.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        if (mode === "credit") {
          return {
            ...row,
            selectedAllocations: [
              {
                id: `credit-${row.id}`,
                type: "credit",
                targetLabel: "Customer credit",
                amount: row.amount,
                paymentDate: row.transactionDate,
              },
            ],
          };
        }

        if (mode === "on_account") {
          return {
            ...row,
            selectedAllocations: [
              {
                id: `on-account-${row.id}`,
                type: "on_account",
                targetLabel: "Payment on account",
                amount: row.amount,
                paymentDate: row.transactionDate,
              },
            ],
          };
        }

        const customer =
          row.selectedCustomerId == null
            ? null
            : customerById.get(row.selectedCustomerId) ?? null;

        return {
          ...row,
          selectedAllocations: suggestAllocations({
            row,
            customer,
            visits,
            invoices,
            monthlyPayments,
            monthlyPaymentMonths: paymentYearMonths.map((month) => month.key),
          }),
        };
      })
    );
  }

  function selectConfidentReconciliationRows() {
    setSelectedReconciliationRowIds(
      reconciliationRows
        .filter(
          (row) =>
            row.matchConfidence >= 90 &&
            (row.matchStatus === "matched" || row.matchStatus === "possible_match") &&
            canImportReconciliationRow(row)
        )
        .map((row) => row.id)
    );
  }

  function clearReconciliationReview() {
    setReconciliationFileName("");
    setReconciliationRows([]);
    setSelectedReconciliationRowIds([]);
    setReconciliationWarnings([]);
    setReconciliationError(null);
    setReconciliationFilter("all");
  }

  function getReconciliationActionErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    if (typeof error === "string" && error.trim()) {
      return error;
    }

    if (error && typeof error === "object") {
      const errorDetails = error as {
        code?: unknown;
        details?: unknown;
        hint?: unknown;
        message?: unknown;
      };
      const messageParts = [
        errorDetails.message,
        errorDetails.details,
        errorDetails.hint,
      ]
        .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
        .map((value) => value.trim());

      if (messageParts.length > 0) {
        return messageParts.join(" ");
      }

      if (typeof errorDetails.code === "string" && errorDetails.code.trim()) {
        return `${fallback} (${errorDetails.code})`;
      }
    }

    return fallback;
  }

  async function runReconciliationAction(
    action: () => Promise<void>,
    fallback: string
  ) {
    setReconciliationError(null);

    try {
      await action();
    } catch (error) {
      setReconciliationError(getReconciliationActionErrorMessage(error, fallback));
    }
  }

  function removeReconciliationRow(rowId: string) {
    setReconciliationRows((previous) => previous.filter((row) => row.id !== rowId));
    toggleReconciliationRow(rowId, false);
  }

  async function handleImportSelectedRows() {
    setIsImportingStatement(true);
    setReconciliationError(null);

    try {
      await onImportStatementRows(
        reconciliationFileName || "bank-statement.csv",
        reconciliationRows,
        selectedReconciliationRowIds
      );
      clearReconciliationReview();
    } catch (error) {
      setReconciliationError(
        error instanceof Error
          ? error.message
          : "Unable to import the selected statement rows."
      );
    } finally {
      setIsImportingStatement(false);
    }
  }

  async function handleCreateManualIgnoreRule() {
    const matchValue = newIgnoreRuleValue.trim();

    if (!matchValue) {
      return;
    }

    await runReconciliationAction(async () => {
      await onSavePaymentIgnoreRule({
        id: crypto.randomUUID(),
        matchType: "description_contains",
        matchValue,
        isEnabled: true,
        createdAt: new Date().toISOString(),
      });
      setNewIgnoreRuleValue("");
    }, "Unable to add the ignore rule.");
  }

  const seasonDateRange = useMemo(
    () =>
      getSeasonDateRange(
        seasonStartYear,
        grassCutSeasonStart,
        grassCutSeasonEnd
      ),
    [grassCutSeasonEnd, grassCutSeasonStart, seasonStartYear]
  );
  const seasonMinDate = formatDateForInput(seasonDateRange.startDate);
  const seasonMaxDate = formatDateForInput(seasonDateRange.endDate);

  const paymentYearMonths = useMemo(
    () => buildPaymentYearMonths(seasonStartYear, grassCutSeasonStart),
    [grassCutSeasonStart, seasonStartYear]
  );

  const filteredCustomers = useMemo(
    () =>
      [...customers]
        .filter((customer) => customer.isGrassCuttingCustomer)
        .filter(
          (customer) =>
            weekFilter === "all" ||
            isCustomerDueOnDate(
              customer,
              getSelectedCycleDate(
                weekFilter,
                dayFilter === "all" ? customer.day : dayFilter,
                normalizedDefaultRotationWeeks
              ),
              dayFilter === "all" ? customer.day : dayFilter,
              normalizedDefaultRotationWeeks
            )
        )
        .filter((customer) => dayFilter === "all" || customer.day === dayFilter)
        .filter((customer) => matchesSearch(customer, search))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [customers, dayFilter, normalizedDefaultRotationWeeks, search, weekFilter]
  );
  const hasRouteFilter = weekFilter !== "all" || dayFilter !== "all";

  const monthlyCustomers = useMemo(
    () =>
      filteredCustomers.filter(
        (customer) => (customer.paymentMethod ?? "Monthly") === "Monthly"
      ),
    [filteredCustomers]
  );

  const payOnDayCustomers = useMemo(
    () => filteredCustomers.filter(isPayOnDayCustomer),
    [filteredCustomers]
  );

  const onDayTransferCustomers = useMemo(
    () =>
      payOnDayCustomers.filter(
        (customer) => customer.paymentMethod === "On Day Transfer"
      ),
    [payOnDayCustomers]
  );

  const cashCustomers = useMemo(
    () => payOnDayCustomers.filter((customer) => customer.paymentMethod === "Cash"),
    [payOnDayCustomers]
  );
  const routeFilterLabel =
    weekFilter === "all" && dayFilter === "all"
      ? "all customers"
      : `${weekFilter === "all" ? "all weeks" : getRotationCycleLabel(weekFilter, routeRotationWeeks)}, ${
          dayFilter === "all" ? "all days" : dayFilter
        }`;
  const getCustomerRouteLabel = useCallback(
    (customer: Customer) =>
      `${getRotationCycleLabel(customer.week, normalizedDefaultRotationWeeks)} ${
        customer.day
      }`,
    [normalizedDefaultRotationWeeks]
  );

  const seasonVisitsByCustomer = useMemo(() => {
    const byCustomer = new Map<number, VisitLog[]>();

    visits
      .filter((visit) => visit.status === "completed")
      .filter((visit) =>
        isDateInSeasonRange(
          visit.visitDate,
          seasonStartYear,
          grassCutSeasonStart,
          grassCutSeasonEnd
        )
      )
      .sort(
        (left, right) =>
          new Date(left.visitDate).getTime() - new Date(right.visitDate).getTime()
      )
      .forEach((visit) => {
        const existingVisits = byCustomer.get(visit.customerId) ?? [];
        existingVisits.push(visit);
        byCustomer.set(visit.customerId, existingVisits);
      });

    return byCustomer;
  }, [grassCutSeasonEnd, grassCutSeasonStart, seasonStartYear, visits]);

  const monthlyPaymentLookup = useMemo(() => {
    const lookup = new Map<string, MonthlyPayment>();

    monthlyPayments.forEach((payment) => {
      const key = `${payment.customerId}:${getInputDateValue(payment.paymentMonth)}`;
      lookup.set(key, payment);
    });

    return lookup;
  }, [monthlyPayments]);

  const recordedMonthlyPayments = useMemo(
    () =>
      paymentYearMonths.reduce((count, month) => {
        return (
          count +
          monthlyCustomers.filter((customer) =>
            monthlyPaymentLookup.has(`${customer.id}:${month.key}`)
          ).length
        );
      }, 0),
    [monthlyCustomers, monthlyPaymentLookup, paymentYearMonths]
  );

  const recordedTransferPayments = useMemo(
    () =>
      onDayTransferCustomers.reduce((count, customer) => {
        return (
          count +
          (seasonVisitsByCustomer.get(customer.id) ?? []).filter((visit) =>
            Boolean(getInputDateValue(visit.paidAt))
          ).length
        );
      }, 0),
    [onDayTransferCustomers, seasonVisitsByCustomer]
  );

  const recordedCashPayments = useMemo(
    () =>
      cashCustomers.reduce((count, customer) => {
        return (
          count +
          (seasonVisitsByCustomer.get(customer.id) ?? []).filter((visit) =>
            Boolean(getInputDateValue(visit.paidAt))
          ).length
        );
      }, 0),
    [cashCustomers, seasonVisitsByCustomer]
  );

  const outstandingPaymentRows = useMemo<OutstandingPaymentRow[]>(() => {
    const todayValue = formatDateForInput(new Date());
    const rows: OutstandingPaymentRow[] = [];

    monthlyCustomers.forEach((customer) => {
      const monthlyCharge = getMonthlyPlanCharge(customer);
      const missingMonths = paymentYearMonths
        .filter((month) => {
          const outstandingStartDate = getMonthlyOutstandingStartDate(month.key);
          const payment = monthlyPaymentLookup.get(`${customer.id}:${month.key}`);

          return (
            Boolean(outstandingStartDate) &&
            outstandingStartDate <= todayValue &&
            !getInputDateValue(payment?.paymentDate)
          );
        })
        .map((month) => ({
          label: formatMonthLabel(month.key),
          dueFrom: getMonthlyOutstandingStartDate(month.key),
        }));

      if (missingMonths.length === 0) {
        return;
      }

      rows.push({
        customerId: customer.id,
        customerName: customer.name,
        sectionKey: "monthly",
        routeLabel: getCustomerRouteLabel(customer),
        method: customer.paymentMethod ?? "Monthly",
        amount: missingMonths.length * monthlyCharge,
        dueFrom: missingMonths[0]?.dueFrom ?? todayValue,
        missingItems: missingMonths.map((month) => month.label),
        detail:
          missingMonths.length === 1
            ? "1 overdue month"
            : `${missingMonths.length} overdue months`,
      });
    });

    payOnDayCustomers.forEach((customer) => {
      const unpaidVisits = (seasonVisitsByCustomer.get(customer.id) ?? [])
        .filter((visit) => !getInputDateValue(visit.paidAt))
        .map((visit) => ({
          label: `Visit ${formatStoredDate(visit.visitDate)}`,
          dueFrom: getInputDateValue(visit.visitDate),
          amount: Number(visit.priceAtVisit ?? customer.grassCutAmount ?? 0),
        }));

      if (unpaidVisits.length === 0) {
        return;
      }

      rows.push({
        customerId: customer.id,
        customerName: customer.name,
        sectionKey: customer.paymentMethod === "Cash" ? "cash" : "transfer",
        routeLabel: getCustomerRouteLabel(customer),
        method: customer.paymentMethod ?? "On Day Transfer",
        amount: unpaidVisits.reduce((total, visit) => total + visit.amount, 0),
        dueFrom: unpaidVisits[0]?.dueFrom ?? todayValue,
        missingItems: unpaidVisits.map((visit) => visit.label),
        detail:
          unpaidVisits.length === 1
            ? "1 unpaid visit"
            : `${unpaidVisits.length} unpaid visits`,
      });
    });

    return rows.sort((left, right) => {
      const dueComparison = left.dueFrom.localeCompare(right.dueFrom);

      if (dueComparison !== 0) {
        return dueComparison;
      }

      return right.amount - left.amount;
    });
  }, [
    monthlyCustomers,
    monthlyPaymentLookup,
    paymentYearMonths,
    payOnDayCustomers,
    seasonVisitsByCustomer,
    getCustomerRouteLabel,
  ]);

  const totalOutstandingAmount = useMemo(
    () =>
      outstandingPaymentRows.reduce(
        (total, row) => total + row.amount,
        0
      ),
    [outstandingPaymentRows]
  );

  async function handleMonthlyDateChange(
    slotKey: string,
    customerId: number,
    paymentMonth: string,
    paymentDate: string
  ) {
    setDraftDates((previous) => ({
      ...previous,
      [slotKey]: paymentDate,
    }));
    setSavingKey(slotKey);

    try {
      await onSaveMonthlyPayment(customerId, paymentMonth, paymentDate || null);
      setDraftDates((previous) => {
        const nextDrafts = { ...previous };
        delete nextDrafts[slotKey];
        return nextDrafts;
      });
    } catch {
      setDraftDates((previous) => {
        const nextDrafts = { ...previous };
        delete nextDrafts[slotKey];
        return nextDrafts;
      });
    } finally {
      setSavingKey((previous) => (previous === slotKey ? null : previous));
    }
  }

  async function handleVisitPaymentDateChange(
    slotKey: string,
    visitId: string | number,
    paymentDate: string
  ) {
    setDraftDates((previous) => ({
      ...previous,
      [slotKey]: paymentDate,
    }));
    setSavingKey(slotKey);

    try {
      await onSaveVisitPaymentDate(visitId, paymentDate || null);
      setDraftDates((previous) => {
        const nextDrafts = { ...previous };
        delete nextDrafts[slotKey];
        return nextDrafts;
      });
    } catch {
      setDraftDates((previous) => {
        const nextDrafts = { ...previous };
        delete nextDrafts[slotKey];
        return nextDrafts;
      });
    } finally {
      setSavingKey((previous) => (previous === slotKey ? null : previous));
    }
  }

  async function handleVisitCutDateChange(
    slotKey: string,
    visitId: string | number,
    cutDate: string
  ) {
    if (!cutDate) {
      return;
    }

    setDraftCutDates((previous) => ({
      ...previous,
      [slotKey]: cutDate,
    }));
    setSavingKey(slotKey);

    try {
      await onSaveVisitCutDate(visitId, cutDate);
      setDraftCutDates((previous) => {
        const nextDrafts = { ...previous };
        delete nextDrafts[slotKey];
        return nextDrafts;
      });
    } catch {
      setDraftCutDates((previous) => {
        const nextDrafts = { ...previous };
        delete nextDrafts[slotKey];
        return nextDrafts;
      });
    } finally {
      setSavingKey((previous) => (previous === slotKey ? null : previous));
    }
  }

  async function handleNewVisitCutDateChange(
    slotKey: string,
    customerId: number,
    cutDate: string,
    paymentDate: string | null = null
  ) {
    if (!cutDate) {
      return;
    }

    setDraftCutDates((previous) => ({
      ...previous,
      [slotKey]: cutDate,
    }));
    setSavingKey(slotKey);

    try {
      await onCreateVisitCutDate(customerId, cutDate, paymentDate);
      setDraftCutDates((previous) => {
        const nextDrafts = { ...previous };
        delete nextDrafts[slotKey];
        return nextDrafts;
      });
    } catch {
      setDraftCutDates((previous) => {
        const nextDrafts = { ...previous };
        delete nextDrafts[slotKey];
        return nextDrafts;
      });
    } finally {
      setSavingKey((previous) => (previous === slotKey ? null : previous));
    }
  }

  async function handleVisitRemoval(
    visit: VisitLog,
    customerName: string
  ) {
    const shouldRemove = window.confirm(
      `Remove the visit recorded for ${customerName} on ${formatStoredDate(
        visit.visitDate
      )}? This will delete the visit from Payments and History.`
    );

    if (!shouldRemove) {
      return;
    }

    const visitIdKey = String(visit.id);
    setRemovingVisitId(visitIdKey);

    try {
      await onDeleteVisit(visit.id);
      setDraftDates((previous) => {
        const nextDrafts = { ...previous };
        delete nextDrafts[`visit-${visit.id}`];
        return nextDrafts;
      });
      setDraftCutDates((previous) => {
        const nextDrafts = { ...previous };
        delete nextDrafts[`cut-${visit.id}`];
        return nextDrafts;
      });
    } finally {
      setRemovingVisitId((previous) =>
        previous === visitIdKey ? null : previous
      );
    }
  }

  function toggleCustomerCard(cardKey: string) {
    setExpandedCards((previous) => ({
      ...previous,
      [cardKey]: !previous[cardKey],
    }));
  }

  function setSectionExpanded(
    sectionKey: string,
    sectionCustomers: Customer[],
    expanded: boolean
  ) {
    setExpandedCards((previous) => {
      const nextExpandedCards = { ...previous };

      sectionCustomers.forEach((customer) => {
        nextExpandedCards[getCustomerCardKey(sectionKey, customer.id)] = expanded;
      });

      return nextExpandedCards;
    });
  }

  function setCustomerCardRef(cardKey: string) {
    return (element: HTMLElement | null) => {
      customerCardRefs.current[cardKey] = element;
    };
  }

  function openCustomerPaymentRow(
    sectionKey: PaymentSectionKey,
    customerId: number
  ) {
    const cardKey = getCustomerCardKey(sectionKey, customerId);

    setExpandedCards((previous) => ({
      ...previous,
      [cardKey]: true,
    }));
    setHighlightedCardKey(cardKey);

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedCardKey((previous) =>
        previous === cardKey ? null : previous
      );
    }, 2800);

    requestAnimationFrame(() => {
      customerCardRefs.current[cardKey]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function renderSectionActions(sectionKey: string, sectionCustomers: Customer[]) {
    if (sectionCustomers.length === 0) {
      return null;
    }

    const expandedCount = sectionCustomers.filter(
      (customer) => expandedCards[getCustomerCardKey(sectionKey, customer.id)]
    ).length;
    const allExpanded = expandedCount === sectionCustomers.length;
    const anyExpanded = expandedCount > 0;

    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {expandedCount} of {sectionCustomers.length} expanded
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSectionExpanded(sectionKey, sectionCustomers, true)}
            disabled={allExpanded}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Expand All
          </button>

          <button
            onClick={() => setSectionExpanded(sectionKey, sectionCustomers, false)}
            disabled={!anyExpanded}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Collapse All
          </button>
        </div>
      </div>
    );
  }

  function renderReconciliationRules() {
    if (!rulesExpanded) {
      return null;
    }

    return (
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Matching Rules
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Rules learned from manual matches are reused on future bank
                imports.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {paymentMatchingRules.length}
            </span>
          </div>

          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {paymentMatchingRules.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                No learned matching rules yet.
              </p>
            ) : (
              paymentMatchingRules.map((rule) => {
                const customer = customerById.get(rule.customerId);

                return (
                  <div
                    key={rule.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {customer?.name ?? "Unknown customer"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {rule.matchType.replaceAll("_", " ")}: {rule.matchValue}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Used {rule.useCount} time{rule.useCount === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={rule.isEnabled}
                          onChange={(event) =>
                            void runReconciliationAction(
                              () =>
                                onSavePaymentMatchingRule({
                                  ...rule,
                                  isEnabled: event.target.checked,
                                }),
                              "Unable to update the matching rule."
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        Active
                      </label>
                      <button
                        onClick={() =>
                          void runReconciliationAction(
                            () => onDeletePaymentMatchingRule(rule.id),
                            "Unable to delete the matching rule."
                          )
                        }
                        className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100"
                        aria-label="Delete matching rule"
                        title="Delete matching rule"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Ignore Rules
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Bank fees, transfers, and non-customer entries can be ignored
                automatically.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {paymentIgnoreRules.length}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={newIgnoreRuleValue}
              onChange={(event) => setNewIgnoreRuleValue(event.target.value)}
              placeholder="Description contains..."
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            />
            <button
              onClick={() => void handleCreateManualIgnoreRule()}
              disabled={!newIgnoreRuleValue.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} />
              Add
            </button>
          </div>

          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
            {paymentIgnoreRules.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                No ignore rules yet.
              </p>
            ) : (
              paymentIgnoreRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {rule.matchValue}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {rule.matchType.replaceAll("_", " ")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={rule.isEnabled}
                          onChange={(event) =>
                            void runReconciliationAction(
                              () =>
                                onSavePaymentIgnoreRule({
                                  ...rule,
                                  isEnabled: event.target.checked,
                                }),
                              "Unable to update the ignore rule."
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      Active
                    </label>
                    <button
                      onClick={() =>
                        void runReconciliationAction(
                          () => onDeletePaymentIgnoreRule(rule.id),
                          "Unable to delete the ignore rule."
                        )
                      }
                      className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100"
                      aria-label="Delete ignore rule"
                      title="Delete ignore rule"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderReconciliationCentre() {
    const filterOptions: Array<{ key: ReconciliationFilter; label: string }> = [
      { key: "all", label: "All" },
      { key: "selected", label: "Selected" },
      { key: "matched", label: "Matched" },
      { key: "review", label: "Review" },
      { key: "unmatched", label: "No match" },
      { key: "duplicate", label: "Duplicate" },
      { key: "ignored", label: "Ignored" },
    ];
    const selectedImportableCount = selectedReconciliationRows.filter(
      canImportReconciliationRow
    ).length;
    const importedRowCount = statementImportRows.filter(
      (row) => row.status === "imported"
    ).length;
    const activeCreditTotal = activeCustomerCredits.reduce(
      (total, credit) => total + credit.amount,
      0
    );

    return (
      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#18b74f]">
              Payment Reconciliation Centre
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Import bank statements and match payments
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Upload a CSV statement, review suggested customer matches, split
              payments across unpaid invoices or visits, and learn the matches
              for next time.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#18b74f] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#129640]">
              <Upload size={16} />
              Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => void handleStatementFileChange(event)}
                className="sr-only"
              />
            </label>

            <button
              onClick={() => setRulesExpanded((previous) => !previous)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Info size={16} />
              Rules
            </button>

            {reconciliationRows.length > 0 && (
              <button
                onClick={clearReconciliationReview}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X size={16} />
                Clear
              </button>
            )}
          </div>
        </div>

        {!reconciliationReady && (
          <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} />
            <p>
              Reconciliation storage is not ready in Supabase yet. You can
              still review imports in this session, but import history, rules,
              credits, and audit events need the latest tenant SQL setup script.
            </p>
          </div>
        )}

        {reconciliationError && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {reconciliationError}
          </div>
        )}

        {reconciliationWarnings.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {reconciliationWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Rows In Review
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {reconciliationSummary.totalRows}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {reconciliationFileName || "No statement loaded"}
            </p>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Ready To Import
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-700">
              {selectedImportableCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatMoney(
                selectedReconciliationRows
                  .filter(canImportReconciliationRow)
                  .reduce((total, row) => total + row.amount, 0)
              )}{" "}
              selected
            </p>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Imported Rows
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {importedRowCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Across {statementImports.length} import
              {statementImports.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Customer Credits
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {formatMoney(activeCreditTotal)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              From partial, split, or overpaid imports
            </p>
          </div>
        </div>

        {reconciliationRows.length > 0 && (
          <div className="mt-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setReconciliationFilter(option.key)}
                    className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                      reconciliationFilter === option.key
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={selectConfidentReconciliationRows}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <CheckCircle2 size={16} />
                  Select confident
                </button>
                <button
                  onClick={() => void handleImportSelectedRows()}
                  disabled={selectedImportableCount === 0 || isImportingStatement}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isImportingStatement ? "Importing..." : "Import selected"}
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[1180px] overflow-hidden rounded-[18px] border border-slate-200">
                <div className="grid grid-cols-[0.35fr_0.7fr_1.45fr_1.1fr_0.65fr_1.45fr_0.85fr_0.55fr] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <span>Select</span>
                  <span>Date</span>
                  <span>Description</span>
                  <span>Customer</span>
                  <span>Status</span>
                  <span>Allocation</span>
                  <span>Learning</span>
                  <span>Remove</span>
                </div>

                {visibleReconciliationRows.map((row) => {
                  const isSelected = selectedReconciliationRowIds.includes(row.id);
                  const canSelect = canImportReconciliationRow(row);
                  const selectedCustomer =
                    row.selectedCustomerId == null
                      ? null
                      : customerById.get(row.selectedCustomerId) ?? null;

                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-[0.35fr_0.7fr_1.45fr_1.1fr_0.65fr_1.45fr_0.85fr_0.55fr] items-start gap-3 border-t border-slate-200 px-4 py-3 text-sm"
                    >
                      <label className="pt-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          onChange={(event) =>
                            toggleReconciliationRow(row.id, event.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-300 disabled:opacity-40"
                        />
                      </label>

                      <div className="pt-1 font-semibold text-slate-700">
                        {formatStoredDate(row.transactionDate)}
                      </div>

                      <div className="min-w-0">
                        <p className="break-words font-bold text-slate-900">
                          {row.description || row.customerNameFromStatement || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatMoney(row.amount)} · Row {row.rowIndex}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {row.matchReason}
                        </p>
                      </div>

                      <div>
                        <select
                          value={row.selectedCustomerId ?? ""}
                          onChange={(event) =>
                            setReconciliationRowCustomer(
                              row.id,
                              event.target.value ? Number(event.target.value) : null
                            )
                          }
                          disabled={row.matchStatus === "already_imported"}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">No customer</option>
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name}
                            </option>
                          ))}
                        </select>
                        {selectedCustomer && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            {getCustomerDisplayAddress(selectedCustomer)}
                          </p>
                        )}
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getReconciliationStatusClass(row)}`}
                        >
                          {getReconciliationStatusLabel(row)}
                        </span>
                        <p className="mt-1 text-[11px] font-semibold text-slate-400">
                          {row.matchConfidence}% confidence
                        </p>
                      </div>

                      <div>
                        <select
                          value={getAllocationMode(row)}
                          onChange={(event) => {
                            setReconciliationAllocationMode(
                              row.id,
                              event.target.value as "suggested" | "credit" | "on_account"
                            );
                          }}
                          disabled={!row.selectedCustomerId}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="suggested">Suggested split</option>
                          <option value="credit">Customer credit</option>
                          <option value="on_account">On account</option>
                        </select>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {row.selectedAllocations.length === 0 ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                              No allocation
                            </span>
                          ) : (
                            row.selectedAllocations.map((allocation) => (
                              <span
                                key={allocation.id}
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  allocation.isPartial
                                    ? "bg-amber-100 text-amber-700"
                                    : allocation.type === "credit" ||
                                      allocation.type === "on_account"
                                    ? "bg-sky-100 text-sky-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                                title={allocation.targetLabel}
                              >
                                {allocation.targetLabel}:{" "}
                                {formatMoney(allocation.amount)}
                                {allocation.isPartial ? " partial" : ""}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <label className="flex items-center gap-2 pt-2 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={row.learnMatch}
                          disabled={!row.selectedCustomerId}
                          onChange={(event) =>
                            setReconciliationRows((previous) =>
                              previous.map((entry) =>
                                entry.id === row.id
                                  ? { ...entry, learnMatch: event.target.checked }
                                  : entry
                              )
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        Learn
                      </label>

                      <button
                        onClick={() => removeReconciliationRow(row.id)}
                        disabled={row.matchStatus === "already_imported"}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Remove transaction from review"
                        title="Remove transaction from review"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  );
                })}

                {visibleReconciliationRows.length === 0 && (
                  <div className="border-t border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                    No rows match this filter.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {renderReconciliationRules()}

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Import History
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Undo an import if a statement was matched incorrectly.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {statementImports.length}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {statementImports.slice(0, 5).length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                  No statement imports yet.
                </p>
              ) : (
                statementImports.slice(0, 5).map((importRecord) => {
                  const rowCount = statementImportRows.filter(
                    (row) => row.statementImportId === importRecord.id
                  ).length;

                  return (
                    <div
                      key={importRecord.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {importRecord.fileName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatStoredDate(importRecord.createdAt)} ·{" "}
                          {importRecord.importedCount} imported · {rowCount} rows
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            importRecord.status === "undone"
                              ? "bg-slate-200 text-slate-600"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {importRecord.status.replaceAll("_", " ")}
                        </span>
                        <button
                          onClick={() =>
                            void onUndoStatementImport(importRecord.id)
                          }
                          disabled={importRecord.status === "undone"}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <RotateCcw size={14} />
                          Undo
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-black text-slate-900">
              Customer Credits
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Credits are created for overpayments, on-account values, and
              partial payments that cannot fully close a visit or invoice yet.
            </p>

            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {activeCustomerCredits.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                  No active customer credits.
                </p>
              ) : (
                activeCustomerCredits.slice(0, 8).map((credit) => {
                  const customer = customerById.get(credit.customerId);

                  return (
                    <div
                      key={credit.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {customer?.name ?? "Unknown customer"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {credit.note ?? "Customer credit"}
                          </p>
                        </div>
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                          {formatMoney(credit.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderOutstandingPaymentsSection() {
    return (
      <section
        data-tour="payment-status"
        className="rounded-[22px] border border-amber-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Outstanding Payments
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              {formatMoney(totalOutstandingAmount)}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {outstandingPaymentRows.length} customer
              {outstandingPaymentRows.length === 1 ? "" : "s"} currently due
              for {routeFilterLabel}.
            </p>
          </div>

          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Monthly arrears are only listed after the following month closes.
          </div>
        </div>

        {outstandingPaymentRows.length === 0 ? (
          <div className="mt-4 rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-slate-500">
            No outstanding payments for this filter.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[860px] overflow-hidden rounded-[18px] border border-slate-200">
              <div className="grid grid-cols-[1.2fr_0.8fr_0.85fr_0.85fr_1.6fr_0.55fr] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Customer</span>
                <span>Route</span>
                <span>Method</span>
                <span>Outstanding</span>
                <span>Missing</span>
                <span>Action</span>
              </div>

              {outstandingPaymentRows.map((row) => {
                const visibleItems = row.missingItems.slice(0, 3);
                const hiddenItemCount = row.missingItems.length - visibleItems.length;

                return (
                  <div
                    key={`${row.customerId}-${row.method}`}
                    className="grid grid-cols-[1.2fr_0.8fr_0.85fr_0.85fr_1.6fr_0.55fr] items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm"
                  >
                    <button
                      onClick={() => onOpenCustomer(row.customerId)}
                      className="text-left font-black text-slate-900 transition hover:underline"
                    >
                      {row.customerName}
                    </button>

                    <span className="font-semibold text-slate-600">
                      {row.routeLabel}
                    </span>

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {row.method}
                    </span>

                    <div>
                      <p className="font-black text-amber-700">
                        {formatMoney(row.amount)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Due from {formatStoredDate(row.dueFrom)}
                      </p>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-1.5">
                        {visibleItems.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"
                          >
                            {item}
                          </span>
                        ))}
                        {hiddenItemCount > 0 && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            +{hiddenItemCount} more
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {row.detail}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        openCustomerPaymentRow(row.sectionKey, row.customerId)
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Open
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    );
  }

  function renderMonthlySection() {
    return (
      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              Monthly Plans
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Expand a customer to see the full 12-month payment year starting
              from your configured season start month, with visits logged above
              the payment date for each month.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            {!monthlyPaymentsReady && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Monthly payment storage is not ready yet. Run the payment
                tracking SQL script, then refresh.
              </div>
            )}

            {renderSectionActions("monthly", monthlyCustomers)}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {monthlyCustomers.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              No monthly-plan customers match the current filter.
            </div>
          ) : (
            monthlyCustomers.map((customer) => {
              const customerVisits = seasonVisitsByCustomer.get(customer.id) ?? [];
              const paidMonthCount = paymentYearMonths.filter((month) =>
                monthlyPaymentLookup.has(`${customer.id}:${month.key}`)
              ).length;
              const cardKey = getCustomerCardKey("monthly", customer.id);
              const isExpanded = Boolean(expandedCards[cardKey]);
              const hasSearchMatch = Boolean(normalizedSearch);
              const isHighlighted = highlightedCardKey === cardKey;

              return (
                <article
                  key={customer.id}
                  ref={setCustomerCardRef(cardKey)}
                  className={`overflow-hidden rounded-[24px] border shadow-sm ${
                    isHighlighted
                      ? "border-[#244d51] bg-emerald-50/70 ring-2 ring-[#18b74f]/35"
                      : hasSearchMatch
                      ? "border-amber-300 bg-amber-50/50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => onOpenCustomer(customer.id)}
                          className="text-left text-lg font-black tracking-tight text-slate-900 transition hover:underline"
                        >
                          {renderHighlightedText(customer.name, search)}
                        </button>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {customer.paymentMethod ?? "Monthly"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        {renderHighlightedText(getCustomerDisplayAddress(customer), search)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {paidMonthCount}/{paymentYearMonths.length} paid
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {customerVisits.length} visits logged
                      </span>

                      <button
                        onClick={() => toggleCustomerCard(cardKey)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {isExpanded ? "Hide Months" : "Show Months"}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-200 px-5 py-5">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {paymentYearMonths.map((month) => {
                          const payment =
                            monthlyPaymentLookup.get(`${customer.id}:${month.key}`) ??
                            null;
                          const monthVisits = customerVisits.filter((visit) =>
                            getInputDateValue(visit.visitDate).startsWith(
                              month.key.slice(0, 7)
                            )
                          );
                          const slotKey = `monthly-${customer.id}-${month.key}`;
                          const currentValue =
                            draftDates[slotKey] ??
                            getInputDateValue(payment?.paymentDate);
                          const isPaid = Boolean(currentValue);
                          const newCutDateKey = `new-cut-${customer.id}-${month.key}`;
                          const newCutDateValue =
                            draftCutDates[newCutDateKey] ?? "";
                          const monthEndDate = formatDateForInput(
                            new Date(month.year, month.monthIndex + 1, 0)
                          );
                          const addCutMinDate =
                            month.start > seasonMinDate
                              ? month.start
                              : seasonMinDate;
                          const addCutMaxDate =
                            monthEndDate < seasonMaxDate
                              ? monthEndDate
                              : seasonMaxDate;
                          const canAddCutInMonth =
                            addCutMinDate <= addCutMaxDate;

                          return (
                            <div
                              key={month.key}
                              className={`rounded-[20px] border p-4 ${
                                isPaid
                                  ? "border-emerald-200 bg-emerald-50/70"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-slate-900">
                                    {month.label}
                                  </p>
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    {month.fullLabel}
                                  </p>
                                </div>

                                <span
                                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                    isPaid
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {isPaid ? "Paid" : "Awaiting"}
                                </span>
                              </div>

                              <div className="mt-4">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                  Visits This Month
                                </p>

                                {monthVisits.length > 0 ? (
                                  <div className="mt-3 space-y-3">
                                    {monthVisits.map((visit) => (
                                      <div
                                        key={visit.id}
                                        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                              Logged Visit
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                              {formatStoredDate(visit.visitDate)}
                                            </p>
                                          </div>

                                          <button
                                            onClick={() =>
                                              void handleVisitRemoval(
                                                visit,
                                                customer.name
                                              )
                                            }
                                            disabled={
                                              removingVisitId === String(visit.id)
                                            }
                                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {removingVisitId === String(visit.id)
                                              ? "Removing..."
                                              : "Remove Visit"}
                                          </button>
                                        </div>

                                        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                          Visit Date
                                        </label>
                                        <input
                                          type="date"
                                          value={
                                            draftCutDates[`cut-${visit.id}`] ??
                                            getInputDateValue(visit.visitDate)
                                          }
                                          disabled={
                                            removingVisitId === String(visit.id)
                                          }
                                          onChange={(event) => {
                                            if (!event.target.value) {
                                              return;
                                            }

                                            void handleVisitCutDateChange(
                                              `cut-${visit.id}`,
                                              visit.id,
                                              event.target.value
                                            );
                                          }}
                                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                                        />

                                        <p className="mt-2 text-[11px] text-slate-400">
                                          {savingKey === `cut-${visit.id}`
                                            ? "Saving..."
                                            : `Visit logged ${formatStoredDate(
                                                draftCutDates[`cut-${visit.id}`] ??
                                                  visit.visitDate
                                              )}`}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-2 min-h-8 text-sm text-slate-500">
                                    No visits logged yet
                                  </p>
                                )}

                                {canAddCutInMonth && (
                                  <>
                                    <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                      Add Visit Date
                                    </label>
                                    <input
                                      type="date"
                                      value={newCutDateValue}
                                      min={addCutMinDate}
                                      max={addCutMaxDate}
                                      disabled={savingKey === newCutDateKey}
                                      onChange={(event) => {
                                        if (!event.target.value) {
                                          return;
                                        }

                                        void handleNewVisitCutDateChange(
                                          newCutDateKey,
                                          customer.id,
                                          event.target.value
                                        );
                                      }}
                                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                                    />

                                    <p className="mt-2 text-[11px] text-slate-400">
                                      {savingKey === newCutDateKey
                                        ? "Saving..."
                                        : "Enter a visit date to log a completed visit"}
                                    </p>
                                  </>
                                )}
                              </div>

                              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Payment Date
                              </label>
                              <input
                                data-tour="record-payment-button"
                                type="date"
                                value={currentValue}
                                disabled={!monthlyPaymentsReady}
                                onChange={(event) => {
                                  void handleMonthlyDateChange(
                                    slotKey,
                                    customer.id,
                                    month.key,
                                    event.target.value
                                  );
                                }}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                              />

                              <p className="mt-2 text-[11px] text-slate-400">
                                {savingKey === slotKey
                                  ? "Saving..."
                                  : currentValue
                                  ? `Paid ${formatStoredDate(currentValue)}`
                                  : "Awaiting payment date"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    );
  }

  function renderPayOnDaySection(
    sectionKey: string,
    title: string,
    description: string,
    sectionCustomers: Customer[],
    emptyMessage: string,
    pendingDates?: Record<string, string>
  ) {
    return (
      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>

          {renderSectionActions(sectionKey, sectionCustomers)}
        </div>

        <div className="mt-4 space-y-4">
          {sectionCustomers.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              {emptyMessage}
            </div>
          ) : (
            sectionCustomers.map((customer) => {
              const customerVisits = (
                seasonVisitsByCustomer.get(customer.id) ?? []
              );
              const cutSlotCount = getSeasonCutSlotCount(
                getEffectiveRotationWeeks(customer, normalizedDefaultRotationWeeks),
                seasonStartYear,
                grassCutSeasonStart,
                grassCutSeasonEnd
              );
              const limitedCustomerVisits = customerVisits.slice(0, cutSlotCount);
              const pendingPaymentDate =
                pendingDates?.[String(customer.id)] ?? "";
              const pendingIsInSeason =
                Boolean(pendingPaymentDate) &&
                isDateInSeasonRange(
                  pendingPaymentDate,
                  seasonStartYear,
                  grassCutSeasonStart,
                  grassCutSeasonEnd
                );
              const pendingSlotIndex =
                pendingIsInSeason && limitedCustomerVisits.length < cutSlotCount
                  ? limitedCustomerVisits.length
                  : -1;
              const paidVisitCount = limitedCustomerVisits.filter((visit) =>
                Boolean(getInputDateValue(visit.paidAt))
              ).length;
              const cardKey = getCustomerCardKey(sectionKey, customer.id);
              const isExpanded = Boolean(expandedCards[cardKey]);
              const hasSearchMatch = Boolean(normalizedSearch);
              const isHighlighted = highlightedCardKey === cardKey;

              return (
                <article
                  key={customer.id}
                  ref={setCustomerCardRef(cardKey)}
                  className={`overflow-hidden rounded-[24px] border shadow-sm ${
                    isHighlighted
                      ? "border-[#244d51] bg-emerald-50/70 ring-2 ring-[#18b74f]/35"
                      : hasSearchMatch
                      ? "border-amber-300 bg-amber-50/50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => onOpenCustomer(customer.id)}
                          className="text-left text-lg font-black tracking-tight text-slate-900 transition hover:underline"
                        >
                          {renderHighlightedText(customer.name, search)}
                        </button>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {customer.paymentMethod ?? "Monthly"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        {renderHighlightedText(getCustomerDisplayAddress(customer), search)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {paidVisitCount}/{cutSlotCount} paid
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {limitedCustomerVisits.length}/{cutSlotCount} visits logged
                      </span>

                      {pendingSlotIndex !== -1 && (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                          Route paid {formatStoredDate(pendingPaymentDate)}
                        </span>
                      )}

                      <button
                        onClick={() => toggleCustomerCard(cardKey)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {isExpanded ? "Hide Visits" : "Show Visits"}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-200 px-5 py-5">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {Array.from({ length: cutSlotCount }, (_, index) => {
                          const visit = limitedCustomerVisits[index] ?? null;
                          const pendingValue =
                            !visit && index === pendingSlotIndex
                              ? pendingPaymentDate
                              : "";
                          const cutDateKey = visit ? `cut-${visit.id}` : "";
                          const slotKey = visit
                            ? `visit-${visit.id}`
                            : `empty-${customer.id}-${index}`;
                          const currentCutDate = visit
                            ? draftCutDates[cutDateKey] ??
                              getInputDateValue(visit.visitDate)
                            : "";
                          const newCutDateKey = `new-cut-${sectionKey}-${customer.id}-${index}`;
                          const newCutDateValue =
                            draftCutDates[newCutDateKey] ?? "";
                          const currentValue = visit
                            ? draftDates[slotKey] ?? getInputDateValue(visit.paidAt)
                            : pendingValue;
                          const isPendingRouteSlot = Boolean(pendingValue) && !visit;
                          const isPaid = Boolean(currentValue);
                          const isRemoving = visit
                            ? removingVisitId === String(visit.id)
                            : false;

                          return (
                            <div
                              key={slotKey}
                              className={`rounded-[20px] border p-4 ${
                                isPendingRouteSlot
                                  ? "border-sky-200 bg-sky-50"
                                  : isPaid
                                  ? "border-emerald-200 bg-emerald-50/70"
                                  : visit
                                  ? "border-amber-200 bg-amber-50/70"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-slate-900">
                                    Visit {index + 1}
                                  </p>
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    {isPendingRouteSlot
                                      ? "Route payment selected"
                                      : visit
                                      ? "Completed visit"
                                      : "Waiting for visit"}
                                  </p>
                                </div>

                                <span
                                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                    isPendingRouteSlot
                                      ? "bg-sky-100 text-sky-700"
                                      : isPaid
                                      ? "bg-emerald-100 text-emerald-700"
                                      : visit
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {isPendingRouteSlot
                                    ? "Pending"
                                    : isPaid
                                    ? "Paid"
                                    : visit
                                    ? "Unpaid"
                                    : "Awaiting"}
                                </span>
                              </div>

                              <div className="mt-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                      Visit Date
                                    </p>
                                  </div>

                                  {visit && (
                                    <button
                                      onClick={() =>
                                        void handleVisitRemoval(
                                          visit,
                                          customer.name
                                        )
                                      }
                                      disabled={isRemoving}
                                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {isRemoving ? "Removing..." : "Remove Visit"}
                                    </button>
                                  )}
                                </div>

                                {visit && (
                                  <>
                                    <input
                                      type="date"
                                      value={currentCutDate}
                                      disabled={isRemoving}
                                      onChange={(event) => {
                                        if (!event.target.value) {
                                          return;
                                        }

                                        void handleVisitCutDateChange(
                                          cutDateKey,
                                          visit.id,
                                          event.target.value
                                        );
                                      }}
                                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                                    />

                                    <p className="mt-2 text-[11px] text-slate-400">
                                      {savingKey === cutDateKey
                                        ? "Saving..."
                                        : `Visit logged ${formatStoredDate(
                                            currentCutDate
                                          )}`}
                                    </p>
                                  </>
                                )}

                                {!visit && (
                                  <>
                                    <input
                                      type="date"
                                      value={newCutDateValue}
                                      min={seasonMinDate}
                                      max={seasonMaxDate}
                                      disabled={savingKey === newCutDateKey}
                                      onChange={(event) => {
                                        if (!event.target.value) {
                                          return;
                                        }

                                        void handleNewVisitCutDateChange(
                                          newCutDateKey,
                                          customer.id,
                                          event.target.value,
                                          pendingValue || null
                                        );
                                      }}
                                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                                    />

                                    <p className="mt-2 text-[11px] text-slate-400">
                                      {savingKey === newCutDateKey
                                        ? "Saving..."
                                        : isPendingRouteSlot
                                        ? "Enter the visit date to create the visit and attach this payment"
                                        : "Enter the visit date to log this visit"}
                                    </p>
                                  </>
                                )}
                              </div>

                              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Payment Date
                              </label>
                              <input
                                data-tour="record-payment-button"
                                type="date"
                                value={currentValue}
                                disabled={!visit || isRemoving}
                                readOnly={!visit}
                                onChange={(event) => {
                                  if (!visit) {
                                    return;
                                  }

                                  void handleVisitPaymentDateChange(
                                    slotKey,
                                    visit.id,
                                    event.target.value
                                  );
                                }}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-white/70 disabled:text-slate-400"
                              />

                              <p className="mt-2 text-[11px] text-slate-400">
                                {!visit && pendingValue
                                  ? `Selected on route for ${formatStoredDate(
                                      pendingValue
                                    )}. This attaches after the visit is logged.`
                                  : !visit
                                  ? "Payment date unlocks after the visit is logged"
                                  : savingKey === slotKey
                                  ? "Saving..."
                                  : currentValue
                                  ? `Paid ${formatStoredDate(currentValue)}`
                                  : "Awaiting payment date"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    );
  }

  if (reconciliationOnly) {
    return <div className="space-y-6">{renderReconciliationCentre()}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
              Customer Payments
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Payment Tracking
            </h1>
            <p className="mt-2 text-sm text-white/75">
              Track monthly-plan payments by month and pay-on-day customers by
              each completed visit.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="rounded-2xl bg-white/10 p-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSeasonStartYear((previous) => previous - 1)}
                  className="rounded-xl px-3 py-2 text-white transition hover:bg-white/10"
                  aria-label="Previous season"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900">
                  {getSeasonLabel(
                    seasonStartYear,
                    grassCutSeasonStart,
                    grassCutSeasonEnd
                  )}{" "}
                  Season
                </div>

                <button
                  onClick={() => setSeasonStartYear((previous) => previous + 1)}
                  className="rounded-xl px-3 py-2 text-white transition hover:bg-white/10"
                  aria-label="Next season"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <select
                value={weekFilter}
                onChange={(event) => setWeekFilter(event.target.value as WeekFilter)}
                aria-label="Filter payments by week"
                className="w-full rounded-xl border border-white/15 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-white sm:w-32"
              >
                <option value="all">All weeks</option>
                {weekFilterOptions.map((week) => (
                  <option key={week} value={week}>
                    {getRotationCycleLabel(week, routeRotationWeeks)}
                  </option>
                ))}
              </select>

              <select
                value={dayFilter}
                onChange={(event) => setDayFilter(event.target.value as DayFilter)}
                aria-label="Filter payments by day"
                className="w-full rounded-xl border border-white/15 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-white sm:w-36"
              >
                <option value="all">All days</option>
                {DAY_FILTER_OPTIONS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setWeekFilter("all");
                  setDayFilter("all");
                  setSearch("");
                }}
                disabled={!hasRouteFilter && !normalizedSearch}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                All Customers
              </button>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, site, address, town or postcode..."
                className="w-full rounded-xl border border-white/15 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-white sm:w-72"
              />
            </div>
          </div>
        </div>
      </section>

      {(normalizedSearch || hasRouteFilter) && (
        <section className="rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-amber-900">
              Showing {filteredCustomers.length} matching customer
              {filteredCustomers.length === 1 ? "" : "s"}
              {normalizedSearch ? (
                <>
                  {" "}
                  for &quot;{search.trim()}&quot;
                </>
              ) : null}{" "}
              across {routeFilterLabel}.
            </p>

            <button
              onClick={() => {
                setWeekFilter("all");
                setDayFilter("all");
                setSearch("");
              }}
              className="w-fit rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              All Customers
            </button>
          </div>
        </section>
      )}

      {renderOutstandingPaymentsSection()}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Monthly Customers
          </p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            {monthlyCustomers.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {recordedMonthlyPayments} monthly payment dates recorded in this
            12-month payment year.
          </p>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            On Day Transfer
          </p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            {onDayTransferCustomers.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {recordedTransferPayments} transfer payment dates recorded this
            season.
          </p>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Cash
          </p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            {cashCustomers.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {recordedCashPayments} cash payment dates recorded this season.
          </p>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Season Window
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {seasonDateRange.startDate.toLocaleDateString()} to{" "}
            {seasonDateRange.endDate.toLocaleDateString()}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Monthly plans use 12 payment months starting from the configured
            season start month.
            Pay-on-day customers use visit slots based on the season length and
            their service frequency.
          </p>
        </div>
      </div>

      {renderMonthlySection()}

      {renderPayOnDaySection(
        "transfer",
        "On Day Transfer Customers",
        "Expand a customer to see each visit date and the transfer payment date beside it.",
        onDayTransferCustomers,
        "No On Day Transfer customers match the current filter."
      )}

      {renderPayOnDaySection(
        "cash",
        "Cash Customers",
        "Expand a customer to see each visit, the cash collection date, and any route payment selected before the visit is logged.",
        cashCustomers,
        "No Cash customers match the current filter.",
        pendingCashPaymentDates
      )}
    </div>
  );
}
