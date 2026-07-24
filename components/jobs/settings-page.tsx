"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Bot,
    Building2,
    Phone,
    Mail,
    Globe,
    MapPin,
    Palette,
    Scissors,
    Receipt,
    CloudSun,
    ShieldCheck,
    RotateCcw,
    Save,
    Database,
    CreditCard,
    FileText,
    Upload,
    Download,
    Plus,
    Image as ImageIcon,
    Trash2,
    Settings2,
    UserCircle,
    KeyRound,
    HelpCircle,
    Calendar as CalendarIcon,
} from "lucide-react";
import AiReceptionistSettingsForm from "@/components/ai-receptionist/ai-receptionist-settings-form";
import AiReceptionistCallHistory from "@/components/ai-receptionist/ai-receptionist-call-history";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { AiReceptionistSettings } from "@/lib/ai-receptionist-settings";
import type { AiReceptionistCallHistoryItem } from "@/lib/ai-receptionist/call-logs";

import {
    DEFAULT_GRASS_CUT_SEASON_END,
    DEFAULT_GRASS_CUT_SEASON_START,
    getSeasonDateInputValue,
    normalizeSeasonMonthDay,
} from "./helpers";
import {
    DEFAULT_ROTATION_WEEKS,
    getRotationLabel,
    normalizeRotationWeeks,
    ROTATION_WEEK_OPTIONS,
} from "./rotation";
import {
    CURRENCY_OPTIONS,
    DEFAULT_CURRENCY_CODE,
    formatCurrencyAmount,
    getCurrencyOption,
    normalizeCurrencyCode,
    type CurrencyCode,
} from "./currency";
import {
    normalizeEditInactiveAction,
    normalizeEditInactiveMinutes,
    type EditInactiveAction,
} from "./edit-collaboration";
import {
    DEFAULT_AUTO_SCHEDULING_SETTINGS,
    SCHEDULING_DAY_NAMES,
    normalizeAutoSchedulingSettings,
    normalizeSchedulingMode,
    type AutoSchedulingSettings,
    type SchedulingUnavailableWindow,
} from "@/lib/scheduling/quote-scheduler";
import type { ExpenseProduct, ExpenseRecord, ExpenseSupplier } from "./expenses-page";
import type { RouteChangeRecord } from "./route-efficiency";
import type {
    CommercialRamsDocument,
    Customer,
    CustomerLead,
    DocumentHistoryEntry,
    Invoice,
    InvoiceReminderState,
    MonthlyPayment,
    Quote,
    QuoteFollowUpState,
    RecurringInvoiceTemplate,
    RolePermission,
    RotationWeeks,
    ScheduledJob,
    StaffMember,
    VisitLog,
} from "./types";
import { DEFAULT_NOT_CUT_REASONS } from "./types";

type PaymentMethod = "cash" | "bank_transfer" | "direct_debit" | "invoice";
type CutType = "front_only" | "front_back" | "full_garden";
type ThemeMode = "light" | "dark" | "system";
type PdfHeaderStyle = "banner" | "letterhead";
type PdfLogoBackground = "none" | "dark" | "light";
type PdfPreviewDocumentType = "quote" | "invoice" | "rams";
type QuoteServiceType = "service" | "product";
type WorkflowMessageMethod = "email";
type QuoteService = {
    id: string;
    title: string;
    category: string;
    itemType: QuoteServiceType;
    price: number;
    buyPrice: number;
};
type SettingsTab =
    | "account"
    | "business"
    | "documents"
    | "pricing"
    | "jobs"
    | "quotes"
    | "invoices"
    | "email"
    | "dashboard"
    | "ai-receptionist"
    | "data";

export type SettingsData = {
    businessName: string;
    tradingName: string;
    businessEmail: string;
    businessPhone: string;
    website: string;

    addressLine1: string;
    addressLine2: string;
    townCity: string;
    county: string;
    postcode: string;

    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    themeMode: ThemeMode;
    compactMode: boolean;
    currencyCode: CurrencyCode;
    pdfHeaderStyle: PdfHeaderStyle;
    pdfLogoBackground: PdfLogoBackground;
    pdfLogoScale: number;
    pdfShowLogo: boolean;
    pdfShowFooter: boolean;
    pdfShowBusinessDetails: boolean;
    pdfFooterText: string;
    editInactivityMinutes: number;
    editInactiveAction: EditInactiveAction;
    helpEnabled: boolean;
    autoScheduling: AutoSchedulingSettings;
    notCutReasons: string[];

    defaultGrassCutPrice: number;
    defaultHedgeCutPrice: number;
    defaultPressureWashRate: number;
    defaultHourlyRate: number;
    fuelSurcharge: number;
    minimumCharge: number;

    defaultPaymentMethod: PaymentMethod;
    defaultCutType: CutType;
    defaultVisitDay: string;
    defaultVisitFrequencyDays: number;
    defaultRotationWeeks: RotationWeeks;
    grassCutSeasonStart: string;
    grassCutSeasonEnd: string;
    autoCompleteRoutineJobs: boolean;
    requireJobNotes: boolean;
    requireBeforeAfterPhotos: boolean;

    defaultCustomerNotes: string;
    defaultQuoteNotes: string;
    defaultInvoiceNotes: string;
    defaultQuoteTerms: string;
    defaultInvoiceTerms: string;
    quoteServices: QuoteService[];

    quotePrefix: string;
    nextQuoteNumber: number;
    invoicePrefix: string;
    nextInvoiceNumber: number;
    paymentTermsDays: number;
    vatRegistered: boolean;
    vatRate: number;
    bankAccountName: string;
    bankSortCode: string;
    bankAccountNumber: string;
    bankPaymentReference: string;
    stripeConnectedAccountId: string;
    stripeConnectStatus: "not_connected" | "onboarding" | "enabled" | "restricted";
    stripeConnectChargesEnabled: boolean;
    stripeConnectPayoutsEnabled: boolean;
    stripeConnectDetailsSubmitted: boolean;
    stripePaymentLinksEnabled: boolean;
    emailFromName: string;
    emailFromAddress: string;
    emailReplyTo: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUsername: string;
    smtpPassword: string;
    quoteFollowUpMethod: WorkflowMessageMethod;
    quoteFollowUpEmailSubjectTemplate: string;
    quoteFollowUpEmailTemplate: string;
    quoteFollowUpTextTemplate: string;
    invoiceReminderMethod: WorkflowMessageMethod;
    invoiceReminderEmailSubjectTemplate: string;
    invoiceReminderEmailTemplate: string;
    invoiceReminderTextTemplate: string;
    autoSendVisitCompletionTexts: boolean;
    visitCompletionTextTemplate: string;

    showWeatherWidget: boolean;
    showRevenueWidget: boolean;
    showJobsWidget: boolean;
    showUnpaidWidget: boolean;
    showRecentActivityWidget: boolean;

    publicLiabilityInsurance: string;
    termsAndConditionsUrl: string;
};

type Props = {
    initialSettings?: Partial<SettingsData>;
    accountEmail?: string | null;
    showGrowthSettings?: boolean;
    exportData?: RoundHqDataExportRecords;
    onImportData?: (payload: RoundHqFullDataExport) => Promise<void> | void;
    onSave?: (settings: SettingsData) => Promise<void> | void;
    workspaceName?: string;
    aiReceptionistSettings?: AiReceptionistSettings | null;
    aiReceptionistCallHistory?: {
        items: AiReceptionistCallHistoryItem[];
        schemaReady: boolean;
        schemaError?: string;
    } | null;
    canManageAiReceptionistSettings?: boolean;
};

export type RoundHqDataExportRecords = {
    customers: Customer[];
    quotes: Quote[];
    invoices: Invoice[];
    payments: MonthlyPayment[];
    visits: VisitLog[];
    scheduledJobs: ScheduledJob[];
    scheduledJobChecklists: Record<string, unknown>;
    recurringInvoiceTemplates: RecurringInvoiceTemplate[];
    commercialRamsDocuments: CommercialRamsDocument[];
    customerLeads: CustomerLead[];
    staffMembers: StaffMember[];
    rolePermissions: RolePermission[];
    expenseSuppliers: ExpenseSupplier[];
    expenseProducts: ExpenseProduct[];
    expenses: ExpenseRecord[];
    quoteFollowUps: Record<string, QuoteFollowUpState>;
    invoiceReminders: Record<string, InvoiceReminderState>;
    quoteHistory: Record<string, DocumentHistoryEntry[]>;
    invoiceHistory: Record<string, DocumentHistoryEntry[]>;
    routeChangeHistory: RouteChangeRecord[];
    routeNotes: Record<string, string>;
    schedulingRecommendations: unknown[];
    schedulingAuditLogs: unknown[];
    lockedRounds: Record<string, boolean>;
    activeRoundCycles: Record<string, number>;
    pendingCashPaymentDates: Record<string, string>;
    ignoredMoveSuggestionIds: string[];
    selectedWeek: string;
    selectedDay: string;
    quotesTableInitialized: boolean;
    invoicesWriteFallbackActive: boolean;
    recurringInvoiceTemplatesFallbackActive: boolean;
};

export type RoundHqFullDataExport = {
    app: "RoundHQ";
    exportType: "full-data";
    version: 1;
    exportedAt: string;
    accountEmail: string | null;
    counts: {
        customers: number;
        quotes: number;
        invoices: number;
        payments: number;
        visits: number;
        jobs: number;
        staff: number;
        expenses: number;
        totalRecords: number;
    };
    settings: SettingsData;
    data: RoundHqDataExportRecords;
};

const STORAGE_KEY = "roundhq_settings";
const HELP_ENABLED_STORAGE_KEY = "roundhq_help_enabled";

const emptyExportRecords: RoundHqDataExportRecords = {
    customers: [],
    quotes: [],
    invoices: [],
    payments: [],
    visits: [],
    scheduledJobs: [],
    scheduledJobChecklists: {},
    recurringInvoiceTemplates: [],
    commercialRamsDocuments: [],
    customerLeads: [],
    staffMembers: [],
    rolePermissions: [],
    expenseSuppliers: [],
    expenseProducts: [],
    expenses: [],
    quoteFollowUps: {},
    invoiceReminders: {},
    quoteHistory: {},
    invoiceHistory: {},
    routeChangeHistory: [],
    routeNotes: {},
    schedulingRecommendations: [],
    schedulingAuditLogs: [],
    lockedRounds: {},
    activeRoundCycles: {},
    pendingCashPaymentDates: {},
    ignoredMoveSuggestionIds: [],
    selectedWeek: "Week 1",
    selectedDay: "Monday",
    quotesTableInitialized: false,
    invoicesWriteFallbackActive: false,
    recurringInvoiceTemplatesFallbackActive: false,
};

const visitDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];
const workflowMessageMethodOptions: WorkflowMessageMethod[] = ["email"];
const MAX_LOGO_UPLOAD_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_LOGO_UPLOAD_WIDTH = 1200;
const MAX_LOGO_UPLOAD_HEIGHT = 800;
const LOGO_UPLOAD_JPEG_QUALITY = 0.86;

