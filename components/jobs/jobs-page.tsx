"use client";

import { ArrowRight, Calendar, FileText, Receipt, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { getCustomerDisplayAddress } from "./helpers";
import type { Customer } from "./types";

type ScheduledJobType =
    | "One Off"
    | "Quote Accepted"
    | "Grass Cut"
    | "Commercial";

type ScheduledJobStatus =
    | "Scheduled"
    | "In Progress"
    | "Completed"
    | "Cancelled";

type ScheduledJob = {
    id: string;
    title: string;
    date: string;
    notes?: string;
    startTime?: string;
    finishTime?: string;
    customerName?: string;
    customerId?: number | null;
    type: ScheduledJobType;
    status: ScheduledJobStatus;
    quoteIds?: string[];
    invoiceIds?: string[];
    createdAt: string;
};

type Quote = {
    id: string;
    quoteNumber: string;
    customerName: string;
    status: string;
    total: number;
};

type Invoice = {
    id: string;
    invoiceNumber: string;
    linkedQuoteId?: string;
    customerName: string;
    status: string;
    total: number;
};

type Props = {
    jobs: ScheduledJob[];
    customers: Customer[];
    quotes: Quote[];
    invoices: Invoice[];
    onOpenJob: (jobId: string) => void;
    onOpenCustomer: (customerId: number) => void;
};

const moneyFormatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
});

