"use client";

import { getCustomerDisplayAddress } from "@/components/jobs/helpers";
import type { Customer, VisitLog } from "@/components/jobs/types";

type Props = {
  customers: Customer[];
  visits: VisitLog[];
  selectedWeek: string;
  selectedDay: string;
  isLocked: boolean;
  onMarkVisit: (
    customerId: number,
    status: "cut" | "not_cut",
    extra?: { paid?: boolean }
  ) => void;
  onSetPaidStatus: (visitId: number | string, paid: boolean) => void;
  pendingCashPaymentDates: Record<string, string>;
  onSetPendingCashPayment: (customerId: number, paid: boolean) => void;
  getCurrentVisit: (customerId: number) => VisitLog | null;
  onOpenCustomer: (customerId: number) => void;
};

function formatMoney(value: number | null | undefined) {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

export default function RoundsPage({
  customers,
  selectedWeek,
  selectedDay,
  isLocked,
  onMarkVisit,
  onSetPaidStatus,
  pendingCashPaymentDates,
  onSetPendingCashPayment,
  getCurrentVisit,
  onOpenCustomer,
}: Props) {
  const roundCustomers = customers
      .filter(
          (customer) =>
              customer.isGrassCuttingCustomer &&
              customer.week === selectedWeek &&
              customer.day === selectedDay
      )
      .sort((left, right) => {
        const leftOrder = Number.isFinite(left.routeOrder)
            ? Number(left.routeOrder)
            : Number.MAX_SAFE_INTEGER;
        const rightOrder = Number.isFinite(right.routeOrder)
            ? Number(right.routeOrder)
            : Number.MAX_SAFE_INTEGER;

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return left.name.localeCompare(right.name);
      });
  const residentialCount = roundCustomers.filter(
      (customer) => customer.customerType === "Residential"
  ).length;
  const commercialCount = roundCustomers.length - residentialCount;

  const completedCount = roundCustomers.filter((customer) => {
    const visit = getCurrentVisit(customer.id);
    return visit?.status === "completed";
  }).length;

  const notCutCount = roundCustomers.filter((customer) => {
    const visit = getCurrentVisit(customer.id);
    return visit?.status === "not_cut";
  }).length;

  const unpaidCount = roundCustomers.filter((customer) => {
    const visit = getCurrentVisit(customer.id);
    if (!visit) return false;
    return !(visit.paid === true || visit.paymentStatus === "Paid");
  }).length;

  const progress =
    roundCustomers.length === 0
      ? 0
      : Math.round((completedCount / roundCustomers.length) * 100);

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
              Grass Schedule
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              Grass Cutting Round
            </h2>
            <p className="mt-2 text-sm text-white/75">
              {selectedWeek} · {selectedDay} · {residentialCount} residential ·{" "}
              {commercialCount} commercial
            </p>
          </div>

          <div
            className={`inline-flex rounded-2xl px-4 py-3 text-sm font-semibold ${
              isLocked
                ? "bg-rose-100 text-rose-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isLocked ? "Round Locked" : "Round Active"}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Jobs
          </p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            {roundCustomers.length}
          </p>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Completed
          </p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            {completedCount}
          </p>
        </div>

        <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">
            Not Cut
          </p>
          <p className="mt-2 text-4xl font-black tracking-tight text-rose-700">
            {notCutCount}
          </p>
        </div>

        <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Unpaid
          </p>
          <p className="mt-2 text-4xl font-black tracking-tight text-amber-700">
            {unpaidCount}
          </p>
        </div>
      </div>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Round Progress</p>
            <p className="text-sm text-slate-500">
              {completedCount} of {roundCustomers.length} completed
            </p>
          </div>
          <p className="text-2xl font-black text-slate-900">{progress}%</p>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <div className="space-y-4">
        {roundCustomers.length === 0 ? (
          <div className="rounded-[22px] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            No customers scheduled for this round.
          </div>
        ) : (
          roundCustomers.map((customer) => {
            const visit = getCurrentVisit(customer.id);
            const isCashCustomer = customer.paymentMethod === "Cash";
            const isPaid =
              !!visit &&
              (visit.paid === true || visit.paymentStatus === "Paid");
            const selectedCashPaid =
              visit?.paymentStatus === "Paid" ||
              (!visit && Boolean(pendingCashPaymentDates[String(customer.id)]));

            const statusLabel =
              visit?.status === "completed"
                ? "Cut"
                : visit?.status === "not_cut"
                ? "Not Cut"
                : "Not Started";

            const statusClass =
              visit?.status === "completed"
                ? "bg-emerald-100 text-emerald-700"
                : visit?.status === "not_cut"
                ? "bg-rose-100 text-rose-700"
                : "bg-slate-100 text-slate-600";

            return (
              <div
                key={customer.id}
                className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <button
                      onClick={() => onOpenCustomer(customer.id)}
                      className="text-left text-lg font-bold tracking-tight text-slate-900 hover:underline"
                    >
                      {customer.name}
                    </button>

                    <p className="mt-1 text-sm text-slate-500">
                      {getCustomerDisplayAddress(customer) || "—"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          customer.customerType === "Commercial"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {customer.customerType}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                      >
                        {statusLabel}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {formatMoney(customer.grassCutAmount ?? 0)}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {visit ? (isPaid ? "Paid" : "Unpaid") : "No Visit Yet"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={isLocked}
                      onClick={() =>
                        onMarkVisit(customer.id, "cut", {
                          paid: isCashCustomer
                            ? Boolean(pendingCashPaymentDates[String(customer.id)])
                            : undefined,
                        })
                      }
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Mark Cut
                    </button>

                    <button
                      disabled={isLocked}
                      onClick={() =>
                        onMarkVisit(customer.id, "not_cut", {
                          paid: isCashCustomer
                            ? Boolean(pendingCashPaymentDates[String(customer.id)])
                            : undefined,
                        })
                      }
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Not Cut
                    </button>

                    {isCashCustomer && (
                      <>
                        <button
                          disabled={isLocked && !visit}
                          onClick={() => {
                            if (visit) {
                              onSetPaidStatus(visit.id, true);
                              return;
                            }

                            onSetPendingCashPayment(customer.id, true);
                          }}
                          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            selectedCashPaid
                              ? "border-sky-300 bg-sky-100 text-sky-800"
                              : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                          }`}
                        >
                          Paid
                        </button>

                        <button
                          disabled={isLocked && !visit}
                          onClick={() => {
                            if (visit) {
                              onSetPaidStatus(visit.id, false);
                              return;
                            }

                            onSetPendingCashPayment(customer.id, false);
                          }}
                          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            !selectedCashPaid
                              ? "border-amber-300 bg-amber-100 text-amber-800"
                              : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                          }`}
                        >
                          Not Paid
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {visit && (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Visit Date
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {new Date(visit.visitDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Payment
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {isPaid ? "Paid" : "Outstanding"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Round Status
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {isLocked ? "Locked" : "Editable"}
                      </p>
                    </div>
                  </div>
                )}

                {isLocked && (
                  <p className="mt-4 text-xs font-semibold text-rose-600">
                    This round is locked. You can still update payment status.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
