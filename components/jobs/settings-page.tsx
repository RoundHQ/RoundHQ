"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
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
    MessageSquare,
} from "lucide-react";
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
import type { RotationWeeks } from "./types";

type PaymentMethod = "cash" | "bank_transfer" | "direct_debit" | "invoice";
type CutType = "front_only" | "front_back" | "full_garden";
type ThemeMode = "light" | "dark" | "system";
type QuoteServiceType = "service" | "product";
type WorkflowMessageMethod = "email" | "text" | "both";
type QuoteService = {
    id: string;
    title: string;
    category: string;
    itemType: QuoteServiceType;
    price: number;
    buyPrice: number;
};
type SettingsTab =
    | "business"
    | "branding"
    | "pricing"
    | "jobs"
    | "quotes"
    | "invoices"
    | "email"
    | "sms"
    | "dashboard"
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
    onSave?: (settings: SettingsData) => Promise<void> | void;
};

type SmsConfigStatus = {
    configured: boolean;
    accountSidConfigured: boolean;
    authTokenConfigured: boolean;
    fromNumber: string;
    messagingServiceSid: string;
    defaultCountryCode: string;
};

const STORAGE_KEY = "roundhq_settings";

const visitDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];
const workflowMessageMethodOptions: WorkflowMessageMethod[] = [
    "email",
    "text",
    "both",
];

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

