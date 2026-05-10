"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import DocumentCustomerPicker from "./document-customer-picker";
import { INVOICE_STATUS_OPTIONS, type Customer, type InvoiceStatus } from "./types";

type CustomerType = "Residential" | "Commercial";

type LineItem = {
    id: string;
    description: string;
    quantity: number;
    price: number;
};

type DocumentCustomerFields = {
    customerType?: CustomerType;
    customerAddress?: string;
    customerTown?: string;
    customerPostcode?: string;
    siteName?: string;
    siteAddress?: string;
    siteTown?: string;
    sitePostcode?: string;
};

type Invoice = {
    id: string;
    invoiceNumber: string;
    customerId: number | null;
    customerName: string;
    customerType?: CustomerType;
    customerAddress?: string;
    customerTown?: string;
    customerPostcode?: string;
    siteName?: string;
    siteAddress?: string;
    siteTown?: string;
    sitePostcode?: string;
    date: string;
    dueDate?: string;
    status: InvoiceStatus;
    items: LineItem[];
    notes?: string;
    terms?: string;
    vatRate?: number;
    vatAmount?: number;
    total: number;
    linkedQuoteId?: string;
};

type Props = DocumentCustomerFields & {
    customerId?: number | null;
    customerName?: string;
    customers?: Customer[];
    existingInvoice?: Invoice;
    invoiceNumberPreview?: string;
    initialNotes?: string;
    initialTerms?: string;
    defaultPaymentTermsDays: number;
    defaultVatRegistered: boolean;
    defaultVatRate: number;
    allowCommercialTools?: boolean;
    onSave: (invoice: Invoice) => void | boolean | Promise<void | boolean>;
    onBack: () => void;
};

function formatMoney(value: number | null | undefined) {
    return `£${Number(value ?? 0).toFixed(2)}`;
}

function formatDateInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addDaysToIsoDate(value: string, days: number) {
    const [year, month, day] = value.split("-").map(Number);

    if (!year || !month || !day) {
        return value;
    }

    const nextDate = new Date(year, month - 1, day, 12);
    nextDate.setDate(nextDate.getDate() + Math.max(0, Math.floor(days)));
    return formatDateInput(nextDate);
}

function roundCurrency(value: number) {
    return Math.round(value * 100) / 100;
}

