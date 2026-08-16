"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileSearch, Mail, RefreshCw } from "lucide-react";
import type { DashboardAttentionItem } from "./types";

type MessageHistory = {
  id: string;
  related_id: string | null;
  status: "queued" | "sent" | "delivered" | "failed" | "cancelled";
  channel: "email" | "sms";
  sent_at: string | null;
  created_at: string;
  failure_reason: string | null;
};

type Props = {
  items: DashboardAttentionItem[];
  onOpenQuote: (id: string) => void;
  onOpenInvoice: (id: string) => void;
  onSendQuoteFollowUp: (id: string) => void;
  onSendInvoiceReminder: (id: string) => void;
};

const PAGE_SIZE = 10;

export default function FollowUpPage({
  items,
  onOpenQuote,
  onOpenInvoice,
  onSendQuoteFollowUp,
  onSendInvoiceReminder,
}: Props) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | DashboardAttentionItem["kind"]>("all");
  const [sort, setSort] = useState<"priority" | "customer">("priority");
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState<MessageHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  async function loadHistory() {
    setIsLoadingHistory(true);
    setHistoryError("");
    try {
      const response = await fetch("/api/customer-messages", { cache: "no-store" });
      const result = await response.json().catch(() => null) as
        | { messages?: MessageHistory[]; error?: string }
        | null;
      if (!response.ok) throw new Error(result?.error || "Unable to load message history.");
      setHistory(result?.messages ?? []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Unable to load message history.");
    } finally {
      setIsLoadingHistory(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  const latestMessageByDocument = useMemo(() => {
    const map = new Map<string, MessageHistory>();
    for (const message of history) {
      if (message.related_id && !map.has(message.related_id)) map.set(message.related_id, message);
    }
    return map;
  }, [history]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items
      .filter((item) => kind === "all" || item.kind === kind)
      .filter((item) => !normalizedQuery || [item.title, item.customerName, item.meta, item.detail]
        .some((value) => value.toLowerCase().includes(normalizedQuery)))
      .sort((left, right) => sort === "customer"
        ? left.customerName.localeCompare(right.customerName, "en-GB")
        : left.kind === right.kind ? left.title.localeCompare(right.title, "en-GB") : left.kind === "invoice_overdue" ? -1 : 1);
  }, [items, kind, query, sort]);
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const unansweredQuoteCount = items.filter((item) => item.kind === "quote_follow_up").length;
  const unpaidInvoiceCount = items.filter((item) => item.kind === "invoice_overdue").length;

  return (
    <div className="space-y-5 text-slate-950">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Manual workflow</p>
        <h2 className="mt-2 text-2xl font-black">Follow-up</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">Quotes waiting for a response and unpaid invoices appear here once they reach your configured delay. RoundHQ will not contact anyone until you review and send a message.</p>
      </header>
      <section className="grid gap-4 md:grid-cols-2" aria-label="Follow-up sections">
        <button type="button" onClick={() => { setKind("quote_follow_up"); setPage(1); }} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left transition hover:border-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-200">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Unanswered quotes</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{unansweredQuoteCount}</p>
          <p className="mt-1 text-sm text-slate-600">Sent quotes waiting for a customer decision.</p>
        </button>
        <button type="button" onClick={() => { setKind("invoice_overdue"); setPage(1); }} className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-left transition hover:border-rose-300 focus:outline-none focus:ring-4 focus:ring-rose-200">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-700">Unpaid invoices</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{unpaidInvoiceCount}</p>
          <p className="mt-1 text-sm text-slate-600">Invoices past their due date and configured delay.</p>
        </button>
      </section>


      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
          <input aria-label="Search follow-ups" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search customer or document" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500" />
          <select aria-label="Filter follow-up type" value={kind} onChange={(event) => { setKind(event.target.value as typeof kind); setPage(1); }} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="all">All types</option><option value="quote_follow_up">Unanswered quotes</option><option value="invoice_overdue">Unpaid invoices</option></select>
          <select aria-label="Sort follow-ups" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="priority">Priority</option><option value="customer">Customer name</option></select>
          <button type="button" onClick={() => void loadHistory()} disabled={isLoadingHistory} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={isLoadingHistory ? "animate-spin" : ""} />Refresh status</button>
        </div>
        {historyError ? <p role="alert" className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{historyError}</p> : null}
      </section>

      {visibleItems.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><FileSearch className="mx-auto text-slate-400" /><h3 className="mt-3 font-bold">Nothing needs following up</h3><p className="mt-1 text-sm text-slate-500">Eligible records appear here automatically; messages remain manual.</p></section>
      ) : (
        <section className="space-y-3" aria-label="Eligible follow-ups">
          {visibleItems.map((item) => {
            const message = latestMessageByDocument.get(item.documentId);
            const isQuote = item.kind === "quote_follow_up";
            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{item.title}</h3><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.badgeTone === "rose" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{item.badge}</span></div><p className="mt-1 font-semibold text-slate-700">{item.customerName}</p><p className="mt-1 text-sm text-slate-600">{item.meta}</p><p className="mt-1 text-xs text-slate-500">{item.detail}</p>{message ? <p className="mt-2 text-xs font-semibold text-slate-600">Latest message: {message.channel === "sms" ? "Text" : "Email"} · {message.status}{message.failure_reason ? ` · ${message.failure_reason}` : ""}</p> : null}</div>
                  <div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => isQuote ? onOpenQuote(item.documentId) : onOpenInvoice(item.documentId)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold hover:bg-slate-50">Open</button><button type="button" onClick={() => isQuote ? onSendQuoteFollowUp(item.documentId) : onSendInvoiceReminder(item.documentId)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"><Mail size={16} />Review &amp; send</button></div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <nav aria-label="Follow-up pagination" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"><p className="text-sm text-slate-600">{filteredItems.length} eligible · Page {safePage} of {pageCount}</p><div className="flex gap-2"><button type="button" aria-label="Previous page" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeft size={17} /></button><button type="button" aria-label="Next page" disabled={safePage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRight size={17} /></button></div></nav>
    </div>
  );
}
