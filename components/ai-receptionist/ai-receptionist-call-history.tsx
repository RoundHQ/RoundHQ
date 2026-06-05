"use client";

import { Bot, PhoneCall } from "lucide-react";
import { formatAiReceptionistCallDuration } from "@/lib/ai-receptionist-leads";
import type { AiReceptionistCallHistoryItem } from "@/lib/ai-receptionist/call-logs";

type Props = {
  calls: AiReceptionistCallHistoryItem[];
  schemaReady: boolean;
  schemaError?: string;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOutcome(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function AiReceptionistCallHistory({
  calls,
  schemaReady,
  schemaError,
}: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
            AI Receptionist
          </p>
          <h2 className="mt-1 text-lg font-extrabold tracking-normal text-slate-950">
            Call History
          </h2>
        </div>
        <span className="inline-flex size-10 items-center justify-center rounded-md bg-slate-950 text-white">
          <PhoneCall className="size-5" />
        </span>
      </div>

      {!schemaReady ? (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Run the AI Receptionist Stage 5 SQL to enable call history.
          {schemaError ? (
            <div className="mt-2 text-xs text-amber-800">{schemaError}</div>
          ) : null}
        </div>
      ) : calls.length === 0 ? (
        <div className="mt-5 flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
          <Bot className="size-4" />
          No AI Receptionist calls yet.
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
          <div className="hidden grid-cols-[1fr_1fr_0.6fr_0.8fr_0.8fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 md:grid">
            <span>Date</span>
            <span>Caller</span>
            <span>Duration</span>
            <span>Lead Created</span>
            <span>Outcome</span>
          </div>
          <div className="divide-y divide-slate-100">
            {calls.map((call) => (
              <div
                key={call.id}
                className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_0.6fr_0.8fr_0.8fr] md:items-center"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 md:hidden">
                    Date
                  </p>
                  <p className="font-semibold text-slate-900">
                    {formatDate(call.date)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 md:hidden">
                    Caller
                  </p>
                  <p className="truncate font-semibold text-slate-700">
                    {call.caller}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 md:hidden">
                    Duration
                  </p>
                  <p className="font-semibold text-slate-700">
                    {call.durationSeconds == null
                      ? "-"
                      : formatAiReceptionistCallDuration(call.durationSeconds)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 md:hidden">
                    Lead Created
                  </p>
                  <p className="font-semibold text-slate-700">
                    {call.leadId ? call.leadId : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 md:hidden">
                    Outcome
                  </p>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                      call.priority === "high"
                        ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                        : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                    }`}
                  >
                    {formatOutcome(call.outcome)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