function normalizeOptionalText(value: string | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function normalizeDocumentCustomerFields(
    fields: DocumentCustomerFields
): DocumentCustomerFields {
    const customerType =
        fields.customerType === "Commercial" ? "Commercial" : fields.customerType;
    const normalizedFields: DocumentCustomerFields = {
        customerType,
        customerAddress: normalizeOptionalText(fields.customerAddress),
        customerTown: normalizeOptionalText(fields.customerTown),
        customerPostcode: normalizeOptionalText(fields.customerPostcode),
    };

    if (customerType === "Commercial") {
        normalizedFields.siteName = normalizeOptionalText(fields.siteName);
        normalizedFields.siteAddress = normalizeOptionalText(fields.siteAddress);
        normalizedFields.siteTown = normalizeOptionalText(fields.siteTown);
        normalizedFields.sitePostcode = normalizeOptionalText(fields.sitePostcode);
    }

    return normalizedFields;
}

function getDocumentCustomerFieldsFromCustomer(
    customer: Customer
): DocumentCustomerFields {
    return normalizeDocumentCustomerFields({
        customerType: customer.customerType,
        customerAddress: customer.address,
        customerTown: customer.town,
        customerPostcode: customer.postcode,
        siteName: customer.siteName,
        siteAddress: customer.siteAddress,
        siteTown: customer.siteTown,
        sitePostcode: customer.sitePostcode,
    });
}

function buildLocationLine(town?: string, postcode?: string) {
    return [town, postcode].filter(Boolean).join(", ");
}

function DetailCard({
    title,
    lines,
    emptyText,
}: {
    title: string;
    lines: string[];
    emptyText: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {title}
            </p>
            {lines.length > 0 ? (
                <div className="mt-3 space-y-1 text-sm text-slate-700">
                    {lines.map((line) => (
                        <p key={line}>{line}</p>
                    ))}
                </div>
            ) : (
                <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
            )}
        </div>
    );
}

function getInvoiceStatusBadgeClasses(status: InvoiceStatus) {
    switch (status) {
        case "Paid":
        case "Accepted":
            return "bg-emerald-500/15 text-emerald-50 ring-1 ring-inset ring-emerald-300/25";
        case "Declined":
            return "bg-rose-500/15 text-rose-50 ring-1 ring-inset ring-rose-300/25";
        case "Sent":
            return "bg-sky-500/15 text-sky-50 ring-1 ring-inset ring-sky-300/25";
        case "Approved":
            return "bg-amber-400/15 text-amber-50 ring-1 ring-inset ring-amber-300/25";
        case "Unpaid":
            return "bg-orange-400/15 text-orange-50 ring-1 ring-inset ring-orange-300/25";
        default:
            return "bg-white/10 text-white ring-1 ring-inset ring-white/15";
    }
}

export default function InvoiceForm({
    customerId,
    customerName,
    customers = [],
    existingInvoice,
    customerType,
    customerAddress,
    customerTown,
    customerPostcode,
    siteName,
    siteAddress,
    siteTown,
    sitePostcode,
    invoiceNumberPreview,
    initialNotes,
    initialTerms,
    defaultPaymentTermsDays,
    defaultVatRegistered,
    defaultVatRate,
    allowCommercialTools = true,
    onSave,
    onBack,
}: Props) {
    const isEditingInvoice = Boolean(existingInvoice);
    const initialSelectedCustomerId =
        existingInvoice?.customerId ??
        customerId ??
        null;
    const initialDocumentFields = normalizeDocumentCustomerFields({
        customerType: existingInvoice?.customerType ?? customerType,
        customerAddress: existingInvoice?.customerAddress ?? customerAddress,
        customerTown: existingInvoice?.customerTown ?? customerTown,
        customerPostcode: existingInvoice?.customerPostcode ?? customerPostcode,
        siteName: existingInvoice?.siteName ?? siteName,
        siteAddress: existingInvoice?.siteAddress ?? siteAddress,
        siteTown: existingInvoice?.siteTown ?? siteTown,
        sitePostcode: existingInvoice?.sitePostcode ?? sitePostcode,
    });
    const [invoiceCustomerName, setInvoiceCustomerName] = useState(
        existingInvoice?.customerName ?? customerName ?? ""
    );
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
        initialSelectedCustomerId
    );
    const [documentCustomerFields, setDocumentCustomerFields] =
        useState<DocumentCustomerFields>(initialDocumentFields);
    const [invoiceDate, setInvoiceDate] = useState(
        existingInvoice?.date ?? formatDateInput(new Date())
    );
    const [dueDate, setDueDate] = useState(
        existingInvoice?.dueDate ??
            addDaysToIsoDate(
                existingInvoice?.date ?? formatDateInput(new Date()),
                defaultPaymentTermsDays
            )
    );
    const [dueDateTouched, setDueDateTouched] = useState(
        Boolean(existingInvoice?.dueDate)
    );
    const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>(
        existingInvoice?.status ?? "Draft"
    );
    const [linkedQuoteId, setLinkedQuoteId] = useState(
        existingInvoice?.linkedQuoteId ?? ""
    );
    const [notes, setNotes] = useState(
        existingInvoice?.notes ?? initialNotes ?? ""
    );
    const [terms, setTerms] = useState(
        existingInvoice?.terms ?? initialTerms ?? ""
    );
    const [items, setItems] = useState<LineItem[]>(
        existingInvoice?.items?.length
            ? existingInvoice.items.map((item) => ({ ...item }))
            : [
                  {
                      id: crypto.randomUUID(),
                      description: "",
                      quantity: 1,
                      price: 0,
                  },
              ]
    );
    const selectedCustomer = useMemo(
        () =>
            selectedCustomerId == null
                ? null
                : customers.find((customer) => customer.id === selectedCustomerId) ?? null,
        [customers, selectedCustomerId]
    );
    const {
        customerType: activeCustomerType,
        customerAddress: activeCustomerAddress,
        customerTown: activeCustomerTown,
        customerPostcode: activeCustomerPostcode,
        siteName: activeSiteName,
        siteAddress: activeSiteAddress,
        siteTown: activeSiteTown,
        sitePostcode: activeSitePostcode,
    } = documentCustomerFields;
    const showCommercialTools =
        allowCommercialTools && activeCustomerType === "Commercial";

    useEffect(() => {
        if (dueDateTouched) {
            return;
        }

        setDueDate(addDaysToIsoDate(invoiceDate, defaultPaymentTermsDays));
    }, [defaultPaymentTermsDays, dueDateTouched, invoiceDate]);

    function addItem() {
        setItems((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                description: "",
                quantity: 1,
                price: 0,
            },
        ]);
    }

    function removeItem(id: string) {
        setItems((prev) => prev.filter((item) => item.id !== id));
    }

    function updateItem<K extends keyof LineItem>(
        id: string,
        field: K,
        value: LineItem[K]
    ) {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    }

    const subtotal = useMemo(() => {
        return roundCurrency(
            items.reduce(
                (sum, item) =>
                    sum + Number(item.quantity || 0) * Number(item.price || 0),
                0
            )
        );
    }, [items]);

    const vatRate =
        typeof existingInvoice?.vatRate === "number" && !Number.isNaN(existingInvoice.vatRate)
            ? Math.max(0, existingInvoice.vatRate)
            : defaultVatRegistered
              ? Math.max(0, defaultVatRate)
              : 0;
    const vatAmount = useMemo(
        () => roundCurrency(subtotal * (vatRate / 100)),
        [subtotal, vatRate]
    );
    const total = useMemo(
        () => roundCurrency(subtotal + vatAmount),
        [subtotal, vatAmount]
    );

    const customerDetails = useMemo(() => {
        const address = [
            showCommercialTools ? normalizeOptionalText(activeSiteName) : undefined,
            normalizeOptionalText(activeCustomerAddress),
        ]
            .filter(Boolean)
            .join(", ");
        const location = buildLocationLine(
            normalizeOptionalText(activeCustomerTown),
            normalizeOptionalText(activeCustomerPostcode)
        );

        return [address || undefined, location].filter(Boolean) as string[];
    }, [
        activeCustomerAddress,
        activeCustomerPostcode,
        activeCustomerTown,
        activeSiteName,
        showCommercialTools,
    ]);

    const siteDetails = useMemo(() => {
        if (!showCommercialTools) {
            return [];
        }

        const location = buildLocationLine(
            normalizeOptionalText(activeSiteTown),
            normalizeOptionalText(activeSitePostcode)
        );

        return [
            normalizeOptionalText(activeSiteName),
            normalizeOptionalText(activeSiteAddress),
            location || undefined,
        ].filter(Boolean) as string[];
    }, [
        activeSiteAddress,
        activeSiteName,
        activeSitePostcode,
        activeSiteTown,
        showCommercialTools,
    ]);

    function handleCustomerNameChange(value: string) {
        setInvoiceCustomerName(value);

        if (
            selectedCustomerId != null &&
            (!selectedCustomer || value.trim() !== selectedCustomer.name)
        ) {
            setSelectedCustomerId(null);
            setDocumentCustomerFields(isEditingInvoice ? initialDocumentFields : {});
        }
    }

    function handleCustomerSelect(customer: Customer) {
        setSelectedCustomerId(customer.id);
        setInvoiceCustomerName(customer.name);
        setDocumentCustomerFields(getDocumentCustomerFieldsFromCustomer(customer));
    }

    async function handleSave() {
        const cleanedItems = items.filter(
            (item) =>
                item.description.trim() !== "" ||
                Number(item.quantity) > 0 ||
                Number(item.price) > 0
        );

        if (!invoiceCustomerName.trim()) return;
        if (cleanedItems.length === 0) return;

        await onSave({
            id: existingInvoice?.id ?? crypto.randomUUID(),
            invoiceNumber: existingInvoice?.invoiceNumber ?? "",
            customerId: selectedCustomerId,
            customerName: invoiceCustomerName.trim(),
            customerType: activeCustomerType,
            customerAddress: normalizeOptionalText(activeCustomerAddress),
            customerTown: normalizeOptionalText(activeCustomerTown),
            customerPostcode: normalizeOptionalText(activeCustomerPostcode),
            siteName:
                showCommercialTools
                    ? normalizeOptionalText(activeSiteName)
                    : undefined,
            siteAddress:
                showCommercialTools
                    ? normalizeOptionalText(activeSiteAddress)
                    : undefined,
            siteTown:
                showCommercialTools
                    ? normalizeOptionalText(activeSiteTown)
                    : undefined,
            sitePostcode:
                showCommercialTools
                    ? normalizeOptionalText(activeSitePostcode)
                    : undefined,
            date: invoiceDate,
            dueDate: dueDate.trim() || undefined,
            status: invoiceStatus,
            items: cleanedItems,
            notes: notes.trim() || undefined,
            terms: terms.trim() || undefined,
            vatRate,
            vatAmount,
            total,
            linkedQuoteId: linkedQuoteId.trim() || undefined,
        });
    }

    return (
        <div className="space-y-6">
            <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <button
                            onClick={onBack}
                            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>

                        <h1 className="mt-4 text-3xl font-black tracking-tight">
                            {isEditingInvoice ? "Edit Invoice" : "Create Invoice"}
                        </h1>
                        <p className="mt-2 text-sm text-white/75">
                            Build a customer invoice with terms, VAT, due-by dates, totals, and status updates.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {existingInvoice?.invoiceNumber ? (
                            <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                                {existingInvoice.invoiceNumber}
                            </div>
                        ) : invoiceNumberPreview ? (
                            <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                                Next: {invoiceNumberPreview}
                            </div>
                        ) : null}

                        <div
                            className={`rounded-full px-4 py-2 text-sm font-semibold ${getInvoiceStatusBadgeClasses(
                                invoiceStatus
                            )}`}
                        >
                            Status: {invoiceStatus}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                    Invoice Details
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="xl:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Customer
                        </label>
                        <DocumentCustomerPicker
                            value={invoiceCustomerName}
                            customers={customers}
                            selectedCustomerId={selectedCustomerId}
                            onChange={handleCustomerNameChange}
                            onSelect={handleCustomerSelect}
                            placeholder="Customer name"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Status
                        </label>
                        <select
                            value={invoiceStatus}
                            onChange={(e) =>
                                setInvoiceStatus(e.target.value as InvoiceStatus)
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        >
                            {INVOICE_STATUS_OPTIONS.map((statusOption) => (
                                <option key={statusOption} value={statusOption}>
                                    {statusOption}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Invoice Date
                        </label>
                        <input
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Due By
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => {
                                setDueDateTouched(true);
                                setDueDate(e.target.value);
                            }}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        />
                    </div>

                    <div className="xl:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Linked Quote ID
                        </label>
                        <input
                            value={linkedQuoteId}
                            onChange={(e) => setLinkedQuoteId(e.target.value)}
                            placeholder="Optional quote ID"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        />
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 xl:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Payment Setup
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                                <p className="text-xs text-slate-500">Terms</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {defaultPaymentTermsDays} day
                                    {defaultPaymentTermsDays === 1 ? "" : "s"}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-slate-500">VAT</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {defaultVatRegistered ? `${vatRate}% applied` : "Not registered"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {(customerDetails.length > 0 || showCommercialTools) && (
                <section className="grid gap-6 xl:grid-cols-2">
                    <DetailCard
                        title="Customer Details"
                        lines={customerDetails}
                        emptyText="No customer address details are saved on this customer yet."
                    />

                    {showCommercialTools && (
                        <DetailCard
                            title="Site Details"
                            lines={siteDetails}
                            emptyText="No commercial site details are saved on this customer yet."
                        />
                    )}
                </section>
            )}

            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black tracking-tight text-slate-900">
                        Line Items
                    </h2>

                    <button
                        onClick={addItem}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        <Plus size={16} />
                        Add Item
                    </button>
                </div>

                <div className="mt-4 space-y-4">
                    {items.map((item, index) => {
                        const lineTotal =
                            Number(item.quantity || 0) * Number(item.price || 0);

                        return (
                            <div
                                key={item.id}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-sm font-semibold text-slate-700">
                                        Item {index + 1}
                                    </p>

                                    {items.length > 1 && (
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                                        >
                                            <Trash2 size={14} />
                                            Remove
                                        </button>
                                    )}
                                </div>

                                <div className="grid gap-4 md:grid-cols-[1.6fr_0.6fr_0.8fr_0.8fr]">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            Description
                                        </label>
                                        <input
                                            value={item.description}
                                            onChange={(e) =>
                                                updateItem(item.id, "description", e.target.value)
                                            }
                                            placeholder="e.g. Routine service, hedge trimming, materials"
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            Qty
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.quantity}
                                            onChange={(e) =>
                                                updateItem(
                                                    item.id,
                                                    "quantity",
                                                    Number(e.target.value || 0)
                                                )
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            Price
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.price}
                                            onChange={(e) =>
                                                updateItem(item.id, "price", Number(e.target.value || 0))
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            Line Total
                                        </label>
                                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900">
                                            {formatMoney(lineTotal)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-black tracking-tight text-slate-900">
                        Notes
                    </h2>

                    <div className="mt-4">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add invoice notes, thank-you text, or remittance guidance."
                            className="min-h-[140px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        />
                    </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-black tracking-tight text-slate-900">
                        Terms
                    </h2>

                    <div className="mt-4">
                        <textarea
                            value={terms}
                            onChange={(e) => setTerms(e.target.value)}
                            placeholder="Add payment terms, late-payment wording, or T&Cs."
                            className="min-h-[140px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        />
                    </div>
                </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Subtotal
                            </p>
                            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                                {formatMoney(subtotal)}
                            </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                VAT
                            </p>
                            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                                {defaultVatRegistered
                                    ? `${formatMoney(vatAmount)} (${vatRate}%)`
                                    : formatMoney(0)}
                            </p>
                        </div>

                        <div className="rounded-2xl bg-slate-900 p-4 text-white">
                            <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
                                Total
                            </p>
                            <p className="mt-2 text-3xl font-black tracking-tight">
                                {formatMoney(total)}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={onBack}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={handleSave}
                            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            {isEditingInvoice ? "Save Changes" : "Save Invoice"}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
