"use client";

import { History as HistoryIcon } from "lucide-react";
import type {
  DocumentDeliveryMethod,
  DocumentHistoryEntry,
} from "./types";

type DocumentReadMetadata = {
  method?: DocumentDeliveryMethod;
  recipient?: string;
};

type Props = {
  documentId: string;
  documentLabel: string;
  documentKind: "quote" | "invoice";
  entries: DocumentHistoryEntry[];
  onMarkRead?: (
    documentId: string,
    metadata?: DocumentReadMetadata
  ) => Promise<void> | void;
};

function getHistoryTypeClasses(type: DocumentHistoryEntry["type"]) {
  switch (type) {
    case "read":
      return "bg-violet-100 text-violet-700";
    case "sent":
      return "bg-sky-100 text-sky-700";
    case "updated":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

function getHistoryTypeLabel(type: DocumentHistoryEntry["type"]) {
  switch (type) {
    case "read":
      return "Read";
    case "sent":
      return "Sent";
    case "updated":
      return "Changed";
    default:
      return "Created";
  }
}

function formatHistoryDate(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date";
  }

  return parsedDate.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DocumentHistoryPanel({
  documentId,
  documentLabel,
  documentKind,
  entries,
  onMarkRead,
}: Props) {
  const sortedEntries = [...entries].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt)
  );
  const latestSentEntry = sortedEntries.find((entry) => entry.type === "sent");
  const latestReadEntry = sortedEntries.find((entry) => entry.type === "read");
  const canRecordRead = Boolean(latestSentEntry && !latestReadEntry && onMarkRead);
  const kindLabel = documentKind === "quote" ? "Quote" : "Invoice";

  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Owner History
          </p>
          <h2 className="mt-2 flex items-center gap-2 text-lg font-black tracking-tight text-slate-900">
            <HistoryIcon size={18} className="text-slate-500" />
            {kindLabel} activity
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Sent and customer-read timestamps for {documentLabel}.
          </p>
        </div>

        {canRecordRead ? (
          <button
            type="button"
            onClick={() =>
              void onMarkRead?.(documentId, {
                method: latestSentEntry?.method ?? "email",
                recipient: latestSentEntry?.recipient,
              })
            }
            className="inline-flex w-fit items-center justify-center rounded-xl bg-[#0f2343] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#153c3f]"
          >
            Record customer read
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Sent
          </p>
          <p className="mt-2 text-sm font-black text-slate-900">
            {latestSentEntry
              ? formatHistoryDate(latestSentEntry.occurredAt)
              : "Not sent yet"}
          </p>
          {latestSentEntry?.recipient ? (
            <p className="mt-1 text-xs text-slate-500">
              To {latestSentEntry.recipient}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Read
          </p>
          <p className="mt-2 text-sm font-black text-slate-900">
            {latestReadEntry
              ? formatHistoryDate(latestReadEntry.occurredAt)
              : "Not read yet"}
          </p>
          {latestReadEntry?.recipient ? (
            <p className="mt-1 text-xs text-slate-500">
              By {latestReadEntry.recipient}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {sortedEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No {documentKind} history recorded yet.
          </div>
        ) : (
          sortedEntries.map((entry) => (
            <article
              key={entry.id}
              className="flex flex-col gap-3 py-4 md:flex-row md:items-start md:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getHistoryTypeClasses(
                      entry.type
                    )}`}
                  >
                    {getHistoryTypeLabel(entry.type)}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {documentLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{entry.summary}</p>
                {entry.recipient ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Email: {entry.recipient}
                  </p>
                ) : null}
              </div>
              <time className="text-sm font-semibold text-slate-500">
                {formatHistoryDate(entry.occurredAt)}
              </time>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
