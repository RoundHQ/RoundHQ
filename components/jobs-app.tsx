"use client";
// Created By William Williamson For Cleancut Garden & Property Maintenance.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  BriefcaseBusiness,
  Repeat,
  CreditCard,
  History as HistoryIcon,
  Users,
  UserCog,
  Map as MapIcon,
  ClipboardList,
  FileText,
  Receipt,
  ArrowLeft,
  CheckCircle2,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Pencil,
  Phone,
  Save,
  TrendingUp,
  Trash2,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  LogOut,
  Inbox,
  X,
} from "lucide-react";

import CustomersPage from "@/components/jobs/customers-page";
import CustomerProfitPage from "@/components/jobs/customer-profit-page";
import CustomerLeadsPage from "@/components/jobs/customer-leads-page";
import CustomerProfilePage from "@/components/jobs/customer-profile-page";
import HistoryPage from "@/components/jobs/history-page";
import ActionsPage from "@/components/jobs/actions-page";
import MapPage from "@/components/jobs/map-page";
import RouteEfficiencyPage from "@/components/jobs/route-efficiency-page";
import StaffPage from "@/components/jobs/staff-page";
import RoundsPage from "@/components/jobs/rounds-page";
import DashboardPage from "@/components/jobs/dashboard-page";
import SchedulePage from "@/components/jobs/schedule-page";
import JobsPage from "@/components/jobs/jobs-page";
import QuotesPage from "@/components/jobs/quotes-page";
import QuoteForm from "@/components/jobs/quote-form";
import InvoicesPage from "@/components/jobs/invoices-page";
import InvoiceForm from "@/components/jobs/invoice-form";
import WorkflowMessageDialog from "@/components/jobs/workflow-message-dialog";
import PaymentsPage from "@/components/jobs/payments-page";
import SettingsPage from "@/components/jobs/settings-page";
import CommercialDocsPage from "@/components/jobs/commercial-docs-page";
import type { RouteChangeRecord } from "@/components/jobs/route-efficiency";
import {
  DEFAULT_GRASS_CUT_SEASON_END,
  DEFAULT_GRASS_CUT_SEASON_START,
  getCustomerEmailAddresses,
  getCustomerDisplayAddress,
  getCustomerTotals,
  getFortnightWeek,
  getInputDateValue,
  getWorkdayFromDate,
  getTodayDateInputValue,
  toStoredDateTime,
} from "@/components/jobs/helpers";
import {
  buildTextMessageUrl,
  sendCustomerEmailMessage,
  sendCustomerTextMessage,
} from "@/components/jobs/document-delivery";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  COMMERCIAL_RAMS_SELECT_FIELDS,
  mapCommercialRamsRowToDocument,
  mapCommercialRamsToRow,
  type CommercialRamsRow,
} from "@/lib/supabase/commercial-rams-data";
import {
  mapCustomerRowToCustomer,
  mapCustomerToRow,
  mapVisitToLegacyRow,
  mapVisitRowToVisit,
  mapVisitToRow,
  type CustomerRow,
  VISIT_LEGACY_SELECT_FIELDS,
  VISIT_SELECT_FIELDS,
  type VisitRow,
} from "@/lib/supabase/jobs-data";
import {
  CUSTOMER_LEAD_SELECT_FIELDS,
  mapCustomerLeadRowToLead,
  mapCustomerLeadToWriteRow,
  sortCustomerLeads,
  type CustomerLeadRow,
} from "@/lib/supabase/customer-leads-data";

import {
  type CommercialRamsDocument,
  type CustomerLead,
  type CustomerLeadActivity,
  type CustomerLeadCustomerDraft,
  type CustomerLeadReply,
  type CustomerLeadStatus,
  type DashboardAttentionItem,
  type DocumentHistoryEntry,
  type DocumentDeliveryMethod,
  INVOICE_STATUS_OPTIONS,
  QUOTE_STATUS_OPTIONS,
  type Customer,
  type InvoiceReminderState,
  type InvoiceStatus,
  type MonthlyPayment,
  type QuoteFollowUpState,
  type RecurringInvoiceFrequency,
  type RecurringInvoiceTemplate,
  type VisitLog,
  type NotCutReason,
  type QuoteStatus,
  type RolePermission,
  type StaffMember,
  type StaffPageAccessKey,
  type StaffRole,
} from "@/components/jobs/types";

type QuoteService = {
  id: string;
  title: string;
  category: string;
  itemType: "service" | "product";
  price: number;
  buyPrice: number;
};

type WorkflowMessageMethod = DocumentDeliveryMethod | "both";

