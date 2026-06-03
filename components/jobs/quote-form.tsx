"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, ReceiptText, Trash2 } from "lucide-react";
import DocumentHistoryPanel from "./document-history-panel";
import DocumentCustomerCreateDialog from "./document-customer-create-dialog";
import DocumentCustomerPicker from "./document-customer-picker";
import {
    QUOTE_STATUS_OPTIONS,
    type Customer,
    type DocumentDeliveryMethod,
    type DocumentHistoryEntry,
    type QuoteStatus,
    type RotationWeeks,
} from "./types";
import type { EditFormCollaboration } from "./edit-collaboration";
import {
    QUOTE_WORK_TYPE_OPTIONS,
    normalizeQuoteAutoSchedulingPreference,
    normalizeQuoteWorkType,
    normalizeServiceRoundSchedulingPreference,
    type QuoteAutoSchedulingPreference,
    type QuoteWorkType,
    type ServiceRoundSchedulingPreference,
} from "@/lib/scheduling/quote-scheduler";

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

type Quote = {
    id: string;
    quoteNumber: string;
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
    status: QuoteStatus;
    items: LineItem[];
    notes?: string;
    total: number;
    workType?: QuoteWorkType;
    estimatedDurationMinutes?: number;
    autoSchedulingPreference?: QuoteAutoSchedulingPreference;
    autoSchedulingDisabled?: boolean;
    serviceRoundSchedulingPreference?: ServiceRoundSchedulingPreference;
    autoScheduledJobId?: string;
    schedulingStatus?:
        | "not_required"
        | "suggested"
        | "scheduled"
        | "manual_required"
        | "skipped";
};

type QuoteService = {
    id: string;
    title: string;
    category: string;
    itemType: "service" | "product";
    price: number;
    buyPrice: number;
};

type PressureWashArea = {
    id: string;
    locationName: string;
    length: number;
    width: number;
};

type Props = DocumentCustomerFields & {
    customerId?: number | null;
    customerName?: string;
    customers?: Customer[];
    existingQuote?: Quote;
    documentHistory?: DocumentHistoryEntry[];
    showOwnerHistory?: boolean;
    initialNotes?: string;
    initialItems?: LineItem[];
    savedServices?: QuoteService[];
    workTypeOptions?: string[];
    pressureWashRatePerSquareMetre?: number;
    defaultRotationWeeks?: RotationWeeks;
    allowCommercialTools?: boolean;
    editCollaboration?: EditFormCollaboration<Quote>;
    onSave: (quote: Quote) => void | boolean | Promise<void | boolean>;
    onCreateCustomer?: (customer: Customer) => Promise<Customer | null | undefined>;
    onConvertToInvoice?: (quoteId: string) => void | Promise<void>;
    onMarkRead?: (
        quoteId: string,
        metadata?: { method?: DocumentDeliveryMethod; recipient?: string }
    ) => Promise<void> | void;
    onBack: () => void;
};

const DEFAULT_PRESSURE_WASH_AREA_COUNT = 3;
const moneyFormatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
});

function getQuoteServiceKey(service: QuoteService) {
    return `${service.category.trim().toLowerCase()}|${service.itemType}|${service.title
        .trim()
        .toLowerCase()}`;
}

function getQuoteServiceProfit(service: QuoteService) {
    if (service.itemType !== "product") {
        return 0;
    }

    return Number(service.price ?? 0) - Number(service.buyPrice ?? 0);
}

function getQuoteServiceLabel(service: QuoteService) {
    const itemLabel = service.category
        ? `${service.category} / ${service.title}`
        : service.title;

    if (service.itemType === "product") {
        return `${itemLabel} (Product, ${formatMoney(service.price)}, ${formatMoney(
            getQuoteServiceProfit(service)
        )} profit)`;
    }

    return `${itemLabel} (${formatMoney(service.price)})`;
}

function formatMoney(value: number | null | undefined) {
    return moneyFormatter.format(Number(value ?? 0));
}

