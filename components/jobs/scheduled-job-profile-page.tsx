"use client";

import { getCustomerDisplayAddress } from "./helpers";
import type { Customer, ScheduledJob } from "./types";

type Props = {
  job: ScheduledJob;
  customers: Customer[];
  onBack: () => void;
};

export default function ScheduledJobProfilePage({
  job,
  customers,
  onBack,
}: Props) {
  const jobTypeLabel = job.type === "Grass Cut" ? "Service Visit" : job.type;
  const customer =
    job.customerId != null
      ? customers.find((c) => c.id === job.customerId) ?? null
      : null;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  });
  const formatSingleTime = (value?: string) => {
    if (!value) {
      return null;
    }

    const [hour, minute] = value.split(":").map(Number);

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return value;
    }

    return formatter.format(new Date(2000, 0, 1, hour, minute));
  };
  const formattedStartTime = formatSingleTime(job.startTime);
  const formattedFinishTime = formatSingleTime(job.finishTime);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← Back
        </button>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {job.status}
        </span>
      </div>

      <section className="rounded-[24px] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Job Details
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          {job.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {new Date(job.date).toLocaleDateString()}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">Job Type</p>
            <p className="mt-2 font-semibold text-slate-900">{jobTypeLabel}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">Status</p>
            <p className="mt-2 font-semibold text-slate-900">{job.status}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
            <p className="text-xs text-slate-400">Approx. Time</p>
            <p className="mt-2 font-semibold text-slate-900">
              {formattedStartTime && formattedFinishTime
                ? `${formattedStartTime} - ${formattedFinishTime}`
                : formattedStartTime
                ? `Starts ${formattedStartTime}`
                : formattedFinishTime
                ? `Finishes ${formattedFinishTime}`
                : "No time added"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
            <p className="text-xs text-slate-400">Customer</p>
            {customer ? (
              <div className="mt-2">
                <p className="font-semibold text-slate-900">{customer.name}</p>
                <p className="text-sm text-slate-500">
                  {getCustomerDisplayAddress(customer) || "—"}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No customer linked</p>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
            <p className="text-xs text-slate-400">Notes</p>
            <p className="mt-2 text-sm text-slate-700">
              {job.notes?.trim() || "No notes added"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black tracking-tight text-slate-900">
          Linked Documents
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Quotes
            </p>
            {job.quoteIds?.length ? (
              <div className="mt-3 space-y-2">
                {job.quoteIds.map((id) => (
                  <div
                    key={id}
                    className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    Quote #{id}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No quotes linked</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Invoices
            </p>
            {job.invoiceIds?.length ? (
              <div className="mt-3 space-y-2">
                {job.invoiceIds.map((id) => (
                  <div
                    key={id}
                    className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    Invoice #{id}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No invoices linked</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