function formatJobDate(value: string) {
    if (!value) {
        return "Date not set";
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }

    return parsedDate.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatJobTimeRange(startTime?: string, finishTime?: string) {
    const formatter = new Intl.DateTimeFormat("en-GB", {
        hour: "numeric",
        minute: "2-digit",
    });

    function formatSingleTime(value?: string) {
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
    }

    const formattedStart = formatSingleTime(startTime);
    const formattedFinish = formatSingleTime(finishTime);

    if (formattedStart && formattedFinish) {
        return `${formattedStart} - ${formattedFinish}`;
    }

    if (formattedStart) {
        return `Starts ${formattedStart}`;
    }

    if (formattedFinish) {
        return `Finishes ${formattedFinish}`;
    }

    return null;
}

function formatMoney(value: number | null | undefined) {
    return moneyFormatter.format(Number(value ?? 0));
}

function getJobTypeClasses(type: ScheduledJobType) {
    switch (type) {
        case "Grass Cut":
            return "bg-emerald-100 text-emerald-700";
        case "Commercial":
            return "bg-sky-100 text-sky-700";
        case "Quote Accepted":
            return "bg-amber-100 text-amber-700";
        default:
            return "bg-slate-100 text-slate-700";
    }
}

function getJobStatusClasses(status: ScheduledJobStatus) {
    switch (status) {
        case "Completed":
            return "bg-emerald-100 text-emerald-700";
        case "In Progress":
            return "bg-sky-100 text-sky-700";
        case "Cancelled":
            return "bg-rose-100 text-rose-700";
        default:
            return "bg-amber-100 text-amber-700";
    }
}

export default function JobsPage({
    jobs,
    customers,
    quotes,
    invoices,
    onOpenJob,
    onOpenCustomer,
}: Props) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | ScheduledJobStatus>("all");
    const [typeFilter, setTypeFilter] = useState<"all" | ScheduledJobType>("all");

    const todayKey = new Date().toISOString().split("T")[0];

    const customerLookup = useMemo(() => {
        const lookup = new Map<number, Customer>();
        for (const customer of customers) {
            lookup.set(customer.id, customer);
        }
        return lookup;
    }, [customers]);

    const quoteLookup = useMemo(() => {
        const lookup = new Map<string, Quote>();
        for (const quote of quotes) {
            lookup.set(quote.id, quote);
        }
        return lookup;
    }, [quotes]);

    const invoiceLookup = useMemo(() => {
        const lookup = new Map<string, Invoice>();
        for (const invoice of invoices) {
            lookup.set(invoice.id, invoice);
        }
        return lookup;
    }, [invoices]);

    const jobRows = useMemo(() => {
        return jobs
            .map((job) => {
                const customer =
                    job.customerId != null ? customerLookup.get(job.customerId) ?? null : null;
                const relatedQuoteIds = Array.from(
                    new Set(
                        (Array.isArray(job.quoteIds) ? job.quoteIds : []).filter(
                            (quoteId): quoteId is string =>
                                typeof quoteId === "string" && quoteId.trim().length > 0
                        )
                    )
                );
                const relatedQuotes = relatedQuoteIds
                    .map((quoteId) => quoteLookup.get(quoteId))
                    .filter((quote): quote is Quote => Boolean(quote));
                const derivedInvoiceIds = new Set(
                    (Array.isArray(job.invoiceIds) ? job.invoiceIds : []).filter(
                        (invoiceId): invoiceId is string =>
                            typeof invoiceId === "string" && invoiceId.trim().length > 0
                    )
                );

                for (const invoice of invoices) {
                    if (invoice.linkedQuoteId && relatedQuoteIds.includes(invoice.linkedQuoteId)) {
                        derivedInvoiceIds.add(invoice.id);
                    }
                }

                const relatedInvoices = Array.from(derivedInvoiceIds)
                    .map((invoiceId) => invoiceLookup.get(invoiceId))
                    .filter((invoice): invoice is Invoice => Boolean(invoice));
                const title =
                    typeof job.title === "string" && job.title.trim()
                        ? job.title.trim()
                        : customer?.name?.trim()
                          ? `Job - ${customer.name.trim()}`
                          : "Untitled Job";
                const notes =
                    typeof job.notes === "string" && job.notes.trim()
                        ? job.notes.trim()
                        : "";
                const customerName =
                    typeof job.customerName === "string" && job.customerName.trim()
                        ? job.customerName.trim()
                        : "";
                const sortDate =
                    typeof job.date === "string" && job.date.trim() ? job.date.trim() : "";

                return {
                    job,
                    customer,
                    relatedQuotes,
                    relatedInvoices,
                    displayTitle: title,
                    displayNotes: notes,
                    displayCustomerName: customerName,
                    sortDate,
                    sortTitle: title.toLowerCase(),
                    searchableText: [
                        title,
                        notes,
                        customerName,
                        customer?.name,
                        customer ? getCustomerDisplayAddress(customer) : "",
                        ...relatedQuotes.map((quote) => quote.quoteNumber),
                        ...relatedInvoices.map((invoice) => invoice.invoiceNumber),
                    ]
                        .filter(
                            (entry): entry is string =>
                                typeof entry === "string" && entry.trim().length > 0
                        )
                        .join(" ")
                        .toLowerCase(),
                };
            });
    }, [customerLookup, invoices, invoiceLookup, jobs, quoteLookup]);

    const rows = useMemo(() => {
        return jobRows
            .filter((entry) => {
                if (statusFilter !== "all" && entry.job.status !== statusFilter) {
                    return false;
                }

                if (typeFilter !== "all" && entry.job.type !== typeFilter) {
                    return false;
                }

                if (!search.trim()) {
                    return true;
                }

                return entry.searchableText.includes(search.trim().toLowerCase());
            })
            .sort((left, right) => {
                const dateCompare = left.sortDate.localeCompare(right.sortDate);

                if (dateCompare !== 0) {
                    return dateCompare;
                }

                return left.sortTitle.localeCompare(right.sortTitle);
            });
    }, [
        jobRows,
        search,
        statusFilter,
        typeFilter,
    ]);

    const stats = useMemo(() => {
        return {
            total: jobRows.length,
            upcoming: jobRows.filter((entry) => entry.sortDate >= todayKey).length,
            withCustomer: jobRows.filter((entry) => entry.job.customerId != null).length,
            withDocuments: jobRows.filter(
                (entry) =>
                    entry.relatedQuotes.length > 0 || entry.relatedInvoices.length > 0
            ).length,
        };
    }, [jobRows, todayKey]);

    return (
        <div className="space-y-6">
            <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                            Job Management
                        </p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight">Jobs</h1>
                        <p className="mt-2 text-sm text-white/75">
                            Review every job in one place, including the assigned customer and the linked quotes and invoices.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl bg-white/10 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-white/55">Total Jobs</p>
                            <p className="mt-2 text-2xl font-black">{stats.total}</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-white/55">Upcoming</p>
                            <p className="mt-2 text-2xl font-black">{stats.upcoming}</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-white/55">Assigned</p>
                            <p className="mt-2 text-2xl font-black">{stats.withCustomer}</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-white/55">With Docs</p>
                            <p className="mt-2 text-2xl font-black">{stats.withDocuments}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr_0.8fr]">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Search Jobs
                        </label>
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                            <Search size={16} className="text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search title, customer, quote, invoice, or notes"
                                className="w-full text-sm outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value as "all" | ScheduledJobStatus)
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        >
                            <option value="all">All statuses</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Type
                        </label>
                        <select
                            value={typeFilter}
                            onChange={(event) =>
                                setTypeFilter(event.target.value as "all" | ScheduledJobType)
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        >
                            <option value="all">All job types</option>
                            <option value="One Off">One Off</option>
                            <option value="Quote Accepted">Quote Accepted</option>
                            <option value="Grass Cut">Grass Cut</option>
                            <option value="Commercial">Commercial</option>
                        </select>
                    </div>
                </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                <th className="px-4 py-3">Job</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Related Documents</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-10 text-center text-sm text-slate-500"
                                    >
                                        No jobs match the current filters.
                                    </td>
                                </tr>
                            ) : (
                                rows.map(
                                    ({
                                        job,
                                        customer,
                                        relatedQuotes,
                                        relatedInvoices,
                                        displayTitle,
                                        displayNotes,
                                        displayCustomerName,
                                        sortDate,
                                    }) => (
                                    <tr key={job.id} className="border-t border-slate-100">
                                        <td className="px-4 py-4">
                                            <div className="space-y-2">
                                                <p className="font-semibold text-slate-900">
                                                    {displayTitle}
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getJobTypeClasses(
                                                            job.type
                                                        )}`}
                                                    >
                                                        {job.type}
                                                    </span>
                                                    {displayNotes ? (
                                                        <span className="text-xs text-slate-500">
                                                            {displayNotes}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-4 text-sm text-slate-600">
                                            <div className="space-y-1">
                                                <div className="inline-flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    {formatJobDate(sortDate)}
                                                </div>
                                                {formatJobTimeRange(job.startTime, job.finishTime) ? (
                                                    <p className="text-xs font-semibold text-slate-500">
                                                        {formatJobTimeRange(job.startTime, job.finishTime)}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </td>

                                        <td className="px-4 py-4">
                                            {customer ? (
                                                <button
                                                    onClick={() => onOpenCustomer(customer.id)}
                                                    className="text-left transition hover:opacity-80"
                                                >
                                                    <p className="font-semibold text-slate-900">
                                                        {customer.name}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {getCustomerDisplayAddress(customer) || "—"}
                                                    </p>
                                                </button>
                                            ) : (
                                                <div>
                                                    <p className="font-semibold text-slate-900">
                                                        {displayCustomerName || "No customer linked"}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        Customer not assigned yet
                                                    </p>
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-4 py-4">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getJobStatusClasses(
                                                    job.status
                                                )}`}
                                            >
                                                {job.status}
                                            </span>
                                        </td>

                                        <td className="px-4 py-4">
                                            <div className="space-y-2 text-sm text-slate-600">
                                                <div className="inline-flex items-center gap-2">
                                                    <FileText size={14} className="text-slate-400" />
                                                    <span>
                                                        {relatedQuotes.length} quote
                                                        {relatedQuotes.length === 1 ? "" : "s"}
                                                    </span>
                                                </div>
                                                <div className="inline-flex items-center gap-2">
                                                    <Receipt size={14} className="text-slate-400" />
                                                    <span>
                                                        {relatedInvoices.length} invoice
                                                        {relatedInvoices.length === 1 ? "" : "s"}
                                                    </span>
                                                </div>
                                                {relatedInvoices[0] ? (
                                                    <p className="text-xs text-slate-500">
                                                        Latest invoice total{" "}
                                                        {formatMoney(relatedInvoices[0].total)}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </td>

                                        <td className="px-4 py-4">
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => onOpenJob(job.id)}
                                                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                                                >
                                                    Open Job
                                                    <ArrowRight size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    )
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