function formatMeasurement(value: number) {
    if (!Number.isFinite(value)) {
        return "0";
    }

    return Number(value.toFixed(2)).toString();
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

function createEmptyPressureWashArea(): PressureWashArea {
    return {
        id: crypto.randomUUID(),
        locationName: "",
        length: 0,
        width: 0,
    };
}

function getQuoteStatusBadgeClasses(status: QuoteStatus) {
    switch (status) {
        case "Accepted":
            return "bg-emerald-500/15 text-emerald-50 ring-1 ring-inset ring-emerald-300/25";
        case "Scheduled":
            return "bg-indigo-500/15 text-indigo-50 ring-1 ring-inset ring-indigo-300/25";
        case "Declined":
            return "bg-rose-500/15 text-rose-50 ring-1 ring-inset ring-rose-300/25";
        case "Sent":
            return "bg-sky-500/15 text-sky-50 ring-1 ring-inset ring-sky-300/25";
        case "Approved":
            return "bg-amber-400/15 text-amber-50 ring-1 ring-inset ring-amber-300/25";
        default:
            return "bg-white/10 text-white ring-1 ring-inset ring-white/15";
    }
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

export default function QuoteForm({
    customerId,
    customerName,
    customers = [],
    existingQuote,
    documentHistory = [],
    showOwnerHistory = false,
    customerType,
    customerAddress,
    customerTown,
    customerPostcode,
    siteName,
    siteAddress,
    siteTown,
    sitePostcode,
    initialNotes,
    initialItems,
    savedServices,
    workTypeOptions,
    pressureWashRatePerSquareMetre,
    defaultRotationWeeks,
    allowCommercialTools = true,
    editCollaboration,
    onSave,
    onCreateCustomer,
    onConvertToInvoice,
    onMarkRead,
    onBack,
}: Props) {
    const isEditingQuote = Boolean(existingQuote);
    const initialSelectedCustomerId =
        existingQuote?.customerId ??
        customerId ??
        null;
    const initialDocumentFields = normalizeDocumentCustomerFields({
        customerType: existingQuote?.customerType ?? customerType,
        customerAddress: existingQuote?.customerAddress ?? customerAddress,
        customerTown: existingQuote?.customerTown ?? customerTown,
        customerPostcode: existingQuote?.customerPostcode ?? customerPostcode,
        siteName: existingQuote?.siteName ?? siteName,
        siteAddress: existingQuote?.siteAddress ?? siteAddress,
        siteTown: existingQuote?.siteTown ?? siteTown,
        sitePostcode: existingQuote?.sitePostcode ?? sitePostcode,
    });
    const [quoteCustomerName, setQuoteCustomerName] = useState(
        existingQuote?.customerName ?? customerName ?? ""
    );
    const [isAddingCustomer, setIsAddingCustomer] = useState(false);
    const [pendingCustomerName, setPendingCustomerName] = useState("");
    const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
        initialSelectedCustomerId
    );
    const [documentCustomerFields, setDocumentCustomerFields] =
        useState<DocumentCustomerFields>(initialDocumentFields);
    const [quoteDate, setQuoteDate] = useState(
        existingQuote?.date ?? new Date().toISOString().split("T")[0]
    );
    const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>(
        existingQuote?.status ?? "Draft"
    );
    const initialEstimatedDuration = existingQuote?.estimatedDurationMinutes ?? 0;
    const [estimatedHours, setEstimatedHours] = useState(
        String(Math.floor(initialEstimatedDuration / 60))
    );
    const [estimatedMinutes, setEstimatedMinutes] = useState(
        String(initialEstimatedDuration % 60)
    );
    const [workType, setWorkType] = useState<QuoteWorkType>(
        existingQuote?.workType
            ? normalizeQuoteWorkType(existingQuote.workType)
            : "Other"
    );
    const resolvedWorkTypeOptions = useMemo(() => {
        const options = Array.from(
            new Map(
                [...(workTypeOptions ?? QUOTE_WORK_TYPE_OPTIONS), workType]
                    .map((option) => option.trim())
                    .filter(Boolean)
                    .map((option) => [option.toLowerCase(), option])
            ).values()
        );

        return options.length ? options : ["Other"];
    }, [workType, workTypeOptions]);
    const [autoSchedulingPreference, setAutoSchedulingPreference] =
        useState<QuoteAutoSchedulingPreference>(
            normalizeQuoteAutoSchedulingPreference(
                existingQuote?.autoSchedulingPreference
            )
        );
    const [serviceRoundSchedulingPreference, setServiceRoundSchedulingPreference] =
        useState<ServiceRoundSchedulingPreference>(
            normalizeServiceRoundSchedulingPreference(
                existingQuote?.serviceRoundSchedulingPreference
            )
        );
    const [autoSchedulingDisabled, setAutoSchedulingDisabled] = useState(
        existingQuote?.autoSchedulingDisabled === true
    );
    const [notes, setNotes] = useState(existingQuote?.notes ?? initialNotes ?? "");
    const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
    const [includesPressureWash, setIncludesPressureWash] = useState(false);
    const [pressureWashAreas, setPressureWashAreas] = useState<PressureWashArea[]>(() =>
        Array.from(
            { length: DEFAULT_PRESSURE_WASH_AREA_COUNT },
            () => createEmptyPressureWashArea()
        )
    );
    const [items, setItems] = useState<LineItem[]>(
        existingQuote?.items?.length
            ? existingQuote.items.map((item) => ({ ...item }))
            : initialItems?.length
              ? initialItems.map((item) => ({ ...item }))
            : [
                  {
                      id: crypto.randomUUID(),
                      description: "",
                      quantity: 1,
                      price: 0,
                  },
              ]
    );
    const draftQuoteIdRef = useRef(existingQuote?.id ?? crypto.randomUUID());
    const initialDraftRef = useRef("");
    const handledSaveRequestRef = useRef(0);
    const handledDiscardRequestRef = useRef(0);
    const editCollaborationRef = useRef(editCollaboration);

    const reusableServices = useMemo(() => {
        const seenServices = new Set<string>();

        return (savedServices ?? []).filter((service) => {
            const title = service.title.trim();
            const key = getQuoteServiceKey(service);

            if (!title || seenServices.has(key)) {
                return false;
            }

            seenServices.add(key);
            return true;
        });
    }, [savedServices]);

    const quoteCategories = useMemo(
        () =>
            Array.from(
                new Set(
                    reusableServices
                        .map((service) => service.category.trim())
                        .filter(Boolean)
                )
            ).sort((left, right) => left.localeCompare(right)),
        [reusableServices]
    );

    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedServiceKey, setSelectedServiceKey] = useState("");
    const selectedCustomer = useMemo(
        () =>
            selectedCustomerId == null
                ? null
                : customers.find((customer) => customer.id === selectedCustomerId) ??
                  (createdCustomer?.id === selectedCustomerId ? createdCustomer : null),
        [createdCustomer, customers, selectedCustomerId]
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
        setSelectedCategory((current) =>
            current === "all" || quoteCategories.includes(current) ? current : "all"
        );
    }, [quoteCategories]);

    const filteredServices = useMemo(
        () =>
            selectedCategory === "all"
                ? reusableServices
                : reusableServices.filter(
                      (service) => service.category.trim() === selectedCategory
                  ),
        [reusableServices, selectedCategory]
    );

    useEffect(() => {
        setSelectedServiceKey((current) => {
            if (
                current &&
                filteredServices.some((service) => getQuoteServiceKey(service) === current)
            ) {
                return current;
            }

            return filteredServices[0] ? getQuoteServiceKey(filteredServices[0]) : "";
        });
    }, [filteredServices]);

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

    function addSavedService(serviceKey: string) {
        const nextService = reusableServices.find(
            (service) => getQuoteServiceKey(service) === serviceKey
        );
        const nextTitle = nextService?.title.trim() ?? "";
        const nextPrice =
            nextService && Number.isFinite(nextService.price)
                ? nextService.price
                : 0;

        if (!nextTitle) {
            return;
        }

        setItems((prev) => {
            const emptyItemIndex = prev.findIndex(
                (item) =>
                    item.description.trim() === "" && Number(item.price || 0) === 0
            );

            if (emptyItemIndex >= 0) {
                return prev.map((item, index) =>
                    index === emptyItemIndex
                        ? {
                              ...item,
                              description: nextTitle,
                              quantity: Number(item.quantity || 0) > 0 ? item.quantity : 1,
                              price: nextPrice,
                          }
                        : item
                );
            }

            return [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    description: nextTitle,
                    quantity: 1,
                    price: nextPrice,
                },
            ];
        });
    }

    function addPressureWashArea() {
        setPressureWashAreas((prev) => [...prev, createEmptyPressureWashArea()]);
    }

    function removePressureWashArea(areaId: string) {
        setPressureWashAreas((prev) =>
            prev.length > 1 ? prev.filter((area) => area.id !== areaId) : prev
        );
        setItems((prev) =>
            prev.filter((item) => item.id !== `pressure-wash-${areaId}`)
        );
    }

    function updatePressureWashArea<K extends keyof PressureWashArea>(
        areaId: string,
        field: K,
        value: PressureWashArea[K]
    ) {
        setPressureWashAreas((prev) =>
            prev.map((area) =>
                area.id === areaId ? { ...area, [field]: value } : area
            )
        );
    }

    const pressureWashRate = useMemo(() => {
        const nextValue = Number(pressureWashRatePerSquareMetre ?? 0);
        return Number.isFinite(nextValue) ? nextValue : 0;
    }, [pressureWashRatePerSquareMetre]);

    const pressureWashBreakdown = useMemo(
        () =>
            pressureWashAreas.map((area) => {
                const length = Math.max(0, Number(area.length || 0));
                const width = Math.max(0, Number(area.width || 0));
                const areaM2 = Number((length * width).toFixed(2));
                const lineTotal = Number((areaM2 * pressureWashRate).toFixed(2));

                return {
                    ...area,
                    locationName: area.locationName.trim(),
                    length,
                    width,
                    areaM2,
                    lineTotal,
                };
            }),
        [pressureWashAreas, pressureWashRate]
    );

    const pressureWashSummary = useMemo(() => {
        return pressureWashBreakdown
            .filter((area) => area.length > 0 && area.width > 0 && area.areaM2 > 0)
            .reduce(
            (summary, area) => {
                const quantity = Number(area.areaM2 || 0);
                const lineTotal = Number(area.lineTotal || 0);

                return {
                    totalArea: Number((summary.totalArea + quantity).toFixed(2)),
                    totalValue: Number((summary.totalValue + lineTotal).toFixed(2)),
                };
            },
            { totalArea: 0, totalValue: 0 }
        );
    }, [pressureWashBreakdown]);

    const total = useMemo(() => {
        return items.reduce(
            (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
            0
        );
    }, [items]);

    const buildQuoteDraft = useCallback((): Quote => {
        const cleanedItems = items.filter(
            (item) =>
                item.description.trim() !== "" ||
                Number(item.quantity) > 0 ||
                Number(item.price) > 0
        );
        const durationHours = Math.max(0, Math.floor(Number(estimatedHours) || 0));
        const durationMinutes = Math.min(
            59,
            Math.max(0, Math.floor(Number(estimatedMinutes) || 0))
        );
        const estimatedDurationMinutes =
            durationHours * 60 + durationMinutes > 0
                ? durationHours * 60 + durationMinutes
                : undefined;

        return {
            id: draftQuoteIdRef.current,
            quoteNumber: existingQuote?.quoteNumber ?? "",
            customerId: selectedCustomerId,
            customerName: quoteCustomerName.trim(),
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
            date: quoteDate,
            status: quoteStatus,
            items: cleanedItems,
            notes: notes.trim() || undefined,
            total,
            workType,
            estimatedDurationMinutes,
            autoSchedulingPreference,
            autoSchedulingDisabled,
            serviceRoundSchedulingPreference,
            autoScheduledJobId: existingQuote?.autoScheduledJobId,
            schedulingStatus: existingQuote?.schedulingStatus,
        };
    }, [
        activeCustomerAddress,
        activeCustomerPostcode,
        activeCustomerTown,
        activeCustomerType,
        activeSiteAddress,
        activeSiteName,
        activeSitePostcode,
        activeSiteTown,
        autoSchedulingDisabled,
        autoSchedulingPreference,
        estimatedHours,
        estimatedMinutes,
        existingQuote?.autoScheduledJobId,
        existingQuote?.quoteNumber,
        existingQuote?.schedulingStatus,
        items,
        notes,
        quoteCustomerName,
        quoteDate,
        quoteStatus,
        selectedCustomerId,
        serviceRoundSchedulingPreference,
        showCommercialTools,
        total,
        workType,
    ]);

    useEffect(() => {
        editCollaborationRef.current = editCollaboration;
    }, [editCollaboration]);

    useEffect(() => {
        if (!editCollaborationRef.current || initialDraftRef.current) {
            return;
        }

        initialDraftRef.current = JSON.stringify(buildQuoteDraft());
    }, [buildQuoteDraft]);

    useEffect(() => {
        const collaboration = editCollaborationRef.current;

        if (!collaboration) {
            return;
        }

        const draft = buildQuoteDraft();
        const draftJson = JSON.stringify(draft);
        const isDirty = initialDraftRef.current
            ? draftJson !== initialDraftRef.current
            : false;

        collaboration.onDraftChange(draft, isDirty);
    }, [buildQuoteDraft]);

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

    const handleSave = useCallback(async () => {
        const draft = buildQuoteDraft();
        if (!quoteCustomerName.trim()) {
            return;
        }

        if (draft.items.length === 0) {
            return;
        }

        const saveResult = await onSave(draft);

        if (saveResult !== false) {
            editCollaboration?.onSaveComplete();
        }
    }, [buildQuoteDraft, editCollaboration, onSave, quoteCustomerName]);

    useEffect(() => {
        if (
            !editCollaboration?.saveRequestId ||
            handledSaveRequestRef.current === editCollaboration.saveRequestId
        ) {
            return;
        }

        handledSaveRequestRef.current = editCollaboration.saveRequestId;
        void handleSave();
    }, [editCollaboration?.saveRequestId, handleSave]);

    useEffect(() => {
        if (
            !editCollaboration?.discardRequestId ||
            handledDiscardRequestRef.current === editCollaboration.discardRequestId
        ) {
            return;
        }

        handledDiscardRequestRef.current = editCollaboration.discardRequestId;
        editCollaboration.onDiscardComplete();
        onBack();
    }, [editCollaboration, onBack]);

    const handleBack = useCallback(() => {
        editCollaborationRef.current?.onDiscardComplete();
        onBack();
    }, [onBack]);

    async function handleCreateInvoice() {
        if (!existingQuote?.id || !onConvertToInvoice || isCreatingInvoice) {
            return;
        }

        setIsCreatingInvoice(true);

        try {
            await onConvertToInvoice(existingQuote.id);
        } finally {
            setIsCreatingInvoice(false);
        }
    }

    function addPressureWashAreaToQuote(areaId: string) {
        const area = pressureWashBreakdown.find((entry) => entry.id === areaId);

        if (!area) {
            return;
        }

        if (!area.locationName || area.areaM2 <= 0 || area.lineTotal <= 0) {
            return;
        }

        const quoteItemId = `pressure-wash-${area.id}`;
        const nextItem: LineItem = {
            id: quoteItemId,
            description: `Pressure Wash - ${area.locationName}`,
            quantity: 1,
            price: area.lineTotal,
        };

        setItems((prev) => {
            const existingIndex = prev.findIndex((item) => item.id === quoteItemId);

            if (existingIndex >= 0) {
                return prev.map((item, index) =>
                    index === existingIndex ? nextItem : item
                );
            }

            return [...prev, nextItem];
        });
    }

    function handleCustomerNameChange(value: string) {
        setQuoteCustomerName(value);

        if (
            selectedCustomerId != null &&
            (!selectedCustomer || value.trim() !== selectedCustomer.name)
        ) {
            setSelectedCustomerId(null);
            setDocumentCustomerFields(isEditingQuote ? initialDocumentFields : {});
        }
    }

    function handleCustomerSelect(customer: Customer) {
        setSelectedCustomerId(customer.id);
        setQuoteCustomerName(customer.name);
        setDocumentCustomerFields(getDocumentCustomerFieldsFromCustomer(customer));
    }

    function beginCreateCustomer(name: string) {
        if (!onCreateCustomer) {
            return;
        }

        setPendingCustomerName(name);
        setIsAddingCustomer(true);
    }

    function handleCustomerCreated(customer: Customer) {
        setCreatedCustomer(customer);
        handleCustomerSelect(customer);
        setPendingCustomerName("");
        setIsAddingCustomer(false);
    }

    return (
        <div className="space-y-6">
            {isAddingCustomer && onCreateCustomer ? (
                <DocumentCustomerCreateDialog
                    customerName={pendingCustomerName || quoteCustomerName}
                    customers={customers}
                    defaultRotationWeeks={defaultRotationWeeks}
                    allowCommercialTools={allowCommercialTools}
                    onCreateCustomer={onCreateCustomer}
                    onCreated={handleCustomerCreated}
                    onCancel={() => setIsAddingCustomer(false)}
                />
            ) : null}

            <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <button
                            onClick={handleBack}
                            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>

                        <h1 className="mt-4 text-3xl font-black tracking-tight">
                            {isEditingQuote ? "Edit Quote" : "Create Quote"}
                        </h1>
                        <p className="mt-2 text-sm text-white/75">
                            Build a customer quote with line items, saved items, pressure wash pricing, and status updates.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {existingQuote?.id && onConvertToInvoice ? (
                            <button
                                type="button"
                                onClick={handleCreateInvoice}
                                disabled={isCreatingInvoice}
                                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <ReceiptText size={16} />
                                {isCreatingInvoice ? "Creating..." : "Create Invoice"}
                            </button>
                        ) : null}

                        {existingQuote?.quoteNumber ? (
                            <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                                {existingQuote.quoteNumber}
                            </div>
                        ) : null}

                        <div
                            className={`rounded-full px-4 py-2 text-sm font-semibold ${getQuoteStatusBadgeClasses(
                                quoteStatus
                            )}`}
                        >
                            Status: {quoteStatus}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                    Quote Details
                </h2>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Customer
                        </label>
                        <DocumentCustomerPicker
                            value={quoteCustomerName}
                            customers={customers}
                            selectedCustomerId={selectedCustomerId}
                            onChange={handleCustomerNameChange}
                            onSelect={handleCustomerSelect}
                            onCreateCustomer={onCreateCustomer ? beginCreateCustomer : undefined}
                            placeholder="Customer name"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Quote Date
                        </label>
                        <input
                            type="date"
                            value={quoteDate}
                            onChange={(e) => setQuoteDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Status
                        </label>
                        <select
                            value={quoteStatus}
                            onChange={(e) =>
                                setQuoteStatus(e.target.value as QuoteStatus)
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        >
                            {QUOTE_STATUS_OPTIONS.map((statusOption) => (
                                <option key={statusOption} value={statusOption}>
                                    {statusOption}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            <section className="rounded-[22px] border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        Internal Scheduling
                    </p>
                    <h2 className="text-lg font-black tracking-tight text-slate-900">
                        Estimated Time
                    </h2>
                    <p className="text-sm text-slate-600">
                        Used for operator scheduling only. This is not shown to the customer.
                    </p>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Work type
                        </label>
                        <select
                            value={workType}
                            onChange={(e) =>
                                setWorkType(normalizeQuoteWorkType(e.target.value))
                            }
                            className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400"
                        >
                            {resolvedWorkTypeOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Hours
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={estimatedHours}
                            onChange={(e) => setEstimatedHours(e.target.value)}
                            className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Minutes
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="59"
                            step="15"
                            value={estimatedMinutes}
                            onChange={(e) => setEstimatedMinutes(e.target.value)}
                            className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Auto-scheduling
                        </label>
                        <select
                            value={autoSchedulingPreference}
                            onChange={(e) =>
                                setAutoSchedulingPreference(
                                    normalizeQuoteAutoSchedulingPreference(e.target.value)
                                )
                            }
                            className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400"
                        >
                            <option value="default">Use settings default</option>
                            <option value="disabled">Disable for this quote</option>
                            <option value="suggest">Suggest slot only</option>
                            <option value="auto">Auto-schedule</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Service round days
                        </label>
                        <select
                            value={serviceRoundSchedulingPreference}
                            onChange={(e) =>
                                setServiceRoundSchedulingPreference(
                                    normalizeServiceRoundSchedulingPreference(e.target.value)
                                )
                            }
                            className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400"
                        >
                            <option value="default">Use settings default</option>
                            <option value="allow">Allow round days</option>
                            <option value="avoid">Avoid round days</option>
                            <option value="force">Only round days</option>
                        </select>
                    </div>

                    <label className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 lg:col-span-3">
                        <input
                            type="checkbox"
                            checked={autoSchedulingDisabled}
                            onChange={(e) => setAutoSchedulingDisabled(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                        />
                        Disable automatic scheduling for this quote
                    </label>
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

            {reusableServices.length > 0 && (
                <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h2 className="text-lg font-black tracking-tight text-slate-900">
                                Saved Items
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Pick a saved service or product to drop it straight into the quote with its default price.
                            </p>
                        </div>

                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
                            {quoteCategories.length > 0 ? (
                                <div className="sm:min-w-[220px]">
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Category
                                    </label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    >
                                        <option value="all">All categories</option>
                                        {quoteCategories.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : null}

                            <div className="sm:min-w-[260px]">
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Item
                                </label>
                                <select
                                    value={selectedServiceKey}
                                    onChange={(e) => setSelectedServiceKey(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                >
                                    {filteredServices.map((service) => (
                                        <option
                                            key={getQuoteServiceKey(service)}
                                            value={getQuoteServiceKey(service)}
                                        >
                                            {getQuoteServiceLabel(service)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={() => addSavedService(selectedServiceKey)}
                                disabled={!selectedServiceKey}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Plus size={16} />
                                Add Item
                            </button>
                        </div>
                    </div>
                </section>
            )}

            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 className="text-lg font-black tracking-tight text-slate-900">
                            Pressure Washing
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Turn this on when part of the quote is for pressure washing. The calculator uses your saved quote settings rate per m2.
                        </p>
                    </div>

                    <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            checked={includesPressureWash}
                            onChange={(e) => setIncludesPressureWash(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        Part of this quote is pressure washing
                    </label>
                </div>

                {includesPressureWash ? (
                    <div className="mt-5 space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Pressure Wash Rate
                            </p>
                            <p className="mt-2 text-lg font-black text-slate-900">
                                {formatMoney(pressureWashRate)} per m2
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                This comes from Settings &gt; Quotes.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {pressureWashBreakdown.map((area, index) => (
                                <div
                                    key={area.id}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700">
                                                Pressure wash area {index + 1}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Add the location name, measurements, and then send that total into the quote.
                                            </p>
                                        </div>

                                        {pressureWashAreas.length > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => removePressureWashArea(area.id)}
                                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                                            >
                                                <Trash2 size={14} />
                                                Remove
                                            </button>
                                        ) : null}
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-[1.2fr_0.9fr_0.9fr_1fr_1fr]">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                Location
                                            </label>
                                            <input
                                                value={area.locationName}
                                                onChange={(e) =>
                                                    updatePressureWashArea(
                                                        area.id,
                                                        "locationName",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="e.g. Driveway, rear patio, side path"
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                Length (m)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={area.length}
                                                onChange={(e) =>
                                                    updatePressureWashArea(
                                                        area.id,
                                                        "length",
                                                        Number(e.target.value || 0)
                                                    )
                                                }
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                Width (m)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={area.width}
                                                onChange={(e) =>
                                                    updatePressureWashArea(
                                                        area.id,
                                                        "width",
                                                        Number(e.target.value || 0)
                                                    )
                                                }
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                Area (m2)
                                            </label>
                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900">
                                                {formatMeasurement(area.areaM2)}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                Value
                                            </label>
                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900">
                                                {formatMoney(area.lineTotal)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <p className="text-xs text-slate-500">
                                            Quote line:{" "}
                                            <span className="font-semibold text-slate-700">
                                                Pressure Wash - {area.locationName || "Location name"}
                                            </span>
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => addPressureWashAreaToQuote(area.id)}
                                            disabled={
                                                !area.locationName ||
                                                area.areaM2 <= 0 ||
                                                area.lineTotal <= 0
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Plus size={16} />
                                            {items.some(
                                                (item) => item.id === `pressure-wash-${area.id}`
                                            )
                                                ? "Update Quote Line"
                                                : "Add to Quote"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <button
                                type="button"
                                onClick={addPressureWashArea}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                <Plus size={16} />
                                Add Another Area
                            </button>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Total Area
                                    </p>
                                    <p className="mt-2 text-lg font-black text-slate-900">
                                        {formatMeasurement(pressureWashSummary.totalArea)} m2
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Pressure Wash Total
                                    </p>
                                    <p className="mt-2 text-lg font-black text-slate-900">
                                        {formatMoney(pressureWashSummary.totalValue)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </section>

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
                        const lineTotal = Number(item.quantity || 0) * Number(item.price || 0);

                        return (
                            <div
                                key={item.id}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-sm font-semibold text-slate-700">
                                        Item {index + 1}
                                    </p>

                                    {items.length > 1 ? (
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                                        >
                                            <Trash2 size={14} />
                                            Remove
                                        </button>
                                    ) : null}
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
                                            placeholder="e.g. Routine service, hedge trimming, bark mulch"
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

            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                    Notes
                </h2>

                <div className="mt-4">
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add quote notes, scope details, exclusions, payment terms, etc."
                        className="min-h-[140px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    />
                </div>
            </section>

            {showOwnerHistory && existingQuote?.id ? (
                <DocumentHistoryPanel
                    documentId={existingQuote.id}
                    documentLabel={existingQuote.quoteNumber || "This quote"}
                    documentKind="quote"
                    entries={documentHistory}
                    onMarkRead={onMarkRead}
                />
            ) : null}

            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500">Quote Total</p>
                        <p className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                            {formatMoney(total)}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        {existingQuote?.id && onConvertToInvoice ? (
                            <button
                                type="button"
                                onClick={handleCreateInvoice}
                                disabled={isCreatingInvoice}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <ReceiptText size={16} />
                                {isCreatingInvoice ? "Creating..." : "Create Invoice"}
                            </button>
                        ) : null}

                        <button
                            type="button"
                            onClick={handleSave}
                            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            {isEditingQuote ? "Save Changes" : "Save Quote"}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
