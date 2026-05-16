"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Download,
  History as HistoryIcon,
  Mail,
  Pencil,
  Trash2,
} from "lucide-react";
import { generateQuotePDF } from "./pdf-generator";
import DocumentSendDialog from "./document-send-dialog";
import { sendQuoteDocument } from "./document-delivery";
import { formatCurrency, getCustomerEmailAddresses } from "./helpers";
import type {
  Customer,
  DocumentDeliveryMethod,
  DocumentHistoryEntry,
  QuoteStatus,
} from "./types";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  price: number;
};

type Quote = {
  id: string;
  quoteNumber: string;
  customerId: number | null;
  customerName: string;
  customerType?: "Residential" | "Commercial";
  customerAddress?: string;
  customerTown?: string;
  customerPostcode?: string;
  siteName?: string;
  siteAddress?: string;
  siteTown?: string;
  sitePostcode?: string;
  date: string;
  status: QuoteStatus;
  items: LineItem[];
  notes?: string;
  total: number;
};

type Props = {
  quotes: Quote[];
  customers: Customer[];
  documentHistory: Record<string, DocumentHistoryEntry[]>;
  businessDetails: {
    businessName?: string;
    tradingName?: string;
    businessEmail?: string;
    businessPhone?: string;
    website?: string;
    addressLine1?: string;
    addressLine2?: string;
    townCity?: string;
    county?: string;
    postcode?: string;
    defaultQuoteTerms?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    pdfHeaderStyle?: "banner" | "letterhead";
    pdfLogoBackground?: "none" | "dark" | "light";
    pdfLogoScale?: number;
    pdfShowLogo?: boolean;
    pdfShowFooter?: boolean;
    pdfShowBusinessDetails?: boolean;
    pdfFooterText?: string;
    emailFromName?: string;
    emailFromAddress?: string;
    emailReplyTo?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpUsername?: string;
    smtpPassword?: string;
  };
  onCreate: () => void;
  onEdit: (quoteId: string) => void;
  onDelete: (quoteId: string) => void;
  onConvertToSchedule: (quoteId: string) => void;
  onConvertToInvoice: (quoteId: string) => void;
  allowQuoteConversionWorkflows?: boolean;
  onMarkSent: (
    quoteId: string,
    metadata?: DocumentSendMetadata
  ) => Promise<void> | void;
};

type SendTarget = {
  quoteId: string;
  method: "email";
} | null;

type DocumentSendMetadata = {
  method: DocumentDeliveryMethod;
  recipient?: string;
};

type QuoteHistoryItem = {
  document: Quote;
  entry: DocumentHistoryEntry;
};

type QuoteFilter = "All" | "Draft" | "Accepted" | "Declined" | "Scheduled";

const QUOTE_FILTER_OPTIONS: QuoteFilter[] = [
  "All",
  "Draft",
  "Accepted",
  "Declined",
  "Scheduled",
];

