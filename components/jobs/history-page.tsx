"use client";

import { formatStoredDate, getCustomerDisplayAddress } from "@/components/jobs/helpers";
import type { Customer } from "./types";

type VisitLog = {
  id: string | number;
  customerId: number;
  visitDate: string;
  status: "completed" | "not_cut" | string;
  paymentStatus?: "Paid" | "Not Paid" | string;
  notes?: string;
  notCutReason?: string;
  priceAtVisit?: number;
  paid?: boolean;
  paidAt?: string | null;
};

type Props = {
  visitLogs: VisitLog[];
  customers: Customer[];
  updatePaymentStatus: (visitId: string | number) => void;
  onClearHistory: () => void;
  isClearingHistory: boolean;
};

function formatMoney(value: number | null | undefined) {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

function getCustomerName(customerId: number, customers: Customer[]) {
  return customers.find((customer) => customer.id === customerId)?.name ?? "Unknown Customer";
}

function getCustomerAddress(customerId: number, customers: Customer[]) {
  return getCustomerDisplayAddress(
    customers.find((customer) => customer.id === customerId)
  );
}

function getCustomer(customerId: number, customers: Customer[]) {
  return customers.find((customer) => customer.id === customerId) ?? null;
}

export default function HistoryPage({
                                      visitLogs,
                                      customers,
                                      updatePaymentStatus,
                                      onClearHistory,
                                      isClearingHistory,
                                    }: Props) {
  const sortedVisits = [...visitLogs].sort(
      (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
  );

  return (
      <div className="space-y-6">
        <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                Grass Schedule
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">History</h1>
              <p className="mt-2 text-sm text-white/75">
                View completed and not cut visits, payment status, and notes.
              </p>
            </div>

            <button
                onClick={onClearHistory}
                disabled={sortedVisits.length === 0 || isClearingHistory}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isClearingHistory ? "Clearing..." : "Clear History"}
            </button>
          </div>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
              </thead>

              <tbody>
              {sortedVisits.length === 0 ? (
                  <tr>
                    <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No visit history recorded yet.
                    </td>
                  </tr>
              ) : (
                  sortedVisits.map((visit) => {
                    const customer = getCustomer(visit.customerId, customers);
                    const isPaid =
                        visit.paid === true || visit.paymentStatus === "Paid";

                    const statusLabel =
                        visit.status === "completed"
                            ? "Cut"
                            : visit.status === "not_cut"
                                ? `Not Cut${visit.notCutReason ? ` - ${visit.notCutReason}` : ""}`
                                : visit.status;

                    return (
                        <tr key={visit.id} className="border-t border-slate-100">
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {new Date(visit.visitDate).toLocaleDateString()}
                          </td>

                          <td className="px-4 py-4 font-semibold text-slate-900">
                            {getCustomerName(visit.customerId, customers)}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {getCustomerAddress(visit.customerId, customers) || "—"}
                          </td>

                          <td className="px-4 py-4">
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                visit.status === "completed"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : visit.status === "not_cut"
                                        ? "bg-rose-100 text-rose-700"
                                        : "bg-slate-100 text-slate-700"
                            }`}
                        >
                          {statusLabel}
                        </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-2">
                        <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                                isPaid
                                    ? "bg-emerald-100 text-emerald-700"
                                    : customer?.paymentMethod === "Monthly"
                                        ? "bg-sky-100 text-sky-700"
                                        : "bg-amber-100 text-amber-700"
                            }`}
                        >
                          {isPaid
                              ? "Paid"
                              : customer?.paymentMethod === "Monthly"
                                  ? "Monthly Plan"
                                  : "Not Paid"}
                        </span>
                              <span className="text-xs text-slate-500">
                          {customer?.paymentMethod === "Monthly"
                              ? "Tracked from Payments page"
                              : visit.paidAt
                                  ? `Payment date ${formatStoredDate(visit.paidAt)}`
                                  : "Payment date not recorded"}
                        </span>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                            {visit.priceAtVisit != null
                                ? formatMoney(visit.priceAtVisit)
                                : "—"}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {visit.notes?.trim() || "—"}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end">
                              {customer?.paymentMethod === "Monthly" ? (
                                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                                Use Payments page
                              </span>
                              ) : (
                                  <button
                                      onClick={() => updatePaymentStatus(visit.id)}
                                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                          isPaid
                                              ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                              : "bg-[#0f2343] text-white hover:bg-[#1a325b]"
                                      }`}
                                  >
                                    {isPaid ? "Mark Unpaid" : "Mark Paid"}
                                  </button>
                              )}
                            </div>
                          </td>
                        </tr>
                    );
                  })
              )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
  );
}