type AppSettings = {
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
  themeMode: "light" | "dark" | "system";
  compactMode: boolean;

  defaultGrassCutPrice: number;
  defaultHedgeCutPrice: number;
  defaultPressureWashRate: number;
  defaultHourlyRate: number;
  fuelSurcharge: number;
  minimumCharge: number;

  defaultPaymentMethod: "cash" | "bank_transfer" | "direct_debit" | "invoice";
  defaultCutType: "front_only" | "front_back" | "full_garden";
  defaultVisitDay: string;
  defaultVisitFrequencyDays: number;
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


type PageKey =
    | "dashboard"
    | "schedule"
    | "jobs"
    | "scheduledJobProfile"
    | "rounds"
    | "commercial"
    | "routeEfficiency"
    | "history"
    | "leads"
    | "customers"
    | "customerProfit"
    | "payments"
    | "customerProfile"
    | "actions"
    | "map"
    | "staff"
    | "quotes"
    | "quoteForm"
    | "invoices"
    | "invoiceForm"
    | "commercialDocs"
    | "settings";

type DayName = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
type WeekName = "Week 1" | "Week 2";
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

type RecurringInvoiceTemplateRecord = RecurringInvoiceTemplate;

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

type ScheduledJobChecklistKey =
    | "arrived"
    | "accessConfirmed"
    | "workComplete"
    | "invoiceSent";

type ScheduledJobChecklistState = Record<ScheduledJobChecklistKey, boolean>;

type PendingQuoteSchedule = {
  quoteId: string;
  quoteNumber: string;
  title: string;
  customerName: string;
  notes?: string;
  scheduledDate?: string;
  startTime?: string;
  finishTime?: string;
  hasExistingJob: boolean;
};

type PendingLeadQuoteDraft = DocumentCustomerFields & {
  leadId: string;
  customerName: string;
  initialNotes: string;
  initialItems: LineItem[];
};

type WorkflowMessageTarget =
    | {
        kind: "quote_follow_up";
        quoteId: string;
      }
    | {
        kind: "invoice_overdue";
        invoiceId: string;
      };

type DocumentSendMetadata = {
  method?: DocumentDeliveryMethod;
  recipient?: string;
};

type PersistedAppState = {
  version: 1;
  scheduledJobs: ScheduledJob[];
  scheduledJobChecklists: Record<string, ScheduledJobChecklistState>;
  quoteFollowUps: Record<string, QuoteFollowUpState>;
  invoiceReminders: Record<string, InvoiceReminderState>;
  quoteHistory: Record<string, DocumentHistoryEntry[]>;
  invoiceHistory: Record<string, DocumentHistoryEntry[]>;
  ignoredMoveSuggestionIds: string[];
  routeChangeHistory: RouteChangeRecord[];
  routeNotes: Record<string, string>;
  quotes: Quote[];
  invoices: Invoice[];
  recurringInvoiceTemplates: RecurringInvoiceTemplateRecord[];
  lockedRounds: Record<string, boolean>;
  activeRoundCycles: Record<string, number>;
  pendingCashPaymentDates: Record<string, string>;
  selectedWeek: WeekName;
  selectedDay: DayName;
  appSettings: AppSettings;
  quotesTableInitialized: boolean;
  invoicesWriteFallbackActive: boolean;
  recurringInvoiceTemplatesFallbackActive: boolean;
};

type TodayPanelState = {
  week: WeekName;
  dayLabel: string;
  selectedDay: DayName | null;
  roundKey: string | null;
};

type WorkflowTablesReady = {
  items: boolean;
  quotes: boolean;
  invoices: boolean;
  recurringInvoiceTemplates: boolean;
  scheduledJobs: boolean;
  monthlyPayments: boolean;
  commercialRams: boolean;
  customerLeads: boolean;
};

type StaffTablesReady = {
  staffMembers: boolean;
  rolePermissions: boolean;
};

type StaffMemberRow = {
  id: number;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean | null;
  phone: string | null;
  notes: string | null;
  is_system_admin: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type StaffMemberWriteRow = {
  auth_user_id?: string | null;
  email: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  phone: string | null;
  notes: string | null;
  is_system_admin?: boolean;
};

type RolePermissionRow = {
  role: string;
  page_key: string;
  allowed: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type RolePermissionWriteRow = {
  role: StaffRole;
  page_key: StaffPageAccessKey;
  allowed: boolean;
};

type CatalogItemRow = {
  id: string;
  title: string;
  category: string | null;
  item_type: string;
  price: number | null;
  buy_price: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type CatalogItemWriteRow = {
  id: string;
  title: string;
  category: string | null;
  item_type: QuoteService["itemType"];
  price: number;
  buy_price: number;
};

type QuoteRow = {
  id: string;
  quote_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_type: string | null;
  customer_address: string | null;
  customer_town: string | null;
  customer_postcode: string | null;
  site_name: string | null;
  site_address: string | null;
  site_town: string | null;
  site_postcode: string | null;
  date: string;
  status: string;
  items: LineItem[] | null;
  notes: string | null;
  total: number | null;
  created_at: string | null;
};

type QuoteWriteRow = {
  id: string;
  quote_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_type: CustomerType | null;
  customer_address: string | null;
  customer_town: string | null;
  customer_postcode: string | null;
  site_name: string | null;
  site_address: string | null;
  site_town: string | null;
  site_postcode: string | null;
  date: string;
  status: Quote["status"];
  items: LineItem[];
  notes: string | null;
  total: number;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_type: string | null;
  customer_address: string | null;
  customer_town: string | null;
  customer_postcode: string | null;
  site_name: string | null;
  site_address: string | null;
  site_town: string | null;
  site_postcode: string | null;
  date: string;
  due_date: string | null;
  status: string;
  items: LineItem[] | null;
  notes: string | null;
  terms: string | null;
  vat_rate: number | null;
  vat_amount: number | null;
  total: number | null;
  linked_quote_id: string | null;
  created_at: string | null;
};

type InvoiceWriteRow = {
  id: string;
  invoice_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_type: CustomerType | null;
  customer_address: string | null;
  customer_town: string | null;
  customer_postcode: string | null;
  site_name: string | null;
  site_address: string | null;
  site_town: string | null;
  site_postcode: string | null;
  date: string;
  due_date: string | null;
  status: Invoice["status"];
  items: LineItem[];
  notes: string | null;
  terms: string | null;
  vat_rate: number | null;
  vat_amount: number | null;
  total: number;
  linked_quote_id: string | null;
};

type RecurringInvoiceTemplateRow = {
  id: string;
  source_invoice_id: string | null;
  customer_id: number | null;
  customer_name: string;
  customer_type: string | null;
  customer_address: string | null;
  customer_town: string | null;
  customer_postcode: string | null;
  site_name: string | null;
  site_address: string | null;
  site_town: string | null;
  site_postcode: string | null;
  status: string;
  items: LineItem[] | null;
  notes: string | null;
  terms: string | null;
  vat_rate: number | null;
  due_days_after_issue: number | null;
  linked_quote_id: string | null;
  frequency: string;
  next_send_date: string;
  preferred_send_method: string | null;
  send_to: string | null;
  is_active: boolean | null;
  last_generated_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type RecurringInvoiceTemplateWriteRow = {
  id: string;
  source_invoice_id: string | null;
  customer_id: number | null;
  customer_name: string;
  customer_type: CustomerType | null;
  customer_address: string | null;
  customer_town: string | null;
  customer_postcode: string | null;
  site_name: string | null;
  site_address: string | null;
  site_town: string | null;
  site_postcode: string | null;
  status: Invoice["status"];
  items: LineItem[];
  notes: string | null;
  terms: string | null;
  vat_rate: number | null;
  due_days_after_issue: number | null;
  linked_quote_id: string | null;
  frequency: RecurringInvoiceFrequency;
  next_send_date: string;
  preferred_send_method: DocumentDeliveryMethod | null;
  send_to: string | null;
  is_active: boolean;
  last_generated_date: string | null;
};

type ScheduledJobRow = {
  id: string;
  title: string;
  date: string;
  notes: string | null;
  start_time: string | null;
  finish_time: string | null;
  customer_id: number | null;
  customer_name: string | null;
  type: string;
  status: string;
  quote_ids: string[] | null;
  invoice_ids: string[] | null;
  created_at: string | null;
};

type ScheduledJobWriteRow = {
  id: string;
  title: string;
  date: string;
  notes: string | null;
  start_time: string | null;
  finish_time: string | null;
  customer_id: number | null;
  customer_name: string | null;
  type: ScheduledJobType;
  status: ScheduledJobStatus;
  quote_ids: string[];
  invoice_ids: string[];
  created_at: string;
};

type MonthlyPaymentRow = {
  id: number;
  customer_id: number;
  payment_month: string;
  payment_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type MonthlyPaymentWriteRow = {
  customer_id: number;
  payment_month: string;
  payment_date: string | null;
};

const CUSTOMER_SELECT_FIELDS = "*";
const QUOTE_SELECT_FIELDS =
    "id,quote_number,customer_id,customer_name,customer_type,customer_address,customer_town,customer_postcode,site_name,site_address,site_town,site_postcode,date,status,items,notes,total,created_at";
const INVOICE_SELECT_FIELDS =
    "id,invoice_number,customer_id,customer_name,customer_type,customer_address,customer_town,customer_postcode,site_name,site_address,site_town,site_postcode,date,due_date,status,items,notes,terms,vat_rate,vat_amount,total,linked_quote_id,created_at";
const RECURRING_INVOICE_TEMPLATE_SELECT_FIELDS = "*";
const SCHEDULED_JOB_SELECT_FIELDS = "*";
const MONTHLY_PAYMENT_SELECT_FIELDS =
    "id,customer_id,payment_month,payment_date,created_at,updated_at";
const STAFF_MEMBER_SELECT_FIELDS =
    "id,auth_user_id,email,full_name,role,is_active,phone,notes,is_system_admin,created_at,updated_at";
const ROLE_PERMISSION_SELECT_FIELDS =
    "role,page_key,allowed,created_at,updated_at";
const VISIT_ROUND_METADATA_SETUP_NOTICE =
    "Supabase is connected, but the visits table needs the latest round metadata columns. Run the visit round metadata SQL setup script and refresh.";

const SETTINGS_STORAGE_KEY = "cleancut_settings";

const DEFAULT_APP_SETTINGS: AppSettings = {
  businessName: "Cleancut Garden & Property Maintenance",
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
      "Hi {{customerName}}, your grass has been cut today. Payment due: {{amount}}. {{paymentDetails}} Reference: {{paymentReference}}. Thanks, {{businessName}}",

  showWeatherWidget: true,
  showRevenueWidget: true,
  showJobsWidget: true,
  showUnpaidWidget: true,
  showRecentActivityWidget: true,

  publicLiabilityInsurance: "£1,000,000",
  termsAndConditionsUrl: "",
};

const STAFF_ROLES: StaffRole[] = ["Admin", "Staff", "Operator"];
const EDITABLE_STAFF_ROLES: Array<Exclude<StaffRole, "Admin">> = ["Staff", "Operator"];
const STAFF_PAGE_OPTIONS: {
  key: StaffPageAccessKey;
  label: string;
  section: string;
}[] = [
  { key: "dashboard", label: "Dashboard", section: "Dashboard" },
  { key: "schedule", label: "Schedule", section: "Dashboard" },
  { key: "rounds", label: "Rounds", section: "Grass Schedule" },
  { key: "history", label: "History", section: "Grass Schedule" },
  { key: "map", label: "Map", section: "Grass Schedule" },
  { key: "actions", label: "Actions", section: "Grass Schedule" },
  { key: "commercialDocs", label: "RAMS & Documents", section: "Commercial" },
  { key: "customers", label: "All Customers", section: "Customers" },
  { key: "quotes", label: "Quotes", section: "Customers" },
  { key: "invoices", label: "Invoices", section: "Customers" },
  { key: "staff", label: "Staff", section: "Staff" },
  { key: "settings", label: "Settings", section: "System" },
];
const ADMIN_ONLY_PAGE_KEYS = new Set<StaffPageAccessKey>(["staff", "settings"]);
const PAGE_PERMISSION_OVERRIDES: Record<PageKey, StaffPageAccessKey> = {
  dashboard: "dashboard",
  schedule: "schedule",
  jobs: "schedule",
  scheduledJobProfile: "schedule",
  rounds: "rounds",
  commercial: "rounds",
  routeEfficiency: "map",
  history: "history",
  leads: "dashboard",
  customers: "customers",
  customerProfit: "customers",
  payments: "customers",
  customerProfile: "customers",
  actions: "actions",
  map: "map",
  staff: "staff",
  quotes: "quotes",
  quoteForm: "quotes",
  invoices: "invoices",
  invoiceForm: "invoices",
  commercialDocs: "commercialDocs",
  settings: "settings",
};
const DEFAULT_ROLE_PAGE_ACCESS: Record<Exclude<StaffRole, "Admin">, StaffPageAccessKey[]> = {
  Staff: [
    "dashboard",
    "schedule",
    "rounds",
    "history",
    "map",
    "actions",
    "commercialDocs",
    "customers",
    "quotes",
    "invoices",
  ],
  Operator: ["dashboard", "rounds", "history", "map", "actions"],
};

function mergeAppSettings(value?: Partial<AppSettings> | null): AppSettings {
  const quoteFollowUpMethod =
      value?.quoteFollowUpMethod === "text" || value?.quoteFollowUpMethod === "both"
          ? value.quoteFollowUpMethod
          : "email";
  const invoiceReminderMethod =
      value?.invoiceReminderMethod === "text" || value?.invoiceReminderMethod === "both"
          ? value.invoiceReminderMethod
          : "email";

  return {
    ...DEFAULT_APP_SETTINGS,
    ...(value || {}),
    quoteFollowUpMethod,
    invoiceReminderMethod,
    quoteServices: normalizeQuoteServices(value?.quoteServices),
  };
}

function loadAppSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    return mergeAppSettings(JSON.parse(raw));
  } catch (error) {
    console.error("Failed to load app settings:", error);
    return DEFAULT_APP_SETTINGS;
  }
}

function getBrandSurface(settings: AppSettings) {
  return settings.themeMode === "dark" ? "#0f172a" : "#f5f7f8";
}

function getBrandPageBackground(settings: AppSettings) {
  return settings.themeMode === "dark" ? "#020617" : "#edf1f2";
}

function getSidebarBackground(settings: AppSettings) {
  return settings.secondaryColor || "#0b2324";
}

function getActiveNavBackground(settings: AppSettings) {
  return settings.primaryColor || "#163738";
}

function buildInvoiceNumber(settings: AppSettings, existingInvoices: Invoice[]) {
  const prefix = (settings.invoicePrefix || "INV").trim() || "INV";
  const nextConfiguredNumber = Number.isFinite(settings.nextInvoiceNumber)
      ? Math.max(1, Math.floor(settings.nextInvoiceNumber))
      : existingInvoices.length + 1;

  const existingIdentifiers = new Set(existingInvoices.map((invoice) => invoice.invoiceNumber));
  let candidate = nextConfiguredNumber;

  while (existingIdentifiers.has(`${prefix}-${String(candidate).padStart(4, "0")}`)) {
    candidate += 1;
  }

  return `${prefix}-${String(candidate).padStart(4, "0")}`;
}

function buildQuoteNumber(settings: AppSettings, existingQuotes: Quote[]) {
  const prefix = (settings.quotePrefix || "Q").trim() || "Q";
  const nextConfiguredNumber = Number.isFinite(settings.nextQuoteNumber)
      ? Math.max(1, Math.floor(settings.nextQuoteNumber))
      : existingQuotes.length + 1;

  const existingIdentifiers = new Set(existingQuotes.map((quote) => quote.quoteNumber));
  let candidate = nextConfiguredNumber;

  while (existingIdentifiers.has(`${prefix}-${String(candidate).padStart(3, "0")}`)) {
    candidate += 1;
  }

  return `${prefix}-${String(candidate).padStart(3, "0")}`;
}

function getQuoteServiceKey(service: QuoteService) {
  return `${service.category.trim().toLowerCase()}|${service.itemType}|${service.title
      .trim()
      .toLowerCase()}`;
}

function buildQuoteServiceId(service: Pick<QuoteService, "title" | "category" | "itemType">) {
  const normalizedKey = getQuoteServiceKey({
    id: "catalog-item",
    title: service.title,
    category: service.category,
    itemType: service.itemType,
    price: 0,
    buyPrice: 0,
  })
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
    const itemType: QuoteService["itemType"] =
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
      price: 0,
      buyPrice: 0,
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

function mapCatalogItemRowToQuoteService(row: CatalogItemRow): QuoteService {
  const itemType: QuoteService["itemType"] = row.item_type === "product" ? "product" : "service";

  return {
    id: row.id,
    title: row.title,
    category: row.category ?? "",
    itemType,
    price: Number(row.price ?? 0),
    buyPrice: itemType === "product" ? Number(row.buy_price ?? 0) : 0,
  };
}

function mapQuoteServiceToCatalogItemRow(service: QuoteService): CatalogItemWriteRow {
  return {
    id: service.id,
    title: service.title.trim(),
    category: service.category.trim() || null,
    item_type: service.itemType,
    price: Number(service.price ?? 0),
    buy_price:
        service.itemType === "product" ? Number(service.buyPrice ?? 0) : 0,
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getScheduledJobTimeInputValue(value?: string) {
  if (!value) {
    return "";
  }

  const [hour, minute] = value.split(":");

  if (!hour || !minute) {
    return value;
  }

  return `${hour.padStart(2, "0").slice(0, 2)}:${minute
      .padStart(2, "0")
      .slice(0, 2)}`;
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

function getIsoDateDifferenceInDays(startValue: string, endValue: string) {
  const normalizedStart = getInputDateValue(startValue);
  const normalizedEnd = getInputDateValue(endValue);

  if (!normalizedStart || !normalizedEnd) {
    return 0;
  }

  const startDate = new Date(`${normalizedStart}T12:00:00`);
  const endDate = new Date(`${normalizedEnd}T12:00:00`);
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86400000);
}

function formatIsoDateLabel(value: string) {
  const normalized = getInputDateValue(value);

  if (!normalized) {
    return value;
  }

  return new Date(`${normalized}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTemplateCurrency(value: number) {
  return `GBP ${roundCurrency(value).toFixed(2)}`;
}

function getBusinessDisplayName(settings: Pick<AppSettings, "tradingName" | "businessName">) {
  return settings.tradingName.trim() || settings.businessName.trim() || "Cleancut";
}

function applyMessageTemplate(
    template: string,
    values: Record<string, string | number | undefined>
) {
  return template.replace(/\{\{\s*([a-zA-Z0-9]+)\s*\}\}/g, (_, key: string) => {
    const value = values[key];
    return value == null ? "" : String(value);
  });
}

function getVisitPaymentReference(settings: AppSettings, customer: Customer) {
  return settings.bankPaymentReference.trim() || customer.name.trim() || "Grass cut";
}

function getBankPaymentDetails(settings: AppSettings) {
  const details = [
    settings.bankAccountName.trim()
        ? `Account name: ${settings.bankAccountName.trim()}`
        : "",
    settings.bankSortCode.trim()
        ? `Sort code: ${settings.bankSortCode.trim()}`
        : "",
    settings.bankAccountNumber.trim()
        ? `Account: ${settings.bankAccountNumber.trim()}`
        : "",
  ].filter(Boolean);

  return details.length > 0
      ? `Bank details: ${details.join(", ")}.`
      : "Please pay by bank transfer.";
}

function buildVisitCompletionText(
    settings: AppSettings,
    customer: Customer,
    visit: VisitLog
) {
  const template =
      settings.visitCompletionTextTemplate.trim() ||
      DEFAULT_APP_SETTINGS.visitCompletionTextTemplate;
  const visitDate = new Date(visit.visitDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return applyMessageTemplate(template, {
    customerName: customer.name,
    businessName: getBusinessDisplayName(settings),
    amount: formatTemplateCurrency(
        Number(visit.priceAtVisit ?? customer.grassCutAmount ?? 0)
    ),
    visitDate,
    paymentDetails: getBankPaymentDetails(settings),
    paymentReference: getVisitPaymentReference(settings, customer),
  }).replace(/\s+/g, " ").trim();
}

function addMonthsToIsoDate(value: string, monthsToAdd: number) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  const startMonthIndex = month - 1;
  const targetMonthIndex = startMonthIndex + monthsToAdd;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const maxDay = new Date(targetYear, normalizedMonthIndex + 1, 0, 12).getDate();
  const safeDay = Math.min(day, maxDay);

  return formatDateInput(new Date(targetYear, normalizedMonthIndex, safeDay, 12));
}

function getLineItemsSubtotal(items: LineItem[]) {
  return roundCurrency(
      items.reduce(
          (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
          0
      )
  );
}

function getVatAmount(subtotal: number, vatRate: number) {
  return roundCurrency(subtotal * (Math.max(0, vatRate) / 100));
}

function getCustomerPaymentMethodFromSettings(
    value: AppSettings["defaultPaymentMethod"] | Customer["paymentMethod"] | string | undefined
): Customer["paymentMethod"] {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (normalized === "cash") {
    return "Cash";
  }

  if (
      normalized === "bank_transfer" ||
      normalized === "bank transfer" ||
      normalized === "on day transfer"
  ) {
    return "On Day Transfer";
  }

  return "Monthly";
}

const WEEK_OPTIONS: WeekName[] = ["Week 1", "Week 2"];
const DAY_OPTIONS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];
const APP_STATE_TABLE = "app_state";
const APP_STATE_ROW_ID = "primary";
const DEFAULT_WORKFLOW_TABLES_READY: WorkflowTablesReady = {
  items: false,
  quotes: false,
  invoices: false,
  recurringInvoiceTemplates: false,
  scheduledJobs: false,
  monthlyPayments: false,
  commercialRams: false,
  customerLeads: false,
};
const DEFAULT_STAFF_TABLES_READY: StaffTablesReady = {
  staffMembers: false,
  rolePermissions: false,
};
const DEFAULT_SCHEDULED_JOB_CHECKLIST: ScheduledJobChecklistState = {
  arrived: false,
  accessConfirmed: false,
  workComplete: false,
  invoiceSent: false,
};
const QUOTE_FOLLOW_UP_INTERVAL_DAYS = [2, 3, 5] as const;
const INVOICE_REMINDER_INTERVAL_DAYS = [0, 3, 7] as const;
const DEFAULT_PERSISTED_APP_STATE: PersistedAppState = {
  version: 1,
  scheduledJobs: [],
  scheduledJobChecklists: {},
  quoteFollowUps: {},
  invoiceReminders: {},
  quoteHistory: {},
  invoiceHistory: {},
  ignoredMoveSuggestionIds: [],
  routeChangeHistory: [],
  routeNotes: {},
  quotes: [],
  invoices: [],
  recurringInvoiceTemplates: [],
  lockedRounds: {},
  activeRoundCycles: {},
  pendingCashPaymentDates: {},
  selectedWeek: "Week 1",
  selectedDay: "Monday",
  appSettings: DEFAULT_APP_SETTINGS,
  quotesTableInitialized: false,
  invoicesWriteFallbackActive: false,
  recurringInvoiceTemplatesFallbackActive: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeScheduledJobChecklist(value: unknown): ScheduledJobChecklistState {
  const entry = isRecord(value) ? value : {};

  return {
    arrived: Boolean(entry.arrived),
    accessConfirmed: Boolean(entry.accessConfirmed),
    workComplete: Boolean(entry.workComplete),
    invoiceSent: Boolean(entry.invoiceSent),
  };
}

function normalizeQuoteFollowUpState(value: unknown): QuoteFollowUpState {
  const entry = isRecord(value) ? value : {};
  const lastFollowedUpOn =
      typeof entry.lastFollowedUpOn === "string"
          ? getInputDateValue(entry.lastFollowedUpOn)
          : "";

  return {
    followUpCount:
        typeof entry.followUpCount === "number" && Number.isFinite(entry.followUpCount)
            ? Math.max(0, Math.floor(entry.followUpCount))
            : 0,
    lastFollowedUpOn: lastFollowedUpOn || undefined,
  };
}

function normalizeInvoiceReminderState(value: unknown): InvoiceReminderState {
  const entry = isRecord(value) ? value : {};
  const lastReminderSentOn =
      typeof entry.lastReminderSentOn === "string"
          ? getInputDateValue(entry.lastReminderSentOn)
          : "";

  return {
    reminderCount:
        typeof entry.reminderCount === "number" && Number.isFinite(entry.reminderCount)
            ? Math.max(0, Math.floor(entry.reminderCount))
            : 0,
    lastReminderSentOn: lastReminderSentOn || undefined,
  };
}

function normalizeRouteChangeRecord(value: unknown): RouteChangeRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const type =
      value.type === "move" ? "move" : value.type === "reorder" ? "reorder" : null;
  const id = typeof value.id === "string" ? value.id.trim() : "";

  if (!type || !id) {
    return null;
  }

  const undoCustomers = Array.isArray(value.undoCustomers)
      ? value.undoCustomers
            .map((entry) => {
              if (!isRecord(entry)) {
                return null;
              }

              const customerId = Number(entry.customerId);
              const routeOrder = Number(entry.routeOrder);

              if (!Number.isInteger(customerId)) {
                return null;
              }

              return {
                customerId,
                customerName:
                    typeof entry.customerName === "string"
                        ? entry.customerName
                        : "",
                week: normaliseWeekName(entry.week),
                day: normaliseDayName(entry.day),
                routeOrder: Number.isFinite(routeOrder) ? routeOrder : undefined,
              };
            })
            .filter(Boolean) as RouteChangeRecord["undoCustomers"]
      : [];

  return {
    id,
    type,
    title: typeof value.title === "string" ? value.title : "Route change",
    detail: typeof value.detail === "string" ? value.detail : "",
    reason: typeof value.reason === "string" ? value.reason : "",
    routeLabel: typeof value.routeLabel === "string" ? value.routeLabel : "",
    savedMiles: Number.isFinite(Number(value.savedMiles))
        ? Number(value.savedMiles)
        : 0,
    affectedCustomerCount: Number.isFinite(Number(value.affectedCustomerCount))
        ? Number(value.affectedCustomerCount)
        : undoCustomers.length,
    occurredAt:
        typeof value.occurredAt === "string" && value.occurredAt.trim()
            ? value.occurredAt
            : new Date().toISOString(),
    undoCustomers,
    undoneAt:
        typeof value.undoneAt === "string" && value.undoneAt.trim()
            ? value.undoneAt
            : undefined,
  };
}

function normalizeDocumentHistoryEntry(
    value: unknown
): DocumentHistoryEntry | null {
  const entry = isRecord(value) ? value : {};
  const type =
      entry.type === "created" || entry.type === "updated" || entry.type === "sent"
          ? entry.type
          : null;
  const occurredAt =
      typeof entry.occurredAt === "string" && !Number.isNaN(Date.parse(entry.occurredAt))
          ? entry.occurredAt
          : "";
  const summary =
      typeof entry.summary === "string" && entry.summary.trim()
          ? entry.summary.trim()
          : "";

  if (!type || !occurredAt || !summary) {
    return null;
  }

  return {
    id:
        typeof entry.id === "string" && entry.id.trim()
            ? entry.id
            : `history-${occurredAt}-${type}`,
    type,
    occurredAt,
    summary,
    method:
        typeof entry.method === "string"
            ? normalizeDocumentDeliveryMethod(entry.method)
            : undefined,
    recipient:
        typeof entry.recipient === "string" && entry.recipient.trim()
            ? entry.recipient.trim()
            : undefined,
  };
}

function normalizeDocumentHistoryMap(
    value: unknown
): Record<string, DocumentHistoryEntry[]> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
      Object.entries(value)
          .map(([documentId, entries]) => [
            documentId,
            Array.isArray(entries)
                ? entries
                    .map(normalizeDocumentHistoryEntry)
                    .filter((entry): entry is DocumentHistoryEntry => Boolean(entry))
                    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
                : [],
          ])
          .filter(([, entries]) => entries.length > 0)
  );
}

function formatUserNameFromEmail(email: string | null | undefined) {
  const emailPrefix = email?.split("@")[0]?.trim();

  if (!emailPrefix) {
    return "Staff Member";
  }

  const cleaned = emailPrefix
      .replace(/[._-]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");

  if (!cleaned) {
    return "Staff Member";
  }

  return cleaned.replace(/\b\w/g, (character) => character.toUpperCase());
}

function getLoggedInStaffName(user: {
  email?: string | null;
  user_metadata?: unknown;
}) {
  const metadata = isRecord(user.user_metadata) ? user.user_metadata : null;
  const candidateKeys = ["full_name", "name", "display_name", "staff_name"];

  for (const key of candidateKeys) {
    const value = metadata?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return formatUserNameFromEmail(user.email);
}

function normalizeEmailAddress(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeStaffRole(value: unknown): StaffRole {
  return STAFF_ROLES.includes(value as StaffRole) ? (value as StaffRole) : "Staff";
}

function normalizeStaffPageAccessKey(value: unknown): StaffPageAccessKey {
  const pageKey = typeof value === "string" ? value.trim() : "";

  if (pageKey === "commercial") {
    return "rounds";
  }

  const matchedPage = STAFF_PAGE_OPTIONS.find((option) => option.key === pageKey);
  return matchedPage?.key ?? "dashboard";
}

function sortStaffMembers(staffMembers: StaffMember[]) {
  return [...staffMembers].sort((left, right) => {
    const leftRank = left.isSystemAdmin ? 0 : left.role === "Admin" ? 1 : 2;
    const rightRank = right.isSystemAdmin ? 0 : right.role === "Admin" ? 1 : 2;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.fullName.localeCompare(right.fullName);
  });
}

function mapStaffMemberRowToStaffMember(row: StaffMemberRow): StaffMember {
  return {
    id: Number(row.id),
    authUserId: row.auth_user_id ?? undefined,
    email: row.email,
    fullName: row.full_name,
    role: normalizeStaffRole(row.role),
    isActive: Boolean(row.is_active ?? true),
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
    isSystemAdmin: Boolean(row.is_system_admin),
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function mapStaffMemberToWriteRow(
    staffMember: Pick<
        StaffMember,
        "authUserId" | "email" | "fullName" | "role" | "isActive" | "phone" | "notes" | "isSystemAdmin"
    >
): StaffMemberWriteRow {
  return {
    auth_user_id: staffMember.authUserId?.trim() || null,
    email: normalizeEmailAddress(staffMember.email),
    full_name: staffMember.fullName.trim(),
    role: staffMember.role,
    is_active: staffMember.isActive,
    phone: staffMember.phone?.trim() || null,
    notes: staffMember.notes?.trim() || null,
    is_system_admin: Boolean(staffMember.isSystemAdmin),
  };
}

function mapRolePermissionRowToRolePermission(row: RolePermissionRow): RolePermission {
  return {
    role: normalizeStaffRole(row.role),
    pageKey: normalizeStaffPageAccessKey(row.page_key),
    allowed: Boolean(row.allowed),
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function mapRolePermissionToWriteRow(
    permission: Pick<RolePermission, "role" | "pageKey" | "allowed">
): RolePermissionWriteRow {
  return {
    role: permission.role,
    page_key: permission.pageKey,
    allowed: permission.allowed,
  };
}

function createDefaultRolePermissions(): RolePermission[] {
  return STAFF_PAGE_OPTIONS.flatMap((pageOption) =>
      STAFF_ROLES.map((role) => ({
        role,
        pageKey: pageOption.key,
        allowed:
            role === "Admin"
                ? true
                : !ADMIN_ONLY_PAGE_KEYS.has(pageOption.key) &&
                  DEFAULT_ROLE_PAGE_ACCESS[role as Exclude<StaffRole, "Admin">].includes(
                      pageOption.key
                  ),
      }))
  );
}

function findMatchingStaffMember(
    staffMembers: StaffMember[],
    authUserId: string | null | undefined,
    email: string | null | undefined
) {
  const normalizedEmail = normalizeEmailAddress(email);

  if (authUserId) {
    const authUserMatch = staffMembers.find(
        (staffMember) => staffMember.authUserId === authUserId
    );

    if (authUserMatch) {
      return authUserMatch;
    }
  }

  if (!normalizedEmail) {
    return null;
  }

  return (
      staffMembers.find(
          (staffMember) => normalizeEmailAddress(staffMember.email) === normalizedEmail
      ) ?? null
  );
}

function isErrorWithMessage(value: unknown): value is {
  code?: string;
  message: string;
} {
  return isRecord(value) && typeof value.message === "string";
}

function normaliseWeekName(value: unknown): WeekName {
  return WEEK_OPTIONS.includes(value as WeekName) ? (value as WeekName) : "Week 1";
}

function normaliseDayName(value: unknown): DayName {
  return DAY_OPTIONS.includes(value as DayName) ? (value as DayName) : "Monday";
}

function getBaseRoundKey(week: WeekName, day: DayName) {
  return `${week}-${day}-GrassCutting`;
}

function getVisitRoundBaseKey(
    week: WeekName,
    day: DayName,
    customerType: CustomerType
) {
  return `${week}-${day}-${customerType}`;
}

function getVisitRoundKey(
    week: WeekName,
    day: DayName,
    customerType: CustomerType,
    cycle: number
) {
  return getRoundKeyForCycle(getVisitRoundBaseKey(week, day, customerType), cycle);
}

function getRoundKeyForCycle(baseRoundKey: string, cycle: number) {
  return cycle <= 1 ? baseRoundKey : `${baseRoundKey}::${cycle}`;
}

function getActiveRoundCycle(
    activeRoundCycles: Record<string, number>,
    baseRoundKey: string
) {
  const cycle = activeRoundCycles[baseRoundKey];
  return Number.isInteger(cycle) && cycle > 0 ? cycle : 1;
}

function getActiveRoundKey(
    activeRoundCycles: Record<string, number>,
    week: WeekName,
    day: DayName
) {
  const baseRoundKey = getBaseRoundKey(week, day);
  return getRoundKeyForCycle(
      baseRoundKey,
      getActiveRoundCycle(activeRoundCycles, baseRoundKey)
  );
}

function normalizeStoredRoundStateKey(key: string) {
  const [baseKey, cycleSuffix] = key.split("::");
  const legacyMatch = baseKey.match(
      /^(Week [12])-(Monday|Tuesday|Wednesday|Thursday|Friday)-(Residential|Commercial)$/
  );

  if (!legacyMatch) {
    return key;
  }

  const cycle = Number(cycleSuffix);
  return getRoundKeyForCycle(
      getBaseRoundKey(legacyMatch[1] as WeekName, legacyMatch[2] as DayName),
      Number.isInteger(cycle) && cycle > 1 ? cycle : 1
  );
}

function normalizeStoredRoundBaseKey(key: string) {
  const baseKey = key.split("::")[0];
  const legacyMatch = baseKey.match(
      /^(Week [12])-(Monday|Tuesday|Wednesday|Thursday|Friday)-(Residential|Commercial)$/
  );

  if (!legacyMatch) {
    return baseKey;
  }

  return getBaseRoundKey(legacyMatch[1] as WeekName, legacyMatch[2] as DayName);
}

function getTodayPanelState(date: Date): TodayPanelState {
  const { dayLabel, selectedDay } = getWorkdayFromDate(date);
  const week = getFortnightWeek(date);

  return {
    week,
    dayLabel,
    selectedDay,
    roundKey: selectedDay ? getBaseRoundKey(week, selectedDay) : null,
  };
}

function normalizePersistedAppState(value: unknown): PersistedAppState {
  const state = isRecord(value) ? value : {};
  const lockedRounds = isRecord(state.lockedRounds)
      ? Object.entries(state.lockedRounds).reduce<Record<string, boolean>>(
          (acc, [key, entry]) => {
            const normalizedKey = normalizeStoredRoundStateKey(key);
            acc[normalizedKey] = Boolean(acc[normalizedKey]) || Boolean(entry);
            return acc;
          },
          {}
      )
      : {};
  const activeRoundCycles = isRecord(state.activeRoundCycles)
      ? Object.entries(state.activeRoundCycles).reduce<Record<string, number>>(
          (acc, [key, entry]) => {
            const cycle = Number(entry);

            if (!Number.isInteger(cycle) || cycle <= 0) {
              return acc;
            }

            const normalizedKey = normalizeStoredRoundBaseKey(key);
            acc[normalizedKey] = Math.max(acc[normalizedKey] ?? 0, cycle);
            return acc;
          },
          {}
      )
      : {};
  const pendingCashPaymentDates = isRecord(state.pendingCashPaymentDates)
      ? Object.fromEntries(
          Object.entries(state.pendingCashPaymentDates)
              .filter(([, entry]) => typeof entry === "string" && getInputDateValue(entry))
              .map(([key, entry]) => [key, getInputDateValue(String(entry))])
      )
      : {};
  const scheduledJobChecklists = isRecord(state.scheduledJobChecklists)
      ? Object.fromEntries(
          Object.entries(state.scheduledJobChecklists).map(([key, entry]) => [
            key,
            normalizeScheduledJobChecklist(entry),
          ])
      )
      : {};
  const quoteFollowUps = isRecord(state.quoteFollowUps)
      ? Object.fromEntries(
          Object.entries(state.quoteFollowUps).map(([key, entry]) => [
            key,
            normalizeQuoteFollowUpState(entry),
          ])
      )
      : {};
  const invoiceReminders = isRecord(state.invoiceReminders)
      ? Object.fromEntries(
          Object.entries(state.invoiceReminders).map(([key, entry]) => [
            key,
            normalizeInvoiceReminderState(entry),
          ])
      )
      : {};
  const quoteHistory = normalizeDocumentHistoryMap(state.quoteHistory);
  const invoiceHistory = normalizeDocumentHistoryMap(state.invoiceHistory);
  const ignoredMoveSuggestionIds = Array.isArray(state.ignoredMoveSuggestionIds)
      ? Array.from(
          new Set(
              state.ignoredMoveSuggestionIds
                  .filter((entry): entry is string => typeof entry === "string")
                  .map((entry) => entry.trim())
                  .filter(Boolean)
          )
      )
      : [];
  const routeChangeHistory = Array.isArray(state.routeChangeHistory)
      ? state.routeChangeHistory
            .map(normalizeRouteChangeRecord)
            .filter((entry): entry is RouteChangeRecord => Boolean(entry))
            .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
            .slice(0, 30)
      : [];
  const routeNotes = isRecord(state.routeNotes)
      ? Object.fromEntries(
          Object.entries(state.routeNotes)
              .filter(([, entry]) => typeof entry === "string")
              .map(([key, entry]) => [key, String(entry)])
      )
      : {};

  return {
    version: 1,
    scheduledJobs: Array.isArray(state.scheduledJobs)
        ? state.scheduledJobs
              .map((job, index) => normalizePersistedScheduledJob(job, index))
              .filter((job): job is ScheduledJob => Boolean(job))
        : [],
    scheduledJobChecklists,
    quoteFollowUps,
    invoiceReminders,
    quoteHistory,
    invoiceHistory,
    ignoredMoveSuggestionIds,
    routeChangeHistory,
    routeNotes,
    quotes: Array.isArray(state.quotes) ? (state.quotes as Quote[]) : [],
    invoices: Array.isArray(state.invoices)
        ? sortInvoices(state.invoices as Invoice[])
        : [],
    recurringInvoiceTemplates: Array.isArray(state.recurringInvoiceTemplates)
        ? sortRecurringInvoiceTemplates(
            state.recurringInvoiceTemplates as RecurringInvoiceTemplateRecord[]
          )
        : [],
    lockedRounds,
    activeRoundCycles,
    pendingCashPaymentDates,
    selectedWeek: normaliseWeekName(state.selectedWeek),
    selectedDay: normaliseDayName(state.selectedDay),
    appSettings: mergeAppSettings(
        isRecord(state.appSettings)
            ? (state.appSettings as Partial<AppSettings>)
            : undefined
    ),
    quotesTableInitialized: Boolean(state.quotesTableInitialized),
    invoicesWriteFallbackActive: Boolean(state.invoicesWriteFallbackActive),
    recurringInvoiceTemplatesFallbackActive: Boolean(
        state.recurringInvoiceTemplatesFallbackActive
    ),
  };
}

function formatDatabaseError(error: { code?: string; message: string }) {
  const message = error.message.toLowerCase();
  const rawDetails = error.code
      ? ` [${error.code}] ${error.message}`
      : ` ${error.message}`;

  switch (error.code) {
    case "42P01":
      if (message.includes("monthly_payments")) {
        return "Supabase is connected, but the monthly_payments table is missing. Run the payment tracking SQL setup script and refresh.";
      }
      if (message.includes("recurring_invoice_templates")) {
        return "Supabase is connected, but the recurring_invoice_templates table is missing. Run the workflow SQL setup script and refresh.";
      }
      if (message.includes("commercial_rams_documents")) {
        return "Supabase is connected, but the commercial_rams_documents table is missing. Run the commercial RAMS SQL setup script and refresh.";
      }
      if (message.includes("customer_leads")) {
        return "Supabase is connected, but the customer_leads table is missing. Run the customer leads SQL setup script and refresh.";
      }
      if (message.includes("staff_members")) {
        return "Supabase is connected, but the staff_members table is missing. Run the staff system SQL setup script and refresh.";
      }
      if (message.includes("role_permissions")) {
        return "Supabase is connected, but the role_permissions table is missing. Run the staff system SQL setup script and refresh.";
      }
      if (message.includes("scheduled_jobs")) {
        return "Supabase is connected, but the scheduled_jobs table is missing. Run the workflow SQL setup script and refresh.";
      }
      if (message.includes("quotes")) {
        return "Supabase is connected, but the quotes table is missing. Run the workflow SQL setup script and refresh.";
      }
      if (message.includes("invoices")) {
        return "Supabase is connected, but the invoices table is missing. Run the workflow SQL setup script and refresh.";
      }
      if (message.includes("items")) {
        return "Supabase is connected, but the items table is missing. Run the workflow SQL setup script and refresh.";
      }
      return "Supabase is reachable, but the shared app_state table is missing. Run the SQL setup script and refresh.";
    case "42501":
      if (message.includes("monthly_payments")) {
        return "Supabase is connected, but the monthly_payments policies are missing or too strict. Run the payment tracking SQL setup script and refresh.";
      }
      if (message.includes("recurring_invoice_templates")) {
        return "Supabase is connected, but the recurring_invoice_templates policies are missing or too strict. Run the workflow SQL setup script and refresh.";
      }
      if (message.includes("commercial_rams_documents")) {
        return "Supabase is connected, but the commercial_rams_documents policies are missing or too strict. Run the commercial RAMS SQL setup script and refresh.";
      }
      if (message.includes("customer_leads")) {
        return "Supabase is connected, but the customer_leads policies are missing or too strict. Run the customer leads SQL setup script and refresh.";
      }
      if (message.includes("staff_members")) {
        return "Supabase is connected, but the staff_members policies are missing or too strict. Run the staff system SQL setup script and refresh.";
      }
      if (message.includes("role_permissions")) {
        return "Supabase is connected, but the role_permissions policies are missing or too strict. Run the staff system SQL setup script and refresh.";
      }
      if (message.includes("scheduled_jobs")) {
        return `Supabase is connected, but the scheduled_jobs policies are missing or too strict.${rawDetails}`;
      }
      if (message.includes("quotes")) {
        return `Supabase is connected, but the quotes policies are missing or too strict.${rawDetails}`;
      }
      if (message.includes("invoices")) {
        return `Supabase is connected, but the invoices policies are missing or too strict.${rawDetails}`;
      }
      if (message.includes("items")) {
        return "Supabase is connected, but the items table policies are missing or too strict. Run the workflow SQL setup script and refresh.";
      }
      return `Supabase is reachable, but app_state access is still failing.${rawDetails}`;
    case "PGRST205":
      if (message.includes("monthly_payments")) {
        return "Supabase is connected, but the monthly_payments table is missing. Run the payment tracking SQL setup script and refresh.";
      }
      if (message.includes("recurring_invoice_templates")) {
        return "Supabase is connected, but the recurring_invoice_templates table is missing. Run the workflow SQL setup script and refresh.";
      }
      if (message.includes("commercial_rams_documents")) {
        return "Supabase is connected, but the commercial_rams_documents table is missing. Run the commercial RAMS SQL setup script and refresh.";
      }
      if (message.includes("customer_leads")) {
        return "Supabase is connected, but the customer_leads table is missing. Run the customer leads SQL setup script and refresh.";
      }
      if (message.includes("staff_members")) {
        return "Supabase is connected, but the staff_members table is missing. Run the staff system SQL setup script and refresh.";
      }
      if (message.includes("role_permissions")) {
        return "Supabase is connected, but the role_permissions table is missing. Run the staff system SQL setup script and refresh.";
      }
      if (message.includes("scheduled_jobs")) {
        return "Supabase is connected, but the scheduled_jobs table is missing. Run the workflow SQL setup script and refresh.";
      }
      if (message.includes("quotes")) {
        return "Supabase is connected, but the quotes table is missing. Run the workflow SQL setup script and refresh.";
      }
      if (message.includes("invoices")) {
        return "Supabase is connected, but the invoices table is missing. Run the workflow SQL setup script and refresh.";
      }
      if (message.includes("items")) {
        return "Supabase is connected, but the items table is missing. Run the workflow SQL setup script and refresh.";
      }
      return "Supabase is connected, but one of the new workflow tables is missing. Run the workflow SQL setup script and refresh.";
    default:
      if (isVisitRoundMetadataSchemaError(error)) {
        return VISIT_ROUND_METADATA_SETUP_NOTICE;
      }

      if (
          message.includes("customers") &&
          (
              message.includes("is_grass_cutting_customer") ||
              message.includes("town") ||
              message.includes("email") ||
              message.includes("contact_emails") ||
              message.includes("grass_cut_areas") ||
              message.includes("site_name") ||
              message.includes("site_address") ||
              message.includes("site_town") ||
              message.includes("site_postcode") ||
              message.includes("customers_day_check")
          )
      ) {
        return "Supabase is connected, but the customers table needs the latest customer fields. Run the customer fields SQL setup script and refresh.";
      }

      if (
          message.includes("payment_month") ||
          message.includes("payment_date") ||
          message.includes("monthly_payments")
      ) {
        return "Supabase is connected, but the monthly payment tracking table needs the latest columns. Run the payment tracking SQL setup script again and refresh.";
      }

      if (
          message.includes("commercial_rams_documents") ||
          message.includes("reference_number") ||
          message.includes("working_at_height") ||
          message.includes("powered_machinery") ||
          message.includes("site_contact_number") ||
          message.includes("approval_role")
      ) {
        return "Supabase is connected, but the commercial RAMS table needs the latest columns. Run the commercial RAMS SQL setup script again and refresh.";
      }

      if (
          message.includes("recurring_invoice_templates") ||
          message.includes("next_send_date") ||
          message.includes("due_days_after_issue") ||
          message.includes("preferred_send_method")
      ) {
        return "Supabase is connected, but the recurring invoice template table needs the latest columns. Run the workflow SQL setup script again and refresh.";
      }

      if (
          (message.includes("quotes") || message.includes("invoices")) &&
          (
              message.includes("customer_type") ||
              message.includes("customer_address") ||
              message.includes("customer_town") ||
              message.includes("customer_postcode") ||
              message.includes("site_name") ||
              message.includes("site_address") ||
              message.includes("site_town") ||
              message.includes("site_postcode")
          )
      ) {
        return "Supabase is connected, but the quotes or invoices table needs the latest document fields. Run the workflow SQL setup script again and refresh.";
      }

      if (
          message.includes("due_date") ||
          message.includes("vat_rate") ||
          message.includes("vat_amount") ||
          message.includes("linked_quote_id") ||
          message.includes("invoice_number") ||
          (message.includes("column") && message.includes("invoices"))
      ) {
        return "Supabase is connected, but the invoices table needs the latest columns. Run the workflow SQL setup script again and refresh.";
      }

      if (
          message.includes("quotes_status_check") ||
          message.includes("invoices_status_check") ||
          (message.includes("status") &&
              (message.includes("quotes") || message.includes("invoices")) &&
              message.includes("violates check constraint"))
      ) {
        return "Supabase is connected, but the quotes or invoices status rules are out of date. Run the workflow SQL setup script again and refresh.";
      }

      if (message.includes("app_state")) {
        return `Supabase responded, but the shared app_state table is not ready yet.${rawDetails}`;
      }
      return error.message;
  }
}

function isMissingTableError(error: { code?: string; message: string }) {
  return error.code === "42P01" || error.code === "PGRST205";
}

function isVisitRoundMetadataSchemaError(error: { code?: string; message: string }) {
  const message = error.message.toLowerCase();
  const mentionsVisitRoundField =
      message.includes("round_key") ||
      message.includes("price_at_visit") ||
      (message.includes("customer_type") && message.includes("visits"));

  return (
      mentionsVisitRoundField &&
      (
          error.code === "42703" ||
          error.code === "PGRST204" ||
          message.includes("schema cache") ||
          message.includes("column")
      )
  );
}

function isSingleJsonObjectResultError(error: { code?: string; message: string }) {
  return (
      error.code === "PGRST116" ||
      error.message.toLowerCase().includes("cannot coerce the result to a single json object")
  );
}

function isOptionalAppStateError(error: { code?: string; message: string }) {
  const message = error.message.toLowerCase();

  return (
      message.includes("app_state") &&
      (error.code === "42501" || isMissingTableError(error))
  );
}

function isInvoiceWriteFallbackError(error: { code?: string; message: string }) {
  const message = error.message.toLowerCase();

  return (
      isSingleJsonObjectResultError(error) ||
      ((error.code === "42501" || isMissingTableError(error)) &&
          message.includes("invoice"))
  );
}

function getInvoiceWriteFallbackNotice(
    error: { code?: string; message: string },
    action: "saved" | "updated"
) {
  if (isSingleJsonObjectResultError(error)) {
    return `Supabase did not return the saved invoice row. This invoice was ${action} in the app for now.`;
  }

  return `${formatDatabaseError(error)} This invoice was ${action} in the app for now.`;
}

function isRecurringInvoiceTemplateFallbackError(error: {
  code?: string;
  message: string;
}) {
  const message = error.message.toLowerCase();

  return (
      error.code === "42501" ||
      isMissingTableError(error) ||
      message.includes("recurring_invoice_templates") ||
      message.includes("next_send_date") ||
      message.includes("due_days_after_issue") ||
      message.includes("preferred_send_method") ||
      message.includes("send_to") ||
      message.includes("is_active") ||
      message.includes("last_generated_date") ||
      message.includes("source_invoice_id")
  );
}

function getRecurringInvoiceTemplateFallbackNotice(
    error: { code?: string; message: string },
    action: "saved" | "deleted"
) {
  return `${formatDatabaseError(error)} This recurring invoice template was ${action} in the app for now.`;
}

function getWorkflowTablesNotice(workflowTables: WorkflowTablesReady) {
  const notices: string[] = [];
  const missingTables = [
    workflowTables.items ? null : "items",
    workflowTables.quotes ? null : "quotes",
    workflowTables.invoices ? null : "invoices",
    workflowTables.recurringInvoiceTemplates ? null : "recurring_invoice_templates",
    workflowTables.scheduledJobs ? null : "scheduled_jobs",
    workflowTables.commercialRams ? null : "commercial_rams_documents",
    workflowTables.customerLeads ? null : "customer_leads",
  ].filter(Boolean);

  if (!workflowTables.monthlyPayments) {
    notices.push(
        "Supabase is connected, but the monthly payment tracking table is not ready yet. Run the payment tracking SQL setup script and refresh."
    );
  }

  if (missingTables.length > 0) {
    notices.push(
        `Supabase is connected, but ${missingTables.join(", ")} are not ready yet. Run the workflow or RAMS SQL setup scripts and refresh when you're ready.`
    );
  }

  return notices.length > 0 ? notices.join(" ") : null;
}

function getStaffSystemNotice(staffTables: StaffTablesReady) {
  const missingTables = [
    staffTables.staffMembers ? null : "staff_members",
    staffTables.rolePermissions ? null : "role_permissions",
  ].filter(Boolean);

  return missingTables.length > 0
      ? `Supabase is connected, but the staff system tables are not ready yet (${missingTables.join(", ")}). Run the staff system SQL setup script and refresh.`
      : null;
}

function getDatabaseSetupNotice(
    workflowTables: WorkflowTablesReady,
    staffTables: StaffTablesReady
) {
  const notices = [getStaffSystemNotice(staffTables), getWorkflowTablesNotice(workflowTables)]
      .filter(Boolean);

  return notices.length > 0 ? notices.join(" ") : null;
}

function sortInvoices(invoices: Invoice[]) {
  return [...invoices].sort((left, right) => {
    const dateComparison = right.date.localeCompare(left.date);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return right.invoiceNumber.localeCompare(left.invoiceNumber, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function mergeInvoicesWithFallback(primaryInvoices: Invoice[], secondaryInvoices: Invoice[]) {
  const mergedInvoices = [...primaryInvoices];
  const existingIds = new Set(primaryInvoices.map((invoice) => invoice.id));

  for (const invoice of secondaryInvoices) {
    if (!existingIds.has(invoice.id)) {
      mergedInvoices.push(invoice);
    }
  }

  return sortInvoices(mergedInvoices);
}

function mergeRecurringInvoiceTemplatesWithFallback(
    primaryTemplates: RecurringInvoiceTemplateRecord[],
    secondaryTemplates: RecurringInvoiceTemplateRecord[]
) {
  const mergedTemplates = [...primaryTemplates];
  const existingIds = new Set(primaryTemplates.map((template) => template.id));

  for (const template of secondaryTemplates) {
    if (!existingIds.has(template.id)) {
      mergedTemplates.push(template);
    }
  }

  return sortRecurringInvoiceTemplates(mergedTemplates);
}

function normalizeQuoteStatus(value: string): Quote["status"] {
  if (value === "Rejected") {
    return "Declined";
  }

  return QUOTE_STATUS_OPTIONS.includes(value as QuoteStatus)
      ? (value as Quote["status"])
      : "Draft";
}

function normalizeInvoiceStatus(value: string): Invoice["status"] {
  if (value === "Rejected") {
    return "Declined";
  }

  return INVOICE_STATUS_OPTIONS.includes(value as InvoiceStatus)
      ? (value as Invoice["status"])
      : "Draft";
}

function normalizeRecurringInvoiceFrequency(
    value: string | null | undefined
): RecurringInvoiceFrequency {
  return value === "Quarterly" || value === "Yearly" ? value : "Monthly";
}

function normalizeDocumentDeliveryMethod(
    value: string | null | undefined
): DocumentDeliveryMethod | undefined {
  return value === "email" || value === "text" ? value : undefined;
}

function getRecurringInvoiceDefaultStatus(status: Invoice["status"]) {
  if (status === "Paid" || status === "Accepted") {
    return "Unpaid" as Invoice["status"];
  }

  return normalizeInvoiceStatus(status);
}

function advanceRecurringInvoiceDate(
    value: string,
    frequency: RecurringInvoiceFrequency
) {
  if (frequency === "Quarterly") {
    return addMonthsToIsoDate(value, 3);
  }

  if (frequency === "Yearly") {
    return addMonthsToIsoDate(value, 12);
  }

  return addMonthsToIsoDate(value, 1);
}

function normalizeDocumentCustomerType(
    value: string | null | undefined
): CustomerType | undefined {
  if (value === "Commercial" || value === "Residential") {
    return value;
  }

  return undefined;
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeUnknownText(value: unknown) {
  return typeof value === "string" ? normalizeOptionalText(value) : undefined;
}

function normalizeUnknownNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
}

function normalizeDocumentCustomerFields(
    fields: DocumentCustomerFields
): DocumentCustomerFields {
  const customerType = normalizeDocumentCustomerType(fields.customerType);
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
    customer: Customer | null | undefined
): DocumentCustomerFields {
  if (!customer) {
    return {};
  }

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

function normalizeScheduledJobType(value: string): ScheduledJobType {
  return ["One Off", "Quote Accepted", "Grass Cut", "Commercial"].includes(value)
      ? (value as ScheduledJobType)
      : "One Off";
}

function normalizeScheduledJobStatus(value: string): ScheduledJobStatus {
  return ["Scheduled", "In Progress", "Completed", "Cancelled"].includes(value)
      ? (value as ScheduledJobStatus)
      : "Scheduled";
}

function normalizePersistedScheduledJob(
    value: unknown,
    index: number
): ScheduledJob | null {
  if (!isRecord(value)) {
    return null;
  }

  const fallbackDate = new Date().toISOString().split("T")[0];
  const rawDate = normalizeUnknownText(value.date);
  const createdAt =
      normalizeUnknownText(value.createdAt) ?? new Date().toISOString();
  const customerName = normalizeUnknownText(value.customerName);

  return {
    id: normalizeUnknownText(value.id) ?? `restored-job-${index + 1}`,
    title: normalizeUnknownText(value.title) ?? customerName ?? "Untitled Job",
    date: rawDate ?? createdAt.slice(0, 10) ?? fallbackDate,
    notes: normalizeUnknownText(value.notes),
    startTime: normalizeUnknownText(value.startTime),
    finishTime: normalizeUnknownText(value.finishTime),
    customerName,
    customerId: normalizeUnknownNumber(value.customerId),
    type: normalizeScheduledJobType(
        typeof value.type === "string" ? value.type : ""
    ),
    status: normalizeScheduledJobStatus(
        typeof value.status === "string" ? value.status : ""
    ),
    quoteIds: normalizeStringList(value.quoteIds),
    invoiceIds: normalizeStringList(value.invoiceIds),
    createdAt,
  };
}

function mapQuoteRowToQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    quoteNumber: row.quote_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerType: normalizeDocumentCustomerType(row.customer_type),
    customerAddress: normalizeOptionalText(row.customer_address),
    customerTown: normalizeOptionalText(row.customer_town),
    customerPostcode: normalizeOptionalText(row.customer_postcode),
    siteName: normalizeOptionalText(row.site_name),
    siteAddress: normalizeOptionalText(row.site_address),
    siteTown: normalizeOptionalText(row.site_town),
    sitePostcode: normalizeOptionalText(row.site_postcode),
    date: row.date,
    status: normalizeQuoteStatus(row.status),
    items: Array.isArray(row.items) ? row.items : [],
    notes: row.notes ?? undefined,
    total: Number(row.total ?? 0),
  };
}

function mapQuoteToRow(quote: Quote): QuoteWriteRow {
  const documentFields = normalizeDocumentCustomerFields(quote);

  return {
    id: quote.id,
    quote_number: quote.quoteNumber,
    customer_id: quote.customerId,
    customer_name: quote.customerName,
    customer_type: documentFields.customerType ?? null,
    customer_address: documentFields.customerAddress ?? null,
    customer_town: documentFields.customerTown ?? null,
    customer_postcode: documentFields.customerPostcode ?? null,
    site_name: documentFields.siteName ?? null,
    site_address: documentFields.siteAddress ?? null,
    site_town: documentFields.siteTown ?? null,
    site_postcode: documentFields.sitePostcode ?? null,
    date: quote.date,
    status: quote.status,
    items: quote.items,
    notes: quote.notes?.trim() || null,
    total: Number(quote.total ?? 0),
  };
}

function mapInvoiceRowToInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerType: normalizeDocumentCustomerType(row.customer_type),
    customerAddress: normalizeOptionalText(row.customer_address),
    customerTown: normalizeOptionalText(row.customer_town),
    customerPostcode: normalizeOptionalText(row.customer_postcode),
    siteName: normalizeOptionalText(row.site_name),
    siteAddress: normalizeOptionalText(row.site_address),
    siteTown: normalizeOptionalText(row.site_town),
    sitePostcode: normalizeOptionalText(row.site_postcode),
    date: row.date,
    dueDate: row.due_date ?? undefined,
    status: normalizeInvoiceStatus(row.status),
    items: Array.isArray(row.items) ? row.items : [],
    notes: row.notes ?? undefined,
    terms: row.terms ?? undefined,
    vatRate: row.vat_rate != null ? Number(row.vat_rate) : undefined,
    vatAmount: row.vat_amount != null ? Number(row.vat_amount) : undefined,
    total: Number(row.total ?? 0),
    linkedQuoteId: row.linked_quote_id ?? undefined,
  };
}

function mapInvoiceToRow(invoice: Invoice): InvoiceWriteRow {
  const documentFields = normalizeDocumentCustomerFields(invoice);

  return {
    id: invoice.id,
    invoice_number: invoice.invoiceNumber,
    customer_id: invoice.customerId,
    customer_name: invoice.customerName,
    customer_type: documentFields.customerType ?? null,
    customer_address: documentFields.customerAddress ?? null,
    customer_town: documentFields.customerTown ?? null,
    customer_postcode: documentFields.customerPostcode ?? null,
    site_name: documentFields.siteName ?? null,
    site_address: documentFields.siteAddress ?? null,
    site_town: documentFields.siteTown ?? null,
    site_postcode: documentFields.sitePostcode ?? null,
    date: invoice.date,
    due_date: invoice.dueDate?.trim() || null,
    status: invoice.status,
    items: invoice.items,
    notes: invoice.notes?.trim() || null,
    terms: invoice.terms?.trim() || null,
    vat_rate:
        typeof invoice.vatRate === "number" && !Number.isNaN(invoice.vatRate)
            ? Number(invoice.vatRate)
            : null,
    vat_amount:
        typeof invoice.vatAmount === "number" && !Number.isNaN(invoice.vatAmount)
            ? Number(invoice.vatAmount)
            : null,
    total: Number(invoice.total ?? 0),
    linked_quote_id: invoice.linkedQuoteId ?? null,
  };
}

function mapRecurringInvoiceTemplateRowToTemplate(
    row: RecurringInvoiceTemplateRow
): RecurringInvoiceTemplateRecord {
  const nextSendDate =
      getInputDateValue(row.next_send_date) ||
      getInputDateValue(row.created_at ?? undefined) ||
      getTodayDateInputValue();

  return {
    id: row.id,
    sourceInvoiceId: row.source_invoice_id ?? undefined,
    customerId: row.customer_id,
    customerName: normalizeOptionalText(row.customer_name) || "Recurring Invoice",
    customerType: normalizeDocumentCustomerType(row.customer_type),
    customerAddress: normalizeOptionalText(row.customer_address),
    customerTown: normalizeOptionalText(row.customer_town),
    customerPostcode: normalizeOptionalText(row.customer_postcode),
    siteName: normalizeOptionalText(row.site_name),
    siteAddress: normalizeOptionalText(row.site_address),
    siteTown: normalizeOptionalText(row.site_town),
    sitePostcode: normalizeOptionalText(row.site_postcode),
    status: normalizeInvoiceStatus(row.status ?? "Draft"),
    items: Array.isArray(row.items) ? row.items : [],
    notes: row.notes ?? undefined,
    terms: row.terms ?? undefined,
    vatRate: row.vat_rate != null ? Number(row.vat_rate) : undefined,
    dueDaysAfterIssue:
        row.due_days_after_issue != null ? Number(row.due_days_after_issue) : undefined,
    linkedQuoteId: row.linked_quote_id ?? undefined,
    frequency: normalizeRecurringInvoiceFrequency(row.frequency),
    nextSendDate,
    preferredSendMethod: normalizeDocumentDeliveryMethod(
        row.preferred_send_method
    ),
    sendTo: normalizeOptionalText(row.send_to),
    isActive: Boolean(row.is_active ?? true),
    lastGeneratedDate: row.last_generated_date ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function mapRecurringInvoiceTemplateToRow(
    template: RecurringInvoiceTemplateRecord
): RecurringInvoiceTemplateWriteRow {
  const documentFields = normalizeDocumentCustomerFields(template);

  return {
    id: template.id,
    source_invoice_id: template.sourceInvoiceId ?? null,
    customer_id: template.customerId,
    customer_name: template.customerName.trim(),
    customer_type: documentFields.customerType ?? null,
    customer_address: documentFields.customerAddress ?? null,
    customer_town: documentFields.customerTown ?? null,
    customer_postcode: documentFields.customerPostcode ?? null,
    site_name: documentFields.siteName ?? null,
    site_address: documentFields.siteAddress ?? null,
    site_town: documentFields.siteTown ?? null,
    site_postcode: documentFields.sitePostcode ?? null,
    status: normalizeInvoiceStatus(template.status),
    items: template.items,
    notes: template.notes?.trim() || null,
    terms: template.terms?.trim() || null,
    vat_rate:
        typeof template.vatRate === "number" && !Number.isNaN(template.vatRate)
            ? Number(template.vatRate)
            : null,
    due_days_after_issue:
        typeof template.dueDaysAfterIssue === "number" &&
        Number.isFinite(template.dueDaysAfterIssue)
            ? Math.max(0, Math.floor(template.dueDaysAfterIssue))
            : null,
    linked_quote_id: template.linkedQuoteId ?? null,
    frequency: normalizeRecurringInvoiceFrequency(template.frequency),
    next_send_date: template.nextSendDate,
    preferred_send_method:
        normalizeDocumentDeliveryMethod(template.preferredSendMethod) ?? null,
    send_to: template.sendTo?.trim() || null,
    is_active: Boolean(template.isActive),
    last_generated_date: template.lastGeneratedDate?.trim() || null,
  };
}

function sortRecurringInvoiceTemplates(
    templates: RecurringInvoiceTemplateRecord[]
) {
  return [...templates].sort((left, right) => {
    if (left.nextSendDate !== right.nextSendDate) {
      return left.nextSendDate.localeCompare(right.nextSendDate);
    }

    return left.customerName.localeCompare(right.customerName);
  });
}

function mapScheduledJobRowToScheduledJob(row: ScheduledJobRow): ScheduledJob {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    notes: row.notes ?? undefined,
    startTime: row.start_time ?? undefined,
    finishTime: row.finish_time ?? undefined,
    customerName: row.customer_name ?? undefined,
    customerId: row.customer_id ?? null,
    type: normalizeScheduledJobType(row.type),
    status: normalizeScheduledJobStatus(row.status),
    quoteIds: Array.isArray(row.quote_ids) ? row.quote_ids : [],
    invoiceIds: Array.isArray(row.invoice_ids) ? row.invoice_ids : [],
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function mapScheduledJobToRow(job: ScheduledJob): ScheduledJobWriteRow {
  const row: ScheduledJobWriteRow = {
    id: job.id,
    title: job.title,
    date: job.date,
    notes: job.notes?.trim() || null,
    start_time: job.startTime?.trim() || null,
    finish_time: job.finishTime?.trim() || null,
    customer_id: job.customerId ?? null,
    customer_name: job.customerName ?? null,
    type: job.type,
    status: job.status,
    quote_ids: job.quoteIds ?? [],
    invoice_ids: job.invoiceIds ?? [],
    created_at: job.createdAt,
  };

  return row;
}

function sortMonthlyPayments(payments: MonthlyPayment[]) {
  return [...payments].sort((left, right) => {
    if (left.paymentMonth !== right.paymentMonth) {
      return left.paymentMonth.localeCompare(right.paymentMonth);
    }

    return left.customerId - right.customerId;
  });
}

function sortCommercialRamsDocuments(documents: CommercialRamsDocument[]) {
  return [...documents].sort((left, right) => {
    const leftUpdated = left.updatedAt ?? left.createdAt;
    const rightUpdated = right.updatedAt ?? right.createdAt;

    if (leftUpdated !== rightUpdated) {
      return rightUpdated.localeCompare(leftUpdated);
    }

    return left.customerName.localeCompare(right.customerName);
  });
}

function mapMonthlyPaymentRowToMonthlyPayment(row: MonthlyPaymentRow): MonthlyPayment {
  return {
    id: Number(row.id),
    customerId: Number(row.customer_id),
    paymentMonth: row.payment_month,
    paymentDate: row.payment_date,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function mapMonthlyPaymentToWriteRow(
    payment: Pick<MonthlyPayment, "customerId" | "paymentMonth" | "paymentDate">
): MonthlyPaymentWriteRow {
  return {
    customer_id: payment.customerId,
    payment_month: payment.paymentMonth,
    payment_date: payment.paymentDate ?? null,
  };
}

const NAV_SECTIONS: {
  title: string;
  items: {
    key: PageKey;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }[];
}[] = [
  {
    title: "Dashboard",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { key: "leads", label: "Leads", icon: Inbox },
      { key: "schedule", label: "Schedule", icon: Calendar },
      { key: "jobs", label: "Jobs", icon: BriefcaseBusiness },
    ],
  },
  {
    title: "Grass Schedule",
    items: [
      { key: "rounds", label: "Rounds", icon: Repeat },
      { key: "routeEfficiency", label: "Route Insights", icon: Navigation },
      { key: "history", label: "History", icon: HistoryIcon },
      { key: "map", label: "Map", icon: MapIcon },
      { key: "actions", label: "Actions", icon: ClipboardList },
    ],
  },
  {
    title: "Commercial",
    items: [
      { key: "commercialDocs", label: "RAMS & Documents", icon: FileText },
    ],
  },
  {
    title: "Customers",
    items: [
      { key: "customers", label: "All Customers", icon: Users },
      { key: "customerProfit", label: "Profit", icon: TrendingUp },
      { key: "payments", label: "Payments", icon: CreditCard },
      { key: "quotes", label: "Quotes", icon: FileText },
      { key: "invoices", label: "Invoices", icon: Receipt },
    ],
  },
  {
    title: "Staff",
    items: [{ key: "staff", label: "Staff", icon: UserCog }],
  },
  {
    title: "System",
    items: [{ key: "settings", label: "Settings", icon: SettingsIcon }],
  },
];

const PAGE_NAV_SECTION_OVERRIDES: Partial<Record<PageKey, string>> = {
  scheduledJobProfile: "Dashboard",
  customerProfile: "Customers",
  quoteForm: "Customers",
  invoiceForm: "Customers",
};

function getNavSectionTitle(page: PageKey) {
  const override = PAGE_NAV_SECTION_OVERRIDES[page];
  if (override) {
    return override;
  }

  const matchingSection = NAV_SECTIONS.find((section) =>
      section.items.some((item) => item.key === page)
  );

  return matchingSection?.title ?? NAV_SECTIONS[0].title;
}

function getExpandedNavSections(activeSectionTitle: string | null) {
  return Object.fromEntries(
      NAV_SECTIONS.map((section) => [section.title, section.title === activeSectionTitle])
  ) as Record<string, boolean>;
}

function getPageAccessKey(page: PageKey) {
  return PAGE_PERMISSION_OVERRIDES[page];
}

function ScheduledJobProfileSection({
                                      job,
                                      checklist,
                                      customers,
                                      quotes,
                                      invoices,
                                      onBack,
                                      backLabel,
                                      onOpenCustomer,
                                      onUpdateChecklist,
                                      onToggleCompleted,
                                      onDeleteJob,
                                      onSaveJob,
                                      onEditQuote,
                                      onEditInvoice,
                                    }: {
  job: ScheduledJob;
  checklist: ScheduledJobChecklistState;
  customers: Customer[];
  quotes: Quote[];
  invoices: Invoice[];
  onBack: () => void;
  backLabel: string;
  onOpenCustomer: (customerId: number) => void;
  onUpdateChecklist: (
      key: ScheduledJobChecklistKey,
      checked: boolean
  ) => void;
  onToggleCompleted: (jobId: string) => Promise<void>;
  onDeleteJob: (jobId: string) => Promise<void>;
  onSaveJob: (job: ScheduledJob) => Promise<ScheduledJob | null>;
  onEditQuote: (quoteId: string) => void;
  onEditInvoice: (invoiceId: string) => void;
}) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [draftTitle, setDraftTitle] = useState(job.title);
  const [draftDate, setDraftDate] = useState(
      getInputDateValue(job.date) || job.date
  );
  const [draftStartTime, setDraftStartTime] = useState(
      getScheduledJobTimeInputValue(job.startTime)
  );
  const [draftFinishTime, setDraftFinishTime] = useState(
      getScheduledJobTimeInputValue(job.finishTime)
  );
  const [draftType, setDraftType] = useState<ScheduledJobType>(job.type);
  const [draftCustomerId, setDraftCustomerId] = useState(
      job.customerId != null ? String(job.customerId) : ""
  );
  const [draftCustomerName, setDraftCustomerName] = useState(
      job.customerName ?? ""
  );
  const [draftNotes, setDraftNotes] = useState(job.notes ?? "");

  useEffect(() => {
    setDraftTitle(job.title);
    setDraftDate(getInputDateValue(job.date) || job.date);
    setDraftStartTime(getScheduledJobTimeInputValue(job.startTime));
    setDraftFinishTime(getScheduledJobTimeInputValue(job.finishTime));
    setDraftType(job.type);
    setDraftCustomerId(job.customerId != null ? String(job.customerId) : "");
    setDraftCustomerName(job.customerName ?? "");
    setDraftNotes(job.notes ?? "");
  }, [
    job.customerId,
    job.customerName,
    job.date,
    job.finishTime,
    job.id,
    job.notes,
    job.startTime,
    job.title,
    job.type,
  ]);

  const linkedCustomer =
      job.customerId != null
          ? customers.find((customer) => customer.id === job.customerId) ?? null
          : null;
  const relatedQuoteIds = Array.from(new Set(job.quoteIds ?? []));
  const relatedQuotes = relatedQuoteIds
      .map((id) => quotes.find((quote) => quote.id === id) ?? null)
      .filter((quote): quote is Quote => Boolean(quote));
  const relatedInvoiceIds = new Set(job.invoiceIds ?? []);

  for (const invoice of invoices) {
    if (invoice.linkedQuoteId && relatedQuoteIds.includes(invoice.linkedQuoteId)) {
      relatedInvoiceIds.add(invoice.id);
    }
  }

  const relatedInvoices = Array.from(relatedInvoiceIds)
      .map((id) => invoices.find((invoice) => invoice.id === id) ?? null)
      .filter((invoice): invoice is Invoice => Boolean(invoice));
  const moneyFormatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  });
  const formatSingleTime = (value?: string) => {
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

    return new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(2000, 0, 1, hour, minute));
  };
  const jobTimeRange =
      formatSingleTime(job.startTime) && formatSingleTime(job.finishTime)
          ? `${formatSingleTime(job.startTime)} - ${formatSingleTime(job.finishTime)}`
          : formatSingleTime(job.startTime)
            ? `Starts ${formatSingleTime(job.startTime)}`
            : formatSingleTime(job.finishTime)
              ? `Finishes ${formatSingleTime(job.finishTime)}`
              : null;
  const linkedCustomerAddress = linkedCustomer ? getCustomerDisplayAddress(linkedCustomer) : "";
  const linkedCustomerHasCoordinates =
      typeof linkedCustomer?.latitude === "number" &&
      !Number.isNaN(linkedCustomer.latitude) &&
      typeof linkedCustomer?.longitude === "number" &&
      !Number.isNaN(linkedCustomer.longitude);
  const jobMapQuery = linkedCustomer
      ? linkedCustomerHasCoordinates
        ? `${linkedCustomer.latitude},${linkedCustomer.longitude}`
        : linkedCustomerAddress.trim()
      : "";
  const jobMapEmbedUrl = jobMapQuery
      ? `https://www.google.com/maps?q=${encodeURIComponent(jobMapQuery)}&z=15&output=embed`
      : null;
  const jobNavigationUrl = jobMapQuery
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(jobMapQuery)}&travelmode=driving`
      : null;
  const jobDateLabel = new Date(job.date).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const trimmedJobNotes = job.notes?.trim() ?? "";
  const linkedDocumentCount = relatedQuotes.length + relatedInvoices.length;
  const primaryContactEmail =
      linkedCustomer?.contactEmails?.find((email) => typeof email === "string" && email.trim())?.trim()
      ?? linkedCustomer?.email?.trim()
      ?? "";
  const phoneValue = linkedCustomer?.phone?.trim() ?? "";
  const phoneActionValue = phoneValue.replace(/[^\d+]/g, "");
  const phoneHref = phoneActionValue ? `tel:${phoneActionValue}` : null;
  const textHref = phoneActionValue ? `sms:${phoneActionValue}` : null;
  const emailHref = primaryContactEmail ? `mailto:${primaryContactEmail}` : null;
  const sortedRelatedQuotes = [...relatedQuotes].sort((left, right) => {
    const priorities: Record<QuoteStatus, number> = {
      Scheduled: 0,
      Accepted: 1,
      Approved: 2,
      Sent: 3,
      Draft: 4,
      Declined: 5,
    };

    const statusDifference = priorities[left.status] - priorities[right.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return right.date.localeCompare(left.date);
  });
  const sortedRelatedInvoices = [...relatedInvoices].sort((left, right) => {
    const priorities: Record<InvoiceStatus, number> = {
      Unpaid: 0,
      Draft: 1,
      Sent: 2,
      Approved: 3,
      Accepted: 4,
      Paid: 5,
      Declined: 6,
    };

    const statusDifference = priorities[left.status] - priorities[right.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return right.date.localeCompare(left.date);
  });
  const primaryQuote = sortedRelatedQuotes[0] ?? null;
  const additionalQuotes = primaryQuote
      ? sortedRelatedQuotes.filter((quote) => quote.id !== primaryQuote.id)
      : sortedRelatedQuotes;
  const primaryInvoice = sortedRelatedInvoices[0] ?? null;
  const additionalInvoices = primaryInvoice
      ? sortedRelatedInvoices.filter((invoice) => invoice.id !== primaryInvoice.id)
      : sortedRelatedInvoices;
  const quickActions: Array<{
    key: string;
    label: string;
    detail: string;
    href?: string | null;
    onClick?: () => void;
    icon: typeof Phone;
  }> = [
    {
      key: "call",
      label: "Call",
      detail: phoneValue || "No phone",
      href: phoneHref,
      icon: Phone,
    },
    {
      key: "text",
      label: "Text",
      detail: phoneValue || "No mobile",
      href: textHref,
      icon: MessageSquare,
    },
    {
      key: "navigate",
      label: "Navigate",
      detail: linkedCustomerAddress || "No address",
      href: jobNavigationUrl,
      icon: Navigation,
    },
    {
      key: "customer",
      label: "Open Customer",
      detail: linkedCustomer?.name ?? "No customer",
      onClick: linkedCustomer ? () => onOpenCustomer(linkedCustomer.id) : undefined,
      icon: Users,
    },
    {
      key: "quote",
      label: "Open Quote",
      detail: primaryQuote?.quoteNumber ?? "No quote",
      onClick: primaryQuote ? () => onEditQuote(primaryQuote.id) : undefined,
      icon: FileText,
    },
    {
      key: "invoice",
      label: "Open Invoice",
      detail: primaryInvoice?.invoiceNumber ?? "No invoice",
      onClick: primaryInvoice ? () => onEditInvoice(primaryInvoice.id) : undefined,
      icon: Receipt,
    },
  ] as const;
  const checklistItems: Array<{
    key: ScheduledJobChecklistKey;
    label: string;
    description: string;
  }> = [
    {
      key: "arrived",
      label: "Arrived on site",
      description: "Mark when the team reaches the property.",
    },
    {
      key: "accessConfirmed",
      label: "Access confirmed",
      description: "Gates, keys, and entry details are sorted.",
    },
    {
      key: "workComplete",
      label: "Work complete",
      description: "The scheduled visit has been finished on site.",
    },
    {
      key: "invoiceSent",
      label: "Invoice sent",
      description: "The customer has been sent the invoice for this visit.",
    },
  ];

  function formatMoney(value: number | null | undefined) {
    return moneyFormatter.format(Number(value ?? 0));
  }

  function getDocumentStatusClasses(status: string) {
    switch (status) {
      case "Accepted":
      case "Paid":
      case "Completed":
        return "bg-emerald-100 text-emerald-700";
      case "Declined":
      case "Cancelled":
        return "bg-rose-100 text-rose-700";
      case "Approved":
      case "Unpaid":
      case "Scheduled":
        return "bg-amber-100 text-amber-700";
      case "Sent":
      case "In Progress":
        return "bg-sky-100 text-sky-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  function handleCancelEdit() {
    setDraftTitle(job.title);
    setDraftDate(getInputDateValue(job.date) || job.date);
    setDraftStartTime(getScheduledJobTimeInputValue(job.startTime));
    setDraftFinishTime(getScheduledJobTimeInputValue(job.finishTime));
    setDraftType(job.type);
    setDraftCustomerId(job.customerId != null ? String(job.customerId) : "");
    setDraftCustomerName(job.customerName ?? "");
    setDraftNotes(job.notes ?? "");
    setIsEditing(false);
  }

  async function handleSaveJobDetails() {
    if (isSavingDetails || isDeleting) {
      return;
    }

    const trimmedTitle = draftTitle.trim();
    const normalizedDate = getInputDateValue(draftDate);
    const normalizedStartTime = getScheduledJobTimeInputValue(draftStartTime);
    const normalizedFinishTime = getScheduledJobTimeInputValue(draftFinishTime);

    if (!trimmedTitle) {
      window.alert("Enter a job title.");
      return;
    }

    if (!normalizedDate) {
      window.alert("Choose a valid job date.");
      return;
    }

    if (
        normalizedStartTime &&
        normalizedFinishTime &&
        normalizedFinishTime <= normalizedStartTime
    ) {
      window.alert("Finish time needs to be later than the start time.");
      return;
    }

    const selectedCustomer =
        draftCustomerId !== ""
            ? customers.find((customer) => customer.id === Number(draftCustomerId)) ??
              null
            : null;

    try {
      setIsSavingDetails(true);
      const savedJob = await onSaveJob({
        ...job,
        title: trimmedTitle,
        date: normalizedDate,
        notes: draftNotes.trim() || undefined,
        startTime: normalizedStartTime || undefined,
        finishTime: normalizedFinishTime || undefined,
        customerId: selectedCustomer?.id ?? null,
        customerName:
            selectedCustomer?.name ?? (draftCustomerName.trim() || undefined),
        type: draftType,
      });

      if (!savedJob) {
        return;
      }

      setIsEditing(false);
    } finally {
      setIsSavingDetails(false);
    }
  }

  async function handleToggleCompleted() {
    if (isCompleting || isDeleting) {
      return;
    }

    try {
      setIsCompleting(true);
      await onToggleCompleted(job.id);
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleDeleteJob() {
    if (isDeleting || isCompleting) {
      return;
    }

    try {
      setIsDeleting(true);
      await onDeleteJob(job.id);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <button
              onClick={onBack}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getDocumentStatusClasses(job.status)}`}>
              {job.status}
            </span>

            <button
                onClick={() => setIsEditing(true)}
                disabled={isDeleting || isSavingDetails}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
            >
              <Pencil size={16} />
              Edit Details
            </button>

            <button
                onClick={handleToggleCompleted}
                disabled={isCompleting || isDeleting}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed ${
                  job.status === "Completed"
                      ? "bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 disabled:text-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 disabled:text-emerald-700"
                }`}
            >
              <CheckCircle2 size={16} />
              {isCompleting
                  ? job.status === "Completed"
                    ? "Undoing..."
                    : "Marking..."
                  : job.status === "Completed"
                    ? "Undo Complete"
                    : "Mark Completed"}
            </button>

            <button
                onClick={handleDeleteJob}
                disabled={isDeleting || isCompleting}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-rose-100 disabled:bg-rose-50 disabled:text-rose-300"
            >
              <Trash2 size={16} />
              {isDeleting ? "Deleting..." : "Delete Job"}
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <div className="rounded-[24px] bg-gradient-to-r from-[#153c3f] via-[#1d474a] to-[#244d51] px-6 py-6 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
              Scheduled Job
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">
                  {job.title}
                </h1>
                <p className="mt-2 text-sm text-white/75">{jobDateLabel}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/10">
                  {job.type}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/10">
                  {jobTimeRange ?? "No time added"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/10">
                  {linkedDocumentCount} linked document{linkedDocumentCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          {isEditing && (
              <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSaveJobDetails();
                  }}
                  className="mt-5 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Edit Job
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                      Details
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                        type="submit"
                        disabled={isSavingDetails}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Save size={16} />
                      {isSavingDetails ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSavingDetails}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="md:col-span-2 xl:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Job Title
                    </span>
                    <input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Job Date
                    </span>
                    <input
                        type="date"
                        value={draftDate}
                        onChange={(event) => setDraftDate(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Job Type
                    </span>
                    <select
                        value={draftType}
                        onChange={(event) =>
                            setDraftType(event.target.value as ScheduledJobType)
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    >
                      <option value="One Off">One Off</option>
                      <option value="Quote Accepted">Quote Accepted</option>
                      <option value="Grass Cut">Grass Cut</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Approx. Start Time
                    </span>
                    <input
                        type="time"
                        value={draftStartTime}
                        onChange={(event) => setDraftStartTime(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Approx. Finish Time
                    </span>
                    <input
                        type="time"
                        value={draftFinishTime}
                        onChange={(event) => setDraftFinishTime(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Linked Customer
                    </span>
                    <select
                        value={draftCustomerId}
                        onChange={(event) => {
                          const nextCustomerId = event.target.value;
                          setDraftCustomerId(nextCustomerId);

                          if (nextCustomerId) {
                            const nextCustomer =
                                customers.find(
                                    (customer) =>
                                        customer.id === Number(nextCustomerId)
                                ) ?? null;
                            setDraftCustomerName(nextCustomer?.name ?? "");
                          }
                        }}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    >
                      <option value="">No linked customer</option>
                      {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} - {getCustomerDisplayAddress(customer)}
                          </option>
                      ))}
                    </select>
                  </label>

                  {draftCustomerId === "" && (
                      <label className="md:col-span-2">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Customer Name
                        </span>
                        <input
                            value={draftCustomerName}
                            onChange={(event) =>
                                setDraftCustomerName(event.target.value)
                            }
                            placeholder="Optional customer name"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        />
                      </label>
                  )}

                  <label className="md:col-span-2 xl:col-span-4">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Notes
                    </span>
                    <textarea
                        value={draftNotes}
                        onChange={(event) => setDraftNotes(event.target.value)}
                        className="min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    />
                  </label>
                </div>
              </form>
          )}

          <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Quick Actions
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  Run The Job
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                Jump into the most common things you need on site.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                const disabled = !action.href && !action.onClick;
                const baseClassName =
                    "flex h-full min-h-[92px] w-full items-start gap-3 rounded-2xl border p-4 text-left transition";
                const stateClassName = disabled
                    ? "cursor-not-allowed border-slate-200 bg-white/70 text-slate-400"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";

                const content = (
                    <>
                      <div className="rounded-xl bg-slate-50 p-2 text-[#153c3f] ring-1 ring-slate-200">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {action.detail}
                        </p>
                      </div>
                    </>
                );

                if (action.href) {
                  return (
                      <a
                          key={action.key}
                          href={action.href}
                          target={action.key === "navigate" ? "_blank" : undefined}
                          rel={action.key === "navigate" ? "noreferrer" : undefined}
                          className={`${baseClassName} ${stateClassName}`}
                      >
                        {content}
                      </a>
                  );
                }

                return (
                    <button
                        key={action.key}
                        type="button"
                        disabled={disabled}
                        onClick={action.onClick}
                        className={`${baseClassName} ${stateClassName}`}
                    >
                      {content}
                    </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm">
              <p className="text-xs text-slate-400">Job Type</p>
              <p className="mt-2 font-semibold text-slate-900">{job.type}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm">
              <p className="text-xs text-slate-400">Status</p>
              <p className="mt-2 font-semibold text-slate-900">{job.status}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm">
              <p className="text-xs text-slate-400">Approx. Time</p>
              <p className="mt-2 font-semibold text-slate-900">
                {jobTimeRange ?? "No time added"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm">
              <p className="text-xs text-slate-400">Linked Quotes</p>
              <p className="mt-2 font-semibold text-slate-900">{relatedQuotes.length}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm">
              <p className="text-xs text-slate-400">Linked Invoices</p>
              <p className="mt-2 font-semibold text-slate-900">{relatedInvoices.length}</p>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm md:col-span-2 xl:col-span-3">
              <p className="text-xs text-slate-400">Assigned Customer</p>
              {linkedCustomer ? (
                  <div className="mt-2 space-y-4">
                    <p className="text-xl font-black tracking-tight text-slate-900">{linkedCustomer.name}</p>
                    <p className="text-sm leading-6 text-slate-500">
                      {getCustomerDisplayAddress(linkedCustomer) || "—"}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Phone
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {phoneValue || "No phone number added"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Email
                        </p>
                        <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                          {primaryContactEmail || "No email address added"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {linkedCustomer.customerType}
                      </span>
                      <button
                          onClick={() => onOpenCustomer(linkedCustomer.id)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Open Customer
                      </button>
                      {jobNavigationUrl && (
                          <a
                              href={jobNavigationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-[#153c3f] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1d4c50]"
                          >
                            <Navigation size={14} />
                            Navigate To Job
                          </a>
                      )}
                      {emailHref && (
                          <a
                              href={emailHref}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            <Mail size={14} />
                            Email Customer
                          </a>
                      )}
                    </div>
                  </div>
              ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Link a customer to this job to surface their details and route shortcuts here.
                  </p>
              )}
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm md:col-span-2 xl:col-span-2">
              <p className="text-xs text-slate-400">Job Checklist</p>
              <div className="mt-3 space-y-3">
                {checklistItems.map((item) => (
                    <label
                        key={item.key}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                    >
                      <input
                          type="checkbox"
                          checked={checklist[item.key]}
                          onChange={(event) => onUpdateChecklist(item.key, event.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#153c3f] focus:ring-[#244d51]"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {item.description}
                        </span>
                      </span>
                    </label>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm md:col-span-2 xl:col-span-5">
              <p className="text-xs text-slate-400">Notes</p>
              <p className={`mt-2 text-sm leading-6 ${trimmedJobNotes ? "text-slate-700" : "text-slate-400"}`}>
                {trimmedJobNotes || "No notes added yet for this scheduled job."}
              </p>
            </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Job Map
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                    Location Preview
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {linkedCustomerAddress
                        ? linkedCustomerAddress
                        : "Link a customer with an address to preview this job on the map."}
                  </p>
                </div>

                {jobNavigationUrl && (
                    <a
                        href={jobNavigationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Navigation size={16} />
                      Open in Maps
                    </a>
                )}
              </div>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                {jobMapEmbedUrl ? (
                    <iframe
                        title={`Map for ${job.title}`}
                        src={jobMapEmbedUrl}
                        loading="lazy"
                        allowFullScreen
                        className="h-[420px] w-full"
                    />
                ) : (
                    <div className="flex h-[420px] items-center justify-center px-6 text-center">
                      <div className="space-y-3">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                          <MapPin size={20} />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          No map location available yet.
                        </p>
                        <p className="text-sm text-slate-500">
                          Add a linked customer with an address or coordinates to show this job on the map.
                        </p>
                      </div>
                    </div>
                )}
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                {linkedCustomerHasCoordinates
                    ? "Map preview is using the customer's saved coordinates."
                    : linkedCustomerAddress
                      ? "Map preview is using the customer's saved address."
                      : "Add a linked customer address or coordinates to enable the live preview."}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Linked Documents
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                Quotes & Invoices
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              {linkedDocumentCount} linked document{linkedDocumentCount === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white p-2 text-[#153c3f] ring-1 ring-slate-200">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Primary Quote
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {primaryQuote ? primaryQuote.quoteNumber : "No quote linked"}
                  </p>
                </div>
              </div>

              {primaryQuote ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{primaryQuote.quoteNumber}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(primaryQuote.date).toLocaleDateString()} - {formatMoney(primaryQuote.total)}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getDocumentStatusClasses(primaryQuote.status)}`}>
                        {primaryQuote.status}
                      </span>
                    </div>
                    <button
                        onClick={() => onEditQuote(primaryQuote.id)}
                        className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Open Quote
                    </button>
                  </div>
              ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    Add or link a quote to surface it here.
                  </p>
              )}
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white p-2 text-[#153c3f] ring-1 ring-slate-200">
                  <Receipt size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Primary Invoice
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {primaryInvoice ? primaryInvoice.invoiceNumber : "No invoice linked"}
                  </p>
                </div>
              </div>

              {primaryInvoice ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{primaryInvoice.invoiceNumber}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(primaryInvoice.date).toLocaleDateString()} - {formatMoney(primaryInvoice.total)}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getDocumentStatusClasses(primaryInvoice.status)}`}>
                        {primaryInvoice.status}
                      </span>
                    </div>
                    <button
                        onClick={() => onEditInvoice(primaryInvoice.id)}
                        className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Open Invoice
                    </button>
                  </div>
              ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    Link an invoice to surface it here.
                  </p>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {primaryQuote ? "Additional Quotes" : "Quotes"}
              </p>
              {additionalQuotes.length ? (
                  <div className="mt-3 space-y-2">
                    {additionalQuotes.map((linkedQuote) => (
                        <div
                            key={linkedQuote.id}
                            className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {linkedQuote.quoteNumber}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {new Date(linkedQuote.date).toLocaleDateString()} · {formatMoney(linkedQuote.total)}
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getDocumentStatusClasses(linkedQuote.status)}`}>
                              {linkedQuote.status}
                            </span>
                          </div>
                          <button
                              onClick={() => onEditQuote(linkedQuote.id)}
                              className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Open Quote
                          </button>
                        </div>
                    ))}
                  </div>
              ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    {primaryQuote ? "No additional quotes linked." : "No quotes linked."}
                  </p>
              )}
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {primaryInvoice ? "Additional Invoices" : "Invoices"}
              </p>
              {additionalInvoices.length ? (
                  <div className="mt-3 space-y-2">
                    {additionalInvoices.map((linkedInvoice) => (
                        <div
                            key={linkedInvoice.id}
                            className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {linkedInvoice.invoiceNumber}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {new Date(linkedInvoice.date).toLocaleDateString()} · {formatMoney(linkedInvoice.total)}
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getDocumentStatusClasses(linkedInvoice.status)}`}>
                              {linkedInvoice.status}
                            </span>
                          </div>
                          <button
                              onClick={() => onEditInvoice(linkedInvoice.id)}
                              className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Open Invoice
                          </button>
                        </div>
                    ))}
                  </div>
              ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    {primaryInvoice ? "No additional invoices linked." : "No invoices linked."}
                  </p>
              )}
            </div>
          </div>
        </section>
      </div>
  );
}

export default function JobsApp() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [expandedNavSections, setExpandedNavSections] = useState<Record<string, boolean>>(
      () => getExpandedNavSections(getNavSectionTitle("dashboard"))
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerLeads, setCustomerLeads] = useState<CustomerLead[]>([]);
  const [visitLogs, setVisitLogs] = useState<VisitLog[]>([]);
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);
  const [commercialRamsDocuments, setCommercialRamsDocuments] = useState<
      CommercialRamsDocument[]
  >([]);
  const [pendingCashPaymentDates, setPendingCashPaymentDates] = useState<
      Record<string, string>
  >(DEFAULT_PERSISTED_APP_STATE.pendingCashPaymentDates);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>(
      DEFAULT_PERSISTED_APP_STATE.scheduledJobs
  );
  const [scheduledJobChecklists, setScheduledJobChecklists] = useState<
      Record<string, ScheduledJobChecklistState>
  >(DEFAULT_PERSISTED_APP_STATE.scheduledJobChecklists);
  const [quoteFollowUps, setQuoteFollowUps] = useState<
      Record<string, QuoteFollowUpState>
  >(DEFAULT_PERSISTED_APP_STATE.quoteFollowUps);
  const [invoiceReminders, setInvoiceReminders] = useState<
      Record<string, InvoiceReminderState>
  >(DEFAULT_PERSISTED_APP_STATE.invoiceReminders);
  const [quoteHistory, setQuoteHistory] = useState<
      Record<string, DocumentHistoryEntry[]>
  >(DEFAULT_PERSISTED_APP_STATE.quoteHistory);
  const [invoiceHistory, setInvoiceHistory] = useState<
      Record<string, DocumentHistoryEntry[]>
  >(DEFAULT_PERSISTED_APP_STATE.invoiceHistory);
  const [ignoredMoveSuggestionIds, setIgnoredMoveSuggestionIds] = useState<string[]>(
      DEFAULT_PERSISTED_APP_STATE.ignoredMoveSuggestionIds
  );
  const [routeChangeHistory, setRouteChangeHistory] = useState<RouteChangeRecord[]>(
      DEFAULT_PERSISTED_APP_STATE.routeChangeHistory
  );
  const [routeNotes, setRouteNotes] = useState<Record<string, string>>(
      DEFAULT_PERSISTED_APP_STATE.routeNotes
  );
  const [quotes, setQuotes] = useState<Quote[]>(DEFAULT_PERSISTED_APP_STATE.quotes);
  const [quotesTableInitialized, setQuotesTableInitialized] = useState(
      DEFAULT_PERSISTED_APP_STATE.quotesTableInitialized
  );
  const [invoices, setInvoices] = useState<Invoice[]>(
      DEFAULT_PERSISTED_APP_STATE.invoices
  );
  const [invoicesWriteFallbackActive, setInvoicesWriteFallbackActive] = useState(
      DEFAULT_PERSISTED_APP_STATE.invoicesWriteFallbackActive
  );
  const [recurringInvoiceTemplates, setRecurringInvoiceTemplates] = useState<
      RecurringInvoiceTemplateRecord[]
  >(DEFAULT_PERSISTED_APP_STATE.recurringInvoiceTemplates);
  const [recurringInvoiceTemplatesFallbackActive, setRecurringInvoiceTemplatesFallbackActive] =
      useState(DEFAULT_PERSISTED_APP_STATE.recurringInvoiceTemplatesFallbackActive);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedScheduledJobId, setSelectedScheduledJobId] = useState<string | null>(null);
  const [jobProfileBackPage, setJobProfileBackPage] = useState<"schedule" | "jobs">("schedule");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [pendingQuoteSchedule, setPendingQuoteSchedule] =
      useState<PendingQuoteSchedule | null>(null);
  const [pendingLeadQuoteDraft, setPendingLeadQuoteDraft] =
      useState<PendingLeadQuoteDraft | null>(null);
  const [workflowMessageTarget, setWorkflowMessageTarget] =
      useState<WorkflowMessageTarget | null>(null);

  const [selectedWeek, setSelectedWeek] = useState<WeekName>(
      DEFAULT_PERSISTED_APP_STATE.selectedWeek
  );
  const [selectedDay, setSelectedDay] = useState<DayName>(
      DEFAULT_PERSISTED_APP_STATE.selectedDay
  );

  const [lockedRounds, setLockedRounds] = useState<Record<string, boolean>>(
      DEFAULT_PERSISTED_APP_STATE.lockedRounds
  );
  const [activeRoundCycles, setActiveRoundCycles] = useState<Record<string, number>>(
      DEFAULT_PERSISTED_APP_STATE.activeRoundCycles
  );
  const [workflowTablesReady, setWorkflowTablesReady] = useState<WorkflowTablesReady>(
      DEFAULT_WORKFLOW_TABLES_READY
  );
  const [staffTablesReady, setStaffTablesReady] = useState<StaffTablesReady>(
      DEFAULT_STAFF_TABLES_READY
  );
  const isProcessingRecurringInvoicesRef = useRef(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [canSyncAppState, setCanSyncAppState] = useState(true);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [todayReferenceDate, setTodayReferenceDate] = useState(() => new Date());
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loggedInStaffName, setLoggedInStaffName] = useState("Staff Member");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const staffSystemReady =
      staffTablesReady.staffMembers && staffTablesReady.rolePermissions;
  const currentStaffMember = useMemo(
      () => findMatchingStaffMember(staffMembers, currentUserId, currentUserEmail),
      [currentUserEmail, currentUserId, staffMembers]
  );
  const currentUserIsAdmin = useMemo(() => {
    if (!staffSystemReady) {
      return true;
    }

    if (!currentStaffMember) {
      return false;
    }

    return Boolean(currentStaffMember.isSystemAdmin) || currentStaffMember.role === "Admin";
  }, [currentStaffMember, staffSystemReady]);
  const allowedRolePages = useMemo(() => {
    if (!staffSystemReady || currentUserIsAdmin) {
      return new Set<StaffPageAccessKey>(
          STAFF_PAGE_OPTIONS.map((pageOption) => pageOption.key)
      );
    }

    if (!currentStaffMember?.isActive) {
      return new Set<StaffPageAccessKey>();
    }

    return new Set<StaffPageAccessKey>(
        rolePermissions
            .filter(
                (permission) =>
                    permission.role === currentStaffMember.role &&
                    permission.allowed &&
                    !ADMIN_ONLY_PAGE_KEYS.has(permission.pageKey)
            )
            .map((permission) => permission.pageKey)
    );
  }, [currentStaffMember, currentUserIsAdmin, rolePermissions, staffSystemReady]);
  const hasPageAccess = useCallback(
      (nextPage: PageKey) => {
        if (!staffSystemReady || currentUserIsAdmin) {
          return true;
        }

        const accessKey = getPageAccessKey(nextPage);

        if (ADMIN_ONLY_PAGE_KEYS.has(accessKey)) {
          return false;
        }

        return allowedRolePages.has(accessKey);
      },
      [allowedRolePages, currentUserIsAdmin, staffSystemReady]
  );
  const accessibleNavSections = useMemo(
      () =>
          NAV_SECTIONS.map((section) => ({
            ...section,
            items: section.items.filter((item) => hasPageAccess(item.key)),
          })).filter((section) => section.items.length > 0),
      [hasPageAccess]
  );
  const firstAccessiblePage = useMemo<PageKey | null>(
      () => accessibleNavSections[0]?.items[0]?.key ?? null,
      [accessibleNavSections]
  );
  const newLeadsCount = useMemo(
      () => customerLeads.filter((lead) => lead.status === "new").length,
      [customerLeads]
  );

  const baseRoundKey = getBaseRoundKey(selectedWeek, selectedDay);
  const activeRoundCycle = getActiveRoundCycle(activeRoundCycles, baseRoundKey);
  const roundKey = getRoundKeyForCycle(baseRoundKey, activeRoundCycle);
  const isLocked = !!lockedRounds[roundKey];
  const todayPanel = useMemo(
      () => getTodayPanelState(todayReferenceDate),
      [todayReferenceDate]
  );
  const todayRoundKey = todayPanel.selectedDay
      ? getActiveRoundKey(
          activeRoundCycles,
          todayPanel.week,
          todayPanel.selectedDay
      )
      : null;
  const isTodayLocked = todayRoundKey
      ? Boolean(lockedRounds[todayRoundKey])
      : false;

  useEffect(() => {
    setAppSettings(loadAppSettings());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", appSettings.primaryColor);
    root.style.setProperty("--brand-secondary", appSettings.secondaryColor);
  }, [appSettings.primaryColor, appSettings.secondaryColor]);

  useEffect(() => {
    const activeSectionTitle = getNavSectionTitle(page);
    setExpandedNavSections(getExpandedNavSections(activeSectionTitle));
  }, [page]);

  useEffect(() => {
    if (hasPageAccess(page) || !firstAccessiblePage) {
      return;
    }

    setExpandedNavSections(getExpandedNavSections(getNavSectionTitle(firstAccessiblePage)));
    setPage(firstAccessiblePage);
  }, [firstAccessiblePage, hasPageAccess, page]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== SETTINGS_STORAGE_KEY) {
        return;
      }

      setAppSettings(loadAppSettings());
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const syncQuoteItemsTable = useCallback(
      async (nextQuoteServices: QuoteService[]) => {
        if (!workflowTablesReady.items) {
          return;
        }

        const supabase = createSupabaseClient();
        const { data: existingRows, error: existingRowsError } = await supabase
            .from("items")
            .select("id");

        if (existingRowsError) {
          throw existingRowsError;
        }

        if (nextQuoteServices.length > 0) {
          const { error: upsertError } = await supabase
              .from("items")
              .upsert(nextQuoteServices.map(mapQuoteServiceToCatalogItemRow), {
                onConflict: "id",
              });

          if (upsertError) {
            throw upsertError;
          }
        }

        const idsToDelete = ((existingRows ?? []) as Array<{ id: string }>)
            .map((row) => row.id)
            .filter((id) => !nextQuoteServices.some((service) => service.id === id));

        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabase
              .from("items")
              .delete()
              .in("id", idsToDelete);

          if (deleteError) {
            throw deleteError;
          }
        }
      },
      [workflowTablesReady.items]
  );

  const handleSaveSettings = useCallback(async (settings: AppSettings) => {
    const merged = mergeAppSettings(settings);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    }

    setAppSettings(merged);

    try {
      await syncQuoteItemsTable(merged.quoteServices);
      setDatabaseError(
          getDatabaseSetupNotice(workflowTablesReady, staffTablesReady)
      );
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      }

      throw error;
    }
  }, [staffTablesReady, syncQuoteItemsTable, workflowTablesReady]);

  const buildPersistedAppState = useCallback(
      (overrides: Partial<PersistedAppState> = {}): PersistedAppState => ({
        version: 1,
        scheduledJobs,
        scheduledJobChecklists,
        quoteFollowUps,
        invoiceReminders,
        quoteHistory,
        invoiceHistory,
        ignoredMoveSuggestionIds,
        routeChangeHistory,
        routeNotes,
        quotes,
        invoices,
        recurringInvoiceTemplates,
        lockedRounds,
        activeRoundCycles,
        pendingCashPaymentDates,
        selectedWeek,
        selectedDay,
        appSettings,
        quotesTableInitialized,
        invoicesWriteFallbackActive,
        recurringInvoiceTemplatesFallbackActive,
        ...overrides,
      }),
      [
        activeRoundCycles,
        appSettings,
        ignoredMoveSuggestionIds,
        invoiceHistory,
        invoiceReminders,
        invoices,
        invoicesWriteFallbackActive,
        lockedRounds,
        pendingCashPaymentDates,
        quoteFollowUps,
        quoteHistory,
        quotes,
        quotesTableInitialized,
        routeChangeHistory,
        routeNotes,
        recurringInvoiceTemplates,
        recurringInvoiceTemplatesFallbackActive,
        scheduledJobs,
        scheduledJobChecklists,
        selectedDay,
        selectedWeek,
      ]
  );

  const persistAppStateSnapshot = useCallback(async (nextState: PersistedAppState) => {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from(APP_STATE_TABLE).upsert(
        {
          id: APP_STATE_ROW_ID,
          data: nextState,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
    );

    if (error) {
      throw error;
    }

    setDatabaseError(
        getDatabaseSetupNotice(workflowTablesReady, staffTablesReady)
    );
  }, [staffTablesReady, workflowTablesReady]);

  const syncRecurringInvoiceTemplatesFallback = useCallback(
      async (
          nextTemplates: RecurringInvoiceTemplateRecord[],
          fallbackNotice?: string | null
      ) => {
        setRecurringInvoiceTemplates(nextTemplates);
        setRecurringInvoiceTemplatesFallbackActive(true);

        const baseNotice =
            fallbackNotice ??
            getDatabaseSetupNotice(
                {
                  ...workflowTablesReady,
                  recurringInvoiceTemplates: true,
                },
                staffTablesReady
            );

        if (isDatabaseReady && canSyncAppState) {
          try {
            await persistAppStateSnapshot(
                buildPersistedAppState({
                  recurringInvoiceTemplates: nextTemplates,
                  recurringInvoiceTemplatesFallbackActive: true,
                })
            );
            setDatabaseError(baseNotice);
          } catch (appStateError) {
            if (isErrorWithMessage(appStateError)) {
              setDatabaseError(
                  baseNotice
                      ? `${baseNotice} ${formatDatabaseError(appStateError)}`
                      : formatDatabaseError(appStateError)
              );
            } else {
              setDatabaseError(
                  baseNotice
                      ? `${baseNotice} Recurring invoice template sync failed.`
                      : "Recurring invoice template sync failed."
              );
            }
          }
        } else {
          setDatabaseError(baseNotice);
        }
      },
      [
        buildPersistedAppState,
        canSyncAppState,
        isDatabaseReady,
        persistAppStateSnapshot,
        staffTablesReady,
        workflowTablesReady,
      ]
  );

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
    );
    const timeoutId = window.setTimeout(
        () => setTodayReferenceDate(new Date()),
        nextMidnight.getTime() - now.getTime() + 1000
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [todayReferenceDate]);

  useEffect(() => {
    let isCancelled = false;

    async function loadPersistedState() {
      try {
        const supabase = createSupabaseClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          throw new Error("You are signed out. Please sign in again.");
        }

        setCurrentUserId(user.id);
        setCurrentUserEmail(user.email ?? null);
        setLoggedInStaffName(getLoggedInStaffName(user));

        const [
          customersResult,
          visitsResult,
          customerLeadsResult,
          monthlyPaymentsResult,
          commercialRamsResult,
          itemsResult,
          quotesResult,
          invoicesResult,
          recurringInvoiceTemplatesResult,
          scheduledJobsResult,
          appStateResult,
          staffMembersResult,
          rolePermissionsResult,
        ] = await Promise.all([
          supabase
              .from("customers")
              .select(CUSTOMER_SELECT_FIELDS)
              .order("name", { ascending: true }),
          supabase
              .from("visits")
              .select(VISIT_SELECT_FIELDS)
              .order("visit_date", { ascending: false }),
          supabase
              .from("customer_leads")
              .select(CUSTOMER_LEAD_SELECT_FIELDS)
              .order("submitted_at", { ascending: false }),
          supabase
              .from("monthly_payments")
              .select(MONTHLY_PAYMENT_SELECT_FIELDS)
              .order("payment_month", { ascending: true })
              .order("customer_id", { ascending: true }),
          supabase
              .from("commercial_rams_documents")
              .select(COMMERCIAL_RAMS_SELECT_FIELDS)
              .order("updated_at", { ascending: false })
              .order("created_at", { ascending: false }),
          supabase
              .from("items")
              .select("id,title,category,item_type,price,buy_price,created_at,updated_at")
              .order("category", { ascending: true })
              .order("title", { ascending: true }),
          supabase
              .from("quotes")
              .select(QUOTE_SELECT_FIELDS)
              .order("date", { ascending: false }),
          supabase
              .from("invoices")
              .select(INVOICE_SELECT_FIELDS)
              .order("date", { ascending: false }),
          supabase
              .from("recurring_invoice_templates")
              .select(RECURRING_INVOICE_TEMPLATE_SELECT_FIELDS),
          supabase
              .from("scheduled_jobs")
              .select(SCHEDULED_JOB_SELECT_FIELDS)
              .order("date", { ascending: true }),
          supabase
              .from(APP_STATE_TABLE)
              .select("data")
              .eq("id", APP_STATE_ROW_ID)
              .limit(1)
              .maybeSingle(),
          supabase
              .from("staff_members")
              .select(STAFF_MEMBER_SELECT_FIELDS)
              .order("full_name", { ascending: true }),
          supabase
              .from("role_permissions")
              .select(ROLE_PERMISSION_SELECT_FIELDS)
              .order("role", { ascending: true })
              .order("page_key", { ascending: true }),
        ]);

        if (customersResult.error) {
          throw customersResult.error;
        }

        let resolvedVisitRows = ((visitsResult.data ?? []) as unknown) as VisitRow[];
        let visitRoundMetadataWarning: string | null = null;

        if (visitsResult.error && isVisitRoundMetadataSchemaError(visitsResult.error)) {
          const legacyVisitsResult = await supabase
              .from("visits")
              .select(VISIT_LEGACY_SELECT_FIELDS)
              .order("visit_date", { ascending: false });

          if (legacyVisitsResult.error) {
            throw legacyVisitsResult.error;
          }

          resolvedVisitRows = ((legacyVisitsResult.data ?? []) as unknown) as VisitRow[];
          visitRoundMetadataWarning = VISIT_ROUND_METADATA_SETUP_NOTICE;
        }

        if (visitsResult.error && !isVisitRoundMetadataSchemaError(visitsResult.error)) {
          throw visitsResult.error;
        }

        if (customerLeadsResult.error && !isMissingTableError(customerLeadsResult.error)) {
          throw customerLeadsResult.error;
        }

        const appStateWarning = appStateResult.error
            ? formatDatabaseError(appStateResult.error)
            : null;
        const canReadAppState =
            !appStateResult.error || !isOptionalAppStateError(appStateResult.error);

        if (appStateResult.error && canReadAppState) {
          throw appStateResult.error;
        }

        if (itemsResult.error && !isMissingTableError(itemsResult.error)) {
          throw itemsResult.error;
        }

        if (monthlyPaymentsResult.error && !isMissingTableError(monthlyPaymentsResult.error)) {
          throw monthlyPaymentsResult.error;
        }

        if (commercialRamsResult.error && !isMissingTableError(commercialRamsResult.error)) {
          throw commercialRamsResult.error;
        }

        if (quotesResult.error && !isMissingTableError(quotesResult.error)) {
          throw quotesResult.error;
        }

        if (invoicesResult.error && !isMissingTableError(invoicesResult.error)) {
          throw invoicesResult.error;
        }

        if (
            recurringInvoiceTemplatesResult.error &&
            !isRecurringInvoiceTemplateFallbackError(recurringInvoiceTemplatesResult.error)
        ) {
          throw recurringInvoiceTemplatesResult.error;
        }

        if (scheduledJobsResult.error && !isMissingTableError(scheduledJobsResult.error)) {
          throw scheduledJobsResult.error;
        }

        if (staffMembersResult.error && !isMissingTableError(staffMembersResult.error)) {
          throw staffMembersResult.error;
        }

        if (rolePermissionsResult.error && !isMissingTableError(rolePermissionsResult.error)) {
          throw rolePermissionsResult.error;
        }

        if (isCancelled) {
          return;
        }

        const rawAppState = canReadAppState ? appStateResult.data?.data : undefined;
        const nextState = normalizePersistedAppState(rawAppState);
        const hasPersistedAppSettings =
            isRecord(rawAppState) &&
            Object.prototype.hasOwnProperty.call(rawAppState, "appSettings");
        const localAppSettings = loadAppSettings();
        let workflowSeedWarning: string | null = null;
        let nextWorkflowTablesReady: WorkflowTablesReady = {
          monthlyPayments: !monthlyPaymentsResult.error,
          commercialRams: !commercialRamsResult.error,
          customerLeads: !customerLeadsResult.error,
          items: !itemsResult.error,
          quotes: !quotesResult.error,
          invoices: !invoicesResult.error,
          recurringInvoiceTemplates: !recurringInvoiceTemplatesResult.error,
          scheduledJobs: !scheduledJobsResult.error,
        };
        const nextStaffTablesReady: StaffTablesReady = {
          staffMembers: !staffMembersResult.error,
          rolePermissions: !rolePermissionsResult.error,
        };
        const fallbackQuoteServices = hasPersistedAppSettings
            ? nextState.appSettings.quoteServices
            : localAppSettings.quoteServices;
        let nextQuotes = nextState.quotes;
        let nextQuotesTableInitialized = nextState.quotesTableInitialized;
        let nextInvoices = nextState.invoices;
        let nextInvoicesWriteFallbackActive = nextState.invoicesWriteFallbackActive;
        let nextRecurringInvoiceTemplates = nextState.recurringInvoiceTemplates;
        let nextRecurringInvoiceTemplatesFallbackActive =
            nextState.recurringInvoiceTemplatesFallbackActive;
        let nextScheduledJobs = nextState.scheduledJobs;
        const nextCommercialRamsDocuments = nextWorkflowTablesReady.commercialRams
            ? sortCommercialRamsDocuments(
                (((commercialRamsResult.data ?? []) as unknown) as CommercialRamsRow[]).map(
                    mapCommercialRamsRowToDocument
                )
            )
            : [];
        let nextQuoteServices = fallbackQuoteServices;
        let nextStaffMembers = nextStaffTablesReady.staffMembers
            ? sortStaffMembers(
                ((staffMembersResult.data ?? []) as StaffMemberRow[]).map(
                    mapStaffMemberRowToStaffMember
                )
            )
            : [];
        let nextRolePermissions = nextStaffTablesReady.rolePermissions
            ? ((rolePermissionsResult.data ?? []) as RolePermissionRow[]).map(
                mapRolePermissionRowToRolePermission
            )
            : [];

        if (nextWorkflowTablesReady.items) {
          const existingItems = ((itemsResult.data ?? []) as CatalogItemRow[]).map(
              mapCatalogItemRowToQuoteService
          );

          if (existingItems.length === 0 && fallbackQuoteServices.length > 0) {
            const seededItemsResult = await supabase
                .from("items")
                .upsert(fallbackQuoteServices.map(mapQuoteServiceToCatalogItemRow), {
                  onConflict: "id",
                })
                .select(
                    "id,title,category,item_type,price,buy_price,created_at,updated_at"
                );

            if (seededItemsResult.error) {
              throw seededItemsResult.error;
            }

            nextQuoteServices = ((seededItemsResult.data ?? []) as CatalogItemRow[]).map(
                mapCatalogItemRowToQuoteService
            );
          } else {
            nextQuoteServices = existingItems;
          }
        }

        if (nextWorkflowTablesReady.quotes) {
          const existingQuotes = ((quotesResult.data ?? []) as QuoteRow[]).map(mapQuoteRowToQuote);

          if (
              existingQuotes.length === 0 &&
              nextState.quotes.length > 0 &&
              !nextQuotesTableInitialized
          ) {
            const seededQuotesResult = await supabase
                .from("quotes")
                .insert(nextState.quotes.map(mapQuoteToRow))
                .select(QUOTE_SELECT_FIELDS);

            if (seededQuotesResult.error) {
              throw seededQuotesResult.error;
            }

            nextQuotes = ((seededQuotesResult.data ?? []) as QuoteRow[]).map(mapQuoteRowToQuote);
            nextQuotesTableInitialized = true;
          } else {
            nextQuotes = existingQuotes;

            if (existingQuotes.length > 0) {
              nextQuotesTableInitialized = true;
            }
          }
        }

        if (nextWorkflowTablesReady.invoices) {
          const existingInvoices = ((invoicesResult.data ?? []) as InvoiceRow[]).map(
              mapInvoiceRowToInvoice
          );

          if (nextInvoicesWriteFallbackActive) {
            nextInvoices = nextState.invoices.length > 0
                ? mergeInvoicesWithFallback(nextState.invoices, existingInvoices)
                : existingInvoices;
          } else if (existingInvoices.length === 0 && nextState.invoices.length > 0) {
            const seededInvoicesResult = await supabase
                .from("invoices")
                .insert(nextState.invoices.map(mapInvoiceToRow))
                .select(INVOICE_SELECT_FIELDS);

            if (seededInvoicesResult.error) {
              if (isInvoiceWriteFallbackError(seededInvoicesResult.error)) {
                nextInvoices = sortInvoices(nextState.invoices);
                nextInvoicesWriteFallbackActive = true;
                workflowSeedWarning = formatDatabaseError(seededInvoicesResult.error);
              } else {
                throw seededInvoicesResult.error;
              }
            } else {
              nextInvoices = ((seededInvoicesResult.data ?? []) as InvoiceRow[]).map(
                  mapInvoiceRowToInvoice
              );
            }
          } else {
            nextInvoices = existingInvoices;
          }
        }

        if (nextWorkflowTablesReady.recurringInvoiceTemplates) {
          const existingRecurringInvoiceTemplates = (
              (recurringInvoiceTemplatesResult.data ?? []) as RecurringInvoiceTemplateRow[]
          ).map(mapRecurringInvoiceTemplateRowToTemplate);

          nextRecurringInvoiceTemplates = nextRecurringInvoiceTemplatesFallbackActive
              ? nextState.recurringInvoiceTemplates.length > 0
                  ? mergeRecurringInvoiceTemplatesWithFallback(
                      nextState.recurringInvoiceTemplates,
                      existingRecurringInvoiceTemplates
                  )
                  : existingRecurringInvoiceTemplates
              : sortRecurringInvoiceTemplates(existingRecurringInvoiceTemplates);
        } else if (
            recurringInvoiceTemplatesResult.error &&
            isRecurringInvoiceTemplateFallbackError(recurringInvoiceTemplatesResult.error)
        ) {
          nextWorkflowTablesReady = {
            ...nextWorkflowTablesReady,
            recurringInvoiceTemplates: true,
          };
          nextRecurringInvoiceTemplates = sortRecurringInvoiceTemplates(
              nextState.recurringInvoiceTemplates
          );
          nextRecurringInvoiceTemplatesFallbackActive = true;
        }

        if (nextWorkflowTablesReady.scheduledJobs) {
          const existingScheduledJobs = ((scheduledJobsResult.data ?? []) as ScheduledJobRow[]).map(
              mapScheduledJobRowToScheduledJob
          );

          if (existingScheduledJobs.length === 0 && nextState.scheduledJobs.length > 0) {
            const seededJobsResult = await supabase
                .from("scheduled_jobs")
                .insert(nextState.scheduledJobs.map(mapScheduledJobToRow))
                .select(SCHEDULED_JOB_SELECT_FIELDS);

            if (seededJobsResult.error) {
              nextWorkflowTablesReady = {
                ...nextWorkflowTablesReady,
                scheduledJobs: false,
              };
              nextScheduledJobs = nextState.scheduledJobs;
              workflowSeedWarning = formatDatabaseError(seededJobsResult.error);
            } else {
              nextScheduledJobs = ((seededJobsResult.data ?? []) as ScheduledJobRow[]).map(
                  mapScheduledJobRowToScheduledJob
              );
            }
          } else {
            nextScheduledJobs = existingScheduledJobs;
          }
        }

        if (nextStaffTablesReady.rolePermissions && nextRolePermissions.length === 0) {
          const seededRolePermissionsResult = await supabase
              .from("role_permissions")
              .upsert(
                  createDefaultRolePermissions().map(mapRolePermissionToWriteRow),
                  {
                    onConflict: "role,page_key",
                  }
              )
              .select(ROLE_PERMISSION_SELECT_FIELDS);

          if (seededRolePermissionsResult.error) {
            throw seededRolePermissionsResult.error;
          }

          nextRolePermissions = ((seededRolePermissionsResult.data ?? []) as RolePermissionRow[]).map(
              mapRolePermissionRowToRolePermission
          );
        }

        if (nextStaffTablesReady.staffMembers) {
          let matchedStaffMember = findMatchingStaffMember(
              nextStaffMembers,
              user.id,
              user.email
          );
          const systemAdminStaffMember =
              nextStaffMembers.find((staffMember) => staffMember.isSystemAdmin) ?? null;

          if (!systemAdminStaffMember) {
            const bootstrapAdminResult = await supabase
                .from("staff_members")
                .insert(
                    mapStaffMemberToWriteRow({
                      authUserId: user.id,
                      email: user.email ?? "",
                      fullName: getLoggedInStaffName(user),
                      role: "Admin",
                      isActive: true,
                      phone: "",
                      notes: "",
                      isSystemAdmin: true,
                    })
                )
                .select(STAFF_MEMBER_SELECT_FIELDS)
                .single();

            if (bootstrapAdminResult.error) {
              throw bootstrapAdminResult.error;
            }

            matchedStaffMember = mapStaffMemberRowToStaffMember(
                bootstrapAdminResult.data as StaffMemberRow
            );
            nextStaffMembers = sortStaffMembers([...nextStaffMembers, matchedStaffMember]);
          } else if (matchedStaffMember && matchedStaffMember.authUserId !== user.id) {
            const linkedStaffMemberResult = await supabase
                .from("staff_members")
                .update({ auth_user_id: user.id })
                .eq("id", matchedStaffMember.id)
                .select(STAFF_MEMBER_SELECT_FIELDS)
                .single();

            if (linkedStaffMemberResult.error) {
              throw linkedStaffMemberResult.error;
            }

            matchedStaffMember = mapStaffMemberRowToStaffMember(
                linkedStaffMemberResult.data as StaffMemberRow
            );
            nextStaffMembers = sortStaffMembers(
                nextStaffMembers.map((staffMember) =>
                    staffMember.id === matchedStaffMember?.id ? matchedStaffMember : staffMember
                )
            );
          }

          if (matchedStaffMember?.fullName) {
            setLoggedInStaffName(matchedStaffMember.fullName);
          }
        }

        setCustomers(
            ((customersResult.data ?? []) as CustomerRow[]).map(mapCustomerRowToCustomer)
        );
        setCustomerLeads(
            nextWorkflowTablesReady.customerLeads
                ? sortCustomerLeads(
                    (((customerLeadsResult.data ?? []) as unknown) as CustomerLeadRow[]).map(
                        mapCustomerLeadRowToLead
                    )
                )
                : []
        );
        setVisitLogs(resolvedVisitRows.map(mapVisitRowToVisit));
        setMonthlyPayments(
            nextWorkflowTablesReady.monthlyPayments
                ? sortMonthlyPayments(
                    ((monthlyPaymentsResult.data ?? []) as MonthlyPaymentRow[]).map(
                        mapMonthlyPaymentRowToMonthlyPayment
                    )
                )
                : []
        );
        setCommercialRamsDocuments(nextCommercialRamsDocuments);
        setQuotes(nextQuotes);
        setQuotesTableInitialized(nextQuotesTableInitialized);
        setInvoices(nextInvoices);
        setInvoicesWriteFallbackActive(nextInvoicesWriteFallbackActive);
        setRecurringInvoiceTemplates(nextRecurringInvoiceTemplates);
        setRecurringInvoiceTemplatesFallbackActive(
            nextRecurringInvoiceTemplatesFallbackActive
        );
        setScheduledJobs(nextScheduledJobs);
        setScheduledJobChecklists(nextState.scheduledJobChecklists);
        setQuoteFollowUps(nextState.quoteFollowUps);
        setInvoiceReminders(nextState.invoiceReminders);
        setQuoteHistory(nextState.quoteHistory);
        setInvoiceHistory(nextState.invoiceHistory);
        setIgnoredMoveSuggestionIds(nextState.ignoredMoveSuggestionIds);
        setRouteChangeHistory(nextState.routeChangeHistory);
        setRouteNotes(nextState.routeNotes);
        setLockedRounds(nextState.lockedRounds);
        setActiveRoundCycles(nextState.activeRoundCycles);
        setPendingCashPaymentDates(nextState.pendingCashPaymentDates);
        setSelectedWeek(nextState.selectedWeek);
        setSelectedDay(nextState.selectedDay);
        setStaffMembers(nextStaffMembers);
        setRolePermissions(nextRolePermissions);
        const resolvedAppSettings = mergeAppSettings({
          ...(hasPersistedAppSettings ? nextState.appSettings : localAppSettings),
          quoteServices: nextQuoteServices,
        });
        setAppSettings(resolvedAppSettings);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
              SETTINGS_STORAGE_KEY,
              JSON.stringify(resolvedAppSettings)
          );
        }
        setWorkflowTablesReady(nextWorkflowTablesReady);
        setStaffTablesReady(nextStaffTablesReady);
        // Keep app_state sync enabled even if the first client read fails.
        // In the browser this can be a transient auth/session timing issue, and
        // a successful follow-up upsert should clear the warning automatically.
        setCanSyncAppState(true);
        setIsDatabaseReady(true);
        setDatabaseError(
            workflowSeedWarning ??
                visitRoundMetadataWarning ??
                appStateWarning ??
                getDatabaseSetupNotice(nextWorkflowTablesReady, nextStaffTablesReady)
        );
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (isErrorWithMessage(error)) {
          setDatabaseError(formatDatabaseError(error));
        } else {
          setDatabaseError("Unable to reach Supabase.");
        }
      } finally {
        if (!isCancelled) {
          setIsHydrating(false);
        }
      }
    }

    loadPersistedState();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isHydrating || !isDatabaseReady || !canSyncAppState) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        await persistAppStateSnapshot(buildPersistedAppState());
      } catch (error) {
        if (isErrorWithMessage(error)) {
          setDatabaseError(formatDatabaseError(error));
          return;
        }

        setDatabaseError("Unable to save changes to Supabase.");
      }
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    buildPersistedAppState,
    canSyncAppState,
    isDatabaseReady,
    isHydrating,
    persistAppStateSnapshot,
  ]);

  async function createCustomer(customer: Customer) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from("customers")
        .insert(mapCustomerToRow(customer))
        .select(CUSTOMER_SELECT_FIELDS)
        .single();

    if (error) {
      setDatabaseError(formatDatabaseError(error));
      throw error;
    }

    const insertedCustomer = mapCustomerRowToCustomer(data as CustomerRow);
    setCustomers((prev) => [...prev, insertedCustomer]);
    setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
    return insertedCustomer;
  }

  async function saveCustomer(updatedCustomer: Customer) {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from("customers")
        .update(mapCustomerToRow(updatedCustomer))
        .eq("id", updatedCustomer.id)
        .select(CUSTOMER_SELECT_FIELDS)
        .single();

    if (error) {
      setDatabaseError(formatDatabaseError(error));
      throw error;
    }

    const savedCustomer = mapCustomerRowToCustomer(data as CustomerRow);
    setCustomers((prev) =>
        prev.map((customer) =>
            customer.id === savedCustomer.id ? savedCustomer : customer
        )
    );
    setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
    return savedCustomer;
  }

  async function removeCustomer(customerId: number) {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from("customers").delete().eq("id", customerId);

    if (error) {
      setDatabaseError(formatDatabaseError(error));
      throw error;
    }

    setCustomers((prev) => prev.filter((customer) => customer.id !== customerId));

    if (selectedCustomerId === customerId) {
      setSelectedCustomerId(null);
      navigateToPage("customers");
    }

    setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
  }

  async function refreshCustomerLeads() {
    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
          .from("customer_leads")
          .select(CUSTOMER_LEAD_SELECT_FIELDS)
          .order("submitted_at", { ascending: false });

      if (error) {
        throw error;
      }

      setCustomerLeads(
          sortCustomerLeads(
              (((data ?? []) as unknown) as CustomerLeadRow[]).map(
                  mapCustomerLeadRowToLead
              )
          )
      );
      setWorkflowTablesReady((prev) => ({ ...prev, customerLeads: true }));
      setDatabaseError(
          getDatabaseSetupNotice(
              { ...workflowTablesReady, customerLeads: true },
              staffTablesReady
          )
      );
    } catch (error) {
      setWorkflowTablesReady((prev) => ({ ...prev, customerLeads: false }));

      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
        return;
      }

      setDatabaseError("Unable to refresh customer leads.");
    }
  }

  function createCustomerLeadActivity(
      type: CustomerLeadActivity["type"],
      title: string,
      detail?: string,
      relatedId?: string
  ): CustomerLeadActivity {
    return {
      id: crypto.randomUUID(),
      type,
      occurredAt: new Date().toISOString(),
      title,
      detail: detail?.trim() || undefined,
      relatedId,
    };
  }

  function withCustomerLeadActivity(
      lead: CustomerLead,
      activity: CustomerLeadActivity
  ): CustomerLead {
    return {
      ...lead,
      activityHistory: [activity, ...lead.activityHistory].slice(0, 80),
    };
  }

  async function saveCustomerLeadRecord(updatedLead: CustomerLead) {
    const nextLead: CustomerLead = {
      ...updatedLead,
      updatedAt: new Date().toISOString(),
    };

    if (!workflowTablesReady.customerLeads) {
      setCustomerLeads((prev) =>
          sortCustomerLeads(
              prev.map((lead) => (lead.id === nextLead.id ? nextLead : lead))
          )
      );
      return nextLead;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
          .from("customer_leads")
          .update(mapCustomerLeadToWriteRow(nextLead))
          .eq("id", nextLead.id)
          .select(CUSTOMER_LEAD_SELECT_FIELDS)
          .single();

      if (error) {
        throw error;
      }

      const savedLead = mapCustomerLeadRowToLead(
          (data as unknown) as CustomerLeadRow
      );
      setCustomerLeads((prev) =>
          sortCustomerLeads(
              prev.map((lead) => (lead.id === savedLead.id ? savedLead : lead))
          )
      );
      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
      return savedLead;
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      } else {
        setDatabaseError("Unable to update the customer lead.");
      }

      return null;
    }
  }

  async function updateCustomerLeadStatus(
      leadId: string,
      status: CustomerLeadStatus
  ) {
    const existingLead = customerLeads.find((lead) => lead.id === leadId) ?? null;

    if (!existingLead) {
      return;
    }

    if (existingLead.status === status) {
      return;
    }

    await saveCustomerLeadRecord(
        withCustomerLeadActivity(
            {
              ...existingLead,
              status,
            },
            createCustomerLeadActivity(
                "status",
                `Marked as ${status}`,
                `Status changed from ${existingLead.status} to ${status}.`
            )
        )
    );
  }

  async function deleteArchivedCustomerLead(leadId: string) {
    const existingLead = customerLeads.find((lead) => lead.id === leadId) ?? null;

    if (!existingLead) {
      return false;
    }

    if (existingLead.status !== "archived") {
      setDatabaseError("Only archived customer messages can be permanently deleted.");
      return false;
    }

    if (!workflowTablesReady.customerLeads) {
      setCustomerLeads((prev) => prev.filter((lead) => lead.id !== leadId));
      return true;
    }

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase
          .from("customer_leads")
          .delete()
          .eq("id", leadId)
          .eq("status", "archived");

      if (error) {
        throw error;
      }

      setCustomerLeads((prev) => prev.filter((lead) => lead.id !== leadId));
      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
      return true;
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      } else {
        setDatabaseError("Unable to permanently delete the archived message.");
      }

      return false;
    }
  }

  async function sendCustomerLeadEmailReply(
      leadId: string,
      payload: { recipient: string; subject: string; message: string }
  ) {
    const existingLead = customerLeads.find((lead) => lead.id === leadId) ?? null;

    if (!existingLead) {
      return;
    }

    await sendCustomerEmailMessage({
      recipient: payload.recipient,
      subject: payload.subject,
      message: payload.message,
      businessDetails: appSettings,
    });

    const replyEntry: CustomerLeadReply = {
      id: crypto.randomUUID(),
      sentAt: new Date().toISOString(),
      recipient: payload.recipient,
      subject: payload.subject,
      message: payload.message,
    };

    await saveCustomerLeadRecord(
        withCustomerLeadActivity(
            {
              ...existingLead,
              status: existingLead.status === "converted" ? "converted" : "replied",
              replyHistory: [replyEntry, ...existingLead.replyHistory],
            },
            createCustomerLeadActivity(
                "reply",
                "Email reply sent",
                `${payload.subject} to ${payload.recipient}`,
                replyEntry.id
            )
        )
    );
  }

  async function convertCustomerLeadToCustomer(
      leadId: string,
      draft: CustomerLeadCustomerDraft
  ) {
    const existingLead = customerLeads.find((lead) => lead.id === leadId) ?? null;

    if (!existingLead || existingLead.status === "converted") {
      return;
    }

    const leadNotes = [
      draft.service ? `Lead service: ${draft.service}` : "",
      draft.notes,
    ]
        .map((entry) => entry.trim())
        .filter(Boolean)
        .join("\n\n");
    const nextCustomer = {
      id: Date.now(),
      name: draft.name.trim(),
      address: draft.address.trim(),
      postcode: draft.postcode.trim() || undefined,
      town: draft.town.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      email: draft.email.trim() || undefined,
      contactEmails: draft.email.trim() ? [draft.email.trim()] : [],
      customerType: draft.customerType,
      isGrassCuttingCustomer: draft.isGrassCuttingCustomer,
      week: selectedWeek,
      day: normaliseDayName(appSettings.defaultVisitDay),
      cutFrequency: "Fortnightly",
      grassCutAmount:
          draft.isGrassCuttingCustomer && draft.customerType === "Residential"
              ? appSettings.defaultGrassCutPrice
              : 0,
      siteName: draft.customerType === "Commercial" ? draft.name.trim() : undefined,
      siteAddress:
          draft.customerType === "Commercial" ? draft.address.trim() : undefined,
      siteTown: draft.customerType === "Commercial" ? draft.town.trim() : undefined,
      sitePostcode:
          draft.customerType === "Commercial" ? draft.postcode.trim() : undefined,
      paymentMethod: getCustomerPaymentMethodFromSettings(
          appSettings.defaultPaymentMethod
      ),
      accessNotes: "",
      notes: leadNotes || appSettings.defaultCustomerNotes || "",
      latitude: null,
      longitude: null,
      createdAt: new Date().toISOString(),
    } satisfies Customer;

    const routeReadyCustomer = { ...(nextCustomer as Record<string, unknown>) };
    ensureCustomerRouteOrder(routeReadyCustomer);
    const savedCustomer = await createCustomer(routeReadyCustomer as Customer);

    await saveCustomerLeadRecord(
        withCustomerLeadActivity(
            {
              ...existingLead,
              status: "converted",
              name: draft.name.trim(),
              email: draft.email.trim() || existingLead.email,
              phone: draft.phone.trim() || existingLead.phone,
              address: draft.address.trim() || existingLead.address,
              town: draft.town.trim() || existingLead.town,
              postcode: draft.postcode.trim() || existingLead.postcode,
              customerType: draft.customerType,
              service: draft.service.trim() || existingLead.service,
              convertedCustomerId: savedCustomer.id,
            },
            createCustomerLeadActivity(
                "converted",
                "Converted to customer",
                `Added ${savedCustomer.name} to customers.`,
                String(savedCustomer.id)
            )
        )
    );
  }

  async function addCustomerLeadActivityNote(leadId: string, note: string) {
    const existingLead = customerLeads.find((lead) => lead.id === leadId) ?? null;
    const trimmedNote = note.trim();

    if (!existingLead || !trimmedNote) {
      return;
    }

    await saveCustomerLeadRecord(
        withCustomerLeadActivity(
            existingLead,
            createCustomerLeadActivity("note", "Note added", trimmedNote)
        )
    );
  }

  function getLeadQuoteNotes(lead: CustomerLead) {
    const mediaReferences = lead.extractedData.mediaUrls ?? [];
    const sections = [
      lead.service || lead.extractedData.service
        ? `Service required: ${lead.service || lead.extractedData.service}`
        : "",
      lead.message || lead.notes || lead.extractedData.notes
        ? `Job description:\n${lead.message || lead.notes || lead.extractedData.notes}`
        : "",
      mediaReferences.length > 0
        ? `Photos/video supplied:\n${mediaReferences.join("\n")}`
        : "",
      `Created from lead received ${new Date(lead.submittedAt).toLocaleString()}.`,
    ];

    return sections
        .map((entry) => entry.trim())
        .filter(Boolean)
        .join("\n\n");
  }

  function createQuoteFromCustomerLead(leadId: string) {
    const lead = customerLeads.find((entry) => entry.id === leadId) ?? null;

    if (!lead) {
      return;
    }

    const service = lead.service || lead.extractedData.service || "Quoted work";
    setSelectedQuoteId(null);
    setSelectedCustomerId(null);
    setPendingLeadQuoteDraft({
      leadId: lead.id,
      customerName:
          lead.name || lead.extractedData.name || lead.email || lead.phone || "New lead",
      customerType: lead.customerType ?? lead.extractedData.customerType,
      customerAddress: lead.address ?? lead.extractedData.address,
      customerTown: lead.town ?? lead.extractedData.town,
      customerPostcode: lead.postcode ?? lead.extractedData.postcode,
      initialNotes: getLeadQuoteNotes(lead),
      initialItems: [
        {
          id: crypto.randomUUID(),
          description: service,
          quantity: 1,
          price: 0,
        },
      ],
    });
    navigateToPage("quoteForm");
  }

  function setPendingCashPayment(customerId: number, paid: boolean) {
    const customerKey = String(customerId);

    setPendingCashPaymentDates((prev) => {
      const nextPendingPayments = { ...prev };

      if (paid) {
        nextPendingPayments[customerKey] =
            nextPendingPayments[customerKey] || getTodayDateInputValue();
      } else {
        delete nextPendingPayments[customerKey];
      }

      return nextPendingPayments;
    });
  }

  async function saveMonthlyPaymentDate(
      customerId: number,
      paymentMonth: string,
      paymentDate: string | null
  ) {
    if (!workflowTablesReady.monthlyPayments) {
      const error = {
        message:
            "Monthly payment tracking is not ready yet. Run the payment tracking SQL setup script and refresh.",
      };
      setDatabaseError(error.message);
      throw error;
    }

    const normalizedMonth = getInputDateValue(paymentMonth);
    const supabase = createSupabaseClient();

    if (!normalizedMonth) {
      return;
    }

    if (!paymentDate) {
      const { error } = await supabase
          .from("monthly_payments")
          .delete()
          .eq("customer_id", customerId)
          .eq("payment_month", normalizedMonth);

      if (error) {
        setDatabaseError(formatDatabaseError(error));
        throw error;
      }

      setMonthlyPayments((prev) =>
          prev.filter(
              (payment) =>
                  !(
                      payment.customerId === customerId &&
                      getInputDateValue(payment.paymentMonth) === normalizedMonth
                  )
          )
      );
      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
      return;
    }

    const { data, error } = await supabase
        .from("monthly_payments")
        .upsert(
            mapMonthlyPaymentToWriteRow({
              customerId,
              paymentMonth: normalizedMonth,
              paymentDate,
            }),
            {
              onConflict: "customer_id,payment_month",
            }
        )
        .select(MONTHLY_PAYMENT_SELECT_FIELDS)
        .single();

    if (error) {
      setDatabaseError(formatDatabaseError(error));
      throw error;
    }

    const savedPayment = mapMonthlyPaymentRowToMonthlyPayment(data as MonthlyPaymentRow);
    setMonthlyPayments((prev) =>
        sortMonthlyPayments([
          ...prev.filter(
              (payment) =>
                  !(
                      payment.customerId === savedPayment.customerId &&
                      getInputDateValue(payment.paymentMonth) ===
                          getInputDateValue(savedPayment.paymentMonth)
                  )
          ),
          savedPayment,
        ])
    );
    setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
  }

  async function createCommercialRamsRecord(document: CommercialRamsDocument) {
    const payload = {
      ...document,
      updatedAt: document.updatedAt ?? new Date().toISOString(),
    };

    if (!workflowTablesReady.commercialRams) {
      setCommercialRamsDocuments((prev) =>
          sortCommercialRamsDocuments([payload, ...prev.filter((entry) => entry.id !== payload.id)])
      );
      navigateToPage("commercialDocs");
      return payload;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
          .from("commercial_rams_documents")
          .insert(mapCommercialRamsToRow(payload))
          .select(COMMERCIAL_RAMS_SELECT_FIELDS)
          .single();

      if (error) {
        throw error;
      }

      const savedDocument = mapCommercialRamsRowToDocument(
          (data as unknown) as CommercialRamsRow
      );
      setCommercialRamsDocuments((prev) =>
          sortCommercialRamsDocuments([
            savedDocument,
            ...prev.filter((entry) => entry.id !== savedDocument.id),
          ])
      );
      navigateToPage("commercialDocs");
      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
      return savedDocument;
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
        return null;
      }

      setDatabaseError("Unable to save the RAMS document to Supabase.");
      return null;
    }
  }

  async function saveCommercialRamsRecord(updatedDocument: CommercialRamsDocument) {
    const payload = {
      ...updatedDocument,
      updatedAt: new Date().toISOString(),
    };

    if (!workflowTablesReady.commercialRams) {
      setCommercialRamsDocuments((prev) =>
          sortCommercialRamsDocuments(
              prev.map((entry) => (entry.id === payload.id ? payload : entry))
          )
      );
      return payload;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
          .from("commercial_rams_documents")
          .update(mapCommercialRamsToRow(payload))
          .eq("id", payload.id)
          .select(COMMERCIAL_RAMS_SELECT_FIELDS)
          .single();

      if (error) {
        throw error;
      }

      const savedDocument = mapCommercialRamsRowToDocument(
          (data as unknown) as CommercialRamsRow
      );
      setCommercialRamsDocuments((prev) =>
          sortCommercialRamsDocuments(
              prev.map((entry) => (entry.id === savedDocument.id ? savedDocument : entry))
          )
      );
      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
      return savedDocument;
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
        return null;
      }

      setDatabaseError("Unable to update the RAMS document in Supabase.");
      return null;
    }
  }

  async function deleteCommercialRamsRecord(documentId: string) {
    const existingDocument =
        commercialRamsDocuments.find((document) => document.id === documentId) ?? null;

    if (!existingDocument) {
      return false;
    }

    const shouldDelete = window.confirm(
        `Delete the RAMS document for ${existingDocument.customerName || "this customer"}? This cannot be undone.`
    );

    if (!shouldDelete) {
      return false;
    }

    try {
      if (!workflowTablesReady.commercialRams) {
        setCommercialRamsDocuments((prev) =>
            prev.filter((document) => document.id !== documentId)
        );
      } else {
        const supabase = createSupabaseClient();
        const { error } = await supabase
            .from("commercial_rams_documents")
            .delete()
            .eq("id", documentId);

        if (error) {
          throw error;
        }

        setCommercialRamsDocuments((prev) =>
            prev.filter((document) => document.id !== documentId)
        );
      }

      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
      return true;
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      } else {
        setDatabaseError("Unable to delete the RAMS document.");
      }

      return false;
    }
  }

  async function persistVisit(visit: VisitLog) {
    const supabase = createSupabaseClient();
    const saveVisitRow = (payload: ReturnType<typeof mapVisitToRow> | ReturnType<typeof mapVisitToLegacyRow>) =>
        visit.id && !String(visit.id).startsWith("temp-")
            ? supabase
                .from("visits")
                .update(payload)
                .eq("id", visit.id)
            : supabase.from("visits").insert(payload);

    let metadataWarning: string | null = null;
    const saveResult = await saveVisitRow(mapVisitToRow(visit))
        .select(VISIT_SELECT_FIELDS)
        .single();
    let savedVisitRow = (saveResult.data as unknown) as VisitRow | null;
    let error = saveResult.error;

    if (error && isVisitRoundMetadataSchemaError(error)) {
      const legacyResult = await saveVisitRow(mapVisitToLegacyRow(visit))
          .select(VISIT_LEGACY_SELECT_FIELDS)
          .single();

      savedVisitRow = (legacyResult.data as unknown) as VisitRow | null;
      error = legacyResult.error;
      metadataWarning = VISIT_ROUND_METADATA_SETUP_NOTICE;
    }

    if (error) {
      setDatabaseError(formatDatabaseError(error));
      throw error;
    }

    const mappedVisit = mapVisitRowToVisit(savedVisitRow as VisitRow);
    const persistedVisit = {
      ...mappedVisit,
      roundKey: mappedVisit.roundKey ?? visit.roundKey,
      customerType: mappedVisit.customerType ?? visit.customerType,
      priceAtVisit: mappedVisit.priceAtVisit ?? visit.priceAtVisit,
    };

    setVisitLogs((prev) => {
      const hasExisting = prev.some((entry) => entry.id === visit.id);
      if (hasExisting) {
        return prev.map((entry) =>
            entry.id === visit.id ? persistedVisit : entry
        );
      }

      return [...prev, persistedVisit];
    });

    setDatabaseError(
        metadataWarning ?? getDatabaseSetupNotice(workflowTablesReady, staffTablesReady)
    );
    return persistedVisit;
  }

  async function clearVisitHistory() {
    const shouldClear = window.confirm(
        "Delete all visit history entries? This will remove every record from the History page."
    );

    if (!shouldClear) {
      return;
    }

    setIsClearingHistory(true);

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase
          .from("visits")
          .delete()
          .not("id", "is", null);

      if (error) {
        throw error;
      }

      setVisitLogs([]);
      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      } else {
        setDatabaseError("Unable to clear the visit history.");
      }
    } finally {
      setIsClearingHistory(false);
    }
  }

  async function createQuoteRecord(quote: Quote) {
    if (!workflowTablesReady.quotes) {
      setQuotes((prev) => [...prev, quote]);
      navigateToPage("quotes");
      return true;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
          .from("quotes")
          .insert(mapQuoteToRow(quote))
          .select(QUOTE_SELECT_FIELDS)
          .single();

      if (error) {
        throw error;
      }

      const persistedQuote = mapQuoteRowToQuote(data as QuoteRow);
      setQuotes((prev) => [persistedQuote, ...prev]);
      setQuotesTableInitialized(true);
      navigateToPage("quotes");
      setDatabaseError(
          getDatabaseSetupNotice(
              {
                ...workflowTablesReady,
                recurringInvoiceTemplates: true,
              },
              staffTablesReady
          )
      );
      return true;
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
        return false;
      }

      setDatabaseError("Unable to save the quote to Supabase.");
      return false;
    }
  }

  async function saveQuoteRecord(updatedQuote: Quote) {
    if (!workflowTablesReady.quotes) {
      setQuotes((prev) =>
          prev.map((quote) => (quote.id === updatedQuote.id ? updatedQuote : quote))
      );
      return true;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
          .from("quotes")
          .update(mapQuoteToRow(updatedQuote))
          .eq("id", updatedQuote.id)
          .select(QUOTE_SELECT_FIELDS)
          .single();

      if (error) {
        throw error;
      }

      const persistedQuote = mapQuoteRowToQuote(data as QuoteRow);
      setQuotes((prev) =>
          prev.map((quote) => (quote.id === persistedQuote.id ? persistedQuote : quote))
      );
      setQuotesTableInitialized(true);
      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
      return true;
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
        return false;
      }

      setDatabaseError("Unable to update the quote in Supabase.");
      return false;
    }
  }

  async function createInvoiceRecord(
      invoice: Invoice,
      options?: { navigateAfterSave?: boolean }
  ) {
    const navigateAfterSave = options?.navigateAfterSave ?? true;

    if (!workflowTablesReady.invoices) {
      setInvoices((prev) => [...prev, invoice]);
      if (navigateAfterSave) {
        navigateToPage("invoices");
      }
      return true;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
          .from("invoices")
          .insert(mapInvoiceToRow(invoice))
          .select(INVOICE_SELECT_FIELDS)
          .single();

      if (error) {
        throw error;
      }

      const persistedInvoice = mapInvoiceRowToInvoice(data as InvoiceRow);
      setInvoices((prev) => sortInvoices([persistedInvoice, ...prev]));
      if (navigateAfterSave) {
        navigateToPage("invoices");
      }
      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
      return true;
    } catch (error) {
      if (isErrorWithMessage(error) && isInvoiceWriteFallbackError(error)) {
        const nextInvoices = sortInvoices([invoice, ...invoices]);

        setInvoices(nextInvoices);
        setInvoicesWriteFallbackActive(true);
        if (navigateAfterSave) {
          navigateToPage("invoices");
        }

        if (isDatabaseReady && canSyncAppState) {
          try {
            await persistAppStateSnapshot(
                buildPersistedAppState({
                  invoices: nextInvoices,
                  invoicesWriteFallbackActive: true,
                })
            );
            setDatabaseError(getInvoiceWriteFallbackNotice(error, "saved"));
          } catch (appStateError) {
            if (isErrorWithMessage(appStateError)) {
              setDatabaseError(
                  `${getInvoiceWriteFallbackNotice(error, "saved")} ${formatDatabaseError(appStateError)}`
              );
            } else {
              setDatabaseError(
                  `${getInvoiceWriteFallbackNotice(error, "saved")} App state sync failed.`
              );
            }
          }
        } else {
          setDatabaseError(getInvoiceWriteFallbackNotice(error, "saved"));
        }

        return true;
      }

      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
        return false;
      }

      setDatabaseError("Unable to save the invoice to Supabase.");
      return false;
    }
  }

  async function saveInvoiceRecord(updatedInvoice: Invoice) {
    if (!workflowTablesReady.invoices) {
      setInvoices((prev) =>
          prev.map((invoice) =>
              invoice.id === updatedInvoice.id ? updatedInvoice : invoice
          )
      );
      return true;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
          .from("invoices")
          .update(mapInvoiceToRow(updatedInvoice))
          .eq("id", updatedInvoice.id)
          .select(INVOICE_SELECT_FIELDS)
          .single();

      if (error) {
        throw error;
      }

      const persistedInvoice = mapInvoiceRowToInvoice(data as InvoiceRow);
      setInvoices((prev) =>
          sortInvoices(
              prev.map((invoice) =>
                  invoice.id === persistedInvoice.id ? persistedInvoice : invoice
              )
          )
      );
      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
      return true;
    } catch (error) {
      if (isErrorWithMessage(error) && isInvoiceWriteFallbackError(error)) {
        const nextInvoices = sortInvoices(
            invoices.map((invoice) =>
                invoice.id === updatedInvoice.id ? updatedInvoice : invoice
            )
        );

        setInvoices(nextInvoices);
        setInvoicesWriteFallbackActive(true);

        if (isDatabaseReady && canSyncAppState) {
          try {
            await persistAppStateSnapshot(
                buildPersistedAppState({
                  invoices: nextInvoices,
                  invoicesWriteFallbackActive: true,
                })
            );
            setDatabaseError(getInvoiceWriteFallbackNotice(error, "updated"));
          } catch (appStateError) {
            if (isErrorWithMessage(appStateError)) {
              setDatabaseError(
                  `${getInvoiceWriteFallbackNotice(error, "updated")} ${formatDatabaseError(appStateError)}`
              );
            } else {
              setDatabaseError(
                  `${getInvoiceWriteFallbackNotice(error, "updated")} App state sync failed.`
              );
            }
          }
        } else {
          setDatabaseError(getInvoiceWriteFallbackNotice(error, "updated"));
        }

        return true;
      }

      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
        return false;
      }

      setDatabaseError("Unable to update the invoice in Supabase.");
      return false;
    }
  }

  function createDocumentHistoryEntry(
      type: DocumentHistoryEntry["type"],
      summary: string,
      metadata: DocumentSendMetadata = {}
  ): DocumentHistoryEntry {
    return {
      id: crypto.randomUUID(),
      type,
      occurredAt: new Date().toISOString(),
      summary,
      method: metadata.method,
      recipient: metadata.recipient?.trim() || undefined,
    };
  }

  function appendQuoteHistory(quoteId: string, entry: DocumentHistoryEntry) {
    setQuoteHistory((prev) => ({
      ...prev,
      [quoteId]: [entry, ...(prev[quoteId] ?? [])].slice(0, 50),
    }));
  }

  function appendInvoiceHistory(invoiceId: string, entry: DocumentHistoryEntry) {
    setInvoiceHistory((prev) => ({
      ...prev,
      [invoiceId]: [entry, ...(prev[invoiceId] ?? [])].slice(0, 50),
    }));
  }

  function describeQuoteChanges(existingQuote: Quote, nextQuote: Quote) {
    const changes: string[] = [];

    if (existingQuote.customerName !== nextQuote.customerName) {
      changes.push("customer");
    }
    if (existingQuote.status !== nextQuote.status) {
      changes.push(`status from ${existingQuote.status} to ${nextQuote.status}`);
    }
    if (existingQuote.date !== nextQuote.date) {
      changes.push("date");
    }
    if (Math.abs(existingQuote.total - nextQuote.total) >= 0.01) {
      changes.push("total");
    }
    if (JSON.stringify(existingQuote.items) !== JSON.stringify(nextQuote.items)) {
      changes.push("line items");
    }
    if ((existingQuote.notes ?? "") !== (nextQuote.notes ?? "")) {
      changes.push("notes");
    }
    if (
        JSON.stringify(normalizeDocumentCustomerFields(existingQuote)) !==
        JSON.stringify(normalizeDocumentCustomerFields(nextQuote))
    ) {
      changes.push("customer details");
    }

    return changes.length
        ? `Updated ${changes.join(", ")}.`
        : "Saved quote details.";
  }

  function describeInvoiceChanges(existingInvoice: Invoice, nextInvoice: Invoice) {
    const changes: string[] = [];

    if (existingInvoice.customerName !== nextInvoice.customerName) {
      changes.push("customer");
    }
    if (existingInvoice.status !== nextInvoice.status) {
      changes.push(`status from ${existingInvoice.status} to ${nextInvoice.status}`);
    }
    if (existingInvoice.date !== nextInvoice.date) {
      changes.push("date");
    }
    if ((existingInvoice.dueDate ?? "") !== (nextInvoice.dueDate ?? "")) {
      changes.push("due date");
    }
    if (Math.abs(existingInvoice.total - nextInvoice.total) >= 0.01) {
      changes.push("total");
    }
    if (JSON.stringify(existingInvoice.items) !== JSON.stringify(nextInvoice.items)) {
      changes.push("line items");
    }
    if ((existingInvoice.notes ?? "") !== (nextInvoice.notes ?? "")) {
      changes.push("notes");
    }
    if ((existingInvoice.terms ?? "") !== (nextInvoice.terms ?? "")) {
      changes.push("terms");
    }
    if ((existingInvoice.linkedQuoteId ?? "") !== (nextInvoice.linkedQuoteId ?? "")) {
      changes.push("linked quote");
    }
    if (
        JSON.stringify(normalizeDocumentCustomerFields(existingInvoice)) !==
        JSON.stringify(normalizeDocumentCustomerFields(nextInvoice))
    ) {
      changes.push("customer details");
    }

    return changes.length
        ? `Updated ${changes.join(", ")}.`
        : "Saved invoice details.";
  }

  async function markQuoteSent(
      quoteId: string,
      metadata: DocumentSendMetadata = {}
  ) {
    const existingQuote = quotes.find((quote) => quote.id === quoteId) ?? null;

    if (!existingQuote) {
      return;
    }

    const nextStatus: QuoteStatus =
        existingQuote.status === "Accepted" ||
        existingQuote.status === "Scheduled" ||
        existingQuote.status === "Declined"
            ? existingQuote.status
            : "Sent";
    const quoteSaved =
        nextStatus === existingQuote.status ||
        (await saveQuoteRecord({
          ...existingQuote,
          status: nextStatus,
        }));

    if (!quoteSaved) {
      return;
    }

    appendQuoteHistory(
        quoteId,
        createDocumentHistoryEntry(
            "sent",
            `${metadata.method === "text" ? "Sent by text" : "Sent by email"}${
                metadata.recipient ? ` to ${metadata.recipient.trim()}` : ""
            }.`,
            metadata
        )
    );
  }

  async function markInvoiceSent(
      invoiceId: string,
      metadata: DocumentSendMetadata = {}
  ) {
    const existingInvoice = invoices.find((invoice) => invoice.id === invoiceId) ?? null;

    if (!existingInvoice) {
      return;
    }

    const nextStatus: InvoiceStatus =
        existingInvoice.status === "Paid" ||
        existingInvoice.status === "Accepted" ||
        existingInvoice.status === "Declined"
            ? existingInvoice.status
            : "Sent";
    const invoiceSaved =
        nextStatus === existingInvoice.status ||
        (await saveInvoiceRecord({
          ...existingInvoice,
          status: nextStatus,
        }));

    if (!invoiceSaved) {
      return;
    }

    appendInvoiceHistory(
        invoiceId,
        createDocumentHistoryEntry(
            "sent",
            `${metadata.method === "text" ? "Sent by text" : "Sent by email"}${
                metadata.recipient ? ` to ${metadata.recipient.trim()}` : ""
            }.`,
            metadata
        )
    );
  }

  async function saveRecurringInvoiceTemplate(
      template: RecurringInvoiceTemplateRecord
  ) {
    const payload = {
      ...template,
      frequency: normalizeRecurringInvoiceFrequency(template.frequency),
      preferredSendMethod: normalizeDocumentDeliveryMethod(
          template.preferredSendMethod
      ),
      sendTo: template.sendTo?.trim() || undefined,
      customerName: template.customerName.trim() || "Recurring Invoice",
      items: template.items,
      nextSendDate: getInputDateValue(template.nextSendDate) || getTodayDateInputValue(),
      isActive: Boolean(template.isActive),
    };
    const nextTemplates = sortRecurringInvoiceTemplates([
      payload,
      ...recurringInvoiceTemplates.filter((entry) => entry.id !== payload.id),
    ]);

    if (
        !workflowTablesReady.recurringInvoiceTemplates ||
        recurringInvoiceTemplatesFallbackActive
    ) {
      await syncRecurringInvoiceTemplatesFallback(nextTemplates);
      return payload;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
          .from("recurring_invoice_templates")
          .upsert(mapRecurringInvoiceTemplateToRow(payload), { onConflict: "id" })
          .select(RECURRING_INVOICE_TEMPLATE_SELECT_FIELDS)
          .single();

      if (error) {
        throw error;
      }

      const savedTemplate = mapRecurringInvoiceTemplateRowToTemplate(
          data as RecurringInvoiceTemplateRow
      );
      setRecurringInvoiceTemplates((prev) =>
          sortRecurringInvoiceTemplates([
            savedTemplate,
            ...prev.filter((entry) => entry.id !== savedTemplate.id),
          ])
      );
      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
      return savedTemplate;
    } catch (error) {
      if (isErrorWithMessage(error) && isRecurringInvoiceTemplateFallbackError(error)) {
        await syncRecurringInvoiceTemplatesFallback(
            nextTemplates,
            getRecurringInvoiceTemplateFallbackNotice(error, "saved")
        );
        return payload;
      }

      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
        return null;
      }

      setDatabaseError("Unable to save the recurring invoice template.");
      return null;
    }
  }

  async function deleteRecurringInvoiceTemplate(templateId: string) {
    const nextTemplates = recurringInvoiceTemplates.filter(
        (template) => template.id !== templateId
    );

    try {
      if (
          !workflowTablesReady.recurringInvoiceTemplates ||
          recurringInvoiceTemplatesFallbackActive
      ) {
        await syncRecurringInvoiceTemplatesFallback(nextTemplates);
      } else {
        const supabase = createSupabaseClient();
        const { error } = await supabase
            .from("recurring_invoice_templates")
            .delete()
            .eq("id", templateId);

        if (error) {
          throw error;
        }

        setRecurringInvoiceTemplates(nextTemplates);
      }

      setDatabaseError(
          getDatabaseSetupNotice(
              {
                ...workflowTablesReady,
                recurringInvoiceTemplates: true,
              },
              staffTablesReady
          )
      );
      return true;
    } catch (error) {
      if (isErrorWithMessage(error) && isRecurringInvoiceTemplateFallbackError(error)) {
        await syncRecurringInvoiceTemplatesFallback(
            nextTemplates,
            getRecurringInvoiceTemplateFallbackNotice(error, "deleted")
        );
        return true;
      }

      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      } else {
        setDatabaseError("Unable to delete the recurring invoice template.");
      }

      return false;
    }
  }

  async function deleteQuoteRecord(quoteId: string) {
    const existingQuote = quotes.find((quote) => quote.id === quoteId) ?? null;

    if (!existingQuote) {
      return;
    }

    const shouldDelete = window.confirm(
        `Delete quote ${existingQuote.quoteNumber}? This cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    const relatedInvoices = invoices.filter(
        (invoice) => invoice.linkedQuoteId === quoteId
    );
    const relatedJobs = scheduledJobs.filter((job) =>
        (job.quoteIds ?? []).includes(quoteId)
    );
    const nextInvoices = invoices.map((invoice) =>
        invoice.linkedQuoteId === quoteId
            ? {
              ...invoice,
              linkedQuoteId: undefined,
            }
            : invoice
    );
    const nextScheduledJobs = scheduledJobs.map((job) =>
        (job.quoteIds ?? []).includes(quoteId)
            ? {
              ...job,
              quoteIds: (job.quoteIds ?? []).filter((id) => id !== quoteId),
            }
            : job
    );
    const nextQuotes = quotes.filter((quote) => quote.id !== quoteId);
    const nextQuoteFollowUps = { ...quoteFollowUps };
    const nextQuoteHistory = { ...quoteHistory };
    delete nextQuoteFollowUps[quoteId];
    delete nextQuoteHistory[quoteId];
    let nextQuotesTableInitialized = quotesTableInitialized;

    try {
      let appStateSyncError: string | null = null;

      for (const invoice of relatedInvoices) {
        const invoiceSaved = await saveInvoiceRecord({
          ...invoice,
          linkedQuoteId: undefined,
        });

        if (!invoiceSaved) {
          throw new Error(
              `Unable to remove quote ${existingQuote.quoteNumber} from invoice ${invoice.invoiceNumber}.`
          );
        }
      }

      for (const job of relatedJobs) {
        const savedJob = await saveScheduledJobRecord({
          ...job,
          quoteIds: (job.quoteIds ?? []).filter((id) => id !== quoteId),
        });

        if (!savedJob) {
          throw new Error(
              `Unable to remove quote ${existingQuote.quoteNumber} from scheduled job ${job.title}.`
          );
        }
      }

      if (workflowTablesReady.quotes) {
        const supabase = createSupabaseClient();
        const { data: deletedQuotes, error } = await supabase
            .from("quotes")
            .delete()
            .eq("id", quoteId)
            .select("id,quote_number");

        if (error) {
          throw error;
        }

        if (deletedQuotes?.length) {
          nextQuotesTableInitialized = true;
        } else {
          const { data: matchingQuote, error: matchingQuoteError } = await supabase
              .from("quotes")
              .select("id,quote_number")
              .eq("quote_number", existingQuote.quoteNumber)
              .maybeSingle();

          if (matchingQuoteError) {
            throw matchingQuoteError;
          }

          if (matchingQuote) {
            const { data: fallbackDeletedQuotes, error: fallbackDeleteError } =
                await supabase
                    .from("quotes")
                    .delete()
                    .eq("id", matchingQuote.id)
                    .select("id,quote_number");

            if (fallbackDeleteError) {
              throw fallbackDeleteError;
            }

            if (!fallbackDeletedQuotes?.length) {
              throw new Error(
                  `Supabase can read quote ${existingQuote.quoteNumber}, but it could not delete it. The quotes delete policy is probably missing or too strict. Run the workflow SQL setup script again and refresh.`
              );
            }

            nextQuotesTableInitialized = true;
          }
        }
      }

      setQuotes(nextQuotes);
      setQuotesTableInitialized(nextQuotesTableInitialized);
      setQuoteFollowUps(nextQuoteFollowUps);
      setQuoteHistory(nextQuoteHistory);

      if (isDatabaseReady && canSyncAppState) {
        try {
          await persistAppStateSnapshot(
              buildPersistedAppState({
                invoices: nextInvoices,
                quotes: nextQuotes,
                quoteFollowUps: nextQuoteFollowUps,
                quoteHistory: nextQuoteHistory,
                scheduledJobs: nextScheduledJobs,
                quotesTableInitialized: nextQuotesTableInitialized,
              })
          );
        } catch (appStateError) {
          if (isErrorWithMessage(appStateError)) {
            appStateSyncError = formatDatabaseError(appStateError);
          } else {
            appStateSyncError = "Quote deleted, but app state sync failed.";
          }
        }
      }

      if (selectedQuoteId === quoteId) {
        setSelectedQuoteId(null);
      }

      setDatabaseError(
          appStateSyncError ??
              getDatabaseSetupNotice(workflowTablesReady, staffTablesReady)
      );
      navigateToPage("quotes");
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      } else {
        setDatabaseError("Unable to delete the quote.");
      }
    }
  }

  async function deleteInvoiceRecord(invoiceId: string) {
    const existingInvoice =
        invoices.find((invoice) => invoice.id === invoiceId) ?? null;

    if (!existingInvoice) {
      return;
    }

    const shouldDelete = window.confirm(
        `Delete invoice ${existingInvoice.invoiceNumber}? This cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    const relatedJobs = scheduledJobs.filter((job) =>
        (job.invoiceIds ?? []).includes(invoiceId)
    );
    const nextInvoiceReminders = { ...invoiceReminders };
    const nextInvoiceHistory = { ...invoiceHistory };
    delete nextInvoiceReminders[invoiceId];
    delete nextInvoiceHistory[invoiceId];

    try {
      for (const job of relatedJobs) {
        const savedJob = await saveScheduledJobRecord({
          ...job,
          invoiceIds: (job.invoiceIds ?? []).filter((id) => id !== invoiceId),
        });

        if (!savedJob) {
          throw new Error(
              `Unable to remove invoice ${existingInvoice.invoiceNumber} from scheduled job ${job.title}.`
          );
        }
      }

      if (!workflowTablesReady.invoices) {
        setInvoices((prev) => prev.filter((invoice) => invoice.id !== invoiceId));
      } else {
        const supabase = createSupabaseClient();
        const { error } = await supabase
            .from("invoices")
            .delete()
            .eq("id", invoiceId);

        if (error) {
          throw error;
        }

        setInvoices((prev) => prev.filter((invoice) => invoice.id !== invoiceId));
      }

      setInvoiceReminders(nextInvoiceReminders);
      setInvoiceHistory(nextInvoiceHistory);

      if (selectedInvoiceId === invoiceId) {
        setSelectedInvoiceId(null);
      }

      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
      navigateToPage("invoices");
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      } else {
        setDatabaseError("Unable to delete the invoice.");
      }
    }
  }

  async function createScheduledJobRecord(job: ScheduledJob) {
    if (!workflowTablesReady.scheduledJobs) {
      setScheduledJobs((prev) =>
          [...prev, job].sort((a, b) => a.date.localeCompare(b.date))
      );
      return job;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
          .from("scheduled_jobs")
          .insert(mapScheduledJobToRow(job))
          .select(SCHEDULED_JOB_SELECT_FIELDS)
          .single();

      if (error) {
        throw error;
      }

      const persistedJob = mapScheduledJobRowToScheduledJob(data as ScheduledJobRow);
      setScheduledJobs((prev) =>
          [...prev, persistedJob].sort((a, b) => a.date.localeCompare(b.date))
      );
      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
      return persistedJob;
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
        return null;
      }

      setDatabaseError("Unable to save the scheduled job to Supabase.");
      return null;
    }
  }

  async function saveScheduledJobRecord(updatedJob: ScheduledJob) {
    if (!workflowTablesReady.scheduledJobs) {
      setScheduledJobs((prev) =>
          prev
              .map((job) => (job.id === updatedJob.id ? updatedJob : job))
              .sort((a, b) => a.date.localeCompare(b.date))
      );
      return updatedJob;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
          .from("scheduled_jobs")
          .update(mapScheduledJobToRow(updatedJob))
          .eq("id", updatedJob.id)
          .select(SCHEDULED_JOB_SELECT_FIELDS)
          .single();

      if (error) {
        throw error;
      }

      const persistedJob = mapScheduledJobRowToScheduledJob(data as ScheduledJobRow);
      setScheduledJobs((prev) =>
          prev
              .map((job) => (job.id === persistedJob.id ? persistedJob : job))
              .sort((a, b) => a.date.localeCompare(b.date))
      );
      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
      return persistedJob;
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
        return null;
      }

      setDatabaseError("Unable to update the scheduled job in Supabase.");
      return null;
    }
  }

  async function logQuoteFollowUpSent(quoteId: string) {
    const today = getTodayDateInputValue();
    const nextQuoteFollowUps = {
      ...quoteFollowUps,
      [quoteId]: {
        followUpCount: (quoteFollowUps[quoteId]?.followUpCount ?? 0) + 1,
        lastFollowedUpOn: today,
      },
    };

    setQuoteFollowUps(nextQuoteFollowUps);

    if (isDatabaseReady && canSyncAppState) {
      try {
        await persistAppStateSnapshot(
            buildPersistedAppState({
              quoteFollowUps: nextQuoteFollowUps,
            })
        );
      } catch (error) {
        if (isErrorWithMessage(error)) {
          setDatabaseError(formatDatabaseError(error));
        } else {
          setDatabaseError("The follow-up was logged in the app, but app state sync failed.");
        }
      }
    }
  }

  async function logInvoiceReminderSent(invoiceId: string) {
    const today = getTodayDateInputValue();
    const nextInvoiceReminders = {
      ...invoiceReminders,
      [invoiceId]: {
        reminderCount: (invoiceReminders[invoiceId]?.reminderCount ?? 0) + 1,
        lastReminderSentOn: today,
      },
    };

    setInvoiceReminders(nextInvoiceReminders);

    if (isDatabaseReady && canSyncAppState) {
      try {
        await persistAppStateSnapshot(
            buildPersistedAppState({
              invoiceReminders: nextInvoiceReminders,
            })
        );
      } catch (error) {
        if (isErrorWithMessage(error)) {
          setDatabaseError(formatDatabaseError(error));
        } else {
          setDatabaseError("The reminder was logged in the app, but app state sync failed.");
        }
      }
    }
  }

  async function ensureInvoiceForCompletedScheduledJob(job: ScheduledJob) {
    const linkedQuotes = (job.quoteIds ?? [])
        .map((quoteId) => quotes.find((quote) => quote.id === quoteId) ?? null)
        .filter((quote): quote is Quote => Boolean(quote))
        .sort((left, right) => {
          const priorities: Record<QuoteStatus, number> = {
            Scheduled: 0,
            Accepted: 1,
            Approved: 2,
            Sent: 3,
            Draft: 4,
            Declined: 5,
          };

          return priorities[left.status] - priorities[right.status];
        });
    const preferredQuote = linkedQuotes[0] ?? null;
    const existingLinkedInvoice =
        (job.invoiceIds ?? [])
            .map((invoiceId) => invoices.find((invoice) => invoice.id === invoiceId) ?? null)
            .find((invoice): invoice is Invoice => Boolean(invoice)) ??
        (preferredQuote
            ? invoices.find((invoice) => invoice.linkedQuoteId === preferredQuote.id) ?? null
            : null);

    if (existingLinkedInvoice) {
      return existingLinkedInvoice;
    }

    const linkedCustomer =
        (job.customerId != null ? customerMap.get(job.customerId) ?? null : null) ??
        (preferredQuote?.customerId != null
            ? customerMap.get(preferredQuote.customerId) ?? null
            : null);
    const baseItems = preferredQuote?.items?.length
        ? preferredQuote.items.map((item) => ({
            ...item,
            id: crypto.randomUUID(),
          }))
        : [
            {
              id: crypto.randomUUID(),
              description:
                  job.title?.trim() ||
                  (linkedCustomer ? `${linkedCustomer.name} visit` : "Completed job"),
              quantity: 1,
              price: Math.max(0, Number(linkedCustomer?.grassCutAmount ?? 0)),
            },
          ];
    const subtotal = getLineItemsSubtotal(baseItems);
    const vatRate = appSettings.vatRegistered ? appSettings.vatRate : 0;
    const vatAmount = getVatAmount(subtotal, vatRate);
    const invoiceDate = getTodayDateInputValue();
    const documentFields = preferredQuote
        ? normalizeDocumentCustomerFields(preferredQuote)
        : linkedCustomer
            ? getDocumentCustomerFieldsFromCustomer(linkedCustomer)
            : {};
    const draftInvoice: Invoice = {
      id: crypto.randomUUID(),
      invoiceNumber: getNextInvoiceNumber(invoices),
      customerId: linkedCustomer?.id ?? preferredQuote?.customerId ?? job.customerId ?? null,
      customerName:
          (
              linkedCustomer?.name ??
              preferredQuote?.customerName ??
              job.customerName?.trim() ??
              ""
          ) || "Customer",
      customerType:
          preferredQuote?.customerType ?? linkedCustomer?.customerType ?? undefined,
      ...documentFields,
      date: invoiceDate,
      dueDate: addDaysToIsoDate(invoiceDate, appSettings.paymentTermsDays),
      status: "Draft",
      items: baseItems,
      notes: preferredQuote?.notes?.trim() || appSettings.defaultInvoiceNotes || undefined,
      terms: appSettings.defaultInvoiceTerms || undefined,
      vatRate,
      vatAmount,
      total: roundCurrency(subtotal + vatAmount),
      linkedQuoteId: preferredQuote?.id,
    };
    const invoiceCreated = await createInvoiceRecord(draftInvoice, {
      navigateAfterSave: false,
    });

    return invoiceCreated ? draftInvoice : null;
  }

  async function toggleScheduledJobCompleted(jobId: string) {
    const targetJob =
        scheduledJobs.find((scheduledJob) => scheduledJob.id === jobId) ?? null;

    if (!targetJob) {
      return;
    }

    const isCompleting = targetJob.status !== "Completed";
    const savedJob = await saveScheduledJobRecord({
      ...targetJob,
      status: isCompleting ? "Completed" : "Scheduled",
    });

    if (!savedJob) {
      return;
    }

    updateScheduledJobChecklist(jobId, "workComplete", isCompleting);

    if (!isCompleting) {
      return;
    }

    const ensuredInvoice = await ensureInvoiceForCompletedScheduledJob(savedJob);

    if (!ensuredInvoice) {
      return;
    }

    const existingInvoiceIds = new Set(savedJob.invoiceIds ?? []);

    if (existingInvoiceIds.has(ensuredInvoice.id)) {
      return;
    }

    await saveScheduledJobRecord({
      ...savedJob,
      invoiceIds: [...existingInvoiceIds, ensuredInvoice.id],
    });
  }

  function updateScheduledJobChecklist(
      jobId: string,
      key: ScheduledJobChecklistKey,
      checked: boolean
  ) {
    setScheduledJobChecklists((prev) => ({
      ...prev,
      [jobId]: {
        ...(prev[jobId] ?? DEFAULT_SCHEDULED_JOB_CHECKLIST),
        [key]: checked,
      },
    }));
  }

  async function deleteScheduledJobRecord(jobId: string) {
    const existingJob =
        scheduledJobs.find((scheduledJob) => scheduledJob.id === jobId) ?? null;

    if (!existingJob) {
      return;
    }

    const shouldDelete = window.confirm(
        `Delete scheduled job "${existingJob.title}"? This cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      if (!workflowTablesReady.scheduledJobs) {
        setScheduledJobs((prev) => prev.filter((job) => job.id !== jobId));
      } else {
        const supabase = createSupabaseClient();
        const { error } = await supabase
            .from("scheduled_jobs")
            .delete()
            .eq("id", jobId);

        if (error) {
          throw error;
        }

        setScheduledJobs((prev) => prev.filter((job) => job.id !== jobId));
      }

      setScheduledJobChecklists((prev) => {
        if (!(jobId in prev)) {
          return prev;
        }

        const next = { ...prev };
        delete next[jobId];
        return next;
      });

      if (selectedScheduledJobId === jobId) {
        setSelectedScheduledJobId(null);
      }

      setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      } else {
        setDatabaseError("Unable to delete the scheduled job.");
      }
    }
  }

  async function addStaffMember(
      values: Pick<
          StaffMember,
          "email" | "fullName" | "role" | "isActive" | "phone" | "notes"
      >
  ) {
    if (!staffTablesReady.staffMembers) {
      throw new Error("Run the staff system SQL setup script first.");
    }

    if (values.role === "Admin") {
      throw new Error("Only the current account can stay as Admin.");
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from("staff_members")
        .insert(
            mapStaffMemberToWriteRow({
              ...values,
              authUserId: null,
              isSystemAdmin: false,
            })
        )
        .select(STAFF_MEMBER_SELECT_FIELDS)
        .single();

    if (error) {
      setDatabaseError(formatDatabaseError(error));
      throw error;
    }

    const persistedStaffMember = mapStaffMemberRowToStaffMember(data as StaffMemberRow);
    setStaffMembers((prev) => sortStaffMembers([...prev, persistedStaffMember]));
    setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
  }

  async function saveStaffMember(
      staffMemberId: number,
      values: Pick<
          StaffMember,
          "email" | "fullName" | "role" | "isActive" | "phone" | "notes"
      >
  ) {
    if (!staffTablesReady.staffMembers) {
      throw new Error("Run the staff system SQL setup script first.");
    }

    const existingStaffMember =
        staffMembers.find((staffMember) => staffMember.id === staffMemberId) ?? null;

    if (!existingStaffMember) {
      throw new Error("That staff member no longer exists.");
    }

    const nextRole = existingStaffMember.isSystemAdmin ? "Admin" : values.role;
    const nextIsActive = existingStaffMember.isSystemAdmin ? true : values.isActive;
    const nextEmail = existingStaffMember.isSystemAdmin
        ? existingStaffMember.email
        : values.email;

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from("staff_members")
        .update(
            mapStaffMemberToWriteRow({
              authUserId: existingStaffMember.authUserId ?? null,
              email: nextEmail,
              fullName: values.fullName,
              role: nextRole,
              isActive: nextIsActive,
              phone: values.phone,
              notes: values.notes,
              isSystemAdmin: existingStaffMember.isSystemAdmin,
            })
        )
        .eq("id", staffMemberId)
        .select(STAFF_MEMBER_SELECT_FIELDS)
        .single();

    if (error) {
      setDatabaseError(formatDatabaseError(error));
      throw error;
    }

    const persistedStaffMember = mapStaffMemberRowToStaffMember(data as StaffMemberRow);
    setStaffMembers((prev) =>
        sortStaffMembers(
            prev.map((staffMember) =>
                staffMember.id === persistedStaffMember.id
                    ? persistedStaffMember
                    : staffMember
            )
        )
    );

    if (
        persistedStaffMember.authUserId === currentUserId ||
        normalizeEmailAddress(persistedStaffMember.email) ===
            normalizeEmailAddress(currentUserEmail)
    ) {
      setLoggedInStaffName(persistedStaffMember.fullName);
    }

    setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
  }

  async function deleteStaffMember(staffMemberId: number) {
    if (!staffTablesReady.staffMembers) {
      throw new Error("Run the staff system SQL setup script first.");
    }

    const existingStaffMember =
        staffMembers.find((staffMember) => staffMember.id === staffMemberId) ?? null;

    if (!existingStaffMember) {
      throw new Error("That staff member no longer exists.");
    }

    if (
        existingStaffMember.isSystemAdmin ||
        existingStaffMember.authUserId === currentUserId ||
        normalizeEmailAddress(existingStaffMember.email) ===
            normalizeEmailAddress(currentUserEmail)
    ) {
      throw new Error("The current admin account cannot be deleted.");
    }

    const supabase = createSupabaseClient();
    const { error } = await supabase
        .from("staff_members")
        .delete()
        .eq("id", staffMemberId);

    if (error) {
      setDatabaseError(formatDatabaseError(error));
      throw error;
    }

    setStaffMembers((prev) =>
        sortStaffMembers(prev.filter((staffMember) => staffMember.id !== staffMemberId))
    );
    setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
  }

  async function saveRolePermission(
      role: Exclude<StaffRole, "Admin">,
      pageKey: StaffPageAccessKey,
      allowed: boolean
  ) {
    if (!staffTablesReady.rolePermissions) {
      throw new Error("Run the staff system SQL setup script first.");
    }

    if (ADMIN_ONLY_PAGE_KEYS.has(pageKey)) {
      throw new Error("Staff and Settings stay admin-only.");
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from("role_permissions")
        .upsert(
            mapRolePermissionToWriteRow({
              role,
              pageKey,
              allowed,
            }),
            {
              onConflict: "role,page_key",
            }
        )
        .select(ROLE_PERMISSION_SELECT_FIELDS)
        .single();

    if (error) {
      setDatabaseError(formatDatabaseError(error));
      throw error;
    }

    const persistedPermission = mapRolePermissionRowToRolePermission(
        data as RolePermissionRow
    );
    setRolePermissions((prev) => {
      const withoutCurrent = prev.filter(
          (permission) =>
              !(
                  permission.role === persistedPermission.role &&
                  permission.pageKey === persistedPermission.pageKey
              )
      );

      return [...withoutCurrent, persistedPermission].sort((left, right) => {
        if (left.role !== right.role) {
          return left.role.localeCompare(right.role);
        }

        return left.pageKey.localeCompare(right.pageKey);
      });
    });
    setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
  }

  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId == null) return null;
    return customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  }, [customers, selectedCustomerId]);

  const selectedScheduledJob = useMemo(() => {
    if (!selectedScheduledJobId) return null;
    return scheduledJobs.find((job) => job.id === selectedScheduledJobId) ?? null;
  }, [scheduledJobs, selectedScheduledJobId]);

  const selectedQuote = useMemo(() => {
    if (!selectedQuoteId) return null;
    return quotes.find((quote) => quote.id === selectedQuoteId) ?? null;
  }, [quotes, selectedQuoteId]);

  const selectedInvoice = useMemo(() => {
    if (!selectedInvoiceId) return null;
    return invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;
  }, [invoices, selectedInvoiceId]);

  const customerMap = useMemo(() => {
    const map = new Map<number, Customer>();
    for (const customer of customers) {
      map.set(customer.id, customer);
    }
    return map;
  }, [customers]);

  const dashboardAttentionItems = useMemo<DashboardAttentionItem[]>(() => {
    const today = getTodayDateInputValue();
    const linkedQuoteIds = new Set(
        invoices
            .map((invoice) => invoice.linkedQuoteId)
            .filter((value): value is string => Boolean(value))
    );
    const items: Array<DashboardAttentionItem & { sortRank: number; sortValue: number }> = [];

    for (const quote of quotes) {
      if (!["Approved", "Sent"].includes(quote.status) || linkedQuoteIds.has(quote.id)) {
        continue;
      }

      const followUpState = quoteFollowUps[quote.id] ?? {
        followUpCount: 0,
      };
      const anchorDate =
          followUpState.followUpCount > 0
              ? followUpState.lastFollowedUpOn ?? quote.date
              : quote.date;
      const intervalDays =
          QUOTE_FOLLOW_UP_INTERVAL_DAYS[
              Math.min(
                  followUpState.followUpCount,
                  QUOTE_FOLLOW_UP_INTERVAL_DAYS.length - 1
              )
          ];
      const daysSinceAnchor = getIsoDateDifferenceInDays(anchorDate, today);

      if (daysSinceAnchor < intervalDays) {
        continue;
      }

      const daysSinceQuote = Math.max(0, getIsoDateDifferenceInDays(quote.date, today));
      items.push({
        id: `quote-${quote.id}`,
        kind: "quote_follow_up",
        title: `${quote.quoteNumber} follow-up due`,
        customerName: quote.customerName,
        badge: `Follow-up ${followUpState.followUpCount + 1}`,
        badgeTone: "amber",
        meta: `${quote.status} · ${daysSinceQuote} day${daysSinceQuote === 1 ? "" : "s"} since quote`,
        detail: followUpState.lastFollowedUpOn
            ? `Last follow-up logged on ${formatIsoDateLabel(
                followUpState.lastFollowedUpOn
            )}.`
            : "No follow-up logged yet.",
        documentId: quote.id,
        primaryActionLabel: "Open quote",
        secondaryActionLabel: "Send follow-up",
        sortRank: 1,
        sortValue: daysSinceAnchor - intervalDays,
      });
    }

    for (const invoice of invoices) {
      if (["Draft", "Paid", "Declined"].includes(invoice.status)) {
        continue;
      }

      const dueDate = getInputDateValue(invoice.dueDate) ||
          addDaysToIsoDate(invoice.date, appSettings.paymentTermsDays);
      const daysOverdue = getIsoDateDifferenceInDays(dueDate, today);

      if (daysOverdue < 0) {
        continue;
      }

      const reminderState = invoiceReminders[invoice.id] ?? {
        reminderCount: 0,
      };
      const anchorDate =
          reminderState.reminderCount > 0
              ? reminderState.lastReminderSentOn ?? dueDate
              : dueDate;
      const intervalDays =
          INVOICE_REMINDER_INTERVAL_DAYS[
              Math.min(
                  reminderState.reminderCount,
                  INVOICE_REMINDER_INTERVAL_DAYS.length - 1
              )
          ];
      const daysSinceAnchor = getIsoDateDifferenceInDays(anchorDate, today);

      if (daysSinceAnchor < intervalDays) {
        continue;
      }

      items.push({
        id: `invoice-${invoice.id}`,
        kind: "invoice_overdue",
        title: `${invoice.invoiceNumber} overdue`,
        customerName: invoice.customerName,
        badge: `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`,
        badgeTone: "rose",
        meta: `${invoice.status} · GBP ${invoice.total.toFixed(2)}`,
        detail: reminderState.lastReminderSentOn
            ? `Last reminder logged on ${formatIsoDateLabel(
                reminderState.lastReminderSentOn
            )}.`
            : `Due on ${formatIsoDateLabel(dueDate)} with no reminder logged yet.`,
        documentId: invoice.id,
        primaryActionLabel: "Open invoice",
        secondaryActionLabel: "Send reminder",
        sortRank: 0,
        sortValue: daysOverdue,
      });
    }

    return items
        .sort((left, right) => {
          if (left.sortRank !== right.sortRank) {
            return left.sortRank - right.sortRank;
          }

          return right.sortValue - left.sortValue;
        })
        .map(({ sortRank, sortValue, ...item }) => item);
  }, [appSettings.paymentTermsDays, invoiceReminders, invoices, quoteFollowUps, quotes]);

  const activeWorkflowQuote = useMemo(() => {
    if (workflowMessageTarget?.kind !== "quote_follow_up") {
      return null;
    }

    return quotes.find((quote) => quote.id === workflowMessageTarget.quoteId) ?? null;
  }, [quotes, workflowMessageTarget]);

  const activeWorkflowInvoice = useMemo(() => {
    if (workflowMessageTarget?.kind !== "invoice_overdue") {
      return null;
    }

    return invoices.find((invoice) => invoice.id === workflowMessageTarget.invoiceId) ?? null;
  }, [invoices, workflowMessageTarget]);

  const activeWorkflowCustomer = useMemo(() => {
    const customerId =
        activeWorkflowQuote?.customerId ??
        activeWorkflowInvoice?.customerId ??
        null;

    return customerId != null ? customerMap.get(customerId) ?? null : null;
  }, [activeWorkflowInvoice, activeWorkflowQuote, customerMap]);

  const workflowMessageDialogConfig = useMemo(() => {
    const brandName = getBusinessDisplayName(appSettings);
    const emailRecipients = activeWorkflowCustomer
        ? getCustomerEmailAddresses(activeWorkflowCustomer)
        : [];
    const textRecipients = activeWorkflowCustomer?.phone?.trim()
        ? [activeWorkflowCustomer.phone.trim()]
        : [];

    if (workflowMessageTarget?.kind === "quote_follow_up" && activeWorkflowQuote) {
      const followUpCount = (quoteFollowUps[activeWorkflowQuote.id]?.followUpCount ?? 0) + 1;
      const daysSinceQuote = Math.max(
          0,
          getIsoDateDifferenceInDays(activeWorkflowQuote.date, getTodayDateInputValue())
      );
      const templateValues = {
        customerName: activeWorkflowQuote.customerName,
        businessName: brandName,
        documentNumber: activeWorkflowQuote.quoteNumber,
        total: formatTemplateCurrency(activeWorkflowQuote.total),
        quoteDate: formatIsoDateLabel(activeWorkflowQuote.date),
        daysSinceQuote,
        followUpNumber: followUpCount,
      };

      return {
        title: `Send follow-up for ${activeWorkflowQuote.quoteNumber}`,
        description:
            "Send a quick chase message from here and the dashboard will snooze this quote automatically.",
        defaultMethod: appSettings.quoteFollowUpMethod,
        emailRecipients,
        textRecipients,
        initialEmailSubject: applyMessageTemplate(
            appSettings.quoteFollowUpEmailSubjectTemplate,
            templateValues
        ),
        initialEmailMessage: applyMessageTemplate(
            appSettings.quoteFollowUpEmailTemplate,
            templateValues
        ),
        initialTextMessage: applyMessageTemplate(
            appSettings.quoteFollowUpTextTemplate,
            templateValues
        ),
      };
    }

    if (workflowMessageTarget?.kind === "invoice_overdue" && activeWorkflowInvoice) {
      const reminderCount = (invoiceReminders[activeWorkflowInvoice.id]?.reminderCount ?? 0) + 1;
      const dueDate =
          getInputDateValue(activeWorkflowInvoice.dueDate) ||
          addDaysToIsoDate(activeWorkflowInvoice.date, appSettings.paymentTermsDays);
      const daysOverdue = Math.max(
          0,
          getIsoDateDifferenceInDays(dueDate, getTodayDateInputValue())
      );
      const templateValues = {
        customerName: activeWorkflowInvoice.customerName,
        businessName: brandName,
        documentNumber: activeWorkflowInvoice.invoiceNumber,
        total: formatTemplateCurrency(activeWorkflowInvoice.total),
        dueDate: formatIsoDateLabel(dueDate),
        daysOverdue,
        reminderNumber: reminderCount,
      };

      return {
        title: `Send reminder for ${activeWorkflowInvoice.invoiceNumber}`,
        description:
            "Send the reminder from here and the dashboard will snooze this invoice until the next chase window.",
        defaultMethod: appSettings.invoiceReminderMethod,
        emailRecipients,
        textRecipients,
        initialEmailSubject: applyMessageTemplate(
            appSettings.invoiceReminderEmailSubjectTemplate,
            templateValues
        ),
        initialEmailMessage: applyMessageTemplate(
            appSettings.invoiceReminderEmailTemplate,
            templateValues
        ),
        initialTextMessage: applyMessageTemplate(
            appSettings.invoiceReminderTextTemplate,
            templateValues
        ),
      };
    }

    return null;
  }, [
    activeWorkflowCustomer,
    activeWorkflowInvoice,
    activeWorkflowQuote,
    appSettings,
    invoiceReminders,
    quoteFollowUps,
    workflowMessageTarget,
  ]);

  function openQuoteFollowUpDialog(quoteId: string) {
    if (!quotes.some((quote) => quote.id === quoteId)) {
      return;
    }

    setWorkflowMessageTarget({
      kind: "quote_follow_up",
      quoteId,
    });
  }

  function openInvoiceReminderDialog(invoiceId: string) {
    if (!invoices.some((invoice) => invoice.id === invoiceId)) {
      return;
    }

    setWorkflowMessageTarget({
      kind: "invoice_overdue",
      invoiceId,
    });
  }

  async function sendWorkflowAttentionMessage(payload: {
    method: WorkflowMessageMethod;
    emailRecipient: string;
    textRecipient: string;
    emailSubject: string;
    emailMessage: string;
    textMessage: string;
  }) {
    if (!workflowMessageTarget || !workflowMessageDialogConfig) {
      return;
    }

    if ((payload.method === "email" || payload.method === "both") && !payload.emailRecipient) {
      throw new Error("Choose an email recipient before sending.");
    }

    if ((payload.method === "text" || payload.method === "both") && !payload.textRecipient) {
      throw new Error("Choose a mobile number before sending.");
    }

    if (payload.method === "email" || payload.method === "both") {
      await sendCustomerEmailMessage({
        recipient: payload.emailRecipient,
        subject: payload.emailSubject,
        message: payload.emailMessage,
        businessDetails: appSettings,
      });
    }

    if (workflowMessageTarget.kind === "quote_follow_up") {
      await logQuoteFollowUpSent(workflowMessageTarget.quoteId);
    } else {
      await logInvoiceReminderSent(workflowMessageTarget.invoiceId);
    }

    setWorkflowMessageTarget(null);

    if (payload.method === "text" || payload.method === "both") {
      const textUrl = buildTextMessageUrl(payload.textRecipient, payload.textMessage);
      window.setTimeout(() => {
        window.location.href = textUrl;
      }, 150);
    }
  }

  useEffect(() => {
    async function syncDueRecurringInvoices() {
      if (
          isHydrating ||
          !isDatabaseReady ||
          isProcessingRecurringInvoicesRef.current
      ) {
        return;
      }

      const today = getTodayDateInputValue();
      const dueTemplates = recurringInvoiceTemplates.filter(
          (template) =>
              template.isActive &&
              Boolean(getInputDateValue(template.nextSendDate)) &&
              getInputDateValue(template.nextSendDate) <= today
      );

      if (dueTemplates.length === 0) {
        return;
      }

      isProcessingRecurringInvoicesRef.current = true;

      try {
        let workingInvoices = [...invoices];

        for (const template of dueTemplates) {
          let nextSendDate = getInputDateValue(template.nextSendDate);
          let updatedTemplate = { ...template };

          while (nextSendDate && nextSendDate <= today) {
            const linkedCustomer =
                template.customerId != null
                    ? customerMap.get(template.customerId) ?? null
                    : null;
            const documentFields = linkedCustomer
                ? getDocumentCustomerFieldsFromCustomer(linkedCustomer)
                : normalizeDocumentCustomerFields(template);
            const subtotal = getLineItemsSubtotal(template.items);
            const vatRate =
                typeof template.vatRate === "number" && !Number.isNaN(template.vatRate)
                    ? template.vatRate
                    : appSettings.vatRegistered
                        ? appSettings.vatRate
                        : 0;
            const vatAmount = getVatAmount(subtotal, vatRate);
            const generatedInvoice: Invoice = {
              id: crypto.randomUUID(),
              invoiceNumber: buildInvoiceNumber(appSettings, workingInvoices),
              customerId: linkedCustomer?.id ?? template.customerId ?? null,
              customerName: linkedCustomer?.name ?? template.customerName,
              ...documentFields,
              date: nextSendDate,
              dueDate: addDaysToIsoDate(
                  nextSendDate,
                  typeof template.dueDaysAfterIssue === "number"
                      ? template.dueDaysAfterIssue
                      : appSettings.paymentTermsDays
              ),
              status: getRecurringInvoiceDefaultStatus(template.status),
              items: template.items.map((item) => ({ ...item })),
              notes: template.notes?.trim() || undefined,
              terms: template.terms?.trim() || undefined,
              vatRate,
              vatAmount,
              total: roundCurrency(subtotal + vatAmount),
              linkedQuoteId: template.linkedQuoteId,
            };

            const created = await createInvoiceRecord(generatedInvoice, {
              navigateAfterSave: false,
            });

            if (!created) {
              break;
            }

            workingInvoices = [generatedInvoice, ...workingInvoices];
            updatedTemplate = {
              ...updatedTemplate,
              lastGeneratedDate: nextSendDate,
              nextSendDate: advanceRecurringInvoiceDate(
                  nextSendDate,
                  template.frequency
              ),
            };
            nextSendDate = updatedTemplate.nextSendDate;
          }

          if (
              updatedTemplate.nextSendDate !== template.nextSendDate ||
              updatedTemplate.lastGeneratedDate !== template.lastGeneratedDate
          ) {
            await saveRecurringInvoiceTemplate(updatedTemplate);
          }
        }
      } finally {
        isProcessingRecurringInvoicesRef.current = false;
      }
    }

    void syncDueRecurringInvoices();
  }, [appSettings, customerMap, invoices, isDatabaseReady, isHydrating, recurringInvoiceTemplates]);

  const selectedCustomerVisits = useMemo(() => {
    if (!selectedCustomer) return [];
    return visitLogs
        .filter((visit) => visit.customerId === selectedCustomer.id)
        .sort(
            (a, b) =>
                new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
        );
  }, [selectedCustomer, visitLogs]);

  const selectedCustomerLastVisit = useMemo(() => {
    if (selectedCustomerVisits.length === 0) return null;
    return new Date(selectedCustomerVisits[0].visitDate);
  }, [selectedCustomerVisits]);

  const selectedCustomerTotalSpent = useMemo(() => {
    if (!selectedCustomer) {
      return 0;
    }

    return getCustomerTotals(
      selectedCustomer.id,
      visitLogs,
      customers,
      monthlyPayments,
      appSettings.grassCutSeasonStart,
      appSettings.grassCutSeasonEnd
    ).totalSpent;
  }, [
    appSettings.grassCutSeasonEnd,
    appSettings.grassCutSeasonStart,
    customers,
    monthlyPayments,
    selectedCustomer,
    visitLogs,
  ]);

  const selectedCustomerOutstanding = useMemo(() => {
    if (!selectedCustomer) {
      return 0;
    }

    return getCustomerTotals(
      selectedCustomer.id,
      visitLogs,
      customers,
      monthlyPayments,
      appSettings.grassCutSeasonStart,
      appSettings.grassCutSeasonEnd
    ).outstanding;
  }, [
    appSettings.grassCutSeasonEnd,
    appSettings.grassCutSeasonStart,
    customers,
    monthlyPayments,
    selectedCustomer,
    visitLogs,
  ]);

  useEffect(() => {
    if (page !== "scheduledJobProfile" || selectedScheduledJob) {
      return;
    }

    setSelectedScheduledJobId(null);
    navigateToPage(jobProfileBackPage);
  }, [jobProfileBackPage, page, selectedScheduledJob]);

  useEffect(() => {
    if (page !== "customerProfile" || selectedCustomer) {
      return;
    }

    setSelectedCustomerId(null);
    navigateToPage("customers");
  }, [page, selectedCustomer]);

  useEffect(() => {
    if (!pendingQuoteSchedule) {
      return;
    }

    const quoteStillExists = quotes.some((quote) => quote.id === pendingQuoteSchedule.quoteId);

    if (!quoteStillExists) {
      setPendingQuoteSchedule(null);
    }
  }, [pendingQuoteSchedule, quotes]);

  function getNextQuoteNumber(existingQuotes: Quote[]) {
    return buildQuoteNumber(appSettings, existingQuotes);
  }

  function getNextInvoiceNumber(existingInvoices: Invoice[]) {
    return buildInvoiceNumber(appSettings, existingInvoices);
  }

  function getQuoteSchedulingContext(quoteId: string) {
    const quote = quotes.find((entry) => entry.id === quoteId) ?? null;

    if (!quote) {
      return null;
    }

    const relatedInvoiceIds = invoices
        .filter((invoice) => invoice.linkedQuoteId === quote.id)
        .map((invoice) => invoice.id);
    const existingJob =
        scheduledJobs.find((job) => (job.quoteIds ?? []).includes(quote.id)) ?? null;

    return {
      quote,
      relatedInvoiceIds,
      existingJob,
    };
  }

  function clearPendingQuoteSchedule() {
    setPendingQuoteSchedule(null);
  }

  function beginQuoteScheduling(quoteId: string) {
    const context = getQuoteSchedulingContext(quoteId);

    if (!context) {
      return;
    }

    const { quote, existingJob } = context;

    if (!navigateToPage("schedule")) {
      return;
    }

    setPendingQuoteSchedule({
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      title: existingJob?.title?.trim() || `Quoted Work - ${quote.customerName}`,
      customerName: quote.customerName,
      notes: quote.notes ?? existingJob?.notes ?? "",
      scheduledDate: existingJob?.date,
      startTime: existingJob?.startTime,
      finishTime: existingJob?.finishTime,
      hasExistingJob: Boolean(existingJob),
    });
  }

  function openCustomerProfile(customerId: number) {
    setSelectedCustomerId(customerId);
    navigateToPage("customerProfile");
  }

  function goBackToCustomers() {
    navigateToPage("customers");
  }

  async function ignoreMoveSuggestion(suggestionId: string) {
    const normalizedSuggestionId = suggestionId.trim();

    if (!normalizedSuggestionId || ignoredMoveSuggestionIds.includes(normalizedSuggestionId)) {
      return;
    }

    const previousSuggestionIds = ignoredMoveSuggestionIds;
    const nextSuggestionIds = Array.from(
        new Set([...ignoredMoveSuggestionIds, normalizedSuggestionId])
    );

    setIgnoredMoveSuggestionIds(nextSuggestionIds);

    try {
      await persistAppStateSnapshot(
          buildPersistedAppState({
            ignoredMoveSuggestionIds: nextSuggestionIds,
          })
      );
    } catch (error) {
      setIgnoredMoveSuggestionIds(previousSuggestionIds);

      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      }

      throw error;
    }
  }

  async function recordRouteChange(change: RouteChangeRecord) {
    const nextRouteChangeHistory = [
      change,
      ...routeChangeHistory.filter((entry) => entry.id !== change.id),
    ].slice(0, 30);
    const previousRouteChangeHistory = routeChangeHistory;

    setRouteChangeHistory(nextRouteChangeHistory);

    try {
      await persistAppStateSnapshot(
          buildPersistedAppState({
            routeChangeHistory: nextRouteChangeHistory,
          })
      );
    } catch (error) {
      setRouteChangeHistory(previousRouteChangeHistory);

      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      }

      throw error;
    }
  }

  async function markRouteChangeUndone(changeId: string) {
    const previousRouteChangeHistory = routeChangeHistory;
    const nextRouteChangeHistory = routeChangeHistory.map((entry) =>
        entry.id === changeId
            ? {
                ...entry,
                undoneAt: new Date().toISOString(),
              }
            : entry
    );

    setRouteChangeHistory(nextRouteChangeHistory);

    try {
      await persistAppStateSnapshot(
          buildPersistedAppState({
            routeChangeHistory: nextRouteChangeHistory,
          })
      );
    } catch (error) {
      setRouteChangeHistory(previousRouteChangeHistory);

      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      }

      throw error;
    }
  }

  async function saveRouteNote(routeKey: string, note: string) {
    const previousRouteNotes = routeNotes;
    const nextRouteNotes = {
      ...routeNotes,
      [routeKey]: note,
    };

    if (!note.trim()) {
      delete nextRouteNotes[routeKey];
    }

    setRouteNotes(nextRouteNotes);

    try {
      await persistAppStateSnapshot(
          buildPersistedAppState({
            routeNotes: nextRouteNotes,
          })
      );
    } catch (error) {
      setRouteNotes(previousRouteNotes);

      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      }

      throw error;
    }
  }

  async function addScheduledJob(job: ScheduledJob) {
    return Boolean(await createScheduledJobRecord(job));
  }

  function openScheduledJob(jobId: string, backPage: "schedule" | "jobs" = "schedule") {
    setSelectedScheduledJobId(jobId);
    setJobProfileBackPage(backPage);
    navigateToPage("scheduledJobProfile");
  }

  function goBackToSchedule() {
    navigateToPage("schedule");
  }

  function goBackFromScheduledJobProfile() {
    navigateToPage(jobProfileBackPage);
  }

  function openNewQuoteForm(customerId: number | null = null) {
    setSelectedQuoteId(null);
    setSelectedCustomerId(customerId);
    setPendingLeadQuoteDraft(null);
    navigateToPage("quoteForm");
  }

  function openEditQuoteForm(quoteId: string) {
    const quote = quotes.find((entry) => entry.id === quoteId) ?? null;

    if (!quote) {
      return;
    }

    setSelectedQuoteId(quoteId);
    setSelectedCustomerId(quote.customerId ?? null);
    setPendingLeadQuoteDraft(null);
    navigateToPage("quoteForm");
  }

  function openNewInvoiceForm(customerId: number | null = null) {
    setSelectedInvoiceId(null);
    setSelectedCustomerId(customerId);
    navigateToPage("invoiceForm");
  }

  function openEditInvoiceForm(invoiceId: string) {
    const invoice = invoices.find((entry) => entry.id === invoiceId) ?? null;

    if (!invoice) {
      return;
    }

    setSelectedInvoiceId(invoiceId);
    setSelectedCustomerId(invoice.customerId ?? null);
    navigateToPage("invoiceForm");
  }

  async function addQuote(quote: Quote) {
    const existingQuote = quotes.find((entry) => entry.id === quote.id) ?? null;

    if (existingQuote) {
      const nextQuote: Quote = {
        ...existingQuote,
        ...quote,
        quoteNumber: existingQuote.quoteNumber,
        customerId: quote.customerId ?? existingQuote.customerId ?? null,
        customerName: quote.customerName.trim() || existingQuote.customerName,
        ...normalizeDocumentCustomerFields({
          customerType: quote.customerType ?? existingQuote.customerType,
          customerAddress: quote.customerAddress ?? existingQuote.customerAddress,
          customerTown: quote.customerTown ?? existingQuote.customerTown,
          customerPostcode: quote.customerPostcode ?? existingQuote.customerPostcode,
          siteName: quote.siteName ?? existingQuote.siteName,
          siteAddress: quote.siteAddress ?? existingQuote.siteAddress,
          siteTown: quote.siteTown ?? existingQuote.siteTown,
          sitePostcode: quote.sitePostcode ?? existingQuote.sitePostcode,
        }),
        status: normalizeQuoteStatus(quote.status),
        notes: quote.notes?.trim() || undefined,
        total: getLineItemsSubtotal(quote.items),
      };

      const quoteSaved = await saveQuoteRecord(nextQuote);

      if (quoteSaved) {
        appendQuoteHistory(
            nextQuote.id,
            createDocumentHistoryEntry(
                "updated",
                describeQuoteChanges(existingQuote, nextQuote)
            )
        );
        setSelectedQuoteId(null);
        navigateToPage("quotes");
      }

      return quoteSaved;
    }

    const linkedCustomer =
        selectedCustomer ??
        (quote.customerId != null ? customerMap.get(quote.customerId) ?? null : null);
    const documentFields = linkedCustomer
        ? getDocumentCustomerFieldsFromCustomer(linkedCustomer)
        : normalizeDocumentCustomerFields(quote);

    const nextQuote: Quote = {
      ...quote,
      quoteNumber: quote.quoteNumber?.trim() || getNextQuoteNumber(quotes),
      customerId: linkedCustomer?.id ?? quote.customerId ?? null,
      customerName: linkedCustomer?.name ?? quote.customerName.trim(),
      ...documentFields,
      status: normalizeQuoteStatus(quote.status),
      notes: quote.notes?.trim() || appSettings.defaultQuoteNotes || undefined,
      total: getLineItemsSubtotal(quote.items),
    };

    const quoteCreated = await createQuoteRecord(nextQuote);

    if (quoteCreated) {
      appendQuoteHistory(
          nextQuote.id,
          createDocumentHistoryEntry(
              "created",
              `Created quote ${nextQuote.quoteNumber}.`
          )
      );
      if (pendingLeadQuoteDraft) {
        const linkedLead =
            customerLeads.find((lead) => lead.id === pendingLeadQuoteDraft.leadId) ??
            null;

        if (linkedLead) {
          await saveCustomerLeadRecord(
              withCustomerLeadActivity(
                  {
                    ...linkedLead,
                    status:
                        linkedLead.status === "new" ? "reviewing" : linkedLead.status,
                  },
                  createCustomerLeadActivity(
                      "quote",
                      `Quote ${nextQuote.quoteNumber} created`,
                      `Draft quote created for ${nextQuote.customerName}.`,
                      nextQuote.id
                  )
              )
          );
        }

        setPendingLeadQuoteDraft(null);
      }
      setSelectedQuoteId(null);
    }

    return quoteCreated;
  }

  async function addInvoice(invoice: Invoice) {
    const existingInvoice = invoices.find((entry) => entry.id === invoice.id) ?? null;
    const subtotal = getLineItemsSubtotal(invoice.items);
    const resolvedVatRate =
        typeof invoice.vatRate === "number" && !Number.isNaN(invoice.vatRate)
            ? invoice.vatRate
            : appSettings.vatRegistered
                ? appSettings.vatRate
                : 0;
    const resolvedVatAmount =
        typeof invoice.vatAmount === "number" && !Number.isNaN(invoice.vatAmount)
            ? invoice.vatAmount
            : getVatAmount(subtotal, resolvedVatRate);

    if (existingInvoice) {
      const nextInvoice: Invoice = {
        ...existingInvoice,
        ...invoice,
        invoiceNumber: existingInvoice.invoiceNumber,
        customerId: invoice.customerId ?? existingInvoice.customerId ?? null,
        customerName: invoice.customerName.trim() || existingInvoice.customerName,
        ...normalizeDocumentCustomerFields({
          customerType: invoice.customerType ?? existingInvoice.customerType,
          customerAddress: invoice.customerAddress ?? existingInvoice.customerAddress,
          customerTown: invoice.customerTown ?? existingInvoice.customerTown,
          customerPostcode: invoice.customerPostcode ?? existingInvoice.customerPostcode,
          siteName: invoice.siteName ?? existingInvoice.siteName,
          siteAddress: invoice.siteAddress ?? existingInvoice.siteAddress,
          siteTown: invoice.siteTown ?? existingInvoice.siteTown,
          sitePostcode: invoice.sitePostcode ?? existingInvoice.sitePostcode,
        }),
        dueDate:
            invoice.dueDate?.trim() ||
            existingInvoice.dueDate ||
            addDaysToIsoDate(invoice.date, appSettings.paymentTermsDays),
        status: normalizeInvoiceStatus(invoice.status),
        notes: invoice.notes?.trim() || undefined,
        terms: invoice.terms?.trim() || undefined,
        vatRate: resolvedVatRate,
        vatAmount: resolvedVatAmount,
        total: roundCurrency(subtotal + resolvedVatAmount),
        linkedQuoteId: invoice.linkedQuoteId?.trim() || undefined,
      };

      const invoiceSaved = await saveInvoiceRecord(nextInvoice);

      if (invoiceSaved) {
        appendInvoiceHistory(
            nextInvoice.id,
            createDocumentHistoryEntry(
                "updated",
                describeInvoiceChanges(existingInvoice, nextInvoice)
            )
        );
        setSelectedInvoiceId(null);
        navigateToPage("invoices");
      }

      return invoiceSaved;
    }

    const linkedCustomer =
        selectedCustomer ??
        (invoice.customerId != null ? customerMap.get(invoice.customerId) ?? null : null);
    const documentFields = linkedCustomer
        ? getDocumentCustomerFieldsFromCustomer(linkedCustomer)
        : normalizeDocumentCustomerFields(invoice);

    const nextInvoice: Invoice = {
      ...invoice,
      invoiceNumber: invoice.invoiceNumber?.trim() || getNextInvoiceNumber(invoices),
      customerId: linkedCustomer?.id ?? invoice.customerId ?? null,
      customerName: linkedCustomer?.name ?? invoice.customerName.trim(),
      ...documentFields,
      dueDate:
          invoice.dueDate?.trim() ||
          addDaysToIsoDate(invoice.date, appSettings.paymentTermsDays),
      status: normalizeInvoiceStatus(invoice.status),
      notes: invoice.notes?.trim() || appSettings.defaultInvoiceNotes || undefined,
      terms: invoice.terms?.trim() || appSettings.defaultInvoiceTerms || undefined,
      vatRate: resolvedVatRate,
      vatAmount: resolvedVatAmount,
      total: roundCurrency(subtotal + resolvedVatAmount),
    };

    const invoiceCreated = await createInvoiceRecord(nextInvoice);

    if (invoiceCreated) {
      appendInvoiceHistory(
          nextInvoice.id,
          createDocumentHistoryEntry(
              "created",
              `Created invoice ${nextInvoice.invoiceNumber}.`
          )
      );
      setSelectedInvoiceId(null);
    }

    return invoiceCreated;
  }

  async function scheduleQuoteFromCalendar({
      quoteId,
      date,
      startTime,
      finishTime,
    }: {
      quoteId: string;
      date: string;
      startTime: string;
      finishTime: string;
    }) {
    const context = getQuoteSchedulingContext(quoteId);

    if (!context) {
      return false;
    }

    const { quote, relatedInvoiceIds, existingJob } = context;

    const trimmedStartTime = startTime.trim();
    const trimmedFinishTime = finishTime.trim();

    if (existingJob) {
      const updatedJob: ScheduledJob = {
        ...existingJob,
        title: existingJob.title?.trim() || `Quoted Work - ${quote.customerName}`,
        date,
        notes: quote.notes ?? existingJob.notes ?? "",
        startTime: trimmedStartTime,
        finishTime: trimmedFinishTime,
        customerId: quote.customerId ?? existingJob.customerId ?? null,
        customerName: quote.customerName,
        type: "Quote Accepted",
        status: existingJob.status === "Cancelled" ? "Scheduled" : existingJob.status,
        quoteIds: Array.from(new Set([...(existingJob.quoteIds ?? []), quote.id])),
        invoiceIds: Array.from(
            new Set([...(existingJob.invoiceIds ?? []), ...relatedInvoiceIds])
        ),
      };

      const persistedJob = await saveScheduledJobRecord(updatedJob);

      if (!persistedJob) {
        return false;
      }

      const quoteSaved = await saveQuoteRecord({
        ...quote,
        status: "Scheduled",
      });

      if (!quoteSaved) {
        return false;
      }

      setPendingQuoteSchedule(null);
      return true;
    }

    const newJob: ScheduledJob = {
      id: crypto.randomUUID(),
      title: `Quoted Work - ${quote.customerName}`,
      date,
      notes: quote.notes ?? "",
      startTime: trimmedStartTime,
      finishTime: trimmedFinishTime,
      customerId: quote.customerId ?? null,
      customerName: quote.customerName,
      type: "Quote Accepted",
      status: "Scheduled",
      quoteIds: [quote.id],
      invoiceIds: relatedInvoiceIds,
      createdAt: new Date().toISOString(),
    };

    const persistedJob = await createScheduledJobRecord(newJob);

    if (!persistedJob) {
      return false;
    }

    const quoteSaved = await saveQuoteRecord({
      ...quote,
      status: "Scheduled",
    });

    if (!quoteSaved) {
      return false;
    }

    setPendingQuoteSchedule(null);
    return true;
  }

  async function convertQuoteToInvoice(quoteId: string) {
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) return;

    const subtotal = getLineItemsSubtotal(quote.items);
    const vatRate = appSettings.vatRegistered ? appSettings.vatRate : 0;
    const vatAmount = getVatAmount(subtotal, vatRate);
    const invoiceDate = formatDateInput(new Date());

    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      invoiceNumber: getNextInvoiceNumber(invoices),
      customerId: quote.customerId ?? null,
      customerName: quote.customerName,
      customerType: quote.customerType,
      customerAddress: quote.customerAddress,
      customerTown: quote.customerTown,
      customerPostcode: quote.customerPostcode,
      siteName: quote.siteName,
      siteAddress: quote.siteAddress,
      siteTown: quote.siteTown,
      sitePostcode: quote.sitePostcode,
      date: invoiceDate,
      dueDate: addDaysToIsoDate(invoiceDate, appSettings.paymentTermsDays),
      status: "Draft",
      items: quote.items,
      notes: appSettings.defaultInvoiceNotes || undefined,
      terms: appSettings.defaultInvoiceTerms || undefined,
      vatRate,
      vatAmount,
      total: roundCurrency(subtotal + vatAmount),
      linkedQuoteId: quote.id,
    };

    const invoiceCreated = await createInvoiceRecord(newInvoice);

    if (!invoiceCreated) {
      return;
    }

    const relatedJobs = scheduledJobs.filter((job) =>
        (job.quoteIds ?? []).includes(quote.id)
    );

    for (const job of relatedJobs) {
      await saveScheduledJobRecord({
        ...job,
        invoiceIds: Array.from(new Set([...(job.invoiceIds ?? []), newInvoice.id])),
      });
    }
  }

  async function deleteCustomer(customerId: number) {
    await removeCustomer(customerId);
  }

  function getNextRouteOrderForCustomer(
      customer: Pick<Customer, "id" | "isGrassCuttingCustomer" | "week" | "day">
  ) {
    if (customer.isGrassCuttingCustomer === false) {
      return 0;
    }

    const customerWeek = normaliseWeekName(customer.week);
    const customerDay = normaliseDayName(customer.day);
    const existingRouteOrders = customers
        .filter(
            (existingCustomer) =>
                existingCustomer.id !== customer.id &&
                existingCustomer.isGrassCuttingCustomer &&
                existingCustomer.week === customerWeek &&
                existingCustomer.day === customerDay
        )
        .map((existingCustomer) =>
            Number.isFinite(existingCustomer.routeOrder) ? Number(existingCustomer.routeOrder) : 0
        );

    return existingRouteOrders.length > 0 ? Math.max(...existingRouteOrders) + 1 : 1;
  }

  function ensureCustomerRouteOrder(customer: Record<string, unknown>) {
    if (customer.isGrassCuttingCustomer === false) {
      customer.routeOrder = 0;
      return;
    }

    const currentRouteOrder = Number(customer.routeOrder);

    if (Number.isFinite(currentRouteOrder) && currentRouteOrder > 0) {
      customer.routeOrder = Math.floor(currentRouteOrder);
      return;
    }

    customer.routeOrder = getNextRouteOrderForCustomer({
      id: typeof customer.id === "number" ? customer.id : -1,
      isGrassCuttingCustomer: true,
      week: normaliseWeekName(customer.week),
      day: normaliseDayName(customer.day),
    });
  }

  async function addCustomer(customer: Customer) {
    const nextCustomer = { ...(customer as Record<string, unknown>) } as Record<string, unknown>;

    if (!nextCustomer.week || typeof nextCustomer.week !== "string") {
      nextCustomer.week = selectedWeek;
    }

    if (!nextCustomer.day || typeof nextCustomer.day !== "string") {
      nextCustomer.day = appSettings.defaultVisitDay;
    }

    if (
        nextCustomer.isGrassCuttingCustomer !== false &&
        (
            nextCustomer.grassCutAmount === null ||
            nextCustomer.grassCutAmount === undefined ||
            nextCustomer.grassCutAmount === ""
        ) &&
        nextCustomer.customerType === "Residential"
    ) {
      nextCustomer.grassCutAmount = appSettings.defaultGrassCutPrice;
    }

    if (!nextCustomer.paymentMethod || typeof nextCustomer.paymentMethod !== "string") {
      nextCustomer.paymentMethod = getCustomerPaymentMethodFromSettings(
          appSettings.defaultPaymentMethod
      );
    }

    if (!nextCustomer.notes || typeof nextCustomer.notes !== "string") {
      nextCustomer.notes = appSettings.defaultCustomerNotes || "";
    }

    ensureCustomerRouteOrder(nextCustomer);

    await createCustomer(nextCustomer as Customer);
  }

  async function updateCustomer(updated: Customer) {
    const nextCustomer = { ...(updated as Record<string, unknown>) } as Record<string, unknown>;

    if (!nextCustomer.paymentMethod || typeof nextCustomer.paymentMethod !== "string") {
      nextCustomer.paymentMethod = getCustomerPaymentMethodFromSettings(
          appSettings.defaultPaymentMethod
      );
    }

    if (!nextCustomer.day || typeof nextCustomer.day !== "string") {
      nextCustomer.day = appSettings.defaultVisitDay;
    }

    ensureCustomerRouteOrder(nextCustomer);

    await saveCustomer(nextCustomer as Customer);
  }

  async function saveVisitPaymentDate(
      visitId: number | string,
      paymentDate: string | null
  ) {
    const existingVisit = visitLogs.find((visit) => visit.id === visitId);
    if (!existingVisit) return;

    await persistVisit({
      ...existingVisit,
      paymentStatus: paymentDate ? "Paid" : "Not Paid",
      paidAt: paymentDate ? toStoredDateTime(paymentDate) : null,
      paid: Boolean(paymentDate),
    });

    setPendingCashPayment(existingVisit.customerId, false);
  }

  async function saveVisitCutDate(
      visitId: number | string,
      cutDate: string
  ) {
    const normalizedCutDate = getInputDateValue(cutDate);
    const existingVisit = visitLogs.find((visit) => visit.id === visitId);
    if (!existingVisit || !normalizedCutDate) return;

    await persistVisit({
      ...existingVisit,
      visitDate: toStoredDateTime(normalizedCutDate) ?? existingVisit.visitDate,
    });
  }

  async function createVisitCutDate(
      customerId: number,
      cutDate: string,
      paymentDate: string | null = null
  ) {
    const normalizedCutDate = getInputDateValue(cutDate);
    const normalizedPaymentDate = getInputDateValue(paymentDate);
    const customer = customerMap.get(customerId);

    if (!customer || !normalizedCutDate) {
      return;
    }

    const nowIso = new Date().toISOString();
    const isPaid = Boolean(normalizedPaymentDate);
    const visitRoundCycle = getActiveRoundCycle(
        activeRoundCycles,
        getBaseRoundKey(customer.week, customer.day)
    );

    await persistVisit({
      id: `temp-${crypto.randomUUID()}`,
      customerId,
      visitDate: toStoredDateTime(normalizedCutDate) ?? nowIso,
      createdAt: nowIso,
      status: "completed",
      paymentStatus: isPaid ? "Paid" : "Not Paid",
      paid: isPaid,
      paidAt: isPaid ? toStoredDateTime(normalizedPaymentDate) : null,
      roundKey: getVisitRoundKey(
          customer.week,
          customer.day,
          customer.customerType,
          visitRoundCycle
      ),
      week: customer.week,
      day: customer.day,
      customerType: customer.customerType,
      priceAtVisit: Number(customer.grassCutAmount ?? 0),
    } as VisitLog);

    if (customer.paymentMethod === "Cash" && isPaid) {
      setPendingCashPayment(customerId, false);
    }
  }

  async function removeVisit(visitId: number | string) {
    const existingVisit = visitLogs.find((visit) => visit.id === visitId);
    if (!existingVisit) return;

    if (String(visitId).startsWith("temp-")) {
      setVisitLogs((prev) => prev.filter((visit) => visit.id !== visitId));
      return;
    }

    const supabase = createSupabaseClient();
    const { error } = await supabase.from("visits").delete().eq("id", visitId);

    if (error) {
      setDatabaseError(formatDatabaseError(error));
      throw error;
    }

    setVisitLogs((prev) => prev.filter((visit) => visit.id !== visitId));
    setDatabaseError(getDatabaseSetupNotice(workflowTablesReady, staffTablesReady));
  }

  async function togglePaid(visitId: number | string) {
    const existingVisit = visitLogs.find((visit) => visit.id === visitId);
    if (!existingVisit) return;

    const isPaidNow =
        existingVisit.paid === true || existingVisit.paymentStatus === "Paid";

    await saveVisitPaymentDate(
        visitId,
        isPaidNow ? null : getTodayDateInputValue()
    );
  }

  function getCurrentVisit(customerId: number) {
    const customer = customerMap.get(customerId);
    if (!customer || !customer.isGrassCuttingCustomer) {
      return null;
    }

    const visitRoundKey = getVisitRoundKey(
        selectedWeek,
        selectedDay,
        customer.customerType,
        activeRoundCycle
    );
    const matchingVisits = visitLogs
        .filter((visit) => {
          if (visit.customerId !== customerId) return false;

          if (visit.roundKey) {
            return visit.roundKey === visitRoundKey;
          }

          if (activeRoundCycle > 1 && !isLocked) {
            return false;
          }

          if (visit.week && visit.day) {
            return (
                visit.week === selectedWeek &&
                visit.day === selectedDay &&
                (visit.customerType
                    ? visit.customerType === customer.customerType
                    : true)
            );
          }

          return false;
        })
        .sort(
            (a, b) =>
                new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
        );

    return matchingVisits[0] ?? null;
  }

  async function sendVisitCompletionTextIfNeeded(
      customer: Customer,
      visit: VisitLog,
      previousStatus?: VisitLog["status"]
  ) {
    if (
        !appSettings.autoSendVisitCompletionTexts ||
        customer.paymentMethod !== "On Day Transfer" ||
        visit.status !== "completed" ||
        previousStatus === "completed"
    ) {
      return;
    }

    const recipient = customer.phone?.trim();

    if (!recipient) {
      setDatabaseError(
          `Visit saved for ${customer.name}, but no mobile number is saved for the automatic payment text.`
      );
      return;
    }

    try {
      await sendCustomerTextMessage({
        recipient,
        message: buildVisitCompletionText(appSettings, customer, visit),
      });
      setDatabaseError(`Visit saved and payment text sent to ${customer.name}.`);
    } catch (error) {
      const message =
          error instanceof Error && error.message.trim()
              ? error.message
              : "Unable to send the automatic payment text.";
      setDatabaseError(`Visit saved for ${customer.name}, but the text was not sent. ${message}`);
    }
  }

  async function markVisit(
      customerId: number,
      status: "cut" | "not_cut",
      extra?: { notes?: string; notCutReason?: NotCutReason; paid?: boolean }
  ) {
    if (isLocked) return;

    const customer = customerMap.get(customerId);
    if (!customer) return;

    const existingVisit = getCurrentVisit(customerId);
    const pendingCashPaymentDate =
        customer.paymentMethod === "Cash"
            ? pendingCashPaymentDates[String(customerId)] ?? null
            : null;
    const nextStatus = status === "cut" ? "completed" : "not_cut";

    if (existingVisit) {
      const persistedVisit = await persistVisit({
        ...existingVisit,
        status: nextStatus,
        notes: extra?.notes ?? existingVisit.notes,
        notCutReason: extra?.notCutReason ?? existingVisit.notCutReason,
        paymentStatus:
            typeof extra?.paid === "boolean"
                ? extra.paid
                    ? "Paid"
                    : "Not Paid"
                : existingVisit.paymentStatus,
        paid:
            typeof extra?.paid === "boolean"
                ? extra.paid
                : existingVisit.paid,
        paidAt:
            typeof extra?.paid === "boolean"
                ? extra.paid
                    ? toStoredDateTime(
                        pendingCashPaymentDate ?? getTodayDateInputValue()
                    )
                    : null
                : existingVisit.paidAt ?? null,
      });

      if (customer.paymentMethod === "Cash" && typeof extra?.paid === "boolean") {
        setPendingCashPayment(customerId, false);
      }

      await sendVisitCompletionTextIfNeeded(
          customer,
          persistedVisit,
          existingVisit.status
      );
      return;
    }

    const nowIso = new Date().toISOString();
    const priceAtVisit = Number(customer.grassCutAmount ?? 0);
    const visitRoundKey = getVisitRoundKey(
        selectedWeek,
        selectedDay,
        customer.customerType,
        activeRoundCycle
    );

    const newVisit = {
      id: `temp-${crypto.randomUUID()}`,
      customerId,
      visitDate: nowIso,
      createdAt: nowIso,
      status: nextStatus,
      notes: extra?.notes,
      notCutReason: extra?.notCutReason,
      paymentStatus: extra?.paid ? "Paid" : "Not Paid",
      paid: extra?.paid === true,
      paidAt: extra?.paid
          ? toStoredDateTime(
              pendingCashPaymentDate ?? getTodayDateInputValue()
          )
          : null,
      roundKey: visitRoundKey,
      week: selectedWeek,
      day: selectedDay,
      customerType: customer.customerType,
      priceAtVisit,
    } as VisitLog;

    const persistedVisit = await persistVisit(newVisit);

    if (customer.paymentMethod === "Cash" && typeof extra?.paid === "boolean") {
      setPendingCashPayment(customerId, false);
    }

    await sendVisitCompletionTextIfNeeded(customer, persistedVisit);
  }

  async function setVisitPaidStatus(visitId: number | string, paid: boolean) {
    await saveVisitPaymentDate(
        visitId,
        paid ? getTodayDateInputValue() : null
    );
  }

  function completeSelectedRound() {
    setLockedRounds((prev) => ({
      ...prev,
      [roundKey]: true,
    }));
  }

  function startNewSelectedRound() {
    const shouldStart = window.confirm(
        `Start a fresh ${selectedWeek} ${selectedDay} grass cutting round? The locked round will stay in History and Payments, and this screen will reset for the next cycle.`
    );

    if (!shouldStart) {
      return;
    }

    const nextCycle = activeRoundCycle + 1;
    const nextRoundKey = getRoundKeyForCycle(baseRoundKey, nextCycle);

    setActiveRoundCycles((prev) => ({
      ...prev,
      [baseRoundKey]: nextCycle,
    }));
    setLockedRounds((prev) => ({
      ...prev,
      [roundKey]: true,
      [nextRoundKey]: false,
    }));
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      window.location.href = "/login";
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(error.message);
      } else {
        setDatabaseError("Unable to sign out right now.");
      }

      setIsLoggingOut(false);
    }
  }

  function toggleNavSection(sectionTitle: string) {
    setExpandedNavSections((prev) =>
        prev[sectionTitle]
            ? getExpandedNavSections(null)
            : getExpandedNavSections(sectionTitle)
    );
  }

  function navigateToPage(nextPage: PageKey) {
    if (!hasPageAccess(nextPage)) {
      if (firstAccessiblePage) {
        setExpandedNavSections(
            getExpandedNavSections(getNavSectionTitle(firstAccessiblePage))
        );
        setPage(firstAccessiblePage);
      }
      return false;
    }

    setExpandedNavSections(getExpandedNavSections(getNavSectionTitle(nextPage)));
    if (nextPage !== "quoteForm") {
      setPendingLeadQuoteDraft(null);
    }
    setPage(nextPage);
    return true;
  }

  function handleSidebarNavigation(nextPage: PageKey) {
    navigateToPage(nextPage);
  }

  function PlaceholderPage({
                             title,
                             description,
                           }: {
    title: string;
    description: string;
  }) {
    return (
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
    );
  }

  function AccessPendingPage() {
    return (
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">No page access yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            This account is signed in, but it has not been given access to any pages
            yet. Use the admin account to add this staff member and switch pages on
            for their role.
          </p>
        </div>
    );
  }

  if (isHydrating) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#edf1f2] p-6">
          <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Supabase
            </p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
              Loading job data...
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Pulling the latest shared app state from Supabase.
            </p>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen" style={{ background: getBrandPageBackground(appSettings) }}>
        <div className="flex min-h-screen">
          <aside className="flex w-[248px] flex-col px-4 py-5 text-white lg:w-[260px]" style={{ background: getSidebarBackground(appSettings) }}>
            <div className="mb-5">
              {appSettings.logoUrl ? (
                  <img
                      src={appSettings.logoUrl}
                      alt={appSettings.businessName || "Business logo"}
                      className="h-auto max-h-16 w-auto max-w-full object-contain"
                  />
              ) : (
                  <div className="px-1">
                    <p className="text-xl font-black tracking-tight text-white">
                      {appSettings.businessName || "Cleancut Garden & Property Maintenance"}
                    </p>
                    {(appSettings.businessEmail || appSettings.businessPhone) && (
                        <p className="mt-1 text-xs text-white/60">
                          {appSettings.businessEmail || appSettings.businessPhone}
                        </p>
                    )}
                  </div>
              )}
            </div>

            <nav className="space-y-5">
              {accessibleNavSections.map((section) => (
                  <div key={section.title} className="space-y-2">
                    {(() => {
                      const sectionIsActive = getNavSectionTitle(page) === section.title;
                      const sectionIsExpanded =
                          expandedNavSections[section.title] ?? sectionIsActive;
                      const SectionChevron = sectionIsExpanded ? ChevronDown : ChevronRight;

                      return (
                          <>
                            <button
                                type="button"
                                onClick={() => toggleNavSection(section.title)}
                                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                                    sectionIsActive
                                        ? "bg-white/8 text-white"
                                        : "text-white/75 hover:bg-white/5 hover:text-white"
                                }`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-inherit">
                                  {section.title}
                                </span>
                                {section.title === "Dashboard" && newLeadsCount > 0 ? (
                                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">
                                      {newLeadsCount}
                                    </span>
                                ) : null}
                              </span>
                              <SectionChevron
                                  size={16}
                                  className={`transition ${sectionIsActive ? "text-white" : "text-white/55 group-hover:text-white/80"}`}
                              />
                            </button>

                            {sectionIsExpanded ? (
                                <div className="space-y-1.5 pl-2">
                                  {section.items.map(({ key, label, icon: Icon }) => {
                                    const active = page === key;
                                    const itemBadgeCount =
                                        key === "leads" ? newLeadsCount : 0;

                                    return (
                                        <button
                                            key={key}
                                            onClick={() => handleSidebarNavigation(key)}
                                            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-all ${
                                                active
                                                    ? "text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-white/10"
                                                    : "text-white/70 hover:bg-white/5 hover:text-white"
                                            }`}
                                            style={active ? { background: getActiveNavBackground(appSettings) } : undefined}
                                        >
                                      <span
                                          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                                              active
                                                  ? "bg-white/10 text-white"
                                                  : "bg-white/[0.04] text-white/65 group-hover:bg-white/10 group-hover:text-white"
                                          }`}
                                      >
                                        <Icon size={18} />
                                      </span>

                                          <span className="font-medium">{label}</span>

                                          <span className="ml-auto flex items-center gap-2">
                                            {itemBadgeCount > 0 ? (
                                                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">
                                                  {itemBadgeCount}
                                                </span>
                                            ) : null}

                                            {active && (
                                                <span className="h-2.5 w-2.5 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.45)]" style={{ background: appSettings.primaryColor }} />
                                            )}
                                          </span>
                                        </button>
                                    );
                                  })}
                                </div>
                            ) : null}
                          </>
                      );
                    })()}
                  </div>
              ))}

              {accessibleNavSections.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white/65">
                    No pages are enabled for this account yet.
                  </div>
              ) : null}
            </nav>

          </aside>

          <main className="flex-1 p-4 lg:p-5">
            <div className="h-full rounded-[28px] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] lg:p-5" style={{ background: getBrandSurface(appSettings) }}>
              <section className="mb-5 rounded-3xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Today
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900">
                      {todayPanel.week} - {todayPanel.dayLabel}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        todayPanel.selectedDay
                          ? isTodayLocked
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {todayPanel.selectedDay
                        ? isTodayLocked
                          ? "Round is locked"
                          : "Round is active"
                        : "No round scheduled today"}
                    </span>

                    <select
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value as WeekName)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50"
                    >
                      {WEEK_OPTIONS.map((week) => (
                        <option key={week} value={week}>
                          {week}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value as DayName)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50"
                    >
                      {DAY_OPTIONS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center justify-start gap-2.5 xl:justify-end">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Logged In As
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900">
                      {loggedInStaffName}
                    </span>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <LogOut size={14} />
                      {isLoggingOut ? "Signing out..." : "Logout"}
                    </button>
                  </div>
                </div>
              </section>

              {databaseError && (
                  <section className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
                    {databaseError}
                  </section>
              )}

              {!hasPageAccess(page) ? (
                  <AccessPendingPage />
              ) : (
                  <>
              {(page === "rounds" || page === "commercial") && (
                  <section className="mb-5 rounded-3xl border bg-white p-3.5 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap gap-2">
                        <select
                            value={selectedWeek}
                            onChange={(e) => setSelectedWeek(e.target.value as WeekName)}
                            className="rounded-xl border px-3 py-2"
                        >
                          {WEEK_OPTIONS.map((week) => (
                              <option key={week} value={week}>
                                {week}
                              </option>
                          ))}
                        </select>

                        <select
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value as DayName)}
                            className="rounded-xl border px-3 py-2"
                        >
                          {DAY_OPTIONS.map((day) => (
                              <option key={day} value={day}>
                                {day}
                              </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                            onClick={completeSelectedRound}
                            disabled={isLocked}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isLocked ? "Round Locked" : "Complete Selected Round"}
                        </button>

                        {isLocked && (
                            <button
                                onClick={startNewSelectedRound}
                                className="rounded-xl border px-4 py-2"
                            >
                              Start New Round
                            </button>
                        )}
                      </div>
                    </div>
                  </section>
              )}

              {page === "dashboard" && (
                  <DashboardPage
                      key={`dashboard-${appSettings.primaryColor}-${appSettings.showWeatherWidget}-${appSettings.showRevenueWidget}-${appSettings.showJobsWidget}-${appSettings.showUnpaidWidget}-${appSettings.showRecentActivityWidget}`}
                      visits={visitLogs}
                      customers={customers}
                      scheduledJobs={scheduledJobs}
                      monthlyPayments={monthlyPayments}
                      grassCutSeasonStart={appSettings.grassCutSeasonStart}
                      grassCutSeasonEnd={appSettings.grassCutSeasonEnd}
                      roundCycle={activeRoundCycle}
                      selectedWeek={selectedWeek}
                      selectedDay={selectedDay}
                      isLocked={isLocked}
                      showWeatherWidget={appSettings.showWeatherWidget}
                      showRevenueWidget={appSettings.showRevenueWidget}
                      showJobsWidget={appSettings.showJobsWidget}
                      showUnpaidWidget={appSettings.showUnpaidWidget}
                      showRecentActivityWidget={appSettings.showRecentActivityWidget}
                      attentionItems={dashboardAttentionItems}
                      onGoToRounds={() => navigateToPage("rounds")}
                      onGoToActions={() => navigateToPage("actions")}
                      onGoToMap={() => navigateToPage("map")}
                      onGoToCustomers={() => navigateToPage("customers")}
                      onGoToQuoteForm={() => openNewQuoteForm()}
                      onGoToInvoiceForm={() => openNewInvoiceForm()}
                      onGoToSchedule={() => navigateToPage("schedule")}
                      onGoToPayments={() => navigateToPage("payments")}
                      onGoToCustomerProfit={() => navigateToPage("customerProfit")}
                      onOpenCustomer={openCustomerProfile}
                      onOpenQuote={openEditQuoteForm}
                      onOpenInvoice={openEditInvoiceForm}
                      onSendQuoteFollowUp={openQuoteFollowUpDialog}
                      onSendInvoiceReminder={openInvoiceReminderDialog}
                  />
              )}

              {page === "schedule" && (
                  <SchedulePage
                      jobs={scheduledJobs as any}
                      customers={customers as any}
                      grassCutSeasonStart={appSettings.grassCutSeasonStart}
                      grassCutSeasonEnd={appSettings.grassCutSeasonEnd}
                      onAddJob={addScheduledJob as any}
                      pendingQuoteSchedule={pendingQuoteSchedule}
                      onScheduleQuote={scheduleQuoteFromCalendar}
                      onClearPendingQuoteSchedule={clearPendingQuoteSchedule}
                      onOpenJob={(jobId) => openScheduledJob(jobId, "schedule")}
                  />
              )}

              {page === "jobs" && (
                  <JobsPage
                      jobs={scheduledJobs as any}
                      customers={customers as any}
                      quotes={quotes as any}
                      invoices={invoices as any}
                      onOpenJob={(jobId) => openScheduledJob(jobId, "jobs")}
                      onOpenCustomer={openCustomerProfile}
                  />
              )}

              {page === "scheduledJobProfile" && selectedScheduledJob && (
                  <ScheduledJobProfileSection
                      job={selectedScheduledJob}
                      checklist={
                        scheduledJobChecklists[selectedScheduledJob.id] ??
                        DEFAULT_SCHEDULED_JOB_CHECKLIST
                      }
                      customers={customers}
                      quotes={quotes}
                      invoices={invoices}
                      onBack={goBackFromScheduledJobProfile}
                      backLabel={jobProfileBackPage === "jobs" ? "Back to Jobs" : "Back to Schedule"}
                      onOpenCustomer={openCustomerProfile}
                      onUpdateChecklist={(key, checked) =>
                        updateScheduledJobChecklist(selectedScheduledJob.id, key, checked)
                      }
                      onToggleCompleted={toggleScheduledJobCompleted}
                      onDeleteJob={deleteScheduledJobRecord}
                      onSaveJob={saveScheduledJobRecord}
                      onEditQuote={openEditQuoteForm}
                      onEditInvoice={openEditInvoiceForm}
                  />
              )}

                {(page === "rounds" || page === "commercial") && (
                  <RoundsPage
                      customers={customers as any}
                      visits={visitLogs as any}
                      selectedWeek={selectedWeek}
                      selectedDay={selectedDay}
                      isLocked={isLocked}
                      onMarkVisit={markVisit as any}
                      onSetPaidStatus={setVisitPaidStatus}
                      pendingCashPaymentDates={pendingCashPaymentDates}
                      onSetPendingCashPayment={setPendingCashPayment}
                      getCurrentVisit={getCurrentVisit as any}
                      onOpenCustomer={openCustomerProfile}
                  />
              )}

              {page === "routeEfficiency" && (
                  <RouteEfficiencyPage
                      customers={customers}
                      selectedWeek={selectedWeek}
                      selectedDay={selectedDay}
                      ignoredMoveSuggestionIds={ignoredMoveSuggestionIds}
                      routeChangeHistory={routeChangeHistory}
                      routeNotes={routeNotes}
                      onUpdateCustomer={updateCustomer}
                      onIgnoreMoveSuggestion={ignoreMoveSuggestion}
                      onRecordRouteChange={recordRouteChange}
                      onMarkRouteChangeUndone={markRouteChangeUndone}
                      onSaveRouteNote={saveRouteNote}
                      onOpenCustomer={openCustomerProfile}
                      onGoToMap={() => navigateToPage("map")}
                  />
              )}

              {page === "customers" && (
                  <CustomersPage
                      key={`customers-${appSettings.defaultPaymentMethod}-${appSettings.defaultVisitDay}-${appSettings.defaultGrassCutPrice}`}
                      customers={customers as any}
                      visits={visitLogs as any}
                      monthlyPayments={monthlyPayments}
                      grassCutSeasonStart={appSettings.grassCutSeasonStart}
                      grassCutSeasonEnd={appSettings.grassCutSeasonEnd}
                      onAdd={addCustomer as any}
                      onUpdate={updateCustomer as any}
                      onDelete={deleteCustomer}
                      onOpenCustomer={openCustomerProfile}
                  />
              )}

              {page === "customerProfit" && (
                  <CustomerProfitPage
                      customers={customers}
                      visits={visitLogs}
                      monthlyPayments={monthlyPayments}
                      grassCutSeasonStart={appSettings.grassCutSeasonStart}
                      grassCutSeasonEnd={appSettings.grassCutSeasonEnd}
                      onOpenCustomer={openCustomerProfile}
                  />
              )}

              {page === "payments" && (
                  <PaymentsPage
                      customers={customers}
                      visits={visitLogs}
                      monthlyPayments={monthlyPayments}
                      grassCutSeasonStart={appSettings.grassCutSeasonStart}
                      grassCutSeasonEnd={appSettings.grassCutSeasonEnd}
                      monthlyPaymentsReady={workflowTablesReady.monthlyPayments}
                      pendingCashPaymentDates={pendingCashPaymentDates}
                      onSaveMonthlyPayment={saveMonthlyPaymentDate}
                      onSaveVisitCutDate={saveVisitCutDate}
                      onCreateVisitCutDate={createVisitCutDate}
                      onSaveVisitPaymentDate={saveVisitPaymentDate}
                      onDeleteVisit={removeVisit}
                      onOpenCustomer={openCustomerProfile}
                  />
              )}

              {page === "customerProfile" && selectedCustomer && (
                  <CustomerProfilePage
                      customer={selectedCustomer}
                      visits={selectedCustomerVisits as any}
                      commercialRamsDocuments={commercialRamsDocuments.filter(
                          (document) => document.customerId === selectedCustomer.id
                      )}
                      lastVisit={selectedCustomerLastVisit}
                      totalSpent={selectedCustomerTotalSpent}
                      outstanding={selectedCustomerOutstanding}
                      grassCutSeasonStart={appSettings.grassCutSeasonStart}
                      grassCutSeasonEnd={appSettings.grassCutSeasonEnd}
                      onBack={goBackToCustomers}
                      onOpenPayments={() => navigateToPage("payments")}
                      onTogglePaid={togglePaid}
                      onUpdateCustomer={updateCustomer}
                      onCreateQuote={(customerId: number) => openNewQuoteForm(customerId)}
                      onCreateInvoice={(customerId: number) =>
                          openNewInvoiceForm(customerId)
                      }
                  />
              )}

              {page === "history" && (
                  <HistoryPage
                      visitLogs={visitLogs as any}
                      customers={customers as any}
                      updatePaymentStatus={togglePaid as any}
                      onClearHistory={clearVisitHistory}
                      isClearingHistory={isClearingHistory}
                  />
              )}

              {page === "actions" && (
                  <ActionsPage
                      visits={visitLogs as any}
                      customers={customers as any}
                      onTogglePaid={togglePaid}
                  />
              )}

              {page === "leads" && (
                  <CustomerLeadsPage
                      leads={customerLeads}
                      customers={customers}
                      leadsReady={workflowTablesReady.customerLeads}
                      businessName={getBusinessDisplayName(appSettings)}
                      onRefresh={refreshCustomerLeads}
                      onSendEmailReply={sendCustomerLeadEmailReply}
                      onConvertToCustomer={convertCustomerLeadToCustomer}
                      onCreateQuote={createQuoteFromCustomerLead}
                      onAddActivityNote={addCustomerLeadActivityNote}
                      onUpdateStatus={updateCustomerLeadStatus}
                      onDeleteArchivedLead={deleteArchivedCustomerLead}
                  />
              )}

              {page === "map" && (
                  <MapPage
                      customers={customers as any}
                      visits={visitLogs as any}
                      selectedWeek={selectedWeek}
                      selectedDay={selectedDay}
                      isLocked={isLocked}
                      getCurrentVisit={getCurrentVisit as any}
                      onUpdateCustomer={updateCustomer as any}
                      onMarkVisit={markVisit as any}
                      onSetPaidStatus={setVisitPaidStatus}
                      pendingCashPaymentDates={pendingCashPaymentDates}
                      onSetPendingCashPayment={setPendingCashPayment}
                      onCompleteRound={completeSelectedRound}
                  />
              )}

                {page === "quotes" && (
                  <QuotesPage
                      quotes={quotes as any}
                      customers={customers}
                      documentHistory={quoteHistory}
                      businessDetails={{
                        businessName: appSettings.businessName,
                        tradingName: appSettings.tradingName,
                        businessEmail: appSettings.businessEmail,
                        businessPhone: appSettings.businessPhone,
                        website: appSettings.website,
                        addressLine1: appSettings.addressLine1,
                        addressLine2: appSettings.addressLine2,
                        townCity: appSettings.townCity,
                        county: appSettings.county,
                        postcode: appSettings.postcode,
                        defaultQuoteTerms: appSettings.defaultQuoteTerms,
                        logoUrl: appSettings.logoUrl || "/logo.png",
                        primaryColor: appSettings.primaryColor,
                        secondaryColor: appSettings.secondaryColor,
                        emailFromName: appSettings.emailFromName,
                        emailFromAddress: appSettings.emailFromAddress,
                        emailReplyTo: appSettings.emailReplyTo,
                        smtpHost: appSettings.smtpHost,
                        smtpPort: appSettings.smtpPort,
                        smtpSecure: appSettings.smtpSecure,
                        smtpUsername: appSettings.smtpUsername,
                        smtpPassword: appSettings.smtpPassword,
                      }}
                      onCreate={() => openNewQuoteForm()}
                      onEdit={openEditQuoteForm}
                      onDelete={deleteQuoteRecord}
                      onConvertToSchedule={beginQuoteScheduling}
                      onConvertToInvoice={convertQuoteToInvoice}
                      onMarkSent={markQuoteSent}
                  />
                )}

              {page === "quoteForm" && (
                  <QuoteForm
                      key={`quote-${selectedQuote?.id ?? pendingLeadQuoteDraft?.leadId ?? "new"}-${selectedCustomer?.id ?? "none"}-${appSettings.defaultQuoteNotes}-${appSettings.quotePrefix}-${appSettings.nextQuoteNumber}-${appSettings.defaultPressureWashRate}-${appSettings.quoteServices.map((service) => `${getQuoteServiceKey(service)}:${service.price}:${service.buyPrice}`).join("|")}`}
                      customerId={selectedQuote?.customerId ?? selectedCustomer?.id ?? null}
                      customerName={
                          selectedQuote?.customerName ??
                          selectedCustomer?.name ??
                          pendingLeadQuoteDraft?.customerName
                      }
                      customers={customers}
                      existingQuote={selectedQuote ?? undefined}
                      customerType={
                          selectedQuote?.customerType ??
                          selectedCustomer?.customerType ??
                          pendingLeadQuoteDraft?.customerType
                      }
                      customerAddress={
                          selectedQuote?.customerAddress ??
                          selectedCustomer?.address ??
                          pendingLeadQuoteDraft?.customerAddress
                      }
                      customerTown={
                          selectedQuote?.customerTown ??
                          selectedCustomer?.town ??
                          pendingLeadQuoteDraft?.customerTown
                      }
                      customerPostcode={
                          selectedQuote?.customerPostcode ??
                          selectedCustomer?.postcode ??
                          pendingLeadQuoteDraft?.customerPostcode
                      }
                      siteName={
                          selectedQuote?.siteName ??
                          selectedCustomer?.siteName ??
                          pendingLeadQuoteDraft?.siteName
                      }
                      siteAddress={
                          selectedQuote?.siteAddress ??
                          selectedCustomer?.siteAddress ??
                          pendingLeadQuoteDraft?.siteAddress
                      }
                      siteTown={
                          selectedQuote?.siteTown ??
                          selectedCustomer?.siteTown ??
                          pendingLeadQuoteDraft?.siteTown
                      }
                      sitePostcode={
                          selectedQuote?.sitePostcode ??
                          selectedCustomer?.sitePostcode ??
                          pendingLeadQuoteDraft?.sitePostcode
                      }
                      initialNotes={
                          selectedQuote?.notes ??
                          pendingLeadQuoteDraft?.initialNotes ??
                          appSettings.defaultQuoteNotes
                      }
                      initialItems={pendingLeadQuoteDraft?.initialItems}
                      savedServices={appSettings.quoteServices}
                      pressureWashRatePerSquareMetre={appSettings.defaultPressureWashRate}
                      onSave={addQuote as any}
                      onBack={() => {
                        setPendingLeadQuoteDraft(null);
                        navigateToPage("quotes");
                      }}
                  />
              )}

                {page === "invoices" && (
                  <InvoicesPage
                      invoices={invoices as any}
                      quotes={quotes as any}
                      customers={customers}
                      documentHistory={invoiceHistory}
                      recurringInvoiceTemplates={recurringInvoiceTemplates}
                      defaultPaymentTermsDays={appSettings.paymentTermsDays}
                      businessDetails={{
                        businessName: appSettings.businessName,
                        tradingName: appSettings.tradingName,
                        businessEmail: appSettings.businessEmail,
                        businessPhone: appSettings.businessPhone,
                        website: appSettings.website,
                        addressLine1: appSettings.addressLine1,
                        addressLine2: appSettings.addressLine2,
                        townCity: appSettings.townCity,
                        county: appSettings.county,
                        postcode: appSettings.postcode,
                        termsAndConditionsUrl: appSettings.termsAndConditionsUrl,
                        defaultInvoiceTerms: appSettings.defaultInvoiceTerms,
                        bankAccountName: appSettings.bankAccountName,
                        bankSortCode: appSettings.bankSortCode,
                        bankAccountNumber: appSettings.bankAccountNumber,
                        bankPaymentReference: appSettings.bankPaymentReference,
                        logoUrl: appSettings.logoUrl || "/logo.png",
                        primaryColor: appSettings.primaryColor,
                        secondaryColor: appSettings.secondaryColor,
                        emailFromName: appSettings.emailFromName,
                        emailFromAddress: appSettings.emailFromAddress,
                        emailReplyTo: appSettings.emailReplyTo,
                        smtpHost: appSettings.smtpHost,
                        smtpPort: appSettings.smtpPort,
                        smtpSecure: appSettings.smtpSecure,
                        smtpUsername: appSettings.smtpUsername,
                        smtpPassword: appSettings.smtpPassword,
                      }}
                      onCreate={() => openNewInvoiceForm()}
                      onEdit={openEditInvoiceForm}
                      onDelete={deleteInvoiceRecord}
                      onMarkSent={markInvoiceSent}
                      onSaveRecurringTemplate={saveRecurringInvoiceTemplate}
                      onDeleteRecurringTemplate={deleteRecurringInvoiceTemplate}
                  />
                )}

              {page === "invoiceForm" && (
                  <InvoiceForm
                      key={`invoice-${selectedInvoice?.id ?? "new"}-${selectedCustomer?.id ?? "none"}-${appSettings.invoicePrefix}-${appSettings.nextInvoiceNumber}-${appSettings.defaultInvoiceNotes}-${appSettings.defaultInvoiceTerms}-${appSettings.paymentTermsDays}-${appSettings.vatRegistered}-${appSettings.vatRate}`}
                      customerId={selectedInvoice?.customerId ?? selectedCustomer?.id ?? null}
                      customerName={
                          selectedInvoice?.customerName ?? selectedCustomer?.name
                      }
                      customers={customers}
                      existingInvoice={selectedInvoice ?? undefined}
                      customerType={
                          selectedInvoice?.customerType ?? selectedCustomer?.customerType
                      }
                      customerAddress={
                          selectedInvoice?.customerAddress ?? selectedCustomer?.address
                      }
                      customerTown={
                          selectedInvoice?.customerTown ?? selectedCustomer?.town
                      }
                      customerPostcode={
                          selectedInvoice?.customerPostcode ?? selectedCustomer?.postcode
                      }
                      siteName={selectedInvoice?.siteName ?? selectedCustomer?.siteName}
                      siteAddress={
                          selectedInvoice?.siteAddress ?? selectedCustomer?.siteAddress
                      }
                      siteTown={selectedInvoice?.siteTown ?? selectedCustomer?.siteTown}
                      sitePostcode={
                          selectedInvoice?.sitePostcode ?? selectedCustomer?.sitePostcode
                      }
                      invoiceNumberPreview={getNextInvoiceNumber(invoices)}
                      initialNotes={
                          selectedInvoice?.notes ?? appSettings.defaultInvoiceNotes
                      }
                      initialTerms={
                          selectedInvoice?.terms ?? appSettings.defaultInvoiceTerms
                      }
                      defaultPaymentTermsDays={appSettings.paymentTermsDays}
                      defaultVatRegistered={appSettings.vatRegistered}
                      defaultVatRate={appSettings.vatRate}
                      onSave={addInvoice as any}
                      onBack={() => navigateToPage("invoices")}
                  />
              )}

              {page === "commercialDocs" && (
                  <CommercialDocsPage
                      customers={customers}
                      documents={commercialRamsDocuments}
                      documentsReady={workflowTablesReady.commercialRams}
                      loggedInStaffName={loggedInStaffName}
                      businessDetails={{
                        businessName: appSettings.businessName,
                        tradingName: appSettings.tradingName,
                        businessEmail: appSettings.businessEmail,
                        businessPhone: appSettings.businessPhone,
                        website: appSettings.website,
                        logoUrl: appSettings.logoUrl || "/logo.png",
                        primaryColor: appSettings.primaryColor,
                        secondaryColor: appSettings.secondaryColor,
                      }}
                      onCreate={createCommercialRamsRecord}
                      onUpdate={saveCommercialRamsRecord}
                      onDelete={deleteCommercialRamsRecord}
                  />
              )}

              {page === "settings" && (
                  <SettingsPage
                      initialSettings={appSettings}
                      onSave={handleSaveSettings}
                  />
              )}

              {page === "staff" && (
                  <StaffPage
                      customers={customers}
                      staffMembers={staffMembers}
                      rolePermissions={rolePermissions}
                      pageOptions={STAFF_PAGE_OPTIONS}
                      currentUserId={currentUserId}
                      currentUserEmail={currentUserEmail}
                      currentUserIsAdmin={currentUserIsAdmin}
                      staffSystemReady={staffSystemReady}
                      setupMessage={getStaffSystemNotice(staffTablesReady)}
                      onAddStaff={addStaffMember}
                      onUpdateStaff={saveStaffMember}
                      onDeleteStaff={deleteStaffMember}
                      onUpdateRolePermission={saveRolePermission}
                  />
              )}

              {workflowMessageDialogConfig ? (
                  <WorkflowMessageDialog
                      isOpen
                      title={workflowMessageDialogConfig.title}
                      description={workflowMessageDialogConfig.description}
                      defaultMethod={workflowMessageDialogConfig.defaultMethod}
                      emailRecipients={workflowMessageDialogConfig.emailRecipients}
                      textRecipients={workflowMessageDialogConfig.textRecipients}
                      initialEmailSubject={workflowMessageDialogConfig.initialEmailSubject}
                      initialEmailMessage={workflowMessageDialogConfig.initialEmailMessage}
                      initialTextMessage={workflowMessageDialogConfig.initialTextMessage}
                      onClose={() => setWorkflowMessageTarget(null)}
                      onSend={sendWorkflowAttentionMessage}
                  />
              ) : null}
                  </>
              )}
            </div>
          </main>
        </div>
      </div>
  );
}