function getQuoteStatusClasses(status: QuoteStatus) {
  switch (status) {
    case "Accepted":
      return "bg-emerald-100 text-emerald-700";
    case "Scheduled":
      return "bg-indigo-100 text-indigo-700";
    case "Declined":
      return "bg-rose-100 text-rose-700";
    case "Sent":
      return "bg-sky-100 text-sky-700";
    case "Approved":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getHistoryTypeClasses(type: DocumentHistoryEntry["type"]) {
  switch (type) {
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
    case "sent":
      return "Sent";
    case "updated":
      return "Changed";
    default:
      return "Created";
  }
}

function canAddQuoteToSchedule(status: QuoteStatus) {
  return status === "Accepted" || status === "Approved" || status === "Scheduled";
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

function getBrandName(businessDetails: Props["businessDetails"]) {
  return (
    businessDetails.tradingName?.trim() ||
    businessDetails.businessName?.trim() ||
    "Your Business"
  );
}

function getQuoteEmailSubject(
  quote: Quote,
  businessDetails: Props["businessDetails"]
) {
  return `Quote ${quote.quoteNumber} from ${getBrandName(businessDetails)}`;
}

function getQuoteEmailMessage(
  quote: Quote,
  businessDetails: Props["businessDetails"]
) {
  const brandName = getBrandName(businessDetails);
  const contactLine = [
    businessDetails.businessPhone?.trim(),
    businessDetails.businessEmail?.trim(),
  ]
    .filter(Boolean)
    .join(" | ");

  return [
    `Hi ${quote.customerName},`,
    "",
    `Please find quote ${quote.quoteNumber} attached.`,
    `Quote total: ${formatCurrency(quote.total)}`,
    "",
    quote.notes?.trim() || "Please let me know if you would like to go ahead.",
    "",
    "Kind regards,",
    brandName,
    contactLine,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function QuotesPage({
  quotes,
  customers,
  documentHistory,
  businessDetails,
  onCreate,
  onEdit,
  onDelete,
  onConvertToSchedule,
  onConvertToInvoice,
  allowQuoteConversionWorkflows = true,
  onMarkSent,
}: Props) {
  const [sendTarget, setSendTarget] = useState<SendTarget>(null);
  const [activeFilter, setActiveFilter] = useState<QuoteFilter>("All");
  const [sendNotice, setSendNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!sendNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSendNotice(null);
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [sendNotice]);

  const activeQuote = useMemo(
    () =>
      sendTarget
        ? quotes.find((quote) => quote.id === sendTarget.quoteId) ?? null
        : null,
    [quotes, sendTarget]
  );
  const activeCustomer = useMemo(
    () =>
      activeQuote?.customerId != null
        ? customers.find((customer) => customer.id === activeQuote.customerId) ?? null
        : null,
    [activeQuote, customers]
  );
  const emailRecipients = useMemo(
    () => (activeCustomer ? getCustomerEmailAddresses(activeCustomer) : []),
    [activeCustomer]
  );
  const filteredQuotes = useMemo(() => {
    if (activeFilter === "All") {
      return quotes;
    }

    return quotes.filter((quote) => quote.status === activeFilter);
  }, [activeFilter, quotes]);
  const quoteFilterCounts = useMemo(
    () => ({
      All: quotes.length,
      Draft: quotes.filter((quote) => quote.status === "Draft").length,
      Accepted: quotes.filter((quote) => quote.status === "Accepted").length,
      Declined: quotes.filter((quote) => quote.status === "Declined").length,
      Scheduled: quotes.filter((quote) => quote.status === "Scheduled").length,
    }),
    [quotes]
  );
  const emptyStateMessage =
    activeFilter === "All"
      ? "No quotes created yet."
      : `No ${activeFilter.toLowerCase()} quotes found.`;
  const historyItems = useMemo<QuoteHistoryItem[]>(
    () =>
      quotes
        .flatMap((quote) =>
          (documentHistory[quote.id] ?? []).map((entry) => ({
            document: quote,
            entry,
          }))
        )
        .sort((left, right) =>
          right.entry.occurredAt.localeCompare(left.entry.occurredAt)
        ),
    [documentHistory, quotes]
  );
  const recentHistoryItems = historyItems.slice(0, 12);

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
              Customer Documents
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Quotes</h1>
            <p className="mt-2 text-sm text-white/75">
              Create, manage, export, and send quotes.
            </p>
          </div>

          <button
            onClick={onCreate}
            data-tour="quote-new-button"
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            New Quote
          </button>
        </div>
      </section>

      {sendNotice ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Email sent</p>
            <p className="mt-0.5 text-emerald-700">{sendNotice}</p>
          </div>
        </div>
      ) : null}

      <section className="rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4">
          <div
            data-tour="quote-filters"
            className="inline-flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1"
          >
            {QUOTE_FILTER_OPTIONS.map((filterOption) => {
              const isActive = activeFilter === filterOption;

              return (
                <button
                  key={filterOption}
                  type="button"
                  onClick={() => setActiveFilter(filterOption)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:bg-white/70"
                  }`}
                >
                  <span>{filterOption}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-slate-100 text-slate-700"
                        : "bg-white/80 text-slate-500"
                    }`}
                  >
                    {quoteFilterCounts[filterOption]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Quote</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    {emptyStateMessage}
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => {
                  const canScheduleQuote = canAddQuoteToSchedule(quote.status);
                  const scheduleButtonLabel =
                    quote.status === "Scheduled" ? "Reschedule" : "Add to Schedule";

                  return (
                    <tr key={quote.id} className="border-t border-slate-100">
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {quote.quoteNumber}
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {quote.customerName}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {new Date(quote.date).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getQuoteStatusClasses(
                            quote.status
                          )}`}
                        >
                          {quote.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                        {formatCurrency(quote.total)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => onEdit(quote.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            onClick={() => onDelete(quote.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>

                          <button
                            onClick={() => generateQuotePDF(quote, businessDetails)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Download size={14} />
                            PDF
                          </button>

                          <button
                            onClick={() =>
                              setSendTarget({ quoteId: quote.id, method: "email" })
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Mail size={14} />
                            Email
                          </button>

                          {canScheduleQuote ? (
                            <button
                              onClick={() => onConvertToSchedule(quote.id)}
                              className="inline-flex items-center gap-2 rounded-lg bg-[#0f2343] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1a325b]"
                            >
                              <Calendar size={14} />
                              {scheduleButtonLabel}
                            </button>
                          ) : null}

                          {allowQuoteConversionWorkflows ? (
                            <button
                              onClick={() => onConvertToInvoice(quote.id)}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                            >
                              Create Invoice
                            </button>
                          ) : null}
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

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              History
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              Quote History
            </h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
            <HistoryIcon size={14} />
            {historyItems.length} event{historyItems.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {recentHistoryItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No quote history yet.
            </div>
          ) : (
            recentHistoryItems.map(({ document, entry }) => (
              <article
                key={`${document.id}-${entry.id}`}
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
                      {document.quoteNumber}
                    </span>
                    <span className="text-sm text-slate-400">for</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {document.customerName}
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

      {sendTarget && activeQuote ? (
        <DocumentSendDialog
          isOpen
          method={sendTarget.method}
          title={`Email ${activeQuote.quoteNumber}`}
          recipientOptions={emailRecipients}
          initialRecipient={emailRecipients[0]}
          initialSubject={getQuoteEmailSubject(activeQuote, businessDetails)}
          initialMessage={getQuoteEmailMessage(activeQuote, businessDetails)}
          onClose={() => setSendTarget(null)}
          onSend={async ({ recipient, subject, message }) => {
            await sendQuoteDocument({
              quote: activeQuote,
              businessDetails,
              method: sendTarget.method,
              recipient,
              subject:
                subject.trim() ||
                getQuoteEmailSubject(activeQuote, businessDetails),
              message:
                message.trim() ||
                getQuoteEmailMessage(activeQuote, businessDetails),
            });

            await onMarkSent(activeQuote.id, {
              method: sendTarget.method,
              recipient,
            });

            setSendNotice(
              `Email sent to ${recipient} for ${activeQuote.quoteNumber}.`
            );
          }}
        />
      ) : null}
    </div>
  );
}
