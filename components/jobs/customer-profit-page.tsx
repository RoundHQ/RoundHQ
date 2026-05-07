"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CircleAlert,
  CreditCard,
  PoundSterling,
  Search,
  Scissors,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  buildCustomerProfitRows,
  formatCustomerProfitDate,
  type CustomerProfitRow,
} from "./customer-profit";
import type { Customer, MonthlyPayment, VisitLog } from "./types";

type Props = {
  customers: Customer[];
  visits: VisitLog[];
  monthlyPayments: MonthlyPayment[];
  grassCutSeasonStart: string;
  grassCutSeasonEnd: string;
  onOpenCustomer: (customerId: number) => void;
};

type CustomerScopeFilter = "grass" | "all";
type PaymentFilter = "all" | "Monthly" | "On Day Transfer" | "Cash" | "Non-routine";
type StatusFilter =
  | "all"
  | "needs_review"
  | "payment_due"
  | "missed_cuts"
  | "no_cuts"
  | "healthy"
  | "non_routine";
type SortKey =
  | "paid_desc"
  | "outstanding_desc"
  | "booked_desc"
  | "missed_desc"
  | "last_visit_desc"
  | "name_asc";

function formatMoney(value: number) {
  return `\u00a3${value.toFixed(2)}`;
}

function getNormalizedQuery(query: string) {
  return query.trim().toLowerCase();
}

function getStatusFilterKey(row: CustomerProfitRow): Exclude<StatusFilter, "all"> {
  if (!row.isGrassCuttingCustomer) {
    return "non_routine";
  }

  if (row.outstanding > 0) {
    return "payment_due";
  }

  if (row.notCutCount > 0) {
    return "missed_cuts";
  }

  if (row.completedVisitCount === 0) {
    return "no_cuts";
  }

  return "healthy";
}

function isReviewRow(row: CustomerProfitRow) {
  return (
    row.isGrassCuttingCustomer &&
    (row.outstanding > 0 || row.notCutCount > 0 || row.completedVisitCount === 0)
  );
}