const defaultSettings: SettingsData = {
    businessName: "Your Business",
    tradingName: "",
    businessEmail: "",
    businessPhone: "",
    website: "",

    addressLine1: "",
    addressLine2: "",
    townCity: "East Kilbride",
    county: "",
    postcode: "",

    logoUrl: "",
    primaryColor: "#10b981",
    secondaryColor: "#0f172a",
    themeMode: "light",
    compactMode: false,
    currencyCode: DEFAULT_CURRENCY_CODE,
    pdfHeaderStyle: "banner",
    pdfLogoBackground: "none",
    pdfLogoScale: 100,
    pdfShowLogo: true,
    pdfShowFooter: true,
    pdfShowBusinessDetails: true,
    pdfFooterText: "",
    editInactivityMinutes: 5,
    editInactiveAction: "notify",
    helpEnabled: true,
    autoScheduling: DEFAULT_AUTO_SCHEDULING_SETTINGS,
    notCutReasons: [...DEFAULT_NOT_CUT_REASONS],

    defaultGrassCutPrice: 15,
    defaultHedgeCutPrice: 40,
    defaultPressureWashRate: 60,
    defaultHourlyRate: 35,
    fuelSurcharge: 0,
    minimumCharge: 15,

    defaultPaymentMethod: "bank_transfer",
    defaultCutType: "front_back",
    defaultVisitDay: "Monday",
    defaultVisitFrequencyDays: 14,
    defaultRotationWeeks: DEFAULT_ROTATION_WEEKS,
    grassCutSeasonStart: DEFAULT_GRASS_CUT_SEASON_START,
    grassCutSeasonEnd: DEFAULT_GRASS_CUT_SEASON_END,
    autoCompleteRoutineJobs: true,
    requireJobNotes: false,
    requireBeforeAfterPhotos: false,

    defaultCustomerNotes: "",
    defaultQuoteNotes: "",
    defaultInvoiceNotes: "Thank you for your business.",
    defaultQuoteTerms:
        "Quotes are valid for 30 days. Any additional work requested may be charged separately.",
    defaultInvoiceTerms:
        "Payment is due within 7 days unless agreed otherwise in writing.",
    quoteServices: [],

    quotePrefix: "Q",
    nextQuoteNumber: 1,
    invoicePrefix: "CC",
    nextInvoiceNumber: 1001,
    paymentTermsDays: 7,
    vatRegistered: false,
    vatRate: 20,
    bankAccountName: "",
    bankSortCode: "",
    bankAccountNumber: "",
    bankPaymentReference: "",
    stripeConnectedAccountId: "",
    stripeConnectStatus: "not_connected",
    stripeConnectChargesEnabled: false,
    stripeConnectPayoutsEnabled: false,
    stripeConnectDetailsSubmitted: false,
    stripePaymentLinksEnabled: false,
    emailFromName: "",
    emailFromAddress: "",
    emailReplyTo: "",
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUsername: "",
    smtpPassword: "",
    quoteFollowUpMethod: "email",
    quoteFollowUpEmailSubjectTemplate:
        "Following up on quote {{documentNumber}} from {{businessName}}",
    quoteFollowUpEmailTemplate: [
        "Hi {{customerName}},",
        "",
        "Just following up on quote {{documentNumber}} from {{businessName}}.",
        "Quote total: {{total}}",
        "Sent on: {{quoteDate}}",
        "",
        "Please let me know if you would like to go ahead or if you have any questions.",
        "",
        "Kind regards,",
        "{{businessName}}",
    ].join("\n"),
    quoteFollowUpTextTemplate:
        "Hi {{customerName}}, just following up on quote {{documentNumber}} from {{businessName}}. Quote total: {{total}}. Let me know if you would like to go ahead or if you have any questions.",
    invoiceReminderMethod: "email",
    invoiceReminderEmailSubjectTemplate:
        "Reminder: invoice {{documentNumber}} from {{businessName}} is overdue",
    invoiceReminderEmailTemplate: [
        "Hi {{customerName}},",
        "",
        "This is a reminder that invoice {{documentNumber}} from {{businessName}} is still outstanding.",
        "Invoice total: {{total}}",
        "Due date: {{dueDate}}",
        "Days overdue: {{daysOverdue}}",
        "",
        "Please let me know once payment has been made.",
        "",
        "Kind regards,",
        "{{businessName}}",
    ].join("\n"),
    invoiceReminderTextTemplate:
        "Hi {{customerName}}, this is a reminder that invoice {{documentNumber}} from {{businessName}} is overdue. Total: {{total}}. Due date: {{dueDate}}. Please let me know once payment has been made.",
    autoSendVisitCompletionTexts: false,
    visitCompletionTextTemplate:
        "Hi {{customerName}}, your service visit has been completed today. Payment due: {{amount}}. {{paymentDetails}} Reference: {{paymentReference}}. Thanks, {{businessName}}",

    showWeatherWidget: true,
    showRevenueWidget: true,
    showJobsWidget: true,
    showUnpaidWidget: true,
    showRecentActivityWidget: true,

    publicLiabilityInsurance: "£1,000,000",
    termsAndConditionsUrl: "",
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function getQuoteServiceKey(service: Pick<QuoteService, "title" | "category" | "itemType">) {
    return `${service.category.trim().toLowerCase()}|${service.itemType}|${service.title
        .trim()
        .toLowerCase()}`;
}

function buildQuoteServiceId(
    service: Pick<QuoteService, "title" | "category" | "itemType">
) {
    const normalizedKey = getQuoteServiceKey(service)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return normalizedKey ? `item-${normalizedKey}` : "item-untitled";
}

function getQuoteServiceId(
    value: unknown,
    service: Pick<QuoteService, "title" | "category" | "itemType">
) {
    return typeof value === "string" && value.trim()
        ? value.trim()
        : buildQuoteServiceId(service);
}

function getQuoteServiceProfit(service: QuoteService) {
    if (service.itemType !== "product") {
        return 0;
    }

    return Number(service.price ?? 0) - Number(service.buyPrice ?? 0);
}

function normalizeQuoteServices(value: unknown): QuoteService[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const seenServices = new Set<string>();
    const normalized: QuoteService[] = [];

    value.forEach((entry) => {
        if (typeof entry === "string") {
            const title = entry.trim();
            const nextService: QuoteService = {
                id: buildQuoteServiceId({
                    title,
                    category: "",
                    itemType: "service",
                }),
                title,
                category: "",
                itemType: "service",
                price: 0,
                buyPrice: 0,
            };
            const key = getQuoteServiceKey(nextService);

            if (!title || seenServices.has(key)) {
                return;
            }

            seenServices.add(key);
            normalized.push(nextService);
            return;
        }

        if (!isRecord(entry) || typeof entry.title !== "string") {
            return;
        }

        const title = entry.title.trim();
        const category =
            typeof entry.category === "string" ? entry.category.trim() : "";
        const itemType: QuoteServiceType =
            entry.itemType === "product" ? "product" : "service";
        const nextService = {
            id: getQuoteServiceId(entry.id, {
                title,
                category,
                itemType,
            }),
            title,
            category,
            itemType,
        };
        const key = getQuoteServiceKey(nextService);

        if (!title || seenServices.has(key)) {
            return;
        }

        const numericPrice =
            typeof entry.price === "number"
                ? entry.price
                : Number(entry.price ?? 0);
        const numericBuyPrice =
            typeof entry.buyPrice === "number"
                ? entry.buyPrice
                : Number(entry.buyPrice ?? 0);

        seenServices.add(key);
        normalized.push({
            id: nextService.id,
            title,
            category,
            itemType,
            price: Number.isFinite(numericPrice) ? numericPrice : 0,
            buyPrice:
                itemType === "product" && Number.isFinite(numericBuyPrice)
                    ? numericBuyPrice
                    : 0,
        });
    });

    return normalized;
}

function normalizeTextOptions(value: unknown, fallback: readonly string[]) {
    const source = Array.isArray(value) ? value : fallback;
    const normalized = Array.from(
        new Map(
            source
                .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
                .filter(Boolean)
                .map((entry) => [entry.toLowerCase(), entry])
        ).values()
    );

    return normalized.length ? normalized : [...fallback];
}

function normalizePdfHeaderStyle(value: unknown): PdfHeaderStyle {
    return value === "letterhead" ? "letterhead" : "banner";
}

function normalizePdfLogoBackground(value: unknown): PdfLogoBackground {
    return value === "dark" || value === "light" ? value : "none";
}

function normalizePdfLogoScale(value: unknown) {
    const numericValue = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(numericValue)) {
        return 100;
    }

    return Math.min(160, Math.max(60, Math.round(numericValue)));
}

function normalizeStripeConnectStatus(
    value: unknown
): SettingsData["stripeConnectStatus"] {
    return value === "onboarding" || value === "enabled" || value === "restricted"
        ? value
        : "not_connected";
}

function getStripeConnectStatusLabel(settings: SettingsData) {
    if (!settings.stripeConnectedAccountId) {
        return "Not connected";
    }

    if (settings.stripeConnectStatus === "enabled") {
        return "Ready for payments";
    }

    if (settings.stripeConnectStatus === "restricted") {
        return "Needs attention";
    }

    return "Setup in progress";
}

function getStripeConnectStatusClasses(settings: SettingsData) {
    if (settings.stripeConnectStatus === "enabled") {
        return "bg-emerald-100 text-emerald-700";
    }

    if (settings.stripeConnectStatus === "restricted") {
        return "bg-amber-100 text-amber-700";
    }

    return "bg-slate-100 text-slate-700";
}

function getServerStripeSettings(settings: SettingsData): Pick<
    SettingsData,
    | "stripeConnectedAccountId"
    | "stripeConnectStatus"
    | "stripeConnectChargesEnabled"
    | "stripeConnectPayoutsEnabled"
    | "stripeConnectDetailsSubmitted"
    | "stripePaymentLinksEnabled"
> {
    return {
        stripeConnectedAccountId: settings.stripeConnectedAccountId,
        stripeConnectStatus: settings.stripeConnectStatus,
        stripeConnectChargesEnabled: settings.stripeConnectChargesEnabled,
        stripeConnectPayoutsEnabled: settings.stripeConnectPayoutsEnabled,
        stripeConnectDetailsSubmitted: settings.stripeConnectDetailsSubmitted,
        stripePaymentLinksEnabled: settings.stripePaymentLinksEnabled,
    };
}

function Card({
                  title,
                  description,
                  icon: Icon,
                  children,
                  dataTour,
              }: {
    title: string;
    description?: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    dataTour?: string;
}) {
    return (
        <section
            data-tour={dataTour}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
            <div className="border-b border-slate-100 p-5">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2">
                        <Icon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                        {description ? (
                            <p className="mt-1 text-sm text-slate-500">{description}</p>
                        ) : null}
                    </div>
                </div>
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

function Field({
                   label,
                   hint,
                   children,
               }: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
            {children}
            {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
        </label>
    );
}

function Input(
    props: React.InputHTMLAttributes<HTMLInputElement>
) {
    return (
        <input
            {...props}
            className={cn(
                "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition",
                "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100",
                props.className
            )}
        />
    );
}

function Textarea(
    props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
    return (
        <textarea
            {...props}
            className={cn(
                "min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition",
                "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100",
                props.className
            )}
        />
    );
}

function Select(
    props: React.SelectHTMLAttributes<HTMLSelectElement>
) {
    return (
        <select
            {...props}
            className={cn(
                "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition",
                "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100",
                props.className
            )}
        />
    );
}

function Toggle({
                    checked,
                    onChange,
                    label,
                    description,
                    dataTour,
                    disabled = false,
                }: {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description?: string;
    dataTour?: string;
    disabled?: boolean;
}) {
    return (
        <div
            data-tour={dataTour}
            className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4"
        >
            <div className="pr-4">
                <p className="text-sm font-medium text-slate-800">{label}</p>
                {description ? (
                    <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                ) : null}
            </div>

            <button
                type="button"
                onClick={() => onChange(!checked)}
                disabled={disabled}
                className={cn(
                    "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
                    checked ? "bg-emerald-600" : "bg-slate-300"
                )}
                aria-pressed={checked}
            >
        <span
            className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
                checked ? "left-5" : "left-0.5"
            )}
        />
            </button>
        </div>
    );
}

function NumberInput({
                         value,
                         onChange,
                         step = "0.01",
                         min = "0",
                         disabled,
                     }: {
    value: number;
    onChange: (value: number) => void;
    step?: string;
    min?: string;
    disabled?: boolean;
}) {
    return (
        <Input
            type="number"
            min={min}
            step={step}
            disabled={disabled}
            value={Number.isFinite(value) ? value : 0}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
    );
}

function getPreviewDocumentTitle(type: PdfPreviewDocumentType) {
    if (type === "invoice") return "Invoice";
    if (type === "rams") return "RAMS";
    return "Quote";
}

