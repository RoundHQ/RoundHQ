"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
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
  getWeekOptions,
  isCustomerDueInSelectedWeek,
  normalizeRotationWeeks,
} from "./rotation";
import type {
  Customer,
  DayName,
  MonthlyPayment,
  RotationWeeks,
  VisitLog,
  WeekNumber,
} from "./types";

type Props = {
  customers: Customer[];
  visits: VisitLog[];
  monthlyPayments: MonthlyPayment[];
  defaultRotationWeeks?: RotationWeeks;
  activeRotationWeeks?: RotationWeeks;
  weekOptions?: WeekNumber[];
  grassCutSeasonStart: string;
  grassCutSeasonEnd: string;
  monthlyPaymentsReady: boolean;
  pendingCashPaymentDates: Record<string, string>;
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
];
type WeekFilter = "all" | WeekNumber;
type DayFilter = "all" | DayName;
type OutstandingPaymentRow = {
  customerId: number;
  customerName: string;
  routeLabel: string;
  method: string;
  amount: number;
  dueFrom: string;
  missingItems: string[];
  detail: string;
};

function isPayOnDayCustomer(customer: Customer) {
  return PAY_ON_DAY_PAYMENT_METHODS.has(customer.paymentMethod ?? "Monthly");
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
  monthlyPayments,
  defaultRotationWeeks = DEFAULT_ROTATION_WEEKS,
  activeRotationWeeks,
  weekOptions,
  grassCutSeasonStart,
  grassCutSeasonEnd,
  monthlyPaymentsReady,
  pendingCashPaymentDates,
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
  const normalizedSearch = getNormalizedQuery(search);
  const normalizedDefaultRotationWeeks = normalizeRotationWeeks(defaultRotationWeeks);
  const routeRotationWeeks = normalizeRotationWeeks(
    activeRotationWeeks ?? normalizedDefaultRotationWeeks
  );
  const weekFilterOptions =
    weekOptions?.length ? weekOptions : getWeekOptions(routeRotationWeeks);

  useEffect(() => {
    if (weekFilter !== "all" && !weekFilterOptions.includes(weekFilter)) {
      setWeekFilter("all");
    }
  }, [weekFilter, weekFilterOptions]);

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
            isCustomerDueInSelectedWeek(
              customer,
              weekFilter,
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
  const getCustomerRouteLabel = (customer: Customer) =>
    `${getRotationCycleLabel(
      customer.week,
      getEffectiveRotationWeeks(customer, normalizedDefaultRotationWeeks)
    )} ${customer.day}`;

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
    normalizedDefaultRotationWeeks,
    paymentYearMonths,
    payOnDayCustomers,
    seasonVisitsByCustomer,
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

  function renderOutstandingPaymentsSection() {
    return (
      <section className="rounded-[22px] border border-amber-200 bg-white p-5 shadow-sm">
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
                      onClick={() => onOpenCustomer(row.customerId)}
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

              return (
                <article
                  key={customer.id}
                  className={`overflow-hidden rounded-[24px] border shadow-sm ${
                    hasSearchMatch
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

              return (
                <article
                  key={customer.id}
                  className={`overflow-hidden rounded-[24px] border shadow-sm ${
                    hasSearchMatch
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