function matchesSearch(row: CustomerProfitRow, query: string) {
  const normalizedQuery = getNormalizedQuery(query);

  if (!normalizedQuery) {
    return true;
  }

  return [
    row.customerName,
    row.address,
    row.routeLabel,
    row.paymentMethod,
    row.statusLabel,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function sortCustomerProfitRows(rows: CustomerProfitRow[], sortKey: SortKey) {
  return [...rows].sort((left, right) => {
    if (sortKey === "outstanding_desc") {
      return right.outstanding - left.outstanding;
    }

    if (sortKey === "booked_desc") {
      return right.bookedRevenue - left.bookedRevenue;
    }

    if (sortKey === "missed_desc") {
      return right.notCutCount - left.notCutCount;
    }

    if (sortKey === "last_visit_desc") {
      return (
        new Date(right.lastVisitDate ?? 0).getTime() -
        new Date(left.lastVisitDate ?? 0).getTime()
      );
    }

    if (sortKey === "name_asc") {
      return left.customerName.localeCompare(right.customerName);
    }

    return right.paidRevenue - left.paidRevenue;
  });
}

function getPaymentDetail(row: CustomerProfitRow) {
  if (!row.isGrassCuttingCustomer) {
    return "No grass route";
  }

  if (row.paymentMethod === "Monthly") {
    return `${row.paidMonthCount} paid months, ${row.outstandingMonthCount} due`;
  }

  return `${row.paidVisitCount} paid cuts, ${row.unpaidVisitCount} unpaid`;
}

function Select({
  value,
  onChange,
  children,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      >
        {children}
      </select>
    </label>
  );
}

export default function CustomerProfitPage({
  customers,
  visits,
  monthlyPayments,
  grassCutSeasonStart,
  grassCutSeasonEnd,
  onOpenCustomer,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [customerScope, setCustomerScope] = useState<CustomerScopeFilter>("grass");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("paid_desc");

  const profitRows = useMemo(
    () =>
      buildCustomerProfitRows({
        customers,
        visits,
        monthlyPayments,
        grassCutSeasonStart,
        grassCutSeasonEnd,
        includeNonGrassCustomers: true,
      }),
    [
      customers,
      grassCutSeasonEnd,
      grassCutSeasonStart,
      monthlyPayments,
      visits,
    ]
  );

  const filteredRows = useMemo(() => {
    const rows = profitRows.filter((row) => {
      if (customerScope === "grass" && !row.isGrassCuttingCustomer) {
        return false;
      }

      if (paymentFilter !== "all" && row.paymentMethod !== paymentFilter) {
        return false;
      }

      if (statusFilter === "needs_review" && !isReviewRow(row)) {
        return false;
      }

      if (
        statusFilter !== "all" &&
        statusFilter !== "needs_review" &&
        getStatusFilterKey(row) !== statusFilter
      ) {
        return false;
      }

      return matchesSearch(row, searchQuery);
    });

    return sortCustomerProfitRows(rows, sortKey);
  }, [customerScope, paymentFilter, profitRows, searchQuery, sortKey, statusFilter]);

  const paidTotal = filteredRows.reduce((total, row) => total + row.paidRevenue, 0);
  const outstandingTotal = filteredRows.reduce(
    (total, row) => total + row.outstanding,
    0
  );
  const bookedTotal = filteredRows.reduce((total, row) => total + row.bookedRevenue, 0);
  const reviewCount = filteredRows.filter(isReviewRow).length;
  const topCustomer = filteredRows[0] ?? null;

  return (
    <div className="space-y-5">
      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Before expenses
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">
                Customer Profitability
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Current season performance by customer, including paid income,
                unpaid work, missed cuts, and payment risk.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => topCustomer && onOpenCustomer(topCustomer.customerId)}
            disabled={!topCustomer}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open Top Customer
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Customers
              </p>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {filteredRows.length}
              </p>
            </div>
            <Users className="text-slate-400" size={22} />
          </div>
        </section>

        <section className="rounded-[22px] border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">
                Paid in
              </p>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {formatMoney(paidTotal)}
              </p>
            </div>
            <PoundSterling className="text-emerald-500" size={22} />
          </div>
        </section>

        <section className="rounded-[22px] border border-amber-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-700">
                Still owed
              </p>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {formatMoney(outstandingTotal)}
              </p>
            </div>
            <CircleAlert className="text-amber-500" size={22} />
          </div>
        </section>

        <section className="rounded-[22px] border border-sky-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-sky-700">
                Due total
              </p>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {formatMoney(bookedTotal)}
              </p>
            </div>
            <CreditCard className="text-sky-500" size={22} />
          </div>
        </section>

        <section className="rounded-[22px] border border-rose-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-rose-700">
                Needs review
              </p>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {reviewCount}
              </p>
            </div>
            <Scissors className="text-rose-500" size={22} />
          </div>
        </section>
      </div>

      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.2fr)_repeat(4,minmax(150px,0.7fr))] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Search
            </span>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
              <Search size={16} className="text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Name, address, route, status"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          <Select
            label="Customers"
            value={customerScope}
            onChange={(value) => setCustomerScope(value as CustomerScopeFilter)}
          >
            <option value="grass">Grass customers</option>
            <option value="all">All customers</option>
          </Select>

          <Select
            label="Payment"
            value={paymentFilter}
            onChange={(value) => setPaymentFilter(value as PaymentFilter)}
          >
            <option value="all">All methods</option>
            <option value="Monthly">Monthly</option>
            <option value="On Day Transfer">On Day Transfer</option>
            <option value="Cash">Cash</option>
            <option value="Non-routine">Non-routine</option>
          </Select>

          <Select
            label="Status"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <option value="all">All statuses</option>
            <option value="needs_review">Needs review</option>
            <option value="payment_due">Payment due</option>
            <option value="missed_cuts">Missed cuts</option>
            <option value="no_cuts">No cuts logged</option>
            <option value="healthy">Healthy</option>
            <option value="non_routine">Non-routine</option>
          </Select>

          <Select
            label="Sort"
            value={sortKey}
            onChange={(value) => setSortKey(value as SortKey)}
          >
            <option value="paid_desc">Highest paid</option>
            <option value="outstanding_desc">Most owed</option>
            <option value="booked_desc">Highest due total</option>
            <option value="missed_desc">Most missed cuts</option>
            <option value="last_visit_desc">Latest visit</option>
            <option value="name_asc">Name A-Z</option>
          </Select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        {filteredRows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-lg font-black text-slate-900">
              No customers match these filters.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try clearing the search or switching back to all statuses.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_0.75fr_0.85fr_0.75fr_0.75fr_0.9fr_0.8fr_0.9fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 xl:grid">
              <span>Customer</span>
              <span>Route</span>
              <span>Payment</span>
              <span>Paid in</span>
              <span>Owed</span>
              <span>Visits</span>
              <span>Last</span>
              <span>Status</span>
            </div>

            {filteredRows.map((row) => (
              <button
                key={row.customerId}
                type="button"
                onClick={() => onOpenCustomer(row.customerId)}
                className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 xl:grid-cols-[minmax(0,1.5fr)_0.75fr_0.85fr_0.75fr_0.75fr_0.9fr_0.8fr_0.9fr] xl:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-black text-slate-900">
                      {row.customerName}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        row.customerType === "Commercial"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.customerType}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {row.address || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 xl:hidden">
                    Route
                  </p>
                  <p className="font-semibold text-slate-700">{row.routeLabel}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 xl:hidden">
                    Payment
                  </p>
                  <p className="font-semibold text-slate-700">{row.paymentMethod}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {getPaymentDetail(row)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 xl:hidden">
                    Paid in
                  </p>
                  <p className="font-black text-emerald-700">
                    {formatMoney(row.paidRevenue)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 xl:hidden">
                    Owed
                  </p>
                  <p
                    className={
                      row.outstanding > 0
                        ? "font-black text-amber-700"
                        : "font-black text-slate-400"
                    }
                  >
                    {formatMoney(row.outstanding)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 xl:hidden">
                    Visits
                  </p>
                  <p className="font-semibold text-slate-700">
                    {row.completedVisitCount} cut
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {row.notCutCount} missed
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 xl:hidden">
                    Last
                  </p>
                  <p className="font-semibold text-slate-700">
                    {formatCustomerProfitDate(row.lastVisitDate)}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${row.statusClassName}`}
                >
                  {row.statusLabel}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
