"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  CheckCircle2,
  CreditCard,
  FileText,
  History as HistoryIcon,
  Link2,
  Repeat,
} from "lucide-react";
import { generateInvoicePDF } from "./pdf-generator";
import DocumentSendDialog from "./document-send-dialog";
import { sendInvoiceDocument } from "./document-delivery";
import {
  formatCurrency,
  formatStoredDate,
  getCustomerEmailAddresses,
  getInputDateValue,
  getTodayDateInputValue,
} from "./helpers";
import type {
  Customer,
  DocumentDeliveryMethod,
  DocumentHistoryEntry,
  InvoiceStatus,
  QuoteStatus,
  RecurringInvoiceFrequency,
  RecurringInvoiceTemplate,
  StripeInvoicePaymentStatus,
} from "./types";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  price: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
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
  dueDate?: string;
  status: InvoiceStatus;
  items: LineItem[];
  notes?: string;
  terms?: string;
  vatRate?: number;
  vatAmount?: number;
  total: number;
  linkedQuoteId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentLinkUrl?: string;
  stripePaymentStatus?: StripeInvoicePaymentStatus;
  stripePaymentIntentId?: string;
  stripePaymentCompletedAt?: string;
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

type BusinessDetails = {
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
  termsAndConditionsUrl?: string;
  defaultInvoiceTerms?: string;
  bankAccountName?: string;
  bankSortCode?: string;
  bankAccountNumber?: string;
  bankPaymentReference?: string;
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

type Props = {
  invoices: Invoice[];
  quotes: Quote[];
  customers: Customer[];
  documentHistory: Record<string, DocumentHistoryEntry[]>;
  showOwnerHistory?: boolean;
  recurringInvoiceTemplates: RecurringInvoiceTemplate[];
  defaultPaymentTermsDays: number;
  businessDetails: BusinessDetails;
  onCreate: () => void;
  onEdit: (invoiceId: string) => void;
  onDelete: (invoiceId: string) => void;
  onUpdateStatus: (
    invoiceId: string,
    status: InvoiceStatus
  ) => Promise<void> | void;
  onMarkSent: (
    invoiceId: string,
    metadata?: DocumentSendMetadata
  ) => Promise<void> | void;
  onMarkRead?: (
    invoiceId: string,
    metadata?: DocumentSendMetadata
  ) => Promise<void> | void;
  stripeInvoicePaymentsEnabled?: boolean;
  onCreatePaymentLink?: (invoiceId: string) => Promise<Invoice | null>;
  onSendText?: (invoiceId: string) => void;
  onSaveRecurringTemplate: (
    template: RecurringInvoiceTemplate
  ) => Promise<RecurringInvoiceTemplate | null>;
  onDeleteRecurringTemplate: (templateId: string) => Promise<boolean> | boolean;
};

type SendTarget = {
  invoiceId: string;
  method: "email";
} | null;

type DocumentSendMetadata = {
  method: DocumentDeliveryMethod;
  recipient?: string;
};

type InvoiceHistoryItem = {
  document: Invoice;
  entry: DocumentHistoryEntry;
};

type RecurringEditorState = {
  invoiceId: string;
  templateId?: string;
} | null;

type InvoiceFilter = "All" | "Draft" | "Paid" | "Overdue";
type InvoiceAction =
  | "edit"
  | "paid"
  | "pdf"
  | "payment-link"
  | "email"
  | "text"
  | "recurring"
  | "delete";

type InvoiceActionTone = "accept" | "danger" | "neutral" | "primary";

type InvoiceActionMenuItem = {
  action: InvoiceAction;
  label: string;
  tone?: InvoiceActionTone;
  separatorBefore?: boolean;
};

type InvoiceActionMenuState = {
  invoiceId: string;
  top: number;
  left: number;
  width: number;
};

const RECURRING_FREQUENCY_OPTIONS: RecurringInvoiceFrequency[] = [
  "Monthly",
  "Quarterly",
  "Yearly",
];

const INVOICE_FILTER_OPTIONS: InvoiceFilter[] = [
  "All",
  "Draft",
  "Paid",
  "Overdue",
];

function getInvoiceStatusClasses(status: InvoiceStatus) {
  switch (status) {
    case "Paid":
    case "Accepted":
      return "bg-emerald-100 text-emerald-700";
    case "Declined":
      return "bg-rose-100 text-rose-700";
    case "Sent":
      return "bg-sky-100 text-sky-700";
    case "Approved":
      return "bg-amber-100 text-amber-700";
    case "Unpaid":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

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

  return parsedDate.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBrandName(businessDetails: BusinessDetails) {
  return (
    businessDetails.tradingName?.trim() ||
    businessDetails.businessName?.trim() ||
    "Your Business"
  );
}

function getInvoiceEmailSubject(
  invoice: Invoice,
  businessDetails: BusinessDetails
) {
  return `Invoice ${invoice.invoiceNumber} from ${getBrandName(businessDetails)}`;
}

function getInvoiceEmailMessage(
  invoice: Invoice,
  businessDetails: BusinessDetails
) {
  const brandName = getBrandName(businessDetails);
  const contactLine = [
    businessDetails.businessPhone?.trim(),
    businessDetails.businessEmail?.trim(),
  ]
    .filter(Boolean)
    .join(" | ");

  return [
    `Hi ${invoice.customerName},`,
    "",
    `Please find invoice ${invoice.invoiceNumber} attached.`,
    `Invoice total: ${formatCurrency(invoice.total)}`,
    invoice.dueDate
      ? `Due by: ${formatStoredDate(invoice.dueDate)}`
      : undefined,
    invoice.stripePaymentLinkUrl
      ? `Pay securely online: ${invoice.stripePaymentLinkUrl}`
      : undefined,
    "",
    invoice.notes?.trim() || "Please use the invoice number as your payment reference.",
    "",
    "Kind regards,",
    brandName,
    contactLine,
  ]
    .filter(Boolean)
    .join("\n");
}

function appendPaymentLinkToMessage(message: string, invoice: Invoice) {
  const paymentLinkUrl = invoice.stripePaymentLinkUrl?.trim();

  if (!paymentLinkUrl || message.includes(paymentLinkUrl)) {
    return message;
  }

  return `${message.trim()}\n\nPay securely online: ${paymentLinkUrl}`;
}

function getPaymentLinkLabel(invoice: Invoice) {
  if (invoice.stripePaymentStatus === "paid" || invoice.status === "Paid") {
    return "Paid online";
  }

  if (invoice.stripePaymentStatus === "expired") {
    return "Link expired";
  }

  if (invoice.stripePaymentLinkUrl) {
    return "Payment link";
  }

  return "No payment link";
}

function getPaymentLinkClasses(invoice: Invoice) {
  if (invoice.stripePaymentStatus === "paid" || invoice.status === "Paid") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (invoice.stripePaymentStatus === "expired") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-sky-100 text-sky-700";
}

function getActionMenuPosition(
  trigger: HTMLElement,
  itemCount: number
): Omit<InvoiceActionMenuState, "invoiceId"> {
  const rect = trigger.getBoundingClientRect();
  const width = 224;
  const estimatedHeight = Math.min(360, 18 + itemCount * 42);
  const top =
    rect.bottom + estimatedHeight + 12 > window.innerHeight
      ? Math.max(12, rect.top - estimatedHeight - 8)
      : rect.bottom + 8;
  const left = Math.min(
    window.innerWidth - width - 12,
    Math.max(12, rect.right - width)
  );

  return { top, left, width };
}

function getInvoiceActionItemClasses(tone: InvoiceActionTone = "neutral") {
  const base =
    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition";

  switch (tone) {
    case "accept":
      return `${base} bg-emerald-600 text-white shadow-sm hover:bg-emerald-700`;
    case "danger":
      return `${base} text-rose-700 hover:bg-rose-50`;
    case "primary":
      return `${base} text-emerald-800 hover:bg-emerald-50`;
    default:
      return `${base} text-slate-700 hover:bg-slate-50`;
  }
}

function getInvoiceDueDaysAfterIssue(invoice: Invoice, fallbackDays: number) {
  if (!invoice.dueDate) {
    return Math.max(0, fallbackDays);
  }

  const issueDate = new Date(`${invoice.date}T12:00:00`);
  const dueDate = new Date(`${invoice.dueDate}T12:00:00`);
  const dayDifference = Math.round(
    (dueDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Number.isFinite(dayDifference) ? Math.max(0, dayDifference) : Math.max(0, fallbackDays);
}

function addDaysToDateInputValue(value: string, days: number) {
  const normalized = getInputDateValue(value);

  if (!normalized) {
    return getTodayDateInputValue();
  }

  const date = new Date(`${normalized}T12:00:00`);
  const wholeDays = Number.isFinite(days) ? Math.floor(days) : 0;

  date.setDate(date.getDate() + wholeDays);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getRecurringTemplatePaymentByDate(
  template: RecurringInvoiceTemplate,
  fallbackDays: number
) {
  const nextSendDate = getInputDateValue(template.nextSendDate);
  const nextDueDate = getInputDateValue(template.nextDueDate);

  if (nextDueDate) {
    return nextDueDate;
  }

  if (nextSendDate) {
    return addDaysToDateInputValue(
      nextSendDate,
      typeof template.dueDaysAfterIssue === "number"
        ? template.dueDaysAfterIssue
        : fallbackDays
    );
  }

  return "";
}

function getDefaultRecurringStatus(status: InvoiceStatus): InvoiceStatus {
  if (status === "Paid" || status === "Accepted") {
    return "Unpaid";
  }

  return status;
}

function isInvoiceOverdue(invoice: Invoice) {
  if (!invoice.dueDate) {
    return false;
  }

  if (invoice.status === "Paid" || invoice.status === "Declined") {
    return false;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const dueDate = new Date(`${invoice.dueDate}T12:00:00`);

  return dueDate < todayStart;
}

export default function InvoicesPage({
  invoices,
  quotes,
  customers,
  documentHistory,
  showOwnerHistory = false,
  recurringInvoiceTemplates,
  defaultPaymentTermsDays,
  businessDetails,
  onCreate,
  onEdit,
  onDelete,
  onUpdateStatus,
  onMarkSent,
  stripeInvoicePaymentsEnabled = false,
  onCreatePaymentLink,
  onSendText,
  onSaveRecurringTemplate,
  onDeleteRecurringTemplate,
}: Props) {
  const [sendTarget, setSendTarget] = useState<SendTarget>(null);
  const [activeFilter, setActiveFilter] = useState<InvoiceFilter>("All");
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const [paymentLinkNotice, setPaymentLinkNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [paymentLinkInvoiceId, setPaymentLinkInvoiceId] = useState<string | null>(
    null
  );
  const [openActionMenu, setOpenActionMenu] =
    useState<InvoiceActionMenuState | null>(null);
  const [recurringEditor, setRecurringEditor] = useState<RecurringEditorState>(null);
  const [recurringFrequency, setRecurringFrequency] =
    useState<RecurringInvoiceFrequency>("Monthly");
  const [recurringNextSendDate, setRecurringNextSendDate] = useState(
    getTodayDateInputValue()
  );
  const [recurringNextDueDate, setRecurringNextDueDate] = useState(
    getTodayDateInputValue()
  );
  const [recurringSendMethod, setRecurringSendMethod] =
    useState<DocumentDeliveryMethod>("email");
  const [recurringSendTo, setRecurringSendTo] = useState("");
  const [recurringIsActive, setRecurringIsActive] = useState(true);
  const [isSavingRecurring, setIsSavingRecurring] = useState(false);

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

  useEffect(() => {
    if (!paymentLinkNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPaymentLinkNotice(null);
    }, 5500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [paymentLinkNotice]);

  useEffect(() => {
    if (!openActionMenu) {
      return undefined;
    }

    function closeIfOutside(event: PointerEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-action-menu-root]")
      ) {
        return;
      }

      setOpenActionMenu(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenActionMenu(null);
      }
    }

    const closeMenu = () => setOpenActionMenu(null);

    window.addEventListener("pointerdown", closeIfOutside);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("pointerdown", closeIfOutside);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [openActionMenu]);

  const activeInvoice = useMemo(
    () =>
      sendTarget
        ? invoices.find((invoice) => invoice.id === sendTarget.invoiceId) ?? null
        : null,
    [invoices, sendTarget]
  );
  const activeCustomer = useMemo(
    () =>
      activeInvoice?.customerId != null
        ? customers.find((customer) => customer.id === activeInvoice.customerId) ?? null
        : null,
    [activeInvoice, customers]
  );
  const emailRecipients = useMemo(
    () => (activeCustomer ? getCustomerEmailAddresses(activeCustomer) : []),
    [activeCustomer]
  );
  const recurringInvoice = useMemo(
    () =>
      recurringEditor
        ? invoices.find((invoice) => invoice.id === recurringEditor.invoiceId) ?? null
        : null,
    [invoices, recurringEditor]
  );
  const recurringTemplate = useMemo(
    () =>
      recurringEditor?.templateId
        ? recurringInvoiceTemplates.find(
            (template) => template.id === recurringEditor.templateId
          ) ?? null
        : null,
    [recurringEditor, recurringInvoiceTemplates]
  );
  const recurringCustomer = useMemo(
    () =>
      recurringInvoice?.customerId != null
        ? customers.find((customer) => customer.id === recurringInvoice.customerId) ?? null
        : null,
    [customers, recurringInvoice]
  );
  const recurringEmailOptions = useMemo(
    () => (recurringCustomer ? getCustomerEmailAddresses(recurringCustomer) : []),
    [recurringCustomer]
  );
  const recurringRecipientOptions = useMemo(
    () => recurringEmailOptions,
    [recurringEmailOptions]
  );
  const activeRecurringTemplateCount = useMemo(
    () =>
      recurringInvoiceTemplates.filter((template) => template.isActive).length,
    [recurringInvoiceTemplates]
  );
  const filteredInvoices = useMemo(() => {
    switch (activeFilter) {
      case "Draft":
        return invoices.filter((invoice) => invoice.status === "Draft");
      case "Paid":
        return invoices.filter((invoice) => invoice.status === "Paid");
      case "Overdue":
        return invoices.filter((invoice) => isInvoiceOverdue(invoice));
      default:
        return invoices;
    }
  }, [activeFilter, invoices]);
  const invoiceFilterCounts = useMemo(
    () => ({
      All: invoices.length,
      Draft: invoices.filter((invoice) => invoice.status === "Draft").length,
      Paid: invoices.filter((invoice) => invoice.status === "Paid").length,
      Overdue: invoices.filter((invoice) => isInvoiceOverdue(invoice)).length,
    }),
    [invoices]
  );
  const emptyStateMessage =
    activeFilter === "All"
      ? "No invoices created yet."
      : `No ${activeFilter.toLowerCase()} invoices found.`;
  const historyItems = useMemo<InvoiceHistoryItem[]>(
    () =>
      invoices
        .flatMap((invoice) =>
          (documentHistory[invoice.id] ?? []).map((entry) => ({
            document: invoice,
            entry,
          }))
        )
        .sort((left, right) =>
          right.entry.occurredAt.localeCompare(left.entry.occurredAt)
        ),
    [documentHistory, invoices]
  );
  const recentHistoryItems = historyItems.slice(0, 12);

  function openRecurringEditor(invoiceId: string, template?: RecurringInvoiceTemplate) {
    const invoice = invoices.find((entry) => entry.id === invoiceId) ?? null;
    const customer =
      invoice?.customerId != null
        ? customers.find((entry) => entry.id === invoice.customerId) ?? null
        : null;
    const emailOptions = customer ? getCustomerEmailAddresses(customer) : [];
    const phoneValue = customer?.phone?.trim() || "";
    const nextSendDate =
      template?.nextSendDate || invoice?.date || getTodayDateInputValue();
    const dueDaysAfterIssue = invoice
      ? getInvoiceDueDaysAfterIssue(invoice, defaultPaymentTermsDays)
      : defaultPaymentTermsDays;
    const nextDueDateCandidate =
      (template
        ? getRecurringTemplatePaymentByDate(template, defaultPaymentTermsDays)
        : "") || addDaysToDateInputValue(nextSendDate, dueDaysAfterIssue);
    const nextDueDate =
      getInputDateValue(nextDueDateCandidate) >= getInputDateValue(nextSendDate)
        ? nextDueDateCandidate
        : addDaysToDateInputValue(nextSendDate, dueDaysAfterIssue);
    const sendMethod = template?.preferredSendMethod || "email";
    const sendTo =
      template?.sendTo ||
      (sendMethod === "email" ? emailOptions[0] ?? "" : phoneValue);

    setRecurringEditor({
      invoiceId,
      templateId: template?.id,
    });
    setRecurringFrequency(template?.frequency ?? "Monthly");
    setRecurringNextSendDate(nextSendDate);
    setRecurringNextDueDate(nextDueDate);
    setRecurringSendMethod(sendMethod);
    setRecurringSendTo(sendTo);
    setRecurringIsActive(template?.isActive ?? true);
  }

  function closeRecurringEditor() {
    setRecurringEditor(null);
    setIsSavingRecurring(false);
  }

  async function ensureInvoicePaymentLink(invoice: Invoice) {
    if (
      !stripeInvoicePaymentsEnabled ||
      invoice.status === "Paid" ||
      !onCreatePaymentLink
    ) {
      return invoice;
    }

    setPaymentLinkInvoiceId(invoice.id);

    try {
      return (await onCreatePaymentLink(invoice.id)) ?? invoice;
    } finally {
      setPaymentLinkInvoiceId(null);
    }
  }

  async function handleDownloadInvoicePdf(invoice: Invoice) {
    try {
      const invoiceForPdf = await ensureInvoicePaymentLink(invoice);
      await generateInvoicePDF(invoiceForPdf, businessDetails);
    } catch (error) {
      setPaymentLinkNotice({
        type: "error",
        text:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to prepare the invoice PDF.",
      });
    }
  }

  async function handlePaymentLinkAction(invoice: Invoice) {
    if (!onCreatePaymentLink) {
      if (
        invoice.stripePaymentLinkUrl &&
        invoice.stripePaymentStatus !== "expired"
      ) {
        window.open(
          invoice.stripePaymentLinkUrl,
          "_blank",
          "noopener,noreferrer"
        );
        return;
      }

      setPaymentLinkNotice({
        type: "error",
        text: "Stripe invoice payments are not available in this workspace.",
      });
      return;
    }

    try {
      setPaymentLinkInvoiceId(invoice.id);
      const updatedInvoice = await onCreatePaymentLink(invoice.id);

      if (!updatedInvoice?.stripePaymentLinkUrl) {
        throw new Error("Stripe did not return a payment link.");
      }

      setPaymentLinkNotice({
        type: "success",
        text: `Payment link ready for ${updatedInvoice.invoiceNumber}.`,
      });
      window.open(
        updatedInvoice.stripePaymentLinkUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      setPaymentLinkNotice({
        type: "error",
        text:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to create the payment link.",
      });
    } finally {
      setPaymentLinkInvoiceId(null);
    }
  }

  function getInvoiceActionItems(
    invoice: Invoice,
    existingTemplate: RecurringInvoiceTemplate | null
  ): InvoiceActionMenuItem[] {
    const statusItems: InvoiceActionMenuItem[] =
      invoice.status !== "Paid"
        ? [
            {
              action: "paid",
              label: "Mark as paid",
              tone: "accept",
            },
          ]
        : [];

    return [
      ...statusItems,
      {
        action: "edit",
        label: "Edit",
        separatorBefore: statusItems.length > 0,
      },
      { action: "pdf", label: "Download PDF" },
      ...(stripeInvoicePaymentsEnabled && invoice.status !== "Paid"
        ? [
            {
              action: "payment-link" as const,
              label:
                invoice.stripePaymentLinkUrl &&
                invoice.stripePaymentStatus !== "expired"
                  ? "Open payment link"
                  : "Create payment link",
              tone: "primary" as const,
            },
          ]
        : []),
      { action: "email", label: "Email invoice" },
      ...(onSendText ? [{ action: "text" as const, label: "Send by text" }] : []),
      {
        action: "recurring",
        label: existingTemplate ? "Edit recurring" : "Make recurring",
      },
      {
        action: "delete",
        label: "Delete",
        tone: "danger",
        separatorBefore: true,
      },
    ];
  }

  async function handleInvoiceAction(
    invoice: Invoice,
    action: InvoiceAction,
    existingTemplate: RecurringInvoiceTemplate | null
  ) {
    switch (action) {
      case "edit":
        onEdit(invoice.id);
        break;
      case "paid":
        await onUpdateStatus(invoice.id, "Paid");
        break;
      case "pdf":
        await handleDownloadInvoicePdf(invoice);
        break;
      case "payment-link":
        await handlePaymentLinkAction(invoice);
        break;
      case "email":
        setSendTarget({ invoiceId: invoice.id, method: "email" });
        break;
      case "text":
        onSendText?.(invoice.id);
        break;
      case "recurring":
        openRecurringEditor(invoice.id, existingTemplate ?? undefined);
        break;
      case "delete":
        onDelete(invoice.id);
        break;
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
              Customer Documents
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Invoices</h1>
            <p className="mt-2 text-sm text-white/75">
              Create, track, export, send, and manage customer invoices.
            </p>
          </div>

          <button
            onClick={onCreate}
            data-tour="invoice-new-button"
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            New Invoice
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

      {paymentLinkNotice ? (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            paymentLinkNotice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <CreditCard size={18} className="mt-0.5 shrink-0" />
          <p className="font-semibold">{paymentLinkNotice.text}</p>
        </div>
      ) : null}

      <section
        data-tour="recurring-invoices"
        className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Recurring Invoices
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              Scheduled Templates
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Use any saved invoice as a template and generate new copies on or
              after the next send date you choose.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
            <Repeat size={14} />
            {activeRecurringTemplateCount} active template
            {activeRecurringTemplateCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {recurringInvoiceTemplates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 lg:col-span-2">
              No recurring invoices set up yet. Use the `Recurring` button on an
              invoice below to create one.
            </div>
          ) : (
            recurringInvoiceTemplates.map((template) => {
              const sourceInvoice = invoices.find(
                (invoice) => invoice.id === template.sourceInvoiceId
              );
              const paymentByDate = getRecurringTemplatePaymentByDate(
                template,
                defaultPaymentTermsDays
              );

              return (
                <article
                  key={template.id}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black tracking-tight text-slate-900">
                        {template.customerName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {template.frequency} • Next send{" "}
                        {formatStoredDate(template.nextSendDate)}
                        {paymentByDate ? (
                          <>
                            {" - Payment by "}
                            {formatStoredDate(paymentByDate)}
                          </>
                        ) : null}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        template.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {template.isActive ? "Active" : "Paused"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs text-slate-400">Template Source</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {sourceInvoice?.invoiceNumber ??
                          template.sourceInvoiceId ??
                          "Saved template"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs text-slate-400">Preferred Send</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {template.preferredSendMethod
                          ? `Email${
                              template.sendTo ? ` • ${template.sendTo}` : ""
                            }`
                          : "Manual"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      onClick={() =>
                        openRecurringEditor(template.sourceInvoiceId || "", template)
                      }
                      disabled={!template.sourceInvoiceId}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void onDeleteRecurringTemplate(template.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4">
          <div
            data-tour="invoice-filters"
            className="inline-flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1"
          >
            {INVOICE_FILTER_OPTIONS.map((filterOption) => {
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
                    {invoiceFilterCounts[filterOption]}
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
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Linked Quote</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    {emptyStateMessage}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const existingTemplate =
                    recurringInvoiceTemplates.find(
                      (template) => template.sourceInvoiceId === invoice.id
                    ) ?? null;

                  return (
                    <tr key={invoice.id} className="border-t border-slate-100">
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        <div className="flex flex-col gap-1">
                          <span>{invoice.invoiceNumber}</span>
                          {existingTemplate ? (
                            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                              <Repeat size={12} />
                              Recurring
                            </span>
                          ) : null}
                          {invoice.stripePaymentLinkUrl ||
                          invoice.stripePaymentStatus === "paid" ? (
                            <span
                              className={`inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPaymentLinkClasses(
                                invoice
                              )}`}
                            >
                              <Link2 size={12} />
                              {getPaymentLinkLabel(invoice)}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {invoice.customerName}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        <div>{formatStoredDate(invoice.date)}</div>
                        {invoice.dueDate ? (
                          <div className="mt-1 text-xs text-slate-400">
                            Due by {formatStoredDate(invoice.dueDate)}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getInvoiceStatusClasses(
                            invoice.status
                          )}`}
                        >
                          {invoice.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {invoice.linkedQuoteId ? (() => {
                          const linkedQuote = quotes.find(
                            (quote) => quote.id === invoice.linkedQuoteId
                          );

                          return linkedQuote ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              <FileText size={12} />
                              {linkedQuote.quoteNumber}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              <FileText size={12} />
                              {invoice.linkedQuoteId}
                            </span>
                          );
                        })() : (
                          "—"
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                        {formatCurrency(invoice.total)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end">
                          <div data-action-menu-root className="relative">
                            <button
                              type="button"
                              aria-haspopup="menu"
                              aria-expanded={openActionMenu?.invoiceId === invoice.id}
                              disabled={paymentLinkInvoiceId === invoice.id}
                              onClick={(event) => {
                                const items = getInvoiceActionItems(
                                  invoice,
                                  existingTemplate
                                );
                                const position = getActionMenuPosition(
                                  event.currentTarget,
                                  items.length
                                );

                                setOpenActionMenu((currentMenu) =>
                                  currentMenu?.invoiceId === invoice.id
                                    ? null
                                    : {
                                        invoiceId: invoice.id,
                                        ...position,
                                      }
                                );
                              }}
                              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0f2343] px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#153c3f] focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {paymentLinkInvoiceId === invoice.id
                                ? "Working..."
                                : "Actions"}
                              <ChevronDown
                                size={16}
                                className={`transition ${
                                  openActionMenu?.invoiceId === invoice.id
                                    ? "rotate-180"
                                    : ""
                                }`}
                              />
                            </button>
                          </div>
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

      {openActionMenu ? (() => {
        const invoice =
          invoices.find((entry) => entry.id === openActionMenu.invoiceId) ?? null;

        if (!invoice) {
          return null;
        }

        const existingTemplate =
          recurringInvoiceTemplates.find(
            (template) => template.sourceInvoiceId === invoice.id
          ) ?? null;
        const actionItems = getInvoiceActionItems(invoice, existingTemplate);

        return (
          <div
            data-action-menu-root
            role="menu"
            className="fixed z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5"
            style={{
              top: openActionMenu.top,
              left: openActionMenu.left,
              width: openActionMenu.width,
            }}
          >
            <div className="mb-1 px-3 py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {invoice.invoiceNumber}
              </p>
            </div>
            {actionItems.map((item) => (
              <div
                key={item.action}
                className={item.separatorBefore ? "mt-1 border-t border-slate-100 pt-1" : ""}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpenActionMenu(null);
                    void handleInvoiceAction(invoice, item.action, existingTemplate);
                  }}
                  className={getInvoiceActionItemClasses(item.tone)}
                >
                  <span>{item.label}</span>
                </button>
              </div>
            ))}
          </div>
        );
      })() : null}

      {showOwnerHistory ? (
      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              History
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              Invoice History
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
              No invoice history yet.
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
                      {document.invoiceNumber}
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
      ) : null}

      {sendTarget && activeInvoice ? (
        <DocumentSendDialog
          isOpen
          method={sendTarget.method}
          title={`Email ${activeInvoice.invoiceNumber}`}
          recipientOptions={emailRecipients}
          initialRecipients={emailRecipients.slice(0, 1)}
          initialSubject={getInvoiceEmailSubject(activeInvoice, businessDetails)}
          initialMessage={getInvoiceEmailMessage(activeInvoice, businessDetails)}
          onClose={() => setSendTarget(null)}
          onSend={async ({ recipient, recipients, subject, message }) => {
            const invoiceForSending = await ensureInvoicePaymentLink(activeInvoice);
            const fallbackMessage = getInvoiceEmailMessage(
              invoiceForSending,
              businessDetails
            );
            const resolvedMessage = appendPaymentLinkToMessage(
              message.trim() || fallbackMessage,
              invoiceForSending
            );

            await sendInvoiceDocument({
              invoice: invoiceForSending,
              businessDetails,
              method: sendTarget.method,
              recipients,
              subject:
                subject.trim() ||
                getInvoiceEmailSubject(invoiceForSending, businessDetails),
              message: resolvedMessage,
            });

            await onMarkSent(invoiceForSending.id, {
              method: sendTarget.method,
              recipient,
            });

            setSendNotice(
              `Email sent to ${recipient} for ${invoiceForSending.invoiceNumber}.`
            );
          }}
        />
      ) : null}

      {recurringEditor && recurringInvoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Recurring Invoice
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  {recurringTemplate ? "Edit Recurring Invoice" : "Create Recurring Invoice"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  New invoices will be generated from {recurringInvoice.invoiceNumber} on or
                  after the next send date you choose.
                </p>
              </div>

              <button
                onClick={closeRecurringEditor}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Next Send Date
                </label>
                <input
                  type="date"
                  value={recurringNextSendDate}
                  onChange={(event) => {
                    const nextSendDate = event.target.value;
                    const dueDaysAfterIssue = getInvoiceDueDaysAfterIssue(
                      recurringInvoice,
                      defaultPaymentTermsDays
                    );

                    setRecurringNextSendDate(nextSendDate);

                    if (
                      !getInputDateValue(recurringNextDueDate) ||
                      getInputDateValue(recurringNextDueDate) <
                        getInputDateValue(nextSendDate)
                    ) {
                      setRecurringNextDueDate(
                        addDaysToDateInputValue(nextSendDate, dueDaysAfterIssue)
                      );
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Payment By Date
                </label>
                <input
                  type="date"
                  value={recurringNextDueDate}
                  min={recurringNextSendDate || undefined}
                  onChange={(event) => setRecurringNextDueDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Frequency
                </label>
                <select
                  value={recurringFrequency}
                  onChange={(event) =>
                    setRecurringFrequency(event.target.value as RecurringInvoiceFrequency)
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                >
                  {RECURRING_FREQUENCY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Preferred Send Method
                </label>
                <select
                  value={recurringSendMethod}
                  onChange={(event) => {
                    const nextMethod = event.target.value as DocumentDeliveryMethod;
                    setRecurringSendMethod(nextMethod);
                    setRecurringSendTo(recurringEmailOptions[0] ?? "");
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="email">Email</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Send To
                </label>
                {recurringRecipientOptions.length > 0 ? (
                  <select
                    value={recurringSendTo}
                    onChange={(event) => setRecurringSendTo(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                  >
                    {recurringRecipientOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={recurringSendTo}
                    onChange={(event) => setRecurringSendTo(event.target.value)}
                    placeholder="customer@example.com"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                  />
                )}
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={recurringIsActive}
                    onChange={(event) => setRecurringIsActive(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  Keep this recurring invoice active
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  Generated invoices will keep the same line items, VAT setup, and
                  selected payment-by date. Preferred send details are saved with
                  the template so the new invoice is ready for you to send.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                onClick={closeRecurringEditor}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsSavingRecurring(true);

                  try {
                    const normalizedNextSendDate =
                      getInputDateValue(recurringNextSendDate) ||
                      getTodayDateInputValue();
                    const dueDaysAfterIssue = getInvoiceDueDaysAfterIssue(
                      recurringInvoice,
                      defaultPaymentTermsDays
                    );
                    const normalizedNextDueDate =
                      getInputDateValue(recurringNextDueDate) >=
                      normalizedNextSendDate
                        ? getInputDateValue(recurringNextDueDate)
                        : addDaysToDateInputValue(
                            normalizedNextSendDate,
                            dueDaysAfterIssue
                          );
                    const templatePayload: RecurringInvoiceTemplate = {
                      id: recurringTemplate?.id ?? crypto.randomUUID(),
                      sourceInvoiceId: recurringInvoice.id,
                      customerId: recurringInvoice.customerId,
                      customerName: recurringInvoice.customerName,
                      customerType: recurringInvoice.customerType,
                      customerAddress: recurringInvoice.customerAddress,
                      customerTown: recurringInvoice.customerTown,
                      customerPostcode: recurringInvoice.customerPostcode,
                      siteName: recurringInvoice.siteName,
                      siteAddress: recurringInvoice.siteAddress,
                      siteTown: recurringInvoice.siteTown,
                      sitePostcode: recurringInvoice.sitePostcode,
                      status: getDefaultRecurringStatus(recurringInvoice.status),
                      items: recurringInvoice.items.map((item) => ({ ...item })),
                      notes: recurringInvoice.notes,
                      terms: recurringInvoice.terms,
                      vatRate: recurringInvoice.vatRate,
                      dueDaysAfterIssue: getInvoiceDueDaysAfterIssue(
                        recurringInvoice,
                        defaultPaymentTermsDays
                      ),
                      linkedQuoteId: recurringInvoice.linkedQuoteId,
                      frequency: recurringFrequency,
                      nextSendDate: normalizedNextSendDate,
                      nextDueDate: normalizedNextDueDate,
                      preferredSendMethod: recurringSendMethod,
                      sendTo: recurringSendTo.trim() || undefined,
                      isActive: recurringIsActive,
                      lastGeneratedDate: recurringTemplate?.lastGeneratedDate,
                    };

                    const saved = await onSaveRecurringTemplate(templatePayload);

                    if (saved) {
                      closeRecurringEditor();
                    }
                  } finally {
                    setIsSavingRecurring(false);
                  }
                }}
                disabled={
                  !recurringNextSendDate || !recurringNextDueDate || isSavingRecurring
                }
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingRecurring ? "Saving..." : "Save Recurring Invoice"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