function DocumentPdfPreview({
                                settings,
                                documentType,
                            }: {
    settings: SettingsData;
    documentType: PdfPreviewDocumentType;
}) {
    const brandName =
        settings.tradingName.trim() || settings.businessName.trim() || "Your Business";
    const documentTitle = getPreviewDocumentTitle(documentType);
    const isBanner = settings.pdfHeaderStyle === "banner";
    const logoScale = settings.pdfLogoScale / 100;
    const logoBackgroundClass =
        settings.pdfLogoBackground === "dark"
            ? "bg-slate-950/80"
            : settings.pdfLogoBackground === "light"
              ? "bg-white"
              : "";
    const logoFrameClass = cn(
        "flex min-h-10 min-w-28 max-w-[58%] items-center justify-center rounded-md px-2 py-1",
        logoBackgroundClass
    );
    const metaLabel =
        documentType === "invoice"
            ? "Due in 7 days"
            : documentType === "rams"
              ? "Risk assessment"
              : "Valid for 30 days";

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
            <div className="mx-auto aspect-[1/1.414] max-w-[360px] overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-slate-200">
                <div className="flex h-full flex-col">
                    <div
                        className={cn(
                            "flex items-center justify-between gap-4 px-5 py-4",
                            isBanner ? "text-white" : "border-b border-slate-200 bg-white"
                        )}
                        style={isBanner ? { backgroundColor: settings.secondaryColor } : undefined}
                    >
                        <div className={logoFrameClass}>
                            {settings.pdfShowLogo && settings.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={settings.logoUrl}
                                    alt="Document logo preview"
                                    className="max-h-11 max-w-full object-contain"
                                    style={{
                                        maxHeight: `${44 * logoScale}px`,
                                        maxWidth: `${170 * logoScale}px`,
                                    }}
                                />
                            ) : (
                                <p
                                    className={cn(
                                        "truncate text-sm font-black uppercase tracking-normal",
                                        isBanner ? "text-white" : "text-slate-950"
                                    )}
                                >
                                    {brandName}
                                </p>
                            )}
                        </div>

                        <div className="text-right">
                            <p
                                className={cn(
                                    "text-xl font-black uppercase tracking-normal",
                                    isBanner ? "text-white" : "text-slate-950"
                                )}
                            >
                                {documentTitle}
                            </p>
                            <p
                                className={cn(
                                    "mt-1 text-[10px] font-semibold",
                                    isBanner ? "text-white/75" : "text-slate-500"
                                )}
                            >
                                {documentType === "invoice"
                                    ? "INV-1001"
                                    : documentType === "rams"
                                      ? "RAMS-001"
                                      : "Q-001"}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 px-5 py-4">
                        <div className="rounded-lg border border-slate-200 p-3">
                            <p className="text-[9px] font-bold uppercase text-slate-400">
                                Prepared for
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-950">
                                Example Customer
                            </p>
                            <p className="mt-1 text-[10px] leading-4 text-slate-500">
                                12 Oak Road
                                <br />
                                East Kilbride
                            </p>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-3">
                            <p className="text-[9px] font-bold uppercase text-slate-400">
                                Details
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-950">
                                {metaLabel}
                            </p>
                            <p className="mt-1 text-[10px] leading-4 text-slate-500">
                                {brandName}
                                <br />
                                {settings.businessEmail || "mail@roundhq.co.uk"}
                            </p>
                        </div>
                    </div>

                    <div className="mx-5 overflow-hidden rounded-lg border border-slate-200">
                        <div
                            className="grid grid-cols-[1fr_54px] px-3 py-2 text-[9px] font-bold uppercase text-white"
                            style={{ backgroundColor: settings.secondaryColor }}
                        >
                            <span>Description</span>
                            <span className="text-right">Total</span>
                        </div>
                        {[
                            ["Scheduled service", "85.00"],
                            [
                                documentType === "rams"
                                    ? "Site controls and method statement"
                                    : "Materials",
                                documentType === "rams" ? "Included" : "35.00",
                            ],
                        ].map(([label, value]) => (
                            <div
                                key={label}
                                className="grid grid-cols-[1fr_54px] border-t border-slate-100 px-3 py-2 text-[10px]"
                            >
                                <span className="text-slate-700">{label}</span>
                                <span className="text-right font-bold text-slate-950">
                                    {value}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto px-5 pb-4">
                        <div className="ml-auto w-28 rounded-lg p-3 text-right text-white" style={{ backgroundColor: settings.secondaryColor }}>
                            <p className="text-[9px] font-bold uppercase opacity-80">
                                {documentType === "rams" ? "Status" : "Total"}
                            </p>
                            <p className="text-lg font-black">
                                {documentType === "rams" ? "Ready" : "£120"}
                            </p>
                        </div>

                        {settings.pdfShowFooter ? (
                            <div className="mt-4 border-t pt-2" style={{ borderColor: settings.primaryColor }}>
                                <p className="truncate text-[9px] text-slate-500">
                                    {[
                                        settings.pdfFooterText.trim(),
                                        settings.pdfShowBusinessDetails
                                            ? [
                                                  brandName,
                                                  settings.businessPhone.trim(),
                                                  settings.businessEmail.trim(),
                                              ]
                                                  .filter(Boolean)
                                                  .join(" | ")
                                            : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" | ") || "Page 1 of 1"}
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

function TabButton({
                       active,
                       onClick,
                       dataTour,
                       children,
                   }: {
    active: boolean;
    onClick: () => void;
    dataTour?: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            data-tour={dataTour}
            className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-medium transition",
                active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100"
            )}
        >
            {children}
        </button>
    );
}

const settingsTabs: SettingsTab[] = [
    "account",
    "business",
    "documents",
    "pricing",
    "jobs",
    "quotes",
    "invoices",
    "email",
    "dashboard",
    "ai-receptionist",
    "data",
];

function normalizeSettingsTab(value: string | null, allowAiReceptionist: boolean): SettingsTab {
    if (value === "ai-receptionist" && !allowAiReceptionist) {
        return "business";
    }

    return settingsTabs.includes(value as SettingsTab)
        ? (value as SettingsTab)
        : "business";
}

function safeMergeSettings(source?: Partial<SettingsData> | null): SettingsData {
    const quoteFollowUpMethod = "email";
    const invoiceReminderMethod = "email";

    return {
        ...defaultSettings,
        ...(source || {}),
        defaultRotationWeeks: normalizeRotationWeeks(source?.defaultRotationWeeks),
        currencyCode: normalizeCurrencyCode(source?.currencyCode),
        pdfHeaderStyle: normalizePdfHeaderStyle(source?.pdfHeaderStyle),
        pdfLogoBackground: normalizePdfLogoBackground(source?.pdfLogoBackground),
        pdfLogoScale: normalizePdfLogoScale(source?.pdfLogoScale),
        pdfShowLogo: source?.pdfShowLogo !== false,
        pdfShowFooter: source?.pdfShowFooter !== false,
        pdfShowBusinessDetails: source?.pdfShowBusinessDetails !== false,
        pdfFooterText:
            typeof source?.pdfFooterText === "string" ? source.pdfFooterText : "",
        editInactivityMinutes: normalizeEditInactiveMinutes(
            source?.editInactivityMinutes
        ),
        editInactiveAction: normalizeEditInactiveAction(source?.editInactiveAction),
        helpEnabled: source?.helpEnabled !== false,
        autoScheduling: normalizeAutoSchedulingSettings(source?.autoScheduling),
        notCutReasons: normalizeTextOptions(
            source?.notCutReasons,
            defaultSettings.notCutReasons
        ),
        stripeConnectedAccountId:
            typeof source?.stripeConnectedAccountId === "string"
                ? source.stripeConnectedAccountId
                : "",
        stripeConnectStatus: normalizeStripeConnectStatus(source?.stripeConnectStatus),
        stripeConnectChargesEnabled: source?.stripeConnectChargesEnabled === true,
        stripeConnectPayoutsEnabled: source?.stripeConnectPayoutsEnabled === true,
        stripeConnectDetailsSubmitted: source?.stripeConnectDetailsSubmitted === true,
        stripePaymentLinksEnabled: source?.stripePaymentLinksEnabled === true,
        quoteFollowUpMethod,
        invoiceReminderMethod,
        quoteServices: normalizeQuoteServices(source?.quoteServices),
    };
}

function getResolvedExportRecords(
    exportData?: RoundHqDataExportRecords
): RoundHqDataExportRecords {
    return exportData ?? emptyExportRecords;
}

function readImportArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

function readImportRecord<T>(value: unknown): Record<string, T> {
    return isRecord(value) ? (value as Record<string, T>) : {};
}

function readImportStringArray(value: unknown) {
    return Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string")
        : [];
}

function normalizeImportedFullDataRecords(value: unknown): RoundHqDataExportRecords {
    const data = isRecord(value) ? value : {};

    return {
        customers: readImportArray<Customer>(data.customers),
        quotes: readImportArray<Quote>(data.quotes),
        invoices: readImportArray<Invoice>(data.invoices),
        payments: readImportArray<MonthlyPayment>(data.payments),
        visits: readImportArray<VisitLog>(data.visits),
        scheduledJobs: readImportArray<ScheduledJob>(data.scheduledJobs),
        scheduledJobChecklists: readImportRecord<unknown>(
            data.scheduledJobChecklists
        ),
        recurringInvoiceTemplates: readImportArray<RecurringInvoiceTemplate>(
            data.recurringInvoiceTemplates
        ),
        commercialRamsDocuments: readImportArray<CommercialRamsDocument>(
            data.commercialRamsDocuments
        ),
        customerLeads: readImportArray<CustomerLead>(data.customerLeads),
        staffMembers: readImportArray<StaffMember>(data.staffMembers),
        rolePermissions: readImportArray<RolePermission>(data.rolePermissions),
        expenseSuppliers: readImportArray<ExpenseSupplier>(data.expenseSuppliers),
        expenseProducts: readImportArray<ExpenseProduct>(data.expenseProducts),
        expenses: readImportArray<ExpenseRecord>(data.expenses),
        quoteFollowUps: readImportRecord<QuoteFollowUpState>(data.quoteFollowUps),
        invoiceReminders: readImportRecord<InvoiceReminderState>(
            data.invoiceReminders
        ),
        quoteHistory: readImportRecord<DocumentHistoryEntry[]>(data.quoteHistory),
        invoiceHistory: readImportRecord<DocumentHistoryEntry[]>(
            data.invoiceHistory
        ),
        routeChangeHistory: readImportArray<RouteChangeRecord>(
            data.routeChangeHistory
        ),
        routeNotes: readImportRecord<string>(data.routeNotes),
        schedulingRecommendations: readImportArray<unknown>(
            data.schedulingRecommendations
        ),
        schedulingAuditLogs: readImportArray<unknown>(data.schedulingAuditLogs),
        lockedRounds: readImportRecord<boolean>(data.lockedRounds),
        activeRoundCycles: readImportRecord<number>(data.activeRoundCycles),
        pendingCashPaymentDates: readImportRecord<string>(
            data.pendingCashPaymentDates
        ),
        ignoredMoveSuggestionIds: readImportStringArray(
            data.ignoredMoveSuggestionIds
        ),
        selectedWeek:
            typeof data.selectedWeek === "string" ? data.selectedWeek : "Week 1",
        selectedDay: typeof data.selectedDay === "string" ? data.selectedDay : "Monday",
        quotesTableInitialized: Boolean(data.quotesTableInitialized),
        invoicesWriteFallbackActive: Boolean(data.invoicesWriteFallbackActive),
        recurringInvoiceTemplatesFallbackActive: Boolean(
            data.recurringInvoiceTemplatesFallbackActive
        ),
    };
}

function parseFullDataImportPayload(value: unknown): RoundHqFullDataExport {
    if (!isRecord(value) || value.exportType !== "full-data" || !isRecord(value.data)) {
        throw new Error("Choose a RoundHQ full data export JSON file.");
    }

    const data = normalizeImportedFullDataRecords(value.data);
    const settings = safeMergeSettings(
        isRecord(value.settings)
            ? (value.settings as Partial<SettingsData>)
            : undefined
    );

    return {
        app: "RoundHQ",
        exportType: "full-data",
        version: 1,
        exportedAt:
            typeof value.exportedAt === "string" && value.exportedAt.trim()
                ? value.exportedAt
                : new Date().toISOString(),
        accountEmail:
            typeof value.accountEmail === "string" && value.accountEmail.trim()
                ? value.accountEmail
                : null,
        counts: getFullDataExportCounts(data),
        settings,
        data,
    };
}

function countRecordEntries<T>(records: Record<string, T[]>) {
    return Object.values(records).reduce(
        (total, entries) => total + (Array.isArray(entries) ? entries.length : 0),
        0
    );
}

function getFullDataExportCounts(records: RoundHqDataExportRecords) {
    const staff = records.staffMembers.length + records.rolePermissions.length;
    const expenses =
        records.expenses.length +
        records.expenseProducts.length +
        records.expenseSuppliers.length;
    const routeData =
        records.routeChangeHistory.length +
        Object.keys(records.routeNotes).length +
        Object.keys(records.lockedRounds).length +
        Object.keys(records.activeRoundCycles).length;
    const workflowData =
        records.recurringInvoiceTemplates.length +
        records.commercialRamsDocuments.length +
        records.customerLeads.length +
        records.schedulingRecommendations.length +
        records.schedulingAuditLogs.length +
        Object.keys(records.quoteFollowUps).length +
        Object.keys(records.invoiceReminders).length +
        countRecordEntries(records.quoteHistory) +
        countRecordEntries(records.invoiceHistory) +
        Object.keys(records.pendingCashPaymentDates).length;
    const totalRecords =
        records.customers.length +
        records.quotes.length +
        records.invoices.length +
        records.payments.length +
        records.visits.length +
        records.scheduledJobs.length +
        staff +
        expenses +
        routeData +
        workflowData;

    return {
        customers: records.customers.length,
        quotes: records.quotes.length,
        invoices: records.invoices.length,
        payments: records.payments.length,
        visits: records.visits.length,
        jobs: records.scheduledJobs.length,
        staff,
        expenses,
        totalRecords,
    };
}

function downloadJson(filename: string, data: unknown) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

function getExportDateStamp() {
    return new Date().toISOString().slice(0, 10);
}

function getBoundedLogoDimensions(width: number, height: number) {
    if (width <= 0 || height <= 0) {
        return { width: 1, height: 1 };
    }

    const scale = Math.min(
        1,
        MAX_LOGO_UPLOAD_WIDTH / width,
        MAX_LOGO_UPLOAD_HEIGHT / height
    );

    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
}

function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            resolve(result);
        };
        reader.onerror = () => reject(new Error("Unable to read the logo image."));
        reader.readAsDataURL(file);
    });
}

function loadImageFromObjectUrl(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Unable to load the logo image."));
        image.src = url;
    });
}

function canvasHasTransparentPixels(
    context: CanvasRenderingContext2D,
    width: number,
    height: number
) {
    try {
        const pixels = context.getImageData(0, 0, width, height).data;

        for (let index = 3; index < pixels.length; index += 4) {
            if (pixels[index] < 245) {
                return true;
            }
        }
    } catch {
        return false;
    }

    return false;
}