function Card({
                  title,
                  description,
                  icon: Icon,
                  children,
              }: {
    title: string;
    description?: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                }: {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description?: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
            <div className="pr-4">
                <p className="text-sm font-medium text-slate-800">{label}</p>
                {description ? (
                    <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                ) : null}
            </div>

            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={cn(
                    "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition",
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

function TabButton({
                       active,
                       onClick,
                       children,
                   }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
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

function safeMergeSettings(source?: Partial<SettingsData> | null): SettingsData {
    const quoteFollowUpMethod =
        source?.quoteFollowUpMethod === "text" || source?.quoteFollowUpMethod === "both"
            ? source.quoteFollowUpMethod
            : "email";
    const invoiceReminderMethod =
        source?.invoiceReminderMethod === "text" || source?.invoiceReminderMethod === "both"
            ? source.invoiceReminderMethod
            : "email";

    return {
        ...defaultSettings,
        ...(source || {}),
        defaultRotationWeeks: normalizeRotationWeeks(source?.defaultRotationWeeks),
        quoteFollowUpMethod,
        invoiceReminderMethod,
        quoteServices: normalizeQuoteServices(source?.quoteServices),
    };
}

export default function SettingsPage({
                                         initialSettings,
                                         onSave,
                                     }: Props) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const importInputRef = useRef<HTMLInputElement | null>(null);

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
    const [testEmailRecipient, setTestEmailRecipient] = useState("");
    const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
    const [smsConfigStatus, setSmsConfigStatus] =
        useState<SmsConfigStatus | null>(null);
    const [isLoadingSmsConfigStatus, setIsLoadingSmsConfigStatus] =
        useState(false);
    const [testSmsRecipient, setTestSmsRecipient] = useState("");
    const [testSmsMessage, setTestSmsMessage] = useState(
        "This is a test text from RoundHQ."
    );
    const [isSendingTestSms, setIsSendingTestSms] = useState(false);
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

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty("--brand-primary", settings.primaryColor);
        root.style.setProperty("--brand-secondary", settings.secondaryColor);
    }, [settings.primaryColor, settings.secondaryColor]);

    useEffect(() => {
        setSettings(mergedSettings);
    }, [mergedSettings]);

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
        if (activeTab !== "sms") {
            return;
        }

        let isCurrent = true;

        async function loadSmsConfigStatus() {
            try {
                setIsLoadingSmsConfigStatus(true);

                const response = await fetch("/api/send-visit-text", {
                    method: "GET",
                });
                const body = (await response.json().catch(() => null)) as
                    | SmsConfigStatus
                    | null;

                if (!isCurrent) {
                    return;
                }

                if (!response.ok || !body) {
                    setSmsConfigStatus(null);
                    return;
                }

                setSmsConfigStatus(body);
            } catch (error) {
                console.error("Failed to load SMS configuration status:", error);
                if (isCurrent) {
                    setSmsConfigStatus(null);
                }
            } finally {
                if (isCurrent) {
                    setIsLoadingSmsConfigStatus(false);
                }
            }
        }

        void loadSmsConfigStatus();

        return () => {
            isCurrent = false;
        };
    }, [activeTab]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Partial<SettingsData>;
            setSettings(safeMergeSettings(parsed));
        } catch (error) {
            console.error("Failed to load local settings:", error);
        }
    }, []);

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

    async function handleSendTestSms() {
        const recipient = testSmsRecipient.trim();
        const textMessage = testSmsMessage.trim();

        if (!recipient) {
            showMessage("Enter a mobile number to send the test text to.", "error");
            return;
        }

        if (!textMessage) {
            showMessage("Enter a message before sending the test text.", "error");
            return;
        }

        try {
            setIsSendingTestSms(true);
            setMessage("");

            const response = await fetch("/api/send-visit-text", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    to: recipient,
                    message: textMessage,
                }),
            });

            const body = (await response.json().catch(() => null)) as
                | { error?: string }
                | null;

            if (!response.ok) {
                throw new Error(body?.error || "Unable to send the test text.");
            }

            showMessage(`Test text sent to ${recipient}.`, "success");
        } catch (error) {
            console.error("Failed to send test text:", error);
            showMessage(
                error instanceof Error && error.message.trim()
                    ? error.message
                    : "Unable to send the test text.",
                "error"
            );
        } finally {
            setIsSendingTestSms(false);
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
        const blob = new Blob([JSON.stringify(settings, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "roundhq-settings.json";
        a.click();
        URL.revokeObjectURL(url);

        showMessage("Settings exported.", "success");
    }

    function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            update("logoUrl", result);
            showMessage("Logo uploaded locally.", "success");
        };
        reader.readAsDataURL(file);
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

    return (
        <div className="min-h-full bg-slate-50 p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <div
                    className="overflow-hidden rounded-3xl shadow-sm"
                    style={{
                        background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
                    }}
                >
                    <div className="flex flex-col gap-5 p-6 text-white lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold md:text-3xl">Settings</h1>
                            <p className="mt-2 max-w-2xl text-sm text-white/90">
                                Manage branding, pricing, defaults, quotes, invoices, email sending, widgets, and data tools.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={handleResetChanges}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Reset changes
                            </button>

                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                style={{ color: settings.primaryColor }}
                            >
                                <Save className="h-4 w-4" />
                                {isSaving ? "Saving..." : "Save settings"}
                            </button>
                        </div>
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
                    <TabButton active={activeTab === "business"} onClick={() => setActiveTab("business")}>
                        Business
                    </TabButton>
                    <TabButton active={activeTab === "branding"} onClick={() => setActiveTab("branding")}>
                        Branding
                    </TabButton>
                    <TabButton active={activeTab === "pricing"} onClick={() => setActiveTab("pricing")}>
                        Pricing
                    </TabButton>
                    <TabButton active={activeTab === "jobs"} onClick={() => setActiveTab("jobs")}>
                        Jobs
                    </TabButton>
                    <TabButton active={activeTab === "quotes"} onClick={() => setActiveTab("quotes")}>
                        Quotes
                    </TabButton>
                    <TabButton active={activeTab === "invoices"} onClick={() => setActiveTab("invoices")}>
                        Invoices
                    </TabButton>
                    <TabButton active={activeTab === "email"} onClick={() => setActiveTab("email")}>
                        Email
                    </TabButton>
                    <TabButton active={activeTab === "sms"} onClick={() => setActiveTab("sms")}>
                        SMS
                    </TabButton>
                    <TabButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")}>
                        Dashboard
                    </TabButton>
                    <TabButton active={activeTab === "data"} onClick={() => setActiveTab("data")}>
                        Data
                    </TabButton>
                </div>

                {activeTab === "business" && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card
                            title="Business details"
                            description="Main business identity and contact information."
                            icon={Building2}
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

                {activeTab === "branding" && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card
                            title="Branding"
                            description="Logo and brand colours for the app."
                            icon={Palette}
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

                                    <Field label="Secondary colour">
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
                                        <div className="rounded-2xl border border-slate-200 p-4">
                                            <p className="mb-3 text-sm font-medium text-slate-700">
                                                Live preview
                                            </p>
                                            <div
                                                className="rounded-2xl p-5 text-white"
                                                style={{
                                                    background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                                                        <Settings2 className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-semibold">
                                                            {settings.businessName || "Business Name"}
                                                        </p>
                                                        <p className="text-sm text-white/85">
                                                            Brand preview
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

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
                    </div>
                )}

                {activeTab === "pricing" && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card
                            title="Pricing defaults"
                            description="Used when creating jobs and quotes."
                            icon={CreditCard}
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Default service price (£)">
                                    <NumberInput
                                        value={settings.defaultGrassCutPrice}
                                        onChange={(value) => update("defaultGrassCutPrice", value)}
                                    />
                                </Field>

                                <Field label="Default hedge trimming price (£)">
                                    <NumberInput
                                        value={settings.defaultHedgeCutPrice}
                                        onChange={(value) => update("defaultHedgeCutPrice", value)}
                                    />
                                </Field>

                                <Field label="Default hourly rate (£)">
                                    <NumberInput
                                        value={settings.defaultHourlyRate}
                                        onChange={(value) => update("defaultHourlyRate", value)}
                                    />
                                </Field>

                                <Field label="Fuel surcharge (£)">
                                    <NumberInput
                                        value={settings.fuelSurcharge}
                                        onChange={(value) => update("fuelSurcharge", value)}
                                    />
                                </Field>

                                <Field label="Minimum charge (£)">
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
                            title="Round settings"
                            description="Choose how your normal service rotation behaves."
                            icon={RotateCcw}
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
                            >
                                <div className="grid grid-cols-1 gap-4">
                                    <Field
                                        label="Pressure wash rate (£ per m2)"
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
                                                            Sell price: £{Number(service.price ?? 0).toFixed(2)}
                                                        </p>
                                                        {service.itemType === "product" ? (
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                Buy price: £{Number(service.buyPrice ?? 0).toFixed(2)} • Profit: £{getQuoteServiceProfit(service).toFixed(2)}
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
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <Toggle
                                    checked={settings.showWeatherWidget}
                                    onChange={(value) => update("showWeatherWidget", value)}
                                    label="Show weather widget"
                                    description="Helpful for outdoor scheduling."
                                />

                                <Toggle
                                    checked={settings.showRevenueWidget}
                                    onChange={(value) => update("showRevenueWidget", value)}
                                    label="Show revenue widget"
                                    description="Display revenue totals."
                                />

                                <Toggle
                                    checked={settings.showJobsWidget}
                                    onChange={(value) => update("showJobsWidget", value)}
                                    label="Show jobs widget"
                                    description="Display jobs and totals."
                                />

                                <Toggle
                                    checked={settings.showUnpaidWidget}
                                    onChange={(value) => update("showUnpaidWidget", value)}
                                    label="Show unpaid widget"
                                    description="Track outstanding payments."
                                />

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
                                    Invoices. Quote and invoice text reminders still use your
                                    device's normal text sharing flow.
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

                        <div className="xl:col-span-2">
                            <Card
                                title="Workflow message templates"
                                description="Choose how quote follow-ups and overdue invoice reminders should send from the dashboard, then reuse these templates each time."
                                icon={Settings2}
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
                                                            {option === "both"
                                                                ? "Email + Text"
                                                                : option === "email"
                                                                    ? "Email"
                                                                    : "Text"}
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

                                            <Field
                                                label="Text message template"
                                                hint="This fills the SMS body before your text app opens."
                                            >
                                                <Textarea
                                                    value={settings.quoteFollowUpTextTemplate}
                                                    onChange={(e) =>
                                                        update(
                                                            "quoteFollowUpTextTemplate",
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
                                                            {option === "both"
                                                                ? "Email + Text"
                                                                : option === "email"
                                                                    ? "Email"
                                                                    : "Text"}
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

                                            <Field
                                                label="Text message template"
                                                hint="This fills the SMS body before your text app opens."
                                            >
                                                <Textarea
                                                    value={settings.invoiceReminderTextTemplate}
                                                    onChange={(e) =>
                                                        update(
                                                            "invoiceReminderTextTemplate",
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
                    </div>
                )}

                {activeTab === "sms" && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card
                            title="Automatic completion texts"
                            description="Send an automatic payment-due text when an On Day Transfer customer is marked complete."
                            icon={MessageSquare}
                        >
                            <div className="grid grid-cols-1 gap-5">
                                <Toggle
                                    checked={settings.autoSendVisitCompletionTexts}
                                    onChange={(value) =>
                                        update("autoSendVisitCompletionTexts", value)
                                    }
                                    label="Send payment text after completion"
                                    description="Only sends for customers whose payment method is On Day Transfer. Cash and monthly customers are ignored."
                                />

                                <Field
                                    label="Completion text template"
                                    hint="Placeholders: {{customerName}}, {{businessName}}, {{amount}}, {{visitDate}}, {{paymentDetails}}, {{paymentReference}}"
                                >
                                    <Textarea
                                        value={settings.visitCompletionTextTemplate}
                                        onChange={(e) =>
                                            update("visitCompletionTextTemplate", e.target.value)
                                        }
                                    />
                                </Field>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                                    Automatic completion texts only work after the Twilio variables are
                                    added in Vercel and the site is redeployed. The Auth Token is
                                    kept out of app settings so it is not exposed in the browser.
                                </div>
                            </div>
                        </Card>

                        <Card
                            title="Twilio configuration"
                            description="Check the server-side Twilio setup used by automatic texts and test sends."
                            icon={ShieldCheck}
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <div
                                    className={cn(
                                        "rounded-xl border p-4",
                                        smsConfigStatus?.configured
                                            ? "border-emerald-200 bg-emerald-50"
                                            : "border-amber-200 bg-amber-50"
                                    )}
                                >
                                    <p
                                        className={cn(
                                            "text-sm font-semibold",
                                            smsConfigStatus?.configured
                                                ? "text-emerald-900"
                                                : "text-amber-900"
                                        )}
                                    >
                                        {isLoadingSmsConfigStatus
                                            ? "Checking Twilio setup..."
                                            : smsConfigStatus?.configured
                                                ? "Twilio is ready to send SMS."
                                                : "Twilio needs more server details."}
                                    </p>
                                    <p
                                        className={cn(
                                            "mt-1 text-sm",
                                            smsConfigStatus?.configured
                                                ? "text-emerald-700"
                                                : "text-amber-800"
                                        )}
                                    >
                                        Add the missing values in Vercel Project Settings, then
                                        redeploy the app.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {[
                                        {
                                            label: "Account SID",
                                            value: smsConfigStatus?.accountSidConfigured
                                                ? "Configured"
                                                : "Missing",
                                            ready: Boolean(
                                                smsConfigStatus?.accountSidConfigured
                                            ),
                                        },
                                        {
                                            label: "Auth Token",
                                            value: smsConfigStatus?.authTokenConfigured
                                                ? "Configured"
                                                : "Missing",
                                            ready: Boolean(
                                                smsConfigStatus?.authTokenConfigured
                                            ),
                                        },
                                        {
                                            label: "From number",
                                            value: smsConfigStatus?.fromNumber || "Not set",
                                            ready: Boolean(smsConfigStatus?.fromNumber),
                                        },
                                        {
                                            label: "Messaging Service SID",
                                            value:
                                                smsConfigStatus?.messagingServiceSid ||
                                                "Not set",
                                            ready: Boolean(
                                                smsConfigStatus?.messagingServiceSid
                                            ),
                                        },
                                        {
                                            label: "Default country code",
                                            value:
                                                smsConfigStatus?.defaultCountryCode || "+44",
                                            ready: true,
                                        },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                                        >
                                            <p className="text-xs font-medium uppercase text-slate-500">
                                                {item.label}
                                            </p>
                                            <p
                                                className={cn(
                                                    "mt-1 text-sm font-semibold",
                                                    item.ready
                                                        ? "text-slate-900"
                                                        : "text-amber-700"
                                                )}
                                            >
                                                {item.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-sm text-slate-100">
                                    <p className="font-semibold">Vercel environment variables</p>
                                    <div className="mt-3 grid gap-2 font-mono text-xs leading-6 text-slate-200">
                                        <span>TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</span>
                                        <span>TWILIO_AUTH_TOKEN=your_twilio_auth_token</span>
                                        <span>TWILIO_FROM_NUMBER=+447000000000</span>
                                        <span>SMS_DEFAULT_COUNTRY_CODE=+44</span>
                                    </div>
                                    <p className="mt-3 text-xs leading-5 text-slate-300">
                                        You can use TWILIO_MESSAGING_SERVICE_SID instead of
                                        TWILIO_FROM_NUMBER if you set up a Twilio Messaging Service.
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <div className="xl:col-span-2">
                            <Card
                                title="Send test SMS"
                                description="Send a one-off test text using the Twilio details currently deployed on the server."
                                icon={Phone}
                            >
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_auto] lg:items-end">
                                    <Field
                                        label="Send test text to"
                                        hint="Use E.164 format if possible, for example +447700900123."
                                    >
                                        <Input
                                            type="tel"
                                            value={testSmsRecipient}
                                            onChange={(e) =>
                                                setTestSmsRecipient(e.target.value)
                                            }
                                            placeholder="+447700900123"
                                        />
                                    </Field>

                                    <Field label="Test message">
                                        <Textarea
                                            value={testSmsMessage}
                                            onChange={(e) =>
                                                setTestSmsMessage(e.target.value)
                                            }
                                            className="min-h-[92px]"
                                        />
                                    </Field>

                                    <button
                                        type="button"
                                        onClick={handleSendTestSms}
                                        disabled={isSendingTestSms}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        {isSendingTestSms
                                            ? "Sending test text..."
                                            : "Send Test Text"}
                                    </button>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === "data" && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card
                            title="Import / export"
                            description="Backup or restore your settings."
                            icon={Database}
                        >
                            <div className="grid grid-cols-1 gap-4">
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