async function optimizeLogoFileForStorage(file: File) {
    if (!file.type.startsWith("image/")) {
        throw new Error("Choose an image file for your logo.");
    }

    if (file.size > MAX_LOGO_UPLOAD_SOURCE_BYTES) {
        throw new Error("Choose a logo image under 10MB.");
    }

    if (file.type === "image/svg+xml") {
        return readFileAsDataUrl(file);
    }

    const objectUrl = URL.createObjectURL(file);

    try {
        const image = await loadImageFromObjectUrl(objectUrl);
        const dimensions = getBoundedLogoDimensions(
            image.naturalWidth || image.width,
            image.naturalHeight || image.height
        );
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Unable to optimise the logo image.");
        }

        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

        const outputType = canvasHasTransparentPixels(
            context,
            dimensions.width,
            dimensions.height
        )
            ? "image/png"
            : "image/jpeg";

        return canvas.toDataURL(outputType, LOGO_UPLOAD_JPEG_QUALITY);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export default function SettingsPage({
                                         initialSettings,
                                         accountEmail,
                                         showGrowthSettings = true,
                                         exportData,
                                         onImportData,
                                         onSave,
                                         workspaceName,
                                         aiReceptionistSettings,
                                         aiReceptionistCallHistory,
                                         canManageAiReceptionistSettings = false,
                                     }: Props) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const importInputRef = useRef<HTMLInputElement | null>(null);
    const fullDataImportInputRef = useRef<HTMLInputElement | null>(null);

    const mergedSettings = useMemo(
        () => safeMergeSettings(initialSettings),
        [initialSettings]
    );

    const [settings, setSettings] = useState<SettingsData>(mergedSettings);
    const [activeTab, setActiveTab] = useState<SettingsTab>("business");
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error" | "info">(
        "info"
    );
    const [newQuoteServiceTitle, setNewQuoteServiceTitle] = useState("");
    const [selectedQuoteServiceCategory, setSelectedQuoteServiceCategory] = useState("");
    const [newQuoteServiceCategory, setNewQuoteServiceCategory] = useState("");
    const [newQuoteServiceIsProduct, setNewQuoteServiceIsProduct] = useState(false);
    const [newQuoteServicePrice, setNewQuoteServicePrice] = useState("0");
    const [newQuoteServiceBuyPrice, setNewQuoteServiceBuyPrice] = useState("0");
    const [newSchedulingCategory, setNewSchedulingCategory] = useState("");
    const [newNotCutReason, setNewNotCutReason] = useState("");
    const [testEmailRecipient, setTestEmailRecipient] = useState("");
    const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
    const [documentPreviewType, setDocumentPreviewType] =
        useState<PdfPreviewDocumentType>("quote");
    const [accountEmailDraft, setAccountEmailDraft] = useState(accountEmail ?? "");
    const [isUpdatingAccountEmail, setIsUpdatingAccountEmail] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [isOpeningBillingPortal, setIsOpeningBillingPortal] = useState(false);
    const [isConnectingStripe, setIsConnectingStripe] = useState(false);
    const [isRefreshingStripe, setIsRefreshingStripe] = useState(false);
    const [isOpeningStripeDashboard, setIsOpeningStripeDashboard] = useState(false);
    const [isImportingAllData, setIsImportingAllData] = useState(false);
    const quoteServiceCategories = useMemo(
        () =>
            Array.from(
                new Set(
                    settings.quoteServices
                        .map((service) => service.category.trim())
                        .filter(Boolean)
                )
            ).sort((left, right) => left.localeCompare(right)),
        [settings.quoteServices]
    );
    const resolvedExportData = useMemo(
        () => getResolvedExportRecords(exportData),
        [exportData]
    );
    const fullDataExportCounts = useMemo(
        () => getFullDataExportCounts(resolvedExportData),
        [resolvedExportData]
    );
    const showAiReceptionistSettings = canManageAiReceptionistSettings;

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty("--brand-primary", settings.primaryColor);
        root.style.setProperty("--brand-secondary", settings.secondaryColor);
    }, [settings.primaryColor, settings.secondaryColor]);

    useEffect(() => {
        setSettings(mergedSettings);
    }, [mergedSettings]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        setActiveTab(
            normalizeSettingsTab(
                params.get("tab"),
                showAiReceptionistSettings
            )
        );
    }, [showAiReceptionistSettings]);

    useEffect(() => {
        setAccountEmailDraft(accountEmail ?? "");
    }, [accountEmail]);

    useEffect(() => {
        setSelectedQuoteServiceCategory((current) =>
            current && quoteServiceCategories.includes(current) ? current : ""
        );
    }, [quoteServiceCategories]);

    useEffect(() => {
        setTestEmailRecipient((current) => {
            if (current.trim()) {
                return current;
            }

            return (
                settings.businessEmail ||
                settings.emailFromAddress ||
                settings.smtpUsername ||
                ""
            );
        });
    }, [
        settings.businessEmail,
        settings.emailFromAddress,
        settings.smtpUsername,
    ]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Partial<SettingsData>;
            const merged = safeMergeSettings(parsed);
            const storedHelpEnabled = localStorage.getItem(HELP_ENABLED_STORAGE_KEY);
            const serverStripeSettings = getServerStripeSettings(mergedSettings);
            const nextSettings =
                storedHelpEnabled === "true" || storedHelpEnabled === "false"
                    ? { ...merged, helpEnabled: storedHelpEnabled === "true" }
                    : merged;

            setSettings({ ...nextSettings, ...serverStripeSettings });
        } catch (error) {
            console.error("Failed to load local settings:", error);
        }
    }, [mergedSettings]);

    function showMessage(text: string, type: "success" | "error" | "info" = "info") {
        setMessage(text);
        setMessageType(type);
    }

    function update<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
        setSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    function handleSettingsTabChange(nextTab: SettingsTab) {
        setActiveTab(nextTab);

        if (typeof window === "undefined") {
            return;
        }

        const url = new URL(window.location.href);

        if (nextTab === "business") {
            url.searchParams.delete("tab");
        } else {
            url.searchParams.set("tab", nextTab);
        }

        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }

    function updateAutoScheduling(
        value: Partial<AutoSchedulingSettings>
    ) {
        setSettings((prev) => ({
            ...prev,
            autoScheduling: normalizeAutoSchedulingSettings({
                ...prev.autoScheduling,
                ...value,
            }),
        }));
    }

    function updateSchedulingDayHours(
        day: (typeof SCHEDULING_DAY_NAMES)[number],
        value: Partial<AutoSchedulingSettings["workingHours"][typeof day]>
    ) {
        updateAutoScheduling({
            workingHours: {
                ...settings.autoScheduling.workingHours,
                [day]: {
                    ...settings.autoScheduling.workingHours[day],
                    ...value,
                },
            },
        });
    }

    function addUnavailableWindow() {
        const nextWindow: SchedulingUnavailableWindow = {
            id: crypto.randomUUID(),
            day: "Monday",
            start: "12:00",
            end: "13:00",
            label: "Break",
        };

        updateAutoScheduling({
            unavailableWindows: [
                ...settings.autoScheduling.unavailableWindows,
                nextWindow,
            ],
        });
    }

    function updateUnavailableWindow(
        id: string,
        value: Partial<SchedulingUnavailableWindow>
    ) {
        updateAutoScheduling({
            unavailableWindows: settings.autoScheduling.unavailableWindows.map((window) =>
                window.id === id ? { ...window, ...value } : window
            ),
        });
    }

    function removeUnavailableWindow(id: string) {
        updateAutoScheduling({
            unavailableWindows: settings.autoScheduling.unavailableWindows.filter(
                (window) => window.id !== id
            ),
        });
    }

    function addSchedulingCategory() {
        const nextCategory = newSchedulingCategory.trim();

        if (!nextCategory) {
            return;
        }

        updateAutoScheduling({
            workCategories: normalizeTextOptions(
                [...settings.autoScheduling.workCategories, nextCategory],
                settings.autoScheduling.workCategories
            ),
        });
        setNewSchedulingCategory("");
    }

    function removeSchedulingCategory(categoryToRemove: string) {
        if (settings.autoScheduling.workCategories.length <= 1) {
            return;
        }

        updateAutoScheduling({
            workCategories: settings.autoScheduling.workCategories.filter(
                (category) =>
                    category.trim().toLowerCase() !==
                    categoryToRemove.trim().toLowerCase()
            ),
        });
    }

    function addNotCutReason() {
        const nextReason = newNotCutReason.trim();

        if (!nextReason) {
            return;
        }

        update(
            "notCutReasons",
            normalizeTextOptions([...settings.notCutReasons, nextReason], settings.notCutReasons)
        );
        setNewNotCutReason("");
    }

    function removeNotCutReason(reasonToRemove: string) {
        if (settings.notCutReasons.length <= 1) {
            return;
        }

        update(
            "notCutReasons",
            settings.notCutReasons.filter(
                (reason) =>
                    reason.trim().toLowerCase() !== reasonToRemove.trim().toLowerCase()
            )
        );
    }

    function addQuoteService() {
        const nextTitle = newQuoteServiceTitle.trim();
        const nextCategory = (
            selectedQuoteServiceCategory || newQuoteServiceCategory
        ).trim();
        const nextItemType: QuoteServiceType = newQuoteServiceIsProduct
            ? "product"
            : "service";
        const nextPrice = Number(newQuoteServicePrice || 0);
        const nextBuyPrice = Number(newQuoteServiceBuyPrice || 0);

        if (!nextTitle) return;

        const nextService = {
            id: buildQuoteServiceId({
                title: nextTitle,
                category: nextCategory,
                itemType: nextItemType,
            }),
            title: nextTitle,
            category: nextCategory,
            itemType: nextItemType,
            price: Number.isFinite(nextPrice) ? nextPrice : 0,
            buyPrice:
                nextItemType === "product" && Number.isFinite(nextBuyPrice)
                    ? nextBuyPrice
                    : 0,
        };
        const existingIndex = settings.quoteServices.findIndex(
            (service) => getQuoteServiceKey(service) === getQuoteServiceKey(nextService)
        );
        const nextSettings: SettingsData = {
            ...settings,
            quoteServices:
                existingIndex >= 0
                    ? settings.quoteServices.map((service, index) =>
                          index === existingIndex ? nextService : service
                      )
                    : [...settings.quoteServices, nextService],
        };

        setNewQuoteServiceTitle("");
        setSelectedQuoteServiceCategory(nextCategory);
        setNewQuoteServiceCategory("");
        setNewQuoteServiceIsProduct(false);
        setNewQuoteServicePrice("0");
        setNewQuoteServiceBuyPrice("0");
        void persistSettings(nextSettings, "Quote item saved.");
    }

    function removeQuoteService(serviceToRemove: QuoteService) {
        const nextSettings: SettingsData = {
            ...settings,
            quoteServices: settings.quoteServices.filter(
                (service) =>
                    getQuoteServiceKey(service) !== getQuoteServiceKey(serviceToRemove)
            ),
        };
        void persistSettings(nextSettings, "Quote item removed.");
    }

    function saveLocally(nextSettings: SettingsData) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
        localStorage.setItem(
            HELP_ENABLED_STORAGE_KEY,
            nextSettings.helpEnabled ? "true" : "false"
        );
    }

    async function persistSettings(
        nextSettings: SettingsData,
        successText = "Settings saved successfully."
    ) {
        try {
            setIsSaving(true);
            setMessage("");
            setSettings(nextSettings);

            saveLocally(nextSettings);

            if (onSave) {
                await onSave(nextSettings);
            }

            showMessage(successText, "success");
        } catch (error) {
            console.error("Failed to save settings:", error);
            showMessage("Failed to save settings.", "error");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSave() {
        await persistSettings(settings);
    }

    async function handleSendTestEmail() {
        const recipient = testEmailRecipient.trim();

        if (!recipient) {
            showMessage("Enter an email address to send the test email to.", "error");
            return;
        }

        try {
            setIsSendingTestEmail(true);
            setMessage("");

            const response = await fetch("/api/send-test-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    recipient,
                    subject: "RoundHQ test email",
                    message: [
                        "This is a test email from RoundHQ.",
                        "",
                        "Your SMTP settings are working and the website can send emails directly.",
                        "",
                        `Sent at: ${new Date().toLocaleString()}`,
                    ].join("\n"),
                    settings: {
                        emailFromName: settings.emailFromName,
                        emailFromAddress: settings.emailFromAddress,
                        emailReplyTo: settings.emailReplyTo,
                        smtpHost: settings.smtpHost,
                        smtpPort: settings.smtpPort,
                        smtpSecure: settings.smtpSecure,
                        smtpUsername: settings.smtpUsername,
                        smtpPassword: settings.smtpPassword,
                    },
                }),
            });

            const body = (await response.json().catch(() => null)) as
                | { error?: string }
                | null;

            if (!response.ok) {
                throw new Error(body?.error || "Unable to send the test email.");
            }

            showMessage(`Test email sent to ${recipient}.`, "success");
        } catch (error) {
            console.error("Failed to send test email:", error);
            showMessage(
                error instanceof Error && error.message.trim()
                    ? error.message
                    : "Unable to send the test email.",
                "error"
            );
        } finally {
            setIsSendingTestEmail(false);
        }
    }

    async function handleUpdateAccountEmail() {
        const nextEmail = accountEmailDraft.trim();

        if (!nextEmail) {
            showMessage("Enter the new account email address.", "error");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
            showMessage("Enter a valid account email address.", "error");
            return;
        }

        try {
            setIsUpdatingAccountEmail(true);
            setMessage("");

            const supabase = createSupabaseClient();
            const { error } = await supabase.auth.updateUser({ email: nextEmail });

            if (error) {
                throw error;
            }

            showMessage(
                "Email change requested. Check the new email address to confirm the change.",
                "success"
            );
        } catch (error) {
            console.error("Failed to update account email:", error);
            showMessage(
                error instanceof Error && error.message.trim()
                    ? error.message
                    : "Unable to update the account email address.",
                "error"
            );
        } finally {
            setIsUpdatingAccountEmail(false);
        }
    }

    async function handleUpdatePassword() {
        if (newPassword.length < 8) {
            showMessage("Use a password with at least 8 characters.", "error");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showMessage("The new passwords do not match.", "error");
            return;
        }

        try {
            setIsUpdatingPassword(true);
            setMessage("");

            const supabase = createSupabaseClient();
            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) {
                throw error;
            }

            setNewPassword("");
            setConfirmNewPassword("");
            showMessage("Password updated successfully.", "success");
        } catch (error) {
            console.error("Failed to update password:", error);
            showMessage(
                error instanceof Error && error.message.trim()
                    ? error.message
                    : "Unable to update the account password.",
                "error"
            );
        } finally {
            setIsUpdatingPassword(false);
        }
    }

    async function handleOpenBillingPortal() {
        try {
            setIsOpeningBillingPortal(true);
            setMessage("");

            const response = await fetch("/api/billing/portal", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ returnPath: "/dashboard" }),
            });
            const body = (await response.json().catch(() => null)) as
                | { url?: string; error?: string }
                | null;

            if (!response.ok || !body?.url) {
                throw new Error(body?.error || "Unable to open subscription settings.");
            }

            window.location.href = body.url;
        } catch (error) {
            console.error("Failed to open billing portal:", error);
            showMessage(
                error instanceof Error && error.message.trim()
                    ? error.message
                    : "Unable to open subscription settings.",
                "error"
            );
            setIsOpeningBillingPortal(false);
        }
    }

    function applyStripeConnectStatus(body: {
        connectedAccountId?: string | null;
        status?: string | null;
        chargesEnabled?: boolean | null;
        payoutsEnabled?: boolean | null;
        detailsSubmitted?: boolean | null;
        paymentLinksEnabled?: boolean | null;
    }) {
        setSettings((prev) => {
            const nextSettings: SettingsData = {
                ...prev,
                stripeConnectedAccountId: body.connectedAccountId ?? "",
                stripeConnectStatus: normalizeStripeConnectStatus(body.status),
                stripeConnectChargesEnabled: body.chargesEnabled === true,
                stripeConnectPayoutsEnabled: body.payoutsEnabled === true,
                stripeConnectDetailsSubmitted: body.detailsSubmitted === true,
                stripePaymentLinksEnabled: body.paymentLinksEnabled === true,
            };

            saveLocally(nextSettings);
            return nextSettings;
        });
    }

    async function handleStripeOnboarding() {
        try {
            setIsConnectingStripe(true);
            setMessage("");

            const response = await fetch("/api/stripe/connect/onboarding", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const body = (await response.json().catch(() => null)) as
                | {
                      url?: string;
                      connectedAccountId?: string | null;
                      status?: string | null;
                      chargesEnabled?: boolean | null;
                      payoutsEnabled?: boolean | null;
                      detailsSubmitted?: boolean | null;
                      paymentLinksEnabled?: boolean | null;
                      connectSetupRequired?: boolean;
                      setupUrl?: string;
                      error?: string;
                  }
                | null;

            if (!response.ok || !body?.url) {
                showMessage(
                    body?.error || "Unable to start Stripe setup.",
                    "error"
                );
                setIsConnectingStripe(false);
                return;
            }

            applyStripeConnectStatus(body);
            window.location.href = body.url;
        } catch (error) {
            showMessage(
                error instanceof Error && error.message.trim()
                    ? error.message
                    : "Unable to start Stripe setup.",
                "error"
            );
            setIsConnectingStripe(false);
        }
    }

    async function handleRefreshStripeStatus() {
        try {
            setIsRefreshingStripe(true);
            setMessage("");

            const response = await fetch("/api/stripe/connect/status", {
                method: "GET",
            });
            const body = (await response.json().catch(() => null)) as
                | {
                      connectedAccountId?: string | null;
                      status?: string | null;
                      chargesEnabled?: boolean | null;
                      payoutsEnabled?: boolean | null;
                      detailsSubmitted?: boolean | null;
                      paymentLinksEnabled?: boolean | null;
                      error?: string;
                  }
                | null;

            if (!response.ok || !body) {
                throw new Error(body?.error || "Unable to refresh Stripe status.");
            }

            applyStripeConnectStatus(body);
            showMessage("Stripe status refreshed.", "success");
        } catch (error) {
            console.error("Failed to refresh Stripe status:", error);
            showMessage(
                error instanceof Error && error.message.trim()
                    ? error.message
                    : "Unable to refresh Stripe status.",
                "error"
            );
        } finally {
            setIsRefreshingStripe(false);
        }
    }

    async function handleOpenStripeDashboard() {
        try {
            setIsOpeningStripeDashboard(true);
            setMessage("");

            const response = await fetch("/api/stripe/connect/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const body = (await response.json().catch(() => null)) as
                | { url?: string; error?: string }
                | null;

            if (!response.ok || !body?.url) {
                throw new Error(body?.error || "Unable to open Stripe dashboard.");
            }

            window.location.href = body.url;
        } catch (error) {
            console.error("Failed to open Stripe dashboard:", error);
            showMessage(
                error instanceof Error && error.message.trim()
                    ? error.message
                    : "Unable to open Stripe dashboard.",
                "error"
            );
            setIsOpeningStripeDashboard(false);
        }
    }

    function handleResetChanges() {
        setSettings(mergedSettings);
        showMessage("Unsaved changes reset.", "info");
    }

    function handleResetAllToDefaults() {
        const confirmed = window.confirm(
            "Reset all settings to defaults? This will overwrite your saved settings."
        );
        if (!confirmed) return;

        setSettings(defaultSettings);
        saveLocally(defaultSettings);
        showMessage("All settings reset to defaults.", "success");
    }

    function handleExport() {
        downloadJson("roundhq-settings.json", settings);

        showMessage("Settings exported.", "success");
    }

    function handleExportAllData() {
        const payload: RoundHqFullDataExport = {
            app: "RoundHQ",
            exportType: "full-data",
            version: 1,
            exportedAt: new Date().toISOString(),
            accountEmail: accountEmailDraft.trim() || accountEmail || null,
            counts: fullDataExportCounts,
            settings,
            data: resolvedExportData,
        };

        downloadJson(`roundhq-all-data-${getExportDateStamp()}.json`, payload);
        showMessage(
            `All data exported (${fullDataExportCounts.totalRecords.toLocaleString()} records).`,
            "success"
        );
    }

    function handleImportAllData(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) {
            return;
        }

        if (!onImportData) {
            showMessage("Full data import is not available in this workspace.", "error");
            return;
        }

        const reader = new FileReader();

        reader.onload = async () => {
            try {
                const raw = typeof reader.result === "string" ? reader.result : "{}";
                const parsed = parseFullDataImportPayload(JSON.parse(raw));
                const confirmed = window.confirm(
                    `Import ${parsed.counts.totalRecords.toLocaleString()} records from this backup? This will replace the current workspace data.`
                );

                if (!confirmed) {
                    showMessage("Full data import cancelled.", "info");
                    return;
                }

                setIsImportingAllData(true);
                setMessage("");
                await onImportData(parsed);
                setSettings(parsed.settings);
                saveLocally(parsed.settings);
                showMessage(
                    `All data imported (${parsed.counts.totalRecords.toLocaleString()} records).`,
                    "success"
                );
            } catch (error) {
                console.error("Full data import failed:", error);
                showMessage(
                    error instanceof Error && error.message.trim()
                        ? error.message
                        : "Import failed. The JSON file was invalid.",
                    "error"
                );
            } finally {
                setIsImportingAllData(false);
            }
        };

        reader.readAsText(file);
    }

    async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file) return;

        try {
            const result = await optimizeLogoFileForStorage(file);
            update("logoUrl", result);
            showMessage("Logo uploaded and optimised locally.", "success");
        } catch (error) {
            console.error("Logo upload failed:", error);
            showMessage(
                error instanceof Error && error.message.trim()
                    ? error.message
                    : "Unable to upload the logo image.",
                "error"
            );
        } finally {
            input.value = "";
        }
    }

    function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const raw = typeof reader.result === "string" ? reader.result : "{}";
                const parsed = JSON.parse(raw) as Partial<SettingsData>;
                const merged = safeMergeSettings(parsed);
                setSettings(merged);
                saveLocally(merged);
                showMessage("Settings imported successfully.", "success");
            } catch (error) {
                console.error("Invalid settings import:", error);
                showMessage("Import failed. The JSON file was invalid.", "error");
            }
        };
        reader.readAsText(file);
    }

    const stripeConnectReady =
        settings.stripeConnectStatus === "enabled" &&
        settings.stripeConnectChargesEnabled;
    const stripeStatusLabel = getStripeConnectStatusLabel(settings);
    const stripeActionLabel = settings.stripeConnectedAccountId
        ? "Continue Stripe setup"
        : "Connect Stripe";

    return (
        <div className="min-h-full bg-slate-50 p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <div
                    data-tour="settings-overview"
                    className="overflow-hidden rounded-3xl shadow-sm"
                    style={{
                        background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
                    }}
                >
                    <div className="flex flex-col gap-5 p-6 text-white lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold md:text-3xl">Settings</h1>
                            <p className="mt-2 max-w-2xl text-sm text-white/90">
                                Manage your account, PDF branding, pricing, defaults, quotes, invoices, email sending, widgets, and data tools.
                            </p>
                        </div>

                        {activeTab !== "ai-receptionist" ? (
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handleResetChanges}
                                    data-tour="settings-reset-button"
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Reset changes
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    data-tour="settings-save-button"
                                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    style={{ color: settings.primaryColor }}
                                >
                                    <Save className="h-4 w-4" />
                                    {isSaving ? "Saving..." : "Save settings"}
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>

                {message ? (
                    <div
                        className={cn(
                            "rounded-xl px-4 py-3 text-sm",
                            messageType === "success" &&
                            "border border-emerald-200 bg-emerald-50 text-emerald-800",
                            messageType === "error" &&
                            "border border-red-200 bg-red-50 text-red-800",
                            messageType === "info" &&
                            "border border-blue-200 bg-blue-50 text-blue-800"
                        )}
                    >
                        {message}
                    </div>
                ) : null}

                <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-2">
                    <TabButton active={activeTab === "account"} onClick={() => handleSettingsTabChange("account")} dataTour="settings-tab-account">
                        Account
                    </TabButton>
                    <TabButton active={activeTab === "business"} onClick={() => handleSettingsTabChange("business")} dataTour="settings-tab-business">
                        Business
                    </TabButton>
                    <TabButton active={activeTab === "documents"} onClick={() => handleSettingsTabChange("documents")} dataTour="settings-tab-documents">
                        PDFs
                    </TabButton>
                    <TabButton active={activeTab === "pricing"} onClick={() => handleSettingsTabChange("pricing")} dataTour="settings-tab-pricing">
                        Pricing
                    </TabButton>
                    <TabButton active={activeTab === "jobs"} onClick={() => handleSettingsTabChange("jobs")} dataTour="settings-tab-jobs">
                        Jobs
                    </TabButton>
                    <TabButton active={activeTab === "quotes"} onClick={() => handleSettingsTabChange("quotes")} dataTour="settings-tab-quotes">
                        Quotes
                    </TabButton>
                    <TabButton active={activeTab === "invoices"} onClick={() => handleSettingsTabChange("invoices")} dataTour="settings-tab-invoices">
                        Invoices
                    </TabButton>
                    <TabButton active={activeTab === "email"} onClick={() => handleSettingsTabChange("email")} dataTour="settings-tab-email">
                        Email
                    </TabButton>
                    <TabButton active={activeTab === "dashboard"} onClick={() => handleSettingsTabChange("dashboard")} dataTour="settings-tab-dashboard">
                        Dashboard
                    </TabButton>
                    {showAiReceptionistSettings ? (
                        <TabButton active={activeTab === "ai-receptionist"} onClick={() => handleSettingsTabChange("ai-receptionist")} dataTour="settings-tab-ai-receptionist">
                            <span className="inline-flex items-center gap-2">
                                <Bot className="h-4 w-4" />
                                AI Receptionist
                            </span>
                        </TabButton>
                    ) : null}
                    <TabButton active={activeTab === "data"} onClick={() => handleSettingsTabChange("data")} dataTour="settings-tab-data">
                        Data
                    </TabButton>
                </div>

                {activeTab === "account" && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card
                            title="Account email"
                            description="Change the email address used to sign in to RoundHQ."
                            icon={UserCircle}
                            dataTour="settings-account-email"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <Field
                                    label="Current email"
                                    hint="Changing this may require confirmation from the new email address before it takes effect."
                                >
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            className="pl-10"
                                            type="email"
                                            value={accountEmailDraft}
                                            onChange={(event) =>
                                                setAccountEmailDraft(event.target.value)
                                            }
                                            placeholder="you@example.co.uk"
                                        />
                                    </div>
                                </Field>

                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            Sign-in email
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            This updates the login address for this account, not the
                                            business email shown on quotes and invoices.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleUpdateAccountEmail}
                                        disabled={isUpdatingAccountEmail}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Mail className="h-4 w-4" />
                                        {isUpdatingAccountEmail ? "Updating..." : "Update email"}
                                    </button>
                                </div>
                            </div>
                        </Card>

                        <Card
                            title="Password"
                            description="Set a new password for your RoundHQ login."
                            icon={KeyRound}
                            dataTour="settings-account-password"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <Field label="New password">
                                    <Input
                                        type="password"
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={(event) => setNewPassword(event.target.value)}
                                        placeholder="At least 8 characters"
                                    />
                                </Field>

                                <Field label="Confirm new password">
                                    <Input
                                        type="password"
                                        autoComplete="new-password"
                                        value={confirmNewPassword}
                                        onChange={(event) =>
                                            setConfirmNewPassword(event.target.value)
                                        }
                                        placeholder="Repeat the new password"
                                    />
                                </Field>

                                <button
                                    type="button"
                                    onClick={handleUpdatePassword}
                                    disabled={isUpdatingPassword}
                                    className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <KeyRound className="h-4 w-4" />
                                    {isUpdatingPassword ? "Updating..." : "Change password"}
                                </button>
                            </div>
                        </Card>

                        <div className="xl:col-span-2">
                            <Card
                                title="Subscription"
                                description="Open your secure billing portal to manage or cancel the workspace subscription."
                                icon={CreditCard}
                                dataTour="settings-account-subscription"
                            >
                                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            Manage subscription
                                        </p>
                                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                                            Update billing details, view subscription settings, or
                                            cancel the plan through the secure Stripe customer portal.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleOpenBillingPortal}
                                        disabled={isOpeningBillingPortal}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <CreditCard className="h-4 w-4" />
                                        {isOpeningBillingPortal
                                            ? "Opening..."
                                            : "Manage or cancel subscription"}
                                    </button>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === "business" && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card
                            title="Business details"
                            description="Main business identity and contact information."
                            icon={Building2}
                            dataTour="business-settings-section"
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Business name">
                                    <Input
                                        value={settings.businessName}
                                        onChange={(e) => update("businessName", e.target.value)}
                                    />
                                </Field>

                                <Field label="Trading name">
                                    <Input
                                        value={settings.tradingName}
                                        onChange={(e) => update("tradingName", e.target.value)}
                                    />
                                </Field>

                                <Field label="Business email">
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            className="pl-10"
                                            type="email"
                                            value={settings.businessEmail}
                                            onChange={(e) => update("businessEmail", e.target.value)}
                                        />
                                    </div>
                                </Field>

                                <Field label="Business phone">
                                    <div className="relative">
                                        <Phone className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            className="pl-10"
                                            value={settings.businessPhone}
                                            onChange={(e) => update("businessPhone", e.target.value)}
                                        />
                                    </div>
                                </Field>

                                <Field label="Website">
                                    <div className="relative">
                                        <Globe className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            className="pl-10"
                                            value={settings.website}
                                            onChange={(e) => update("website", e.target.value)}
                                        />
                                    </div>
                                </Field>

                                <Field label="Public liability insurance">
                                    <Input
                                        value={settings.publicLiabilityInsurance}
                                        onChange={(e) =>
                                            update("publicLiabilityInsurance", e.target.value)
                                        }
                                    />
                                </Field>
                            </div>
                        </Card>

                        <Card
                            title="Business address"
                            description="Shown on documents and business records."
                            icon={MapPin}
                            dataTour="settings-business-address-section"
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Address line 1">
                                    <Input
                                        value={settings.addressLine1}
                                        onChange={(e) => update("addressLine1", e.target.value)}
                                    />
                                </Field>

                                <Field label="Address line 2">
                                    <Input
                                        value={settings.addressLine2}
                                        onChange={(e) => update("addressLine2", e.target.value)}
                                    />
                                </Field>

                                <Field label="Town / City">
                                    <Input
                                        value={settings.townCity}
                                        onChange={(e) => update("townCity", e.target.value)}
                                    />
                                </Field>

                                <Field label="County">
                                    <Input
                                        value={settings.county}
                                        onChange={(e) => update("county", e.target.value)}
                                    />
                                </Field>

                                <Field label="Postcode">
                                    <Input
                                        value={settings.postcode}
                                        onChange={(e) => update("postcode", e.target.value)}
                                    />
                                </Field>

                                <Field label="Terms & conditions URL">
                                    <Input
                                        value={settings.termsAndConditionsUrl}
                                        onChange={(e) =>
                                            update("termsAndConditionsUrl", e.target.value)
                                        }
                                    />
                                </Field>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === "documents" && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                        <div className="space-y-6">
                        <Card
                            title="Logo and colours"
                            description="These brand assets are used across the app and generated PDFs."
                            icon={Palette}
                            dataTour="settings-branding-section"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <Field label="Logo">
                                    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center">
                                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                            {settings.logoUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={settings.logoUrl}
                                                    alt="Logo preview"
                                                    className="h-full w-full object-contain"
                                                />
                                            ) : (
                                                <ImageIcon className="h-8 w-8 text-slate-400" />
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                            >
                                                <Upload className="h-4 w-4" />
                                                Upload logo
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => update("logoUrl", "")}
                                                className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </Field>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field label="Primary colour">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={settings.primaryColor}
                                                onChange={(e) => update("primaryColor", e.target.value)}
                                                className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                                            />
                                            <Input
                                                value={settings.primaryColor}
                                                onChange={(e) => update("primaryColor", e.target.value)}
                                            />
                                        </div>
                                    </Field>

                                    <Field
                                        label="Header and total colour"
                                        hint="This colour is used for the PDF header and Total box."
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={settings.secondaryColor}
                                                onChange={(e) => update("secondaryColor", e.target.value)}
                                                className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                                            />
                                            <Input
                                                value={settings.secondaryColor}
                                                onChange={(e) => update("secondaryColor", e.target.value)}
                                            />
                                        </div>
                                    </Field>

                                    <Field label="Theme mode">
                                        <Select
                                            value={settings.themeMode}
                                            onChange={(e) =>
                                                update("themeMode", e.target.value as ThemeMode)
                                            }
                                        >
                                            <option value="light">Light</option>
                                            <option value="dark">Dark</option>
                                            <option value="system">System</option>
                                        </Select>
                                    </Field>

                                    <div className="md:col-span-2">
                                        <Toggle
                                            checked={settings.compactMode}
                                            onChange={(value) => update("compactMode", value)}
                                            label="Compact mode"
                                            description="Reduce spacing across cards and tables."
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card
                            title="PDF customisation"
                            description="Control the layout used for quotes, invoices, RAMS documents, and emailed PDF attachments."
                            icon={FileText}
                            dataTour="settings-pdf-customisation-section"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <Field
                                    label="Header layout"
                                    hint="Full banner is best for white or transparent logos. Letterhead keeps the page lighter."
                                >
                                    <Select
                                        value={settings.pdfHeaderStyle}
                                        onChange={(event) =>
                                            update(
                                                "pdfHeaderStyle",
                                                event.target.value as PdfHeaderStyle
                                            )
                                        }
                                    >
                                        <option value="banner">Full-width brand banner</option>
                                        <option value="letterhead">Letterhead with document tile</option>
                                    </Select>
                                </Field>

                                <Field
                                    label="Logo background"
                                    hint="Use a dark background when your uploaded logo is white."
                                >
                                    <Select
                                        value={settings.pdfLogoBackground}
                                        onChange={(event) =>
                                            update(
                                                "pdfLogoBackground",
                                                event.target.value as PdfLogoBackground
                                            )
                                        }
                                    >
                                        <option value="none">No separate logo background</option>
                                        <option value="dark">Dark logo background</option>
                                        <option value="light">Light logo background</option>
                                    </Select>
                                </Field>

                                <Field
                                    label={`Logo size (${settings.pdfLogoScale}%)`}
                                    hint="Adjusts how large the uploaded logo appears on generated PDFs."
                                >
                                    <input
                                        type="range"
                                        min="60"
                                        max="160"
                                        step="5"
                                        value={settings.pdfLogoScale}
                                        onChange={(event) =>
                                            update(
                                                "pdfLogoScale",
                                                normalizePdfLogoScale(event.target.value)
                                            )
                                        }
                                        className="w-full accent-emerald-600"
                                    />
                                </Field>

                                <Toggle
                                    checked={settings.pdfShowLogo}
                                    onChange={(value) => update("pdfShowLogo", value)}
                                    label="Show uploaded logo on PDFs"
                                    description="Turn this off to show the business or trading name instead."
                                />

                                <Toggle
                                    checked={settings.pdfShowFooter}
                                    onChange={(value) => update("pdfShowFooter", value)}
                                    label="Show PDF footer"
                                    description="Adds a footer line and page numbers to generated documents."
                                />

                                <Toggle
                                    checked={settings.pdfShowBusinessDetails}
                                    onChange={(value) =>
                                        update("pdfShowBusinessDetails", value)
                                    }
                                    label="Include business contact details in footer"
                                    description="Shows the business name, phone, email, and website in the PDF footer."
                                />

                                <Field
                                    label="Footer note"
                                    hint="Optional. Appears before your business details in the PDF footer."
                                >
                                    <Input
                                        value={settings.pdfFooterText}
                                        onChange={(event) =>
                                            update("pdfFooterText", event.target.value)
                                        }
                                        placeholder="e.g. Thank you for choosing us"
                                    />
                                </Field>
                            </div>
                        </Card>
                        </div>

                        <Card
                            title="Live document preview"
                            description="Switch between document types to see how the PDF header, logo, colours, and footer will look."
                            icon={Settings2}
                            dataTour="settings-pdf-preview-section"
                        >
                            <div className="mb-4 flex flex-wrap gap-2">
                                {[
                                    ["quote", "Quote"],
                                    ["invoice", "Invoice"],
                                    ["rams", "RAMS"],
                                ].map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() =>
                                            setDocumentPreviewType(
                                                value as PdfPreviewDocumentType
                                            )
                                        }
                                        className={cn(
                                            "rounded-xl px-4 py-2 text-sm font-semibold transition",
                                            documentPreviewType === value
                                                ? "bg-slate-900 text-white"
                                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <DocumentPdfPreview
                                settings={settings}
                                documentType={documentPreviewType}
                            />
                        </Card>
                    </div>
                )}

                {activeTab === "pricing" && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card
                            title="Pricing defaults"
                            description="Used when creating jobs and quotes."
                            icon={CreditCard}
                            dataTour="settings-pricing-defaults-section"
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field
                                    label="Currency"
                                    hint="Used for dashboard totals, quotes, invoices, and payment figures."
                                >
                                    <Select
                                        value={settings.currencyCode}
                                        onChange={(event) =>
                                            update(
                                                "currencyCode",
                                                normalizeCurrencyCode(event.target.value)
                                            )
                                        }
                                    >
                                        {CURRENCY_OPTIONS.map((currency) => (
                                            <option key={currency.code} value={currency.code}>
                                                {currency.code} - {currency.label} ({currency.symbol})
                                            </option>
                                        ))}
                                    </Select>
                                </Field>

                                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                                    <p className="font-semibold">Selected currency</p>
                                    <p className="mt-1 text-emerald-700">
                                        {getCurrencyOption(settings.currencyCode).label} will be used
                                        for money values in the app.
                                    </p>
                                </div>

                                <Field label="Default service price">
                                    <NumberInput
                                        value={settings.defaultGrassCutPrice}
                                        onChange={(value) => update("defaultGrassCutPrice", value)}
                                    />
                                </Field>

                                <Field label="Default hedge trimming price">
                                    <NumberInput
                                        value={settings.defaultHedgeCutPrice}
                                        onChange={(value) => update("defaultHedgeCutPrice", value)}
                                    />
                                </Field>

                                <Field label="Default hourly rate">
                                    <NumberInput
                                        value={settings.defaultHourlyRate}
                                        onChange={(value) => update("defaultHourlyRate", value)}
                                    />
                                </Field>

                                <Field label="Fuel surcharge">
                                    <NumberInput
                                        value={settings.fuelSurcharge}
                                        onChange={(value) => update("fuelSurcharge", value)}
                                    />
                                </Field>

                                <Field label="Minimum charge">
                                    <NumberInput
                                        value={settings.minimumCharge}
                                        onChange={(value) => update("minimumCharge", value)}
                                    />
                                </Field>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === "jobs" && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card
                            title="Default job settings"
                            description="Controls how new customers and jobs are created."
                            icon={Scissors}
                            dataTour="service-defaults-section"
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Default payment method">
                                    <Select
                                        value={settings.defaultPaymentMethod}
                                        onChange={(e) =>
                                            update("defaultPaymentMethod", e.target.value as PaymentMethod)
                                        }
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank transfer</option>
                                        <option value="direct_debit">Direct debit</option>
                                        <option value="invoice">Invoice</option>
                                    </Select>
                                </Field>

                                <Field label="Default service type">
                                    <Select
                                        value={settings.defaultCutType}
                                        onChange={(e) =>
                                            update("defaultCutType", e.target.value as CutType)
                                        }
                                    >
                                        <option value="front_only">Front only</option>
                                        <option value="front_back">Front & back</option>
                                        <option value="full_garden">Full garden</option>
                                    </Select>
                                </Field>

                                <Field label="Default visit day">
                                    <Select
                                        value={settings.defaultVisitDay}
                                        onChange={(e) => update("defaultVisitDay", e.target.value)}
                                    >
                                        {visitDays.map((day) => (
                                            <option key={day} value={day}>
                                                {day}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field label="Default frequency (days)">
                                    <NumberInput
                                        value={settings.defaultVisitFrequencyDays}
                                        onChange={(value) => update("defaultVisitFrequencyDays", value)}
                                        step="1"
                                        min="1"
                                    />
                                </Field>

                                <Field
                                    label="Service season start"
                                    hint="Only the month and day are used, so this repeats every year."
                                >
                                    <Input
                                        type="date"
                                        value={getSeasonDateInputValue(
                                            settings.grassCutSeasonStart,
                                            DEFAULT_GRASS_CUT_SEASON_START
                                        )}
                                        onChange={(e) =>
                                            update(
                                                "grassCutSeasonStart",
                                                normalizeSeasonMonthDay(
                                                    e.target.value,
                                                    DEFAULT_GRASS_CUT_SEASON_START
                                                )
                                            )
                                        }
                                    />
                                </Field>

                                <Field
                                    label="Service season end"
                                    hint="Only the month and day are used, so this repeats every year."
                                >
                                    <Input
                                        type="date"
                                        value={getSeasonDateInputValue(
                                            settings.grassCutSeasonEnd,
                                            DEFAULT_GRASS_CUT_SEASON_END
                                        )}
                                        onChange={(e) =>
                                            update(
                                                "grassCutSeasonEnd",
                                                normalizeSeasonMonthDay(
                                                    e.target.value,
                                                    DEFAULT_GRASS_CUT_SEASON_END
                                                )
                                            )
                                        }
                                    />
                                </Field>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:col-span-2">
                                    If the end date falls earlier in the calendar than the start
                                    date, the season will roll over into the next year.
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 gap-4">
                                    <Toggle
                                        checked={settings.autoCompleteRoutineJobs}
                                        onChange={(value) => update("autoCompleteRoutineJobs", value)}
                                        label="Auto-complete routine jobs"
                                        description="Useful for simple repeat work."
                                    />

                                    <Toggle
                                        checked={settings.requireJobNotes}
                                        onChange={(value) => update("requireJobNotes", value)}
                                        label="Require job notes"
                                        description="Prevent completion without notes."
                                    />

                                    <Toggle
                                        checked={settings.requireBeforeAfterPhotos}
                                        onChange={(value) =>
                                            update("requireBeforeAfterPhotos", value)
                                        }
                                        label="Require before/after photos"
                                        description="Good for pressure washing and transformations."
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card
                            title="Not Cut reasons"
                            description="Customise the reasons shown when a round visit is marked not completed."
                            icon={Scissors}
                        >
                            <div className="space-y-4">
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Input
                                        value={newNotCutReason}
                                        onChange={(event) =>
                                            setNewNotCutReason(event.target.value)
                                        }
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                event.preventDefault();
                                                addNotCutReason();
                                            }
                                        }}
                                        placeholder="e.g. Customer asked to skip"
                                    />
                                    <button
                                        type="button"
                                        onClick={addNotCutReason}
                                        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                                    >
                                        Add reason
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {settings.notCutReasons.map((reason) => (
                                        <span
                                            key={reason}
                                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                                        >
                                            {reason}
                                            <button
                                                type="button"
                                                onClick={() => removeNotCutReason(reason)}
                                                disabled={settings.notCutReasons.length <= 1}
                                                className="text-rose-500 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:text-slate-300"
                                                aria-label={`Remove ${reason}`}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Card>

                        <Card
                            title="Automatic scheduling"
                            description="Suggest or book accepted quotes into your working calendar."
                            icon={CalendarIcon}
                            dataTour="settings-auto-scheduling-section"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <Toggle
                                    checked={settings.autoScheduling.enabled}
                                    onChange={(value) =>
                                        updateAutoScheduling({
                                            enabled: value,
                                            mode: value
                                                ? settings.autoScheduling.mode === "off"
                                                    ? "suggest"
                                                    : settings.autoScheduling.mode
                                                : "off",
                                        })
                                    }
                                    label="Enable quote auto-scheduling"
                                    description="Use estimated time, work type, existing jobs, and postcode grouping when quotes are accepted."
                                />

                                <Field label="Scheduling mode">
                                    <Select
                                        value={settings.autoScheduling.mode}
                                        onChange={(event) =>
                                            updateAutoScheduling({
                                                mode: normalizeSchedulingMode(event.target.value),
                                                enabled: event.target.value !== "off",
                                            })
                                        }
                                    >
                                        <option value="off">Off</option>
                                        <option value="suggest">Suggest slot only</option>
                                        <option value="auto">Auto-schedule after quote acceptance</option>
                                    </Select>
                                </Field>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-semibold text-slate-900">
                                            Work categories
                                        </p>
                                        <p className="text-xs leading-5 text-slate-500">
                                            These appear on quotes as work types and are used to group automatic scheduling.
                                        </p>
                                    </div>

                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                        <Input
                                            value={newSchedulingCategory}
                                            onChange={(event) =>
                                                setNewSchedulingCategory(event.target.value)
                                            }
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                    event.preventDefault();
                                                    addSchedulingCategory();
                                                }
                                            }}
                                            placeholder="e.g. Tree work"
                                        />
                                        <button
                                            type="button"
                                            onClick={addSchedulingCategory}
                                            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                                        >
                                            Add category
                                        </button>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {settings.autoScheduling.workCategories.map((category) => (
                                            <span
                                                key={category}
                                                className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                            >
                                                {category}
                                                <button
                                                    type="button"
                                                    onClick={() => removeSchedulingCategory(category)}
                                                    disabled={
                                                        settings.autoScheduling.workCategories.length <= 1
                                                    }
                                                    className="text-rose-500 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:text-slate-300"
                                                    aria-label={`Remove ${category}`}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                        Working days and hours
                                    </p>
                                    <div className="mt-3 grid grid-cols-1 gap-3">
                                        {SCHEDULING_DAY_NAMES.map((day) => {
                                            const hours = settings.autoScheduling.workingHours[day];

                                            return (
                                                <div
                                                    key={day}
                                                    className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_120px_120px]"
                                                >
                                                    <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={hours.enabled}
                                                            onChange={(event) =>
                                                                updateAutoScheduling({
                                                                    workingDays: event.target.checked
                                                                        ? Array.from(
                                                                            new Set([
                                                                                ...settings.autoScheduling.workingDays,
                                                                                day,
                                                                            ])
                                                                        )
                                                                        : settings.autoScheduling.workingDays.filter(
                                                                            (entry) => entry !== day
                                                                        ),
                                                                    workingHours: {
                                                                        ...settings.autoScheduling.workingHours,
                                                                        [day]: {
                                                                            ...hours,
                                                                            enabled: event.target.checked,
                                                                        },
                                                                    },
                                                                })
                                                            }
                                                            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                                                        />
                                                        {day}
                                                    </label>
                                                    <Input
                                                        type="time"
                                                        value={hours.start}
                                                        onChange={(event) =>
                                                            updateSchedulingDayHours(day, {
                                                                start: event.target.value,
                                                            })
                                                        }
                                                    />
                                                    <Input
                                                        type="time"
                                                        value={hours.end}
                                                        onChange={(event) =>
                                                            updateSchedulingDayHours(day, {
                                                                end: event.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field label="Travel buffer between jobs (minutes)">
                                        <NumberInput
                                            value={settings.autoScheduling.defaultTravelBufferMinutes}
                                            onChange={(value) =>
                                                updateAutoScheduling({
                                                    defaultTravelBufferMinutes: value,
                                                })
                                            }
                                            step="5"
                                            min="0"
                                        />
                                    </Field>

                                    <Field
                                        label="Maximum jobs per day"
                                        hint="Set to 0 for no daily limit."
                                    >
                                        <NumberInput
                                            value={settings.autoScheduling.maxJobsPerDay ?? 0}
                                            onChange={(value) =>
                                                updateAutoScheduling({
                                                    maxJobsPerDay: value > 0 ? value : null,
                                                })
                                            }
                                            step="1"
                                            min="0"
                                        />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field label="Postcode grouping">
                                        <Select
                                            value={settings.autoScheduling.postcodeGrouping}
                                            onChange={(event) =>
                                                updateAutoScheduling({
                                                    postcodeGrouping: event.target.value as AutoSchedulingSettings["postcodeGrouping"],
                                                })
                                            }
                                        >
                                            <option value="none">Do not group by postcode</option>
                                            <option value="outward">Group by outward code</option>
                                            <option value="sector">Group by postcode sector</option>
                                        </Select>
                                    </Field>

                                    <Toggle
                                        checked={settings.autoScheduling.allowServiceRoundDays}
                                        onChange={(value) =>
                                            updateAutoScheduling({
                                                allowServiceRoundDays: value,
                                            })
                                        }
                                        label="Allow quote jobs on service round days"
                                        description="Turn this off to keep one-off quoted work away from recurring round days."
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-slate-900">
                                            Breaks and unavailable time
                                        </p>
                                        <button
                                            type="button"
                                            onClick={addUnavailableWindow}
                                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                                        >
                                            Add break
                                        </button>
                                    </div>

                                    <div className="mt-3 space-y-3">
                                        {settings.autoScheduling.unavailableWindows.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                                                No breaks or unavailable periods set.
                                            </div>
                                        ) : (
                                            settings.autoScheduling.unavailableWindows.map(
                                                (window) => (
                                                    <div
                                                        key={window.id}
                                                        className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_120px_120px_1fr_auto]"
                                                    >
                                                        <Select
                                                            value={window.day}
                                                            onChange={(event) =>
                                                                updateUnavailableWindow(window.id, {
                                                                    day: event.target.value as SchedulingUnavailableWindow["day"],
                                                                })
                                                            }
                                                        >
                                                            {SCHEDULING_DAY_NAMES.map((day) => (
                                                                <option key={day} value={day}>
                                                                    {day}
                                                                </option>
                                                            ))}
                                                        </Select>
                                                        <Input
                                                            type="time"
                                                            value={window.start}
                                                            onChange={(event) =>
                                                                updateUnavailableWindow(window.id, {
                                                                    start: event.target.value,
                                                                })
                                                            }
                                                        />
                                                        <Input
                                                            type="time"
                                                            value={window.end}
                                                            onChange={(event) =>
                                                                updateUnavailableWindow(window.id, {
                                                                    end: event.target.value,
                                                                })
                                                            }
                                                        />
                                                        <Input
                                                            value={window.label ?? ""}
                                                            onChange={(event) =>
                                                                updateUnavailableWindow(window.id, {
                                                                    label: event.target.value,
                                                                })
                                                            }
                                                            placeholder="Break, school run, supplier collection..."
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeUnavailableWindow(window.id)}
                                                            className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                )
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card
                            title="Round settings"
                            description="Choose how your normal service rotation behaves."
                            icon={RotateCcw}
                            dataTour="settings-round-settings-section"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <Field
                                    label="Default service rotation"
                                    hint="This will be used automatically for new customers. You can still change the rotation for individual customers."
                                >
                                    <Select
                                        value={settings.defaultRotationWeeks}
                                        onChange={(e) =>
                                            update(
                                                "defaultRotationWeeks",
                                                normalizeRotationWeeks(e.target.value)
                                            )
                                        }
                                    >
                                        {ROTATION_WEEK_OPTIONS.map((rotationWeeks) => (
                                            <option key={rotationWeeks} value={rotationWeeks}>
                                                {getRotationLabel(rotationWeeks)}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                            </div>
                        </Card>

                        <Card
                            title="Default notes"
                            description="Pre-fill standard text for new customers."
                            icon={FileText}
                            dataTour="settings-default-notes-section"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <Field label="Default customer notes">
                                    <Textarea
                                        value={settings.defaultCustomerNotes}
                                        onChange={(e) => update("defaultCustomerNotes", e.target.value)}
                                    />
                                </Field>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === "quotes" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <Card
                                title="Quote numbering"
                                description="Control the prefix and starting point for new quotes."
                                icon={FileText}
                                dataTour="settings-quote-numbering-section"
                            >
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field label="Quote prefix">
                                        <Input
                                            value={settings.quotePrefix}
                                            onChange={(e) => update("quotePrefix", e.target.value)}
                                            placeholder="e.g. Q"
                                        />
                                    </Field>

                                    <Field label="Next quote number">
                                        <NumberInput
                                            value={settings.nextQuoteNumber}
                                            onChange={(value) => update("nextQuoteNumber", value)}
                                            step="1"
                                            min="1"
                                        />
                                    </Field>
                                </div>
                            </Card>

                            <Card
                                title="Quote defaults"
                                description="Standard text and calculator defaults used when creating new quotes."
                                icon={FileText}
                                dataTour="settings-quote-defaults-section"
                            >
                                <div className="grid grid-cols-1 gap-4">
                                    <Field
                                        label={`Pressure wash rate (${settings.currencyCode} per m2)`}
                                        hint="Used by the pressure wash calculator on the Create Quote page."
                                    >
                                        <NumberInput
                                            value={settings.defaultPressureWashRate}
                                            onChange={(value) => update("defaultPressureWashRate", value)}
                                        />
                                    </Field>

                                    <Field label="Default quote notes">
                                        <Textarea
                                            value={settings.defaultQuoteNotes}
                                            onChange={(e) => update("defaultQuoteNotes", e.target.value)}
                                            placeholder="Add your usual scope notes, exclusions, or service wording."
                                        />
                                    </Field>

                                    <Field label="Default quote terms">
                                        <Textarea
                                            value={settings.defaultQuoteTerms}
                                            onChange={(e) => update("defaultQuoteTerms", e.target.value)}
                                            placeholder="Add quote validity, acceptance terms, or booking wording."
                                        />
                                    </Field>
                                </div>
                            </Card>
                        </div>

                        <Card
                            title="Reusable quote items"
                            description="Save common services and products so you can add them quickly in the quote form."
                            icon={Settings2}
                            dataTour="settings-quote-items-section"
                        >
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <Field label="Item title">
                                        <Input
                                            value={newQuoteServiceTitle}
                                            onChange={(e) => setNewQuoteServiceTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    addQuoteService();
                                                }
                                            }}
                                            placeholder="e.g. Gutter cleaning"
                                        />
                                    </Field>

                                    <Field label="Category" hint="Pick an existing category or create a new one.">
                                        <Select
                                            value={selectedQuoteServiceCategory}
                                            onChange={(e) => setSelectedQuoteServiceCategory(e.target.value)}
                                        >
                                            <option value="">
                                                {quoteServiceCategories.length > 0
                                                    ? "Create new / uncategorised"
                                                    : "New / uncategorised"}
                                            </option>
                                            {quoteServiceCategories.map((category) => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            ))}
                                        </Select>
                                    </Field>
                                </div>

                                {selectedQuoteServiceCategory === "" ? (
                                    <Field
                                        label="New category name"
                                        hint="Leave blank if this item should stay uncategorised."
                                    >
                                        <Input
                                            value={newQuoteServiceCategory}
                                            onChange={(e) => setNewQuoteServiceCategory(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    addQuoteService();
                                                }
                                            }}
                                            placeholder="e.g. Exterior cleaning"
                                        />
                                    </Field>
                                ) : null}

                                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={newQuoteServiceIsProduct}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setNewQuoteServiceIsProduct(checked);
                                                if (!checked) {
                                                    setNewQuoteServiceBuyPrice("0");
                                                }
                                            }}
                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">
                                                This item is a product
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                Turn this on for stocked products so you can save a buy price and track profit.
                                            </p>
                                        </div>
                                    </label>

                                    <div
                                        className={cn(
                                            "grid grid-cols-1 gap-3",
                                            newQuoteServiceIsProduct
                                                ? "md:grid-cols-[1fr_1fr_0.9fr_auto]"
                                                : "md:grid-cols-[1fr_0.9fr_auto]"
                                        )}
                                    >
                                        <Field label="Sell price">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={newQuoteServicePrice}
                                                onChange={(e) => setNewQuoteServicePrice(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        addQuoteService();
                                                    }
                                                }}
                                                placeholder="Price"
                                            />
                                        </Field>

                                        {newQuoteServiceIsProduct ? (
                                            <Field label="Buy price">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={newQuoteServiceBuyPrice}
                                                    onChange={(e) => setNewQuoteServiceBuyPrice(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            addQuoteService();
                                                        }
                                                    }}
                                                    placeholder="Buy price"
                                                />
                                            </Field>
                                        ) : null}

                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                                Profit
                                            </p>
                                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                                {newQuoteServiceIsProduct
                                                    ? `£${(
                                                          Number(newQuoteServicePrice || 0) -
                                                          Number(newQuoteServiceBuyPrice || 0)
                                                      ).toFixed(2)}`
                                                    : "Service item"}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {newQuoteServiceIsProduct
                                                    ? "Sell price minus buy price."
                                                    : "Services use the saved sell price only."}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={addQuoteService}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 md:self-end"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Item
                                        </button>
                                    </div>

                                    {settings.quoteServices.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                                            No reusable quote items added yet.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {settings.quoteServices.map((service) => (
                                                <div
                                                    key={getQuoteServiceKey(service)}
                                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                                                >
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-sm font-medium text-slate-800">
                                                                {service.title}
                                                            </p>
                                                            {service.category ? (
                                                                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                                                                    {service.category}
                                                                </span>
                                                            ) : null}
                                                            <span
                                                                className={cn(
                                                                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
                                                                    service.itemType === "product"
                                                                        ? "bg-amber-100 text-amber-800"
                                                                        : "bg-emerald-100 text-emerald-800"
                                                                )}
                                                            >
                                                                {service.itemType}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            Sell price:{" "}
                                                            {formatCurrencyAmount(
                                                                service.price,
                                                                settings.currencyCode
                                                            )}
                                                        </p>
                                                        {service.itemType === "product" ? (
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                Buy price:{" "}
                                                                {formatCurrencyAmount(
                                                                    service.buyPrice,
                                                                    settings.currencyCode
                                                                )}{" "}
                                                                | Profit:{" "}
                                                                {formatCurrencyAmount(
                                                                    getQuoteServiceProfit(service),
                                                                    settings.currencyCode
                                                                )}
                                                            </p>
                                                        ) : null}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeQuoteService(service)}
                                                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === "invoices" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <Card
                                title="Invoice settings"
                                description="Invoice numbering, VAT, and payment terms."
                                icon={Receipt}
                                dataTour="settings-invoice-settings-section"
                            >
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field label="Invoice prefix">
                                        <Input
                                            value={settings.invoicePrefix}
                                            onChange={(e) => update("invoicePrefix", e.target.value)}
                                        />
                                    </Field>

                                    <Field label="Next invoice number">
                                        <NumberInput
                                            value={settings.nextInvoiceNumber}
                                            onChange={(value) => update("nextInvoiceNumber", value)}
                                            step="1"
                                            min="1"
                                        />
                                    </Field>

                                    <Field label="Payment terms (days)">
                                        <NumberInput
                                            value={settings.paymentTermsDays}
                                            onChange={(value) => update("paymentTermsDays", value)}
                                            step="1"
                                            min="0"
                                        />
                                    </Field>

                                    <Field label="VAT rate (%)">
                                        <NumberInput
                                            value={settings.vatRate}
                                            onChange={(value) => update("vatRate", value)}
                                            disabled={!settings.vatRegistered}
                                        />
                                    </Field>

                                    <div className="md:col-span-2">
                                        <Toggle
                                            checked={settings.vatRegistered}
                                            onChange={(value) => update("vatRegistered", value)}
                                            label="VAT registered"
                                            description="Enable VAT calculations on invoices."
                                        />
                                    </div>
                                </div>
                            </Card>

                            <div className="space-y-6">
                                <Card
                                    title="Document text"
                                    description="Default wording for invoices."
                                    icon={FileText}
                                    dataTour="settings-invoice-text-section"
                                >
                                    <div className="grid grid-cols-1 gap-4">
                                        <Field label="Default invoice notes">
                                            <Textarea
                                                value={settings.defaultInvoiceNotes}
                                                onChange={(e) => update("defaultInvoiceNotes", e.target.value)}
                                            />
                                        </Field>

                                        <Field label="Default invoice terms">
                                            <Textarea
                                                value={settings.defaultInvoiceTerms}
                                                onChange={(e) => update("defaultInvoiceTerms", e.target.value)}
                                            />
                                        </Field>
                                    </div>
                                </Card>

                                <Card
                                    title="Bank Transfer Details"
                                    description="These details show on PDF invoices for customers paying by bank transfer."
                                    icon={CreditCard}
                                    dataTour="settings-bank-transfer-section"
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <Field label="Account name">
                                            <Input
                                                value={settings.bankAccountName}
                                                onChange={(e) => update("bankAccountName", e.target.value)}
                                                placeholder="Account holder name"
                                            />
                                        </Field>

                                        <Field label="Sort code">
                                            <Input
                                                value={settings.bankSortCode}
                                                onChange={(e) => update("bankSortCode", e.target.value)}
                                                placeholder="00-00-00"
                                            />
                                        </Field>

                                        <Field label="Account number">
                                            <Input
                                                value={settings.bankAccountNumber}
                                                onChange={(e) => update("bankAccountNumber", e.target.value)}
                                                placeholder="12345678"
                                            />
                                        </Field>

                                        <div className="md:col-span-2">
                                            <Field
                                                label="Payment reference"
                                                hint="Leave blank to show the invoice number as the payment reference."
                                            >
                                                <Input
                                                    value={settings.bankPaymentReference}
                                                    onChange={(e) => update("bankPaymentReference", e.target.value)}
                                                    placeholder="e.g. Use invoice number as reference"
                                                />
                                            </Field>
                                        </div>
                                    </div>
                                </Card>

                                <Card
                                    title="Stripe invoice payments"
                                    description="Connect your Stripe account to add secure payment links to invoices."
                                    icon={ShieldCheck}
                                    dataTour="settings-stripe-payments-section"
                                >
                                    <div className="space-y-5">
                                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                                    Stripe Connect
                                                </p>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            "rounded-full px-3 py-1 text-xs font-semibold",
                                                            getStripeConnectStatusClasses(settings)
                                                        )}
                                                    >
                                                        {stripeStatusLabel}
                                                    </span>
                                                    {settings.stripeConnectedAccountId ? (
                                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                                                            {settings.stripeConnectedAccountId}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="mt-3 text-sm text-slate-500">
                                                    RoundHQ application fee: 0.00. Stripe processing fees still apply.
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleStripeOnboarding}
                                                    disabled={isConnectingStripe}
                                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {isConnectingStripe ? "Opening..." : stripeActionLabel}
                                                </button>
                                                {settings.stripeConnectedAccountId ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleOpenStripeDashboard}
                                                        disabled={isOpeningStripeDashboard}
                                                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {isOpeningStripeDashboard
                                                            ? "Opening..."
                                                            : "Stripe dashboard"}
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    onClick={handleRefreshStripeStatus}
                                                    disabled={isRefreshingStripe}
                                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {isRefreshingStripe ? "Refreshing..." : "Refresh status"}
                                                </button>
                                            </div>
                                        </div>

                                        <Toggle
                                            checked={
                                                settings.stripePaymentLinksEnabled &&
                                                stripeConnectReady
                                            }
                                            onChange={(value) =>
                                                update(
                                                    "stripePaymentLinksEnabled",
                                                    value && stripeConnectReady
                                                )
                                            }
                                            disabled={!stripeConnectReady}
                                            label="Add payment links to invoices"
                                            description={
                                                stripeConnectReady
                                                    ? "Invoice PDFs and emails can include a Stripe Checkout link."
                                                    : "Complete Stripe onboarding before turning payment links on."
                                            }
                                        />
                                    </div>
                                </Card>
                            </div>
                        </div>

                    </div>
                )}

                {activeTab === "dashboard" && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card
                            title="Dashboard widgets"
                            description="Choose what shows on the dashboard."
                            icon={CloudSun}
                            dataTour="settings-dashboard-widgets-section"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <Toggle
                                    checked={settings.showWeatherWidget}
                                    onChange={(value) => update("showWeatherWidget", value)}
                                    label="Show weather widget"
                                    description="Helpful for outdoor scheduling."
                                />

                                {showGrowthSettings ? (
                                    <Toggle
                                        checked={settings.showRevenueWidget}
                                        onChange={(value) => update("showRevenueWidget", value)}
                                        label="Show revenue widget"
                                        description="Display revenue totals."
                                    />
                                ) : null}

                                <Toggle
                                    checked={settings.showJobsWidget}
                                    onChange={(value) => update("showJobsWidget", value)}
                                    label="Show jobs widget"
                                    description="Display jobs and totals."
                                />

                                {showGrowthSettings ? (
                                    <Toggle
                                        checked={settings.showUnpaidWidget}
                                        onChange={(value) => update("showUnpaidWidget", value)}
                                        label="Show unpaid widget"
                                        description="Track outstanding payments."
                                    />
                                ) : null}

                                <Toggle
                                    checked={settings.showRecentActivityWidget}
                                    onChange={(value) => update("showRecentActivityWidget", value)}
                                    label="Show recent activity widget"
                                    description="Show latest app actions and changes."
                                />
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === "email" && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card
                            title="Sending email account"
                            description="These details are used when you email quotes and invoices directly from the website."
                            icon={Mail}
                            dataTour="settings-email-account-section"
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field
                                    label="From name"
                                    hint="Shown to the customer as the sender name."
                                >
                                    <Input
                                        value={settings.emailFromName}
                                        onChange={(e) => update("emailFromName", e.target.value)}
                                        placeholder="Your Business"
                                    />
                                </Field>

                                <Field
                                    label="From email address"
                                    hint="The email address customers will see in the From field."
                                >
                                    <Input
                                        type="email"
                                        value={settings.emailFromAddress}
                                        onChange={(e) =>
                                            update("emailFromAddress", e.target.value)
                                        }
                                        placeholder="you@yourdomain.co.uk"
                                    />
                                </Field>

                                <Field
                                    label="Reply-to email"
                                    hint="Optional. Leave blank to use the same From address."
                                >
                                    <Input
                                        type="email"
                                        value={settings.emailReplyTo}
                                        onChange={(e) => update("emailReplyTo", e.target.value)}
                                        placeholder="accounts@yourdomain.co.uk"
                                    />
                                </Field>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                                    <p className="text-sm font-semibold text-slate-900">
                                        Attached PDFs
                                    </p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Quote and invoice emails sent from the website include the
                                        PDF as an attachment so the customer can open or download it
                                        directly from the email.
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card
                            title="SMTP server"
                            description="Use the SMTP details from your email provider so the website can send emails without opening a separate email app."
                            icon={ShieldCheck}
                            dataTour="settings-smtp-section"
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="SMTP host">
                                    <Input
                                        value={settings.smtpHost}
                                        onChange={(e) => update("smtpHost", e.target.value)}
                                        placeholder="smtp.office365.com"
                                    />
                                </Field>

                                <Field label="SMTP port">
                                    <NumberInput
                                        value={settings.smtpPort}
                                        onChange={(value) =>
                                            update("smtpPort", Math.max(1, Math.round(value)))
                                        }
                                        step="1"
                                        min="1"
                                    />
                                </Field>

                                <Field label="SMTP username">
                                    <Input
                                        value={settings.smtpUsername}
                                        onChange={(e) => update("smtpUsername", e.target.value)}
                                        placeholder="you@yourdomain.co.uk"
                                    />
                                </Field>

                                <Field
                                    label="SMTP password"
                                    hint="For providers like Gmail or Microsoft 365, this is often an app password."
                                >
                                    <Input
                                        type="password"
                                        autoComplete="new-password"
                                        value={settings.smtpPassword}
                                        onChange={(e) => update("smtpPassword", e.target.value)}
                                        placeholder="Enter password or app password"
                                    />
                                </Field>

                                <div className="md:col-span-2">
                                    <Toggle
                                        checked={settings.smtpSecure}
                                        onChange={(value) => update("smtpSecure", value)}
                                        label="Use SSL / TLS"
                                        description="Turn this on for secure SMTP connections such as port 465. Leave it off for port 587 with STARTTLS."
                                    />
                                </div>

                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 md:col-span-2">
                                    Save these settings before using the Email buttons on Quotes or
                                    Invoices.
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                                        <div className="flex-1">
                                            <Field
                                                label="Send test email to"
                                                hint="This uses the SMTP details currently on screen, so you can test before saving if needed."
                                            >
                                                <Input
                                                    type="email"
                                                    value={testEmailRecipient}
                                                    onChange={(e) =>
                                                        setTestEmailRecipient(e.target.value)
                                                    }
                                                    placeholder="you@example.com"
                                                />
                                            </Field>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleSendTestEmail}
                                            disabled={isSendingTestEmail}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Mail className="h-4 w-4" />
                                            {isSendingTestEmail
                                                ? "Sending test email..."
                                                : "Send Test Email"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {showGrowthSettings ? (
                        <div className="xl:col-span-2">
                            <Card
                                title="Workflow message templates"
                                description="Choose how quote follow-ups and overdue invoice reminders should send from the dashboard, then reuse these templates each time."
                                icon={Settings2}
                                dataTour="settings-workflow-messages-section"
                            >
                                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                                    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-xl bg-white p-2 text-emerald-600 shadow-sm">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900">
                                                    Quote follow-ups
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    Used when you chase quotes from the Needs Attention panel.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-5 grid grid-cols-1 gap-4">
                                            <Field label="Default send method">
                                                <Select
                                                    value={settings.quoteFollowUpMethod}
                                                    onChange={(e) =>
                                                        update(
                                                            "quoteFollowUpMethod",
                                                            e.target.value as WorkflowMessageMethod
                                                        )
                                                    }
                                                >
                                                    {workflowMessageMethodOptions.map((option) => (
                                                        <option key={option} value={option}>
                                                            Email
                                                        </option>
                                                    ))}
                                                </Select>
                                            </Field>

                                            <Field
                                                label="Email subject template"
                                                hint="Placeholders: {{customerName}}, {{businessName}}, {{documentNumber}}, {{total}}, {{quoteDate}}, {{daysSinceQuote}}, {{followUpNumber}}"
                                            >
                                                <Input
                                                    value={settings.quoteFollowUpEmailSubjectTemplate}
                                                    onChange={(e) =>
                                                        update(
                                                            "quoteFollowUpEmailSubjectTemplate",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </Field>

                                            <Field
                                                label="Email message template"
                                                hint="This fills the email body before you send."
                                            >
                                                <Textarea
                                                    value={settings.quoteFollowUpEmailTemplate}
                                                    onChange={(e) =>
                                                        update(
                                                            "quoteFollowUpEmailTemplate",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </Field>

                                        </div>
                                    </section>

                                    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-xl bg-white p-2 text-emerald-600 shadow-sm">
                                                <Receipt className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900">
                                                    Overdue invoice reminders
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    Used when you chase overdue invoices from the dashboard.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-5 grid grid-cols-1 gap-4">
                                            <Field label="Default send method">
                                                <Select
                                                    value={settings.invoiceReminderMethod}
                                                    onChange={(e) =>
                                                        update(
                                                            "invoiceReminderMethod",
                                                            e.target.value as WorkflowMessageMethod
                                                        )
                                                    }
                                                >
                                                    {workflowMessageMethodOptions.map((option) => (
                                                        <option key={option} value={option}>
                                                            Email
                                                        </option>
                                                    ))}
                                                </Select>
                                            </Field>

                                            <Field
                                                label="Email subject template"
                                                hint="Placeholders: {{customerName}}, {{businessName}}, {{documentNumber}}, {{total}}, {{dueDate}}, {{daysOverdue}}, {{reminderNumber}}"
                                            >
                                                <Input
                                                    value={settings.invoiceReminderEmailSubjectTemplate}
                                                    onChange={(e) =>
                                                        update(
                                                            "invoiceReminderEmailSubjectTemplate",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </Field>

                                            <Field
                                                label="Email message template"
                                                hint="This fills the email body before you send."
                                            >
                                                <Textarea
                                                    value={settings.invoiceReminderEmailTemplate}
                                                    onChange={(e) =>
                                                        update(
                                                            "invoiceReminderEmailTemplate",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </Field>

                                        </div>
                                    </section>
                                </div>
                            </Card>
                        </div>
                        ) : null}
                    </div>
                )}

                {activeTab === "ai-receptionist" && showAiReceptionistSettings && (
                    <div className="space-y-6">
                        {!aiReceptionistSettings ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                                AI Receptionist settings are not available yet. Refresh the page
                                once the database setup has been applied.
                            </div>
                        ) : (
                            <>
                                {!aiReceptionistSettings.schemaReady ? (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                                        <span className="font-bold">Database setup needed:</span>{" "}
                                        Run <code>supabase/ai_receptionist_settings.sql</code> or
                                        the latest <code>supabase/roundhq_tenant_schema.sql</code>{" "}
                                        before saving AI Receptionist settings.
                                        {aiReceptionistSettings.schemaError ? (
                                            <div className="mt-2 text-xs text-amber-800">
                                                {aiReceptionistSettings.schemaError}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                <AiReceptionistSettingsForm
                                    initialSettings={aiReceptionistSettings}
                                    workspaceName={
                                        workspaceName?.trim() ||
                                        settings.tradingName.trim() ||
                                        settings.businessName.trim() ||
                                        "RoundHQ Workspace"
                                    }
                                />
                                <AiReceptionistCallHistory
                                    calls={aiReceptionistCallHistory?.items ?? []}
                                    schemaReady={
                                        aiReceptionistCallHistory?.schemaReady ??
                                        aiReceptionistSettings.schemaReady
                                    }
                                    schemaError={aiReceptionistCallHistory?.schemaError}
                                />
                            </>
                        )}
                    </div>
                )}

                {activeTab === "data" && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card
                            title="Edit collaboration"
                            description="Control inactive edit warnings and what happens to unsaved work."
                            icon={Settings2}
                            dataTour="settings-edit-collaboration-section"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <Field
                                    label={`Inactive warning after ${settings.editInactivityMinutes} minute${settings.editInactivityMinutes === 1 ? "" : "s"}`}
                                    hint="Editors are warned when they have unsaved changes and no new edits are made for this long."
                                >
                                    <input
                                        type="range"
                                        min="1"
                                        max="60"
                                        step="1"
                                        value={settings.editInactivityMinutes}
                                        onChange={(event) =>
                                            update(
                                                "editInactivityMinutes",
                                                normalizeEditInactiveMinutes(event.target.value)
                                            )
                                        }
                                        className="w-full accent-emerald-600"
                                    />
                                </Field>

                                <Field
                                    label="Inactive unsaved changes"
                                    hint="Choose whether RoundHQ asks first, saves automatically, or discards automatically when the inactive warning is reached."
                                >
                                    <Select
                                        value={settings.editInactiveAction}
                                        onChange={(event) =>
                                            update(
                                                "editInactiveAction",
                                                normalizeEditInactiveAction(event.target.value)
                                            )
                                        }
                                    >
                                        <option value="notify">
                                            Ask the editor what to do
                                        </option>
                                        <option value="auto_save">
                                            Automatically save changes
                                        </option>
                                        <option value="auto_discard">
                                            Automatically discard changes
                                        </option>
                                    </Select>
                                </Field>
                            </div>
                        </Card>

                        <Card
                            title="In-app help"
                            description="Control automatic onboarding and guided tips."
                            icon={HelpCircle}
                            dataTour="settings-help-section"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <Toggle
                                    dataTour="help-settings-toggle"
                                    checked={settings.helpEnabled}
                                    onChange={(value) => update("helpEnabled", value)}
                                    label="Show help tips"
                                    description="Show first-time onboarding and automatic guided tips. Manual In App Help stays available from the user menu."
                                />
                            </div>
                        </Card>

                        <Card
                            title="Import / export"
                            description="Backup or restore your settings."
                            icon={Database}
                            dataTour="settings-import-export-section"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-emerald-950">Export all data</p>
                                            <p className="mt-1 text-xs leading-5 text-emerald-800">
                                                Download a full JSON backup including customers, quotes, invoices,
                                                payments, visits, jobs, staff, expenses, document history, and settings.
                                            </p>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {[
                                                    ["Customers", fullDataExportCounts.customers],
                                                    ["Quotes", fullDataExportCounts.quotes],
                                                    ["Invoices", fullDataExportCounts.invoices],
                                                    ["Payments", fullDataExportCounts.payments],
                                                    ["Visits", fullDataExportCounts.visits],
                                                    ["Jobs", fullDataExportCounts.jobs],
                                                ].map(([label, count]) => (
                                                    <span
                                                        key={label}
                                                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-900 shadow-sm"
                                                    >
                                                        {label}: {Number(count).toLocaleString()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleExportAllData}
                                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                                        >
                                            <Download className="h-4 w-4" />
                                            Export all data
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-amber-950">Import all data</p>
                                            <p className="mt-1 text-xs leading-5 text-amber-800">
                                                Restore a full RoundHQ data export. This replaces the current workspace
                                                customers, quotes, invoices, payments, jobs, staff, expenses, histories,
                                                and settings after confirmation.
                                            </p>
                                        </div>

                                        <input
                                            ref={fullDataImportInputRef}
                                            type="file"
                                            accept="application/json"
                                            onChange={handleImportAllData}
                                            className="hidden"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => fullDataImportInputRef.current?.click()}
                                            disabled={isImportingAllData}
                                            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 shadow-sm hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Upload className="h-4 w-4" />
                                            {isImportingAllData ? "Importing..." : "Import all data"}
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">Export settings</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Download a JSON backup of your current settings.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleExport}
                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                        >
                                            <Download className="h-4 w-4" />
                                            Export
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">Import settings</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Load settings from a previously exported JSON file.
                                            </p>
                                        </div>

                                        <input
                                            ref={importInputRef}
                                            type="file"
                                            accept="application/json"
                                            onChange={handleImport}
                                            className="hidden"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => importInputRef.current?.click()}
                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                        >
                                            <Upload className="h-4 w-4" />
                                            Import
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-start gap-3">
                                        <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">Local save enabled</p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                Settings are stored in localStorage by default. You can still pass an
                                                <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">onSave</code>
                                                handler to sync with Supabase later.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card
                            title="Danger zone"
                            description="Reset everything if you need a clean start."
                            icon={Trash2}
                            dataTour="settings-danger-zone-section"
                        >
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                                <p className="text-sm font-medium text-red-800">
                                    Reset all settings to defaults
                                </p>
                                <p className="mt-1 text-xs leading-5 text-red-700">
                                    This overwrites your saved settings and cannot be undone unless you exported a backup.
                                </p>

                                <button
                                    type="button"
                                    onClick={handleResetAllToDefaults}
                                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Reset to defaults
                                </button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
