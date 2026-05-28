"use client";
// Created by William Williamson.
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
  ReceiptText,
  ArrowLeft,
  CheckCircle2,
  Mail,
  MapPin,
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
  Bell,
  HelpCircle,
  CloudSun,
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
import ExpensesPage, {
  type ExpenseProduct,
  type ExpenseProductDraft,
  type ExpenseRecord,
  type ExpenseRecordDraft,
  type ExpenseSupplier,
  type ExpenseSupplierDraft,
} from "@/components/jobs/expenses-page";
import WorkflowMessageDialog from "@/components/jobs/workflow-message-dialog";
import PaymentsPage from "@/components/jobs/payments-page";
import SettingsPage, {
  type RoundHqFullDataExport,
} from "@/components/jobs/settings-page";
import HelpProvider from "@/components/help/HelpProvider";
import type { HelpTourActions, HelpTourPage } from "@/components/help/helpTours";
import {
  getEditResourceKey,
  normalizeEditInactiveAction,
  normalizeEditInactiveMinutes,
  type EditFormCollaboration,
  type EditInactiveAction,
  type EditResource,
  type EditableResourceType,
  type EditSessionRecord,
} from "@/components/jobs/edit-collaboration";
import CommercialDocsPage from "@/components/jobs/commercial-docs-page";
import type { RouteChangeRecord } from "@/components/jobs/route-efficiency";
import {
  DEFAULT_GRASS_CUT_SEASON_END,
  DEFAULT_GRASS_CUT_SEASON_START,
  getCustomerEmailAddresses,
  getCustomerDisplayAddress,
  getCustomerTotals,
  getInputDateValue,
  getWorkdayFromDate,
  getTodayDateInputValue,
  toStoredDateTime,
} from "@/components/jobs/helpers";
import {
  DEFAULT_ROTATION_WEEKS,
  getActiveRotationWeeks,
  getCutFrequencyFromRotationWeeks,
  getCycleWeek,
  getEffectiveRotationWeeks,
  getRotationCycleLabel,
  getWeekOptions,
  isCustomerDueInSelectedWeek,
  normalizeRotationWeeks,
  normalizeWeekNumber,
} from "@/components/jobs/rotation";
import {
  sendCustomerEmailMessage,
} from "@/components/jobs/document-delivery";
import {
  DEFAULT_AUTO_SCHEDULING_SETTINGS,
  buildSchedulingEmailDrafts,
  chooseSchedulingSlot,
  normalizeAutoSchedulingSettings,
  normalizeQuoteAutoSchedulingPreference,
  normalizeQuoteWorkType,
  normalizeServiceRoundSchedulingPreference,
  type AutoSchedulingSettings,
  type QuoteAutoSchedulingPreference,
  type QuoteWorkType,
  type RejectedSchedulingCandidate,
  type SchedulingDecision,
  type SchedulingSlot,
  type ServiceRoundSchedulingPreference,
} from "@/lib/scheduling/quote-scheduler";
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
  getDefaultCustomerFeatureAccess,
  normalizeCustomerFeatureAccess,
  type CustomerFeatureAccess,
  type CustomerFeatureKey,
} from "@/lib/customer-features";
import {
  getPlanFeatureAccess,
  getSubscriptionStaffLimit,
  getSubscriptionPlan,
  hasGrowthFeatures,
  hasStaffManagementAccess,
  normalizeStaffAddonQuantity,
  type SubscriptionPlanKey,
} from "@/lib/billing/plans";
import {
  DEFAULT_CURRENCY_CODE,
  formatCurrencyAmount,
  normalizeCurrencyCode,
  type CurrencyCode,
} from "@/components/jobs/currency";
import {
  PLATFORM_ANNOUNCEMENT_SELECT,
  mapPlatformAnnouncementRow,
  type PlatformAnnouncement,
  type PlatformAnnouncementRow,
} from "@/lib/platform-announcements";

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
  type StripeInvoicePaymentStatus,
  type VisitLog,
  type NotCutReason,
  type QuoteStatus,
  type RolePermission,
  type RotationWeeks,
  type StaffMember,
  type StaffPageAccessKey,
  type StaffRole,
  type WeekNumber,
} from "@/components/jobs/types";

type SupabaseRealtimeChannel = ReturnType<
  ReturnType<typeof createSupabaseClient>["channel"]
>;

type QuoteService = {
  id: string;
  title: string;
  category: string;
  itemType: "service" | "product";
  price: number;
  buyPrice: number;
};

type WorkflowMessageMethod = DocumentDeliveryMethod;
type PdfHeaderStyle = "banner" | "letterhead";
type PdfLogoBackground = "none" | "dark" | "light";

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
    | "expenses"
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

const WORKSPACE_ROUTE_PAGE_KEYS = [
  "dashboard",
  "schedule",
  "jobs",
  "scheduledJobProfile",
  "rounds",
  "commercial",
  "routeEfficiency",
  "history",
  "leads",
  "customers",
  "customerProfit",
  "payments",
  "expenses",
  "customerProfile",
  "actions",
  "map",
  "staff",
  "quotes",
  "quoteForm",
  "invoices",
  "invoiceForm",
  "commercialDocs",
  "settings",
] as const satisfies readonly PageKey[];

type WorkspaceRouteState = {
  page: PageKey;
  selectedCustomerId: number | null;
  selectedScheduledJobId: string | null;
  jobProfileBackPage: "schedule" | "jobs";
  selectedQuoteId: string | null;
  selectedInvoiceId: string | null;
};

type DayName =
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
type WeekName = WeekNumber;
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
  stripeCheckoutSessionId?: string;
  stripePaymentLinkUrl?: string;
  stripePaymentStatus?: StripeInvoicePaymentStatus;
  stripePaymentIntentId?: string;
  stripePaymentCompletedAt?: string;
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
  sourceQuoteId?: string;
  workType?: QuoteWorkType;
  estimatedDurationMinutes?: number;
  postcode?: string;
  autoScheduled?: boolean;
  autoScheduleReason?: string;
  autoScheduleReasonLabel?: string;
  assignedStaffId?: number | null;
  assignedStaffName?: string;
  createdAt: string;
};

type SchedulingRecommendationRecord = {
  id: string;
  quoteId: string;
  quoteNumber: string;
  customerId: number | null;
  customerName: string;
  slot: SchedulingSlot;
  reason: SchedulingDecision["reason"];
  reasonLabel: string;
  workType?: QuoteWorkType;
  estimatedDurationMinutes: number;
  postcode?: string;
  rejectedCandidates: RejectedSchedulingCandidate[];
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  decidedAt?: string;
};

type SchedulingAuditLog = {
  id: string;
  quoteId: string;
  quoteNumber: string;
  customerId: number | null;
  customerName: string;
  chosenDate?: string;
  startTime?: string;
  finishTime?: string;
  estimatedDurationMinutes: number | null;
  workType?: QuoteWorkType;
  postcode?: string;
  reason: SchedulingDecision["reason"];
  reasonLabel: string;
  rejectedCandidates: RejectedSchedulingCandidate[];
  status: SchedulingDecision["status"];
  customerEmailSent: boolean;
  operatorEmailSent: boolean;
  customerEmailError?: string;
  operatorEmailError?: string;
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
  assignedStaffId?: number | null;
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
  schedulingRecommendations: SchedulingRecommendationRecord[];
  schedulingAuditLogs: SchedulingAuditLog[];
  quotes: Quote[];
  invoices: Invoice[];
  expenseSuppliers: ExpenseSupplier[];
  expenseProducts: ExpenseProduct[];
  expenses: ExpenseRecord[];
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
  work_type?: string | null;
  estimated_duration_minutes?: number | null;
  auto_scheduling_preference?: string | null;
  auto_scheduling_disabled?: boolean | null;
  service_round_scheduling_preference?: string | null;
  auto_scheduled_job_id?: string | null;
  scheduling_status?: string | null;
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
  work_type?: QuoteWorkType | null;
  estimated_duration_minutes?: number | null;
  auto_scheduling_preference?: QuoteAutoSchedulingPreference | null;
  auto_scheduling_disabled?: boolean;
  service_round_scheduling_preference?: ServiceRoundSchedulingPreference | null;
  auto_scheduled_job_id?: string | null;
  scheduling_status?: Quote["schedulingStatus"] | null;
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
  stripe_checkout_session_id: string | null;
  stripe_payment_link_url: string | null;
  stripe_payment_status: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_completed_at: string | null;
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
  stripe_checkout_session_id?: string | null;
  stripe_payment_link_url?: string | null;
  stripe_payment_status?: StripeInvoicePaymentStatus | null;
  stripe_payment_intent_id?: string | null;
  stripe_payment_completed_at?: string | null;
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
  source_quote_id?: string | null;
  work_type?: string | null;
  estimated_duration_minutes?: number | null;
  postcode?: string | null;
  auto_scheduled?: boolean | null;
  auto_schedule_reason?: string | null;
  auto_schedule_reason_label?: string | null;
  assigned_staff_id?: number | null;
  assigned_staff_name?: string | null;
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
  source_quote_id?: string | null;
  work_type?: QuoteWorkType | null;
  estimated_duration_minutes?: number | null;
  postcode?: string | null;
  auto_scheduled?: boolean;
  auto_schedule_reason?: string | null;
  auto_schedule_reason_label?: string | null;
  assigned_staff_id?: number | null;
  assigned_staff_name?: string | null;
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
    "id,quote_number,customer_id,customer_name,customer_type,customer_address,customer_town,customer_postcode,site_name,site_address,site_town,site_postcode,date,status,items,notes,total,work_type,estimated_duration_minutes,auto_scheduling_preference,auto_scheduling_disabled,service_round_scheduling_preference,auto_scheduled_job_id,scheduling_status,created_at";
const INVOICE_SELECT_FIELDS =
    "id,invoice_number,customer_id,customer_name,customer_type,customer_address,customer_town,customer_postcode,site_name,site_address,site_town,site_postcode,date,due_date,status,items,notes,terms,vat_rate,vat_amount,total,linked_quote_id,stripe_checkout_session_id,stripe_payment_link_url,stripe_payment_status,stripe_payment_intent_id,stripe_payment_completed_at,created_at";
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

const SETTINGS_STORAGE_KEY = "roundhq_settings";
const HELP_ENABLED_STORAGE_KEY = "roundhq_help_enabled";
const ONBOARDING_COMPLETED_STORAGE_KEY = "roundhq_onboarding_completed";

const DEFAULT_APP_SETTINGS: AppSettings = {
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

function readStoredBooleanPreference(key: string, fallback: boolean) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);

  if (raw === "true") {
    return true;
  }

  if (raw === "false") {
    return false;
  }

  return fallback;
}

function writeStoredBooleanPreference(key: string, value: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value ? "true" : "false");
}

const STAFF_ROLES: StaffRole[] = ["Admin", "Staff", "Operator"];
const EDITABLE_STAFF_ROLES: Array<Exclude<StaffRole, "Admin">> = ["Staff", "Operator"];
const STAFF_PAGE_OPTIONS: {
  key: StaffPageAccessKey;
  label: string;
  section: string;
}[] = [
  { key: "dashboard", label: "Overview", section: "Overview" },
  { key: "schedule", label: "Schedule", section: "Work" },
  { key: "rounds", label: "Rounds", section: "Work" },
  { key: "history", label: "History", section: "Work" },
  { key: "map", label: "Map", section: "Work" },
  { key: "actions", label: "Actions", section: "Work" },
  { key: "commercialDocs", label: "RAMS & Documents", section: "Documents" },
  { key: "customers", label: "All Customers", section: "Customers" },
  { key: "expenses", label: "Expenses", section: "Money" },
  { key: "quotes", label: "Quotes", section: "Documents" },
  { key: "invoices", label: "Invoices", section: "Documents" },
  { key: "staff", label: "Staff", section: "Team" },
  { key: "settings", label: "Settings", section: "Settings" },
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
  expenses: "expenses",
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

const CUSTOMER_FEATURE_PAGE_OVERRIDES: Record<PageKey, CustomerFeatureKey> = {
  dashboard: "dashboard",
  schedule: "schedule",
  jobs: "schedule",
  scheduledJobProfile: "schedule",
  rounds: "rounds",
  commercial: "rounds",
  routeEfficiency: "routeEfficiency",
  history: "history",
  leads: "leads",
  customers: "customers",
  customerProfit: "customerProfit",
  payments: "payments",
  expenses: "expenses",
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
    "expenses",
    "quotes",
    "invoices",
  ],
  Operator: ["dashboard", "rounds", "history", "map", "actions"],
};

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
): AppSettings["stripeConnectStatus"] {
  return value === "onboarding" || value === "enabled" || value === "restricted"
      ? value
      : "not_connected";
}

function normalizeStripeInvoicePaymentStatus(
    value: unknown
): StripeInvoicePaymentStatus | undefined {
  return value === "not_created" ||
      value === "open" ||
      value === "paid" ||
      value === "expired"
      ? value
      : undefined;
}

function mergeAppSettings(value?: Partial<AppSettings> | null): AppSettings {
  const quoteFollowUpMethod = "email";
  const invoiceReminderMethod = "email";

  return {
    ...DEFAULT_APP_SETTINGS,
    ...(value || {}),
    defaultRotationWeeks: normalizeRotationWeeks(value?.defaultRotationWeeks),
    currencyCode: normalizeCurrencyCode(value?.currencyCode),
    pdfHeaderStyle: normalizePdfHeaderStyle(value?.pdfHeaderStyle),
    pdfLogoBackground: normalizePdfLogoBackground(value?.pdfLogoBackground),
    pdfLogoScale: normalizePdfLogoScale(value?.pdfLogoScale),
    pdfShowLogo: value?.pdfShowLogo !== false,
    pdfShowFooter: value?.pdfShowFooter !== false,
    pdfShowBusinessDetails: value?.pdfShowBusinessDetails !== false,
    pdfFooterText:
        typeof value?.pdfFooterText === "string" ? value.pdfFooterText : "",
    editInactivityMinutes: normalizeEditInactiveMinutes(
        value?.editInactivityMinutes
    ),
    editInactiveAction: normalizeEditInactiveAction(value?.editInactiveAction),
    helpEnabled: value?.helpEnabled !== false,
    autoScheduling: normalizeAutoSchedulingSettings(value?.autoScheduling),
    stripeConnectedAccountId:
        typeof value?.stripeConnectedAccountId === "string"
            ? value.stripeConnectedAccountId
            : "",
    stripeConnectStatus: normalizeStripeConnectStatus(value?.stripeConnectStatus),
    stripeConnectChargesEnabled: value?.stripeConnectChargesEnabled === true,
    stripeConnectPayoutsEnabled: value?.stripeConnectPayoutsEnabled === true,
    stripeConnectDetailsSubmitted: value?.stripeConnectDetailsSubmitted === true,
    stripePaymentLinksEnabled: value?.stripePaymentLinksEnabled === true,
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
    const storedSettings = raw
        ? mergeAppSettings(JSON.parse(raw))
        : DEFAULT_APP_SETTINGS;

    return {
      ...storedSettings,
      helpEnabled: readStoredBooleanPreference(
          HELP_ENABLED_STORAGE_KEY,
          storedSettings.helpEnabled
      ),
    };
  } catch (error) {
    console.error("Failed to load app settings:", error);
    return {
      ...DEFAULT_APP_SETTINGS,
      helpEnabled: readStoredBooleanPreference(
          HELP_ENABLED_STORAGE_KEY,
          DEFAULT_APP_SETTINGS.helpEnabled
      ),
    };
  }
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

function createLocalEntityId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
}

function getStoredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getStoredNumber(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value ?? 0);

  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
}

function getStoredTimestamp(value: unknown) {
  const timestamp = typeof value === "string" ? value.trim() : "";
  const parsedDate = timestamp ? new Date(timestamp) : null;

  return parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : new Date().toISOString();
}

function normalizeExpenseSupplier(
    value: unknown,
    index: number
): ExpenseSupplier | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = getStoredString(value.name);

  if (!name) {
    return null;
  }

  return {
    id: getStoredString(value.id) || `supplier-${index + 1}`,
    name,
    contactName: getStoredString(value.contactName),
    email: getStoredString(value.email),
    phone: getStoredString(value.phone),
    website: getStoredString(value.website),
    notes: getStoredString(value.notes),
    createdAt: getStoredTimestamp(value.createdAt),
    updatedAt: getStoredString(value.updatedAt) || undefined,
  };
}

function normalizeExpenseProduct(
    value: unknown,
    index: number
): ExpenseProduct | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = getStoredString(value.name);

  if (!name) {
    return null;
  }

  const unitCost = getStoredNumber(value.unitCost);
  const quotePrice =
      getStoredNumber(value.quotePrice) ||
      getStoredNumber(value.salePrice) ||
      unitCost;

  return {
    id: getStoredString(value.id) || `product-${index + 1}`,
    name,
    supplierId: getStoredString(value.supplierId) || null,
    sku: getStoredString(value.sku),
    category: getStoredString(value.category) || "Materials",
    unitCost,
    quotePrice,
    isQuoteItem: Boolean(value.isQuoteItem),
    notes: getStoredString(value.notes),
    createdAt: getStoredTimestamp(value.createdAt),
    updatedAt: getStoredString(value.updatedAt) || undefined,
  };
}

function normalizeExpenseRecord(
    value: unknown,
    index: number
): ExpenseRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const description = getStoredString(value.description);

  if (!description) {
    return null;
  }

  return {
    id: getStoredString(value.id) || `expense-${index + 1}`,
    date: getInputDateValue(getStoredString(value.date)) || getTodayDateInputValue(),
    supplierId: getStoredString(value.supplierId) || null,
    productId: getStoredString(value.productId) || null,
    category: getStoredString(value.category) || "Other",
    description,
    amount: getStoredNumber(value.amount),
    paymentMethod: getStoredString(value.paymentMethod),
    receiptReference: getStoredString(value.receiptReference),
    notes: getStoredString(value.notes),
    createdAt: getStoredTimestamp(value.createdAt),
    updatedAt: getStoredString(value.updatedAt) || undefined,
  };
}

function mapExpenseProductToQuoteService(product: ExpenseProduct): QuoteService {
  const category = product.category.trim() || "Products";

  return {
    id: buildQuoteServiceId({
      title: product.name,
      category,
      itemType: "product",
    }),
    title: product.name.trim(),
    category,
    itemType: "product",
    price: roundCurrency(product.quotePrice || product.unitCost),
    buyPrice: roundCurrency(product.unitCost),
  };
}

function mergeQuoteService(
    services: QuoteService[],
    nextService: QuoteService
): QuoteService[] {
  const nextKey = getQuoteServiceKey(nextService);
  const existingIndex = services.findIndex(
      (service) => getQuoteServiceKey(service) === nextKey
  );

  if (existingIndex === -1) {
    return [...services, nextService];
  }

  return services.map((service, index) =>
      index === existingIndex ? { ...service, ...nextService } : service
  );
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

function formatTemplateCurrency(
  value: number,
  currencyCode: CurrencyCode | string = DEFAULT_CURRENCY_CODE
) {
  return formatCurrencyAmount(roundCurrency(value), currencyCode);
}

function getBusinessDisplayName(settings: Pick<AppSettings, "tradingName" | "businessName">) {
  return settings.tradingName.trim() || settings.businessName.trim() || "Your Business";
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

const DAY_OPTIONS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
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
const EDIT_SESSIONS_STORAGE_KEY = "roundhq_edit_sessions_v1";
const EDIT_SESSION_CHANNEL_NAME = "roundhq-edit-sessions";
const EDIT_SESSION_REALTIME_EVENT = "sync";
const EDIT_SESSION_HEARTBEAT_MS = 15 * 1000;
const EDIT_SESSION_STALE_MS = 90 * 60 * 1000;
const EDIT_SESSION_FINISHED_RETENTION_MS = 5 * 60 * 1000;

function createEditSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `edit-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
}

function readStoredEditSessions(): EditSessionRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(
        window.localStorage.getItem(EDIT_SESSIONS_STORAGE_KEY) || "[]"
    );

    return normalizeEditSessionRecords(parsed);
  } catch {
    return [];
  }
}

function normalizeEditSessionRecords(value: unknown): EditSessionRecord[] {
  return Array.isArray(value)
      ? value.filter((entry): entry is EditSessionRecord => isRecord(entry))
      : [];
}

function getEditSessionUpdatedAt(session: EditSessionRecord) {
  const timestamp = new Date(
      session.updatedAt || session.lastActiveAt || session.startedAt
  ).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function mergeEditSessionRecords(
    ...sessionGroups: EditSessionRecord[][]
): EditSessionRecord[] {
  const mergedSessions = new Map<string, EditSessionRecord>();

  sessionGroups.flat().forEach((session) => {
    const existingSession = mergedSessions.get(session.sessionId);

    if (
        !existingSession ||
        getEditSessionUpdatedAt(session) >= getEditSessionUpdatedAt(existingSession)
    ) {
      mergedSessions.set(session.sessionId, session);
    }
  });

  return Array.from(mergedSessions.values());
}

function pruneEditSessions(sessions: EditSessionRecord[]) {
  const now = Date.now();

  return sessions.filter((session) => {
    const updatedAt = new Date(session.updatedAt || session.lastActiveAt).getTime();

    if (!Number.isFinite(updatedAt)) {
      return false;
    }

    if (session.status === "active") {
      return now - updatedAt <= EDIT_SESSION_STALE_MS;
    }

    return now - updatedAt <= EDIT_SESSION_FINISHED_RETENTION_MS;
  });
}

function getEditResourceLabel(resourceType: EditableResourceType, draft: unknown) {
  if (!isRecord(draft)) {
    return resourceType === "customer"
        ? "New customer"
        : resourceType === "quote"
          ? "New quote"
          : "New invoice";
  }

  if (resourceType === "customer") {
    return typeof draft.name === "string" && draft.name.trim()
        ? draft.name.trim()
        : "New customer";
  }

  if (resourceType === "quote") {
    const quoteNumber = typeof draft.quoteNumber === "string" ? draft.quoteNumber.trim() : "";
    const customerName =
        typeof draft.customerName === "string" ? draft.customerName.trim() : "";

    return [quoteNumber || "New quote", customerName].filter(Boolean).join(" - ");
  }

  const invoiceNumber =
      typeof draft.invoiceNumber === "string" ? draft.invoiceNumber.trim() : "";
  const customerName =
      typeof draft.customerName === "string" ? draft.customerName.trim() : "";

  return [invoiceNumber || "New invoice", customerName].filter(Boolean).join(" - ");
}

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
  schedulingRecommendations: [],
  schedulingAuditLogs: [],
  quotes: [],
  invoices: [],
  expenseSuppliers: [],
  expenseProducts: [],
  expenses: [],
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
  return normalizeWeekNumber(value as WeekName | string | number | null | undefined, 4);
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
      /^(Week [1-4])-(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)-(Residential|Commercial)$/
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
      /^(Week [1-4])-(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)-(Residential|Commercial)$/
  );

  if (!legacyMatch) {
    return baseKey;
  }

  return getBaseRoundKey(legacyMatch[1] as WeekName, legacyMatch[2] as DayName);
}

function getTodayPanelState(date: Date, rotationWeeks: RotationWeeks): TodayPanelState {
  const { dayLabel, selectedDay } = getWorkdayFromDate(date);
  const week = getCycleWeek(date, rotationWeeks);

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
  const schedulingRecommendations = Array.isArray(state.schedulingRecommendations)
      ? state.schedulingRecommendations
            .map(normalizeSchedulingRecommendationRecord)
            .filter(
                (entry): entry is SchedulingRecommendationRecord => Boolean(entry)
            )
      : [];
  const schedulingAuditLogs = Array.isArray(state.schedulingAuditLogs)
      ? state.schedulingAuditLogs
            .map(normalizeSchedulingAuditLog)
            .filter((entry): entry is SchedulingAuditLog => Boolean(entry))
      : [];

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
    schedulingRecommendations,
    schedulingAuditLogs,
    quotes: Array.isArray(state.quotes) ? (state.quotes as Quote[]) : [],
    invoices: Array.isArray(state.invoices)
        ? sortInvoices(state.invoices as Invoice[])
        : [],
    expenseSuppliers: Array.isArray(state.expenseSuppliers)
        ? state.expenseSuppliers
              .map(normalizeExpenseSupplier)
              .filter((supplier): supplier is ExpenseSupplier => Boolean(supplier))
        : [],
    expenseProducts: Array.isArray(state.expenseProducts)
        ? state.expenseProducts
              .map(normalizeExpenseProduct)
              .filter((product): product is ExpenseProduct => Boolean(product))
        : [],
    expenses: Array.isArray(state.expenses)
        ? state.expenses
              .map(normalizeExpenseRecord)
              .filter((expense): expense is ExpenseRecord => Boolean(expense))
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
      if (
          message.includes("default_rotation_weeks") ||
          message.includes("organizations_default_rotation_weeks_check")
      ) {
        return "Supabase is connected, but the organizations table needs the default round rotation column. Run the latest tenant SQL setup script and refresh.";
      }

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
              message.includes("rotation_weeks_override") ||
              message.includes("customers_rotation_weeks_override_check") ||
              message.includes("customers_week_check") ||
              message.includes("customers_cut_frequency_check") ||
              message.includes("site_name") ||
              message.includes("site_address") ||
              message.includes("site_town") ||
              message.includes("site_postcode") ||
              message.includes("customers_day_check")
          )
      ) {
        return "Supabase is connected, but the customers table needs the latest customer fields. Run supabase/customer_fields.sql in Supabase, then refresh.";
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
          message.includes("stripe_checkout_session_id") ||
          message.includes("stripe_payment_link_url") ||
          message.includes("stripe_payment_status") ||
          message.includes("stripe_payment_intent_id") ||
          message.includes("stripe_payment_completed_at") ||
          message.includes("invoice_number") ||
          (message.includes("column") && message.includes("invoices"))
      ) {
        return "Supabase is connected, but the invoices table needs the latest columns. Run supabase/stripe_invoice_payments.sql and the workflow SQL setup script, then refresh.";
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
  return value === "email" ? value : undefined;
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

function normalizeQuoteSchedulingStatus(
    value: unknown
): Quote["schedulingStatus"] | undefined {
  return value === "not_required" ||
      value === "suggested" ||
      value === "scheduled" ||
      value === "manual_required" ||
      value === "skipped"
      ? value
      : undefined;
}

function normalizeEstimatedDurationMinutes(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return undefined;
  }

  return Math.min(24 * 60, Math.max(1, Math.round(numericValue)));
}

function normalizeRejectedSchedulingCandidates(
    value: unknown
): RejectedSchedulingCandidate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
      .map((entry): RejectedSchedulingCandidate | null => {
        if (!isRecord(entry) || typeof entry.date !== "string") {
          return null;
        }

        return {
          date: entry.date,
          startTime:
              typeof entry.startTime === "string" ? entry.startTime : undefined,
          reason: typeof entry.reason === "string" ? entry.reason : "rejected",
        };
      })
      .filter((entry): entry is RejectedSchedulingCandidate => Boolean(entry))
      .slice(0, 80);
}

function normalizeSchedulingSlot(value: unknown): SchedulingSlot | null {
  if (
      !isRecord(value) ||
      typeof value.date !== "string" ||
      typeof value.startTime !== "string" ||
      typeof value.finishTime !== "string"
  ) {
    return null;
  }

  return {
    date: value.date,
    startTime: value.startTime,
    finishTime: value.finishTime,
  };
}

function normalizeSchedulingRecommendationRecord(
    value: unknown
): SchedulingRecommendationRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = normalizeUnknownText(value.id);
  const quoteId = normalizeUnknownText(value.quoteId);
  const quoteNumber = normalizeUnknownText(value.quoteNumber);
  const customerName = normalizeUnknownText(value.customerName);
  const slot = normalizeSchedulingSlot(value.slot);
  const estimatedDurationMinutes = normalizeEstimatedDurationMinutes(
      value.estimatedDurationMinutes
  );

  if (!id || !quoteId || !quoteNumber || !customerName || !slot || !estimatedDurationMinutes) {
    return null;
  }

  const status =
      value.status === "accepted" || value.status === "rejected"
          ? value.status
          : "pending";

  return {
    id,
    quoteId,
    quoteNumber,
    customerId: normalizeUnknownNumber(value.customerId),
    customerName,
    slot,
    reason:
        typeof value.reason === "string"
            ? (value.reason as SchedulingDecision["reason"])
            : "next_available",
    reasonLabel:
        normalizeUnknownText(value.reasonLabel) ?? "next available slot",
    workType:
        typeof value.workType === "string"
            ? normalizeQuoteWorkType(value.workType)
            : undefined,
    estimatedDurationMinutes,
    postcode: normalizeUnknownText(value.postcode),
    rejectedCandidates: normalizeRejectedSchedulingCandidates(
        value.rejectedCandidates
    ),
    status,
    createdAt: normalizeUnknownText(value.createdAt) ?? new Date().toISOString(),
    decidedAt: normalizeUnknownText(value.decidedAt),
  };
}

function normalizeSchedulingAuditLog(value: unknown): SchedulingAuditLog | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = normalizeUnknownText(value.id);
  const quoteId = normalizeUnknownText(value.quoteId);
  const quoteNumber = normalizeUnknownText(value.quoteNumber);
  const customerName = normalizeUnknownText(value.customerName);

  if (!id || !quoteId || !quoteNumber || !customerName) {
    return null;
  }

  const status =
      value.status === "scheduled" ||
      value.status === "suggested" ||
      value.status === "manual_required" ||
      value.status === "skipped"
          ? value.status
          : "manual_required";

  return {
    id,
    quoteId,
    quoteNumber,
    customerId: normalizeUnknownNumber(value.customerId),
    customerName,
    chosenDate: normalizeUnknownText(value.chosenDate),
    startTime: normalizeUnknownText(value.startTime),
    finishTime: normalizeUnknownText(value.finishTime),
    estimatedDurationMinutes: normalizeEstimatedDurationMinutes(
        value.estimatedDurationMinutes
    ) ?? null,
    workType:
        typeof value.workType === "string"
            ? normalizeQuoteWorkType(value.workType)
            : undefined,
    postcode: normalizeUnknownText(value.postcode),
    reason:
        typeof value.reason === "string"
            ? (value.reason as SchedulingDecision["reason"])
            : "no_available_slot",
    reasonLabel:
        normalizeUnknownText(value.reasonLabel) ?? "needs manual scheduling",
    rejectedCandidates: normalizeRejectedSchedulingCandidates(
        value.rejectedCandidates
    ),
    status,
    customerEmailSent: value.customerEmailSent === true,
    operatorEmailSent: value.operatorEmailSent === true,
    customerEmailError: normalizeUnknownText(value.customerEmailError),
    operatorEmailError: normalizeUnknownText(value.operatorEmailError),
    createdAt: normalizeUnknownText(value.createdAt) ?? new Date().toISOString(),
  };
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

function getScheduledJobTypeLabel(type: ScheduledJobType | string | null | undefined) {
  return type === "Grass Cut" ? "Service Visit" : type ?? "One Off";
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
    sourceQuoteId: normalizeUnknownText(value.sourceQuoteId),
    workType:
        typeof value.workType === "string"
            ? normalizeQuoteWorkType(value.workType)
            : undefined,
    estimatedDurationMinutes: normalizeEstimatedDurationMinutes(
        value.estimatedDurationMinutes
    ),
    postcode: normalizeUnknownText(value.postcode),
    autoScheduled: value.autoScheduled === true,
    autoScheduleReason: normalizeUnknownText(value.autoScheduleReason),
    autoScheduleReasonLabel: normalizeUnknownText(value.autoScheduleReasonLabel),
    assignedStaffId: normalizeUnknownNumber(value.assignedStaffId),
    assignedStaffName: normalizeUnknownText(value.assignedStaffName),
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
    workType:
        typeof row.work_type === "string"
            ? normalizeQuoteWorkType(row.work_type)
            : undefined,
    estimatedDurationMinutes: normalizeEstimatedDurationMinutes(
        row.estimated_duration_minutes
    ),
    autoSchedulingPreference: normalizeQuoteAutoSchedulingPreference(
        row.auto_scheduling_preference
    ),
    autoSchedulingDisabled: row.auto_scheduling_disabled === true,
    serviceRoundSchedulingPreference: normalizeServiceRoundSchedulingPreference(
        row.service_round_scheduling_preference
    ),
    autoScheduledJobId: normalizeOptionalText(row.auto_scheduled_job_id ?? null),
    schedulingStatus: normalizeQuoteSchedulingStatus(row.scheduling_status),
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
    work_type: quote.workType ?? null,
    estimated_duration_minutes: quote.estimatedDurationMinutes ?? null,
    auto_scheduling_preference: quote.autoSchedulingPreference ?? "default",
    auto_scheduling_disabled: quote.autoSchedulingDisabled === true,
    service_round_scheduling_preference:
        quote.serviceRoundSchedulingPreference ?? "default",
    auto_scheduled_job_id: quote.autoScheduledJobId ?? null,
    scheduling_status: quote.schedulingStatus ?? null,
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
    stripeCheckoutSessionId: row.stripe_checkout_session_id ?? undefined,
    stripePaymentLinkUrl: row.stripe_payment_link_url ?? undefined,
    stripePaymentStatus: normalizeStripeInvoicePaymentStatus(
        row.stripe_payment_status
    ),
    stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
    stripePaymentCompletedAt: row.stripe_payment_completed_at ?? undefined,
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
    stripe_checkout_session_id: invoice.stripeCheckoutSessionId ?? null,
    stripe_payment_link_url: invoice.stripePaymentLinkUrl ?? null,
    stripe_payment_status: invoice.stripePaymentStatus ?? null,
    stripe_payment_intent_id: invoice.stripePaymentIntentId ?? null,
    stripe_payment_completed_at: invoice.stripePaymentCompletedAt ?? null,
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
    sourceQuoteId: normalizeOptionalText(row.source_quote_id ?? null),
    workType:
        typeof row.work_type === "string"
            ? normalizeQuoteWorkType(row.work_type)
            : undefined,
    estimatedDurationMinutes: normalizeEstimatedDurationMinutes(
        row.estimated_duration_minutes
    ),
    postcode: normalizeOptionalText(row.postcode ?? null),
    autoScheduled: row.auto_scheduled === true,
    autoScheduleReason: normalizeOptionalText(row.auto_schedule_reason ?? null),
    autoScheduleReasonLabel: normalizeOptionalText(
        row.auto_schedule_reason_label ?? null
    ),
    assignedStaffId: row.assigned_staff_id ?? null,
    assignedStaffName: normalizeOptionalText(row.assigned_staff_name ?? null),
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
    source_quote_id: job.sourceQuoteId ?? null,
    work_type: job.workType ?? null,
    estimated_duration_minutes: job.estimatedDurationMinutes ?? null,
    postcode: job.postcode ?? null,
    auto_scheduled: job.autoScheduled === true,
    auto_schedule_reason: job.autoScheduleReason ?? null,
    auto_schedule_reason_label: job.autoScheduleReasonLabel ?? null,
    assigned_staff_id: job.assignedStaffId ?? null,
    assigned_staff_name: job.assignedStaffName?.trim() || null,
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
    title: "Overview",
    items: [
      { key: "dashboard", label: "Overview", icon: LayoutDashboard },
      { key: "leads", label: "Leads", icon: Inbox },
    ],
  },
  {
    title: "Work",
    items: [
      { key: "schedule", label: "Schedule", icon: Calendar },
      { key: "jobs", label: "Jobs", icon: BriefcaseBusiness },
      { key: "rounds", label: "Rounds", icon: Repeat },
      { key: "routeEfficiency", label: "Route Insights", icon: Navigation },
      { key: "map", label: "Map", icon: MapIcon },
      { key: "actions", label: "Actions", icon: ClipboardList },
      { key: "history", label: "History", icon: HistoryIcon },
    ],
  },
  {
    title: "Customers",
    items: [
      { key: "customers", label: "All Customers", icon: Users },
    ],
  },
  {
    title: "Documents",
    items: [
      { key: "quotes", label: "Quotes", icon: FileText },
      { key: "invoices", label: "Invoices", icon: Receipt },
      { key: "commercialDocs", label: "RAMS & Documents", icon: FileText },
    ],
  },
  {
    title: "Cashflow",
    items: [
      { key: "payments", label: "Payments", icon: CreditCard },
      { key: "expenses", label: "Expenses", icon: ReceiptText },
      { key: "customerProfit", label: "Profit", icon: TrendingUp },
    ],
  },
  {
    title: "Team",
    items: [{ key: "staff", label: "Staff", icon: UserCog }],
  },
  {
    title: "Settings",
    items: [{ key: "settings", label: "Settings", icon: SettingsIcon }],
  },
];

const NAV_TOUR_TARGETS: Partial<Record<PageKey, string>> = {
  dashboard: "sidebar-dashboard",
  leads: "sidebar-leads",
  schedule: "sidebar-schedule",
  jobs: "sidebar-jobs",
  rounds: "sidebar-rounds",
  routeEfficiency: "sidebar-route-efficiency",
  map: "sidebar-map",
  actions: "sidebar-actions",
  history: "sidebar-history",
  customers: "sidebar-customers",
  quotes: "sidebar-quotes",
  invoices: "sidebar-invoices",
  commercialDocs: "sidebar-documents",
  payments: "sidebar-payments",
  expenses: "sidebar-expenses",
  customerProfit: "sidebar-profit",
  staff: "sidebar-staff",
  settings: "sidebar-system",
};

const PAGE_NAV_SECTION_OVERRIDES: Partial<Record<PageKey, string>> = {
  commercial: "Work",
  scheduledJobProfile: "Work",
  customerProfile: "Customers",
  quoteForm: "Documents",
  invoiceForm: "Documents",
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

function getPersonInitials(name: string) {
  const parts = name
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

  if (parts.length === 0) {
    return "RH";
  }

  return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
}

function getFirstName(name: string) {
  return name.split(/\s+/).find(Boolean) ?? "there";
}

function getPageDisplayLabel(page: PageKey) {
  if (page === "customerProfile") return "Customer profile";
  if (page === "scheduledJobProfile") return "Scheduled job";
  if (page === "quoteForm") return "Quote";
  if (page === "invoiceForm") return "Invoice";

  for (const section of NAV_SECTIONS) {
    const item = section.items.find((entry) => entry.key === page);
    if (item) return item.label;
  }

  return "Dashboard";
}

function getPageAccessKey(page: PageKey) {
  return PAGE_PERMISSION_OVERRIDES[page];
}

function getCustomerFeatureKey(page: PageKey) {
  return CUSTOMER_FEATURE_PAGE_OVERRIDES[page];
}

function ScheduledJobProfileSection({
                                      job,
                                      checklist,
                                      customers,
                                      staffMembers,
                                      defaultAssignedStaffId,
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
  staffMembers: StaffMember[];
  defaultAssignedStaffId: number | null;
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
  const [draftAssignedStaffId, setDraftAssignedStaffId] = useState(
      job.assignedStaffId != null
          ? String(job.assignedStaffId)
          : defaultAssignedStaffId != null
            ? String(defaultAssignedStaffId)
            : ""
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
    setDraftAssignedStaffId(
        job.assignedStaffId != null
            ? String(job.assignedStaffId)
            : defaultAssignedStaffId != null
              ? String(defaultAssignedStaffId)
              : ""
    );
    setDraftNotes(job.notes ?? "");
  }, [
    defaultAssignedStaffId,
    job.assignedStaffId,
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
  const activeStaffMembers = staffMembers.filter((staffMember) => staffMember.isActive);
  const assignedStaff =
      job.assignedStaffId != null
          ? staffMembers.find((staffMember) => staffMember.id === job.assignedStaffId) ??
            null
          : null;
  const assignedStaffName =
      assignedStaff?.fullName ?? job.assignedStaffName ?? "Unassigned";
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
    setDraftAssignedStaffId(
        job.assignedStaffId != null
            ? String(job.assignedStaffId)
            : defaultAssignedStaffId != null
              ? String(defaultAssignedStaffId)
              : ""
    );
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
    const selectedStaff =
        draftAssignedStaffId !== ""
            ? staffMembers.find(
                (staffMember) => staffMember.id === Number(draftAssignedStaffId)
              ) ?? null
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
        assignedStaffId: selectedStaff?.id ?? null,
        assignedStaffName: selectedStaff?.fullName,
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
                data-tour="complete-job-button"
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
                  {getScheduledJobTypeLabel(job.type)}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/10">
                  {jobTimeRange ?? "No time added"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/10">
                  {assignedStaffName}
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
                      <option value="Grass Cut">Service Visit</option>
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

                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Assigned Staff
                    </span>
                    <select
                        value={draftAssignedStaffId}
                        onChange={(event) =>
                            setDraftAssignedStaffId(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    >
                      <option value="">Unassigned</option>
                      {activeStaffMembers.map((staffMember) => (
                          <option key={staffMember.id} value={staffMember.id}>
                            {staffMember.fullName}
                          </option>
                      ))}
                    </select>
                  </label>

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

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm">
              <p className="text-xs text-slate-400">Job Type</p>
              <p className="mt-2 font-semibold text-slate-900">
                {getScheduledJobTypeLabel(job.type)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm">
              <p className="text-xs text-slate-400">Status</p>
              <p className="mt-2 font-semibold text-slate-900">{job.status}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm">
              <p className="text-xs text-slate-400">Assigned Staff</p>
              <p className="mt-2 font-semibold text-slate-900">
                {assignedStaffName}
              </p>
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
          </div>

          <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
            <div className="space-y-5">
            <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-slate-400">Assigned Customer</p>
              {linkedCustomer ? (
                  <div className="mt-2 space-y-4">
                    <p className="text-xl font-black tracking-tight text-slate-900">{linkedCustomer.name}</p>
                    <p className="text-sm leading-6 text-slate-500">
                      {getCustomerDisplayAddress(linkedCustomer) || "-"}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Phone
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {phoneValue || "No phone number added"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
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

            <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-slate-400">Job Checklist</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

            <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-slate-400">Notes</p>
              <p className={`mt-2 text-sm leading-6 ${trimmedJobNotes ? "text-slate-700" : "text-slate-400"}`}>
                {trimmedJobNotes || "No notes added yet for this scheduled job."}
              </p>
            </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
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

              <div className="mt-5 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 shadow-sm">
                {jobMapEmbedUrl ? (
                    <iframe
                        title={`Map for ${job.title}`}
                        src={jobMapEmbedUrl}
                        loading="lazy"
                        allowFullScreen
                        className="h-[360px] w-full"
                    />
                ) : (
                    <div className="flex h-[360px] items-center justify-center px-6 text-center">
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

type JobsAppProps = {
  featureAccess?: Partial<CustomerFeatureAccess>;
  supportAccess?: {
    organizationId: string;
    workspaceName: string;
  } | null;
  subscriptionPlan?: SubscriptionPlanKey;
  subscriptionStaffAddonQuantity?: number;
};

type HeaderWeatherState = {
  temperature: number | null;
  rainChance: number | null;
  label: string;
};

const HEADER_WEATHER_FALLBACK_COORDINATES = {
  latitude: 55.8642,
  longitude: -4.2518,
};

const HEADER_WEATHER_LOCATION_LABEL = "East Kilbride";

function getCompactWeatherLabel(weatherCode: number | null) {
  if (weatherCode === null) return "Forecast";
  if ([0, 1].includes(weatherCode)) return "Clear";
  if ([2, 3].includes(weatherCode)) return "Cloudy";
  if ([45, 48].includes(weatherCode)) return "Fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
    return "Rain";
  }
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return "Snow";
  if ([95, 96, 99].includes(weatherCode)) return "Storm";
  return "Forecast";
}

function normalizeWorkspaceRoutePage(value: unknown): PageKey {
  return WORKSPACE_ROUTE_PAGE_KEYS.includes(value as PageKey)
      ? (value as PageKey)
      : "dashboard";
}

function getWorkspaceRouteNumber(value: string | null) {
  const numericValue = Number(value);

  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
}

function getWorkspaceRouteText(value: string | null) {
  const text = value?.trim() ?? "";

  return text || null;
}

function getWorkspaceRouteFromLocation(): WorkspaceRouteState {
  if (typeof window === "undefined") {
    return {
      page: "dashboard",
      selectedCustomerId: null,
      selectedScheduledJobId: null,
      jobProfileBackPage: "schedule",
      selectedQuoteId: null,
      selectedInvoiceId: null,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    page: normalizeWorkspaceRoutePage(params.get("page")),
    selectedCustomerId: getWorkspaceRouteNumber(params.get("customer")),
    selectedScheduledJobId: getWorkspaceRouteText(params.get("job")),
    jobProfileBackPage: params.get("jobBack") === "jobs" ? "jobs" : "schedule",
    selectedQuoteId: getWorkspaceRouteText(params.get("quote")),
    selectedInvoiceId: getWorkspaceRouteText(params.get("invoice")),
  };
}

function getWorkspaceRouteUrl(route: WorkspaceRouteState) {
  const params = new URLSearchParams(window.location.search);

  if (route.page === "dashboard") {
    params.delete("page");
  } else {
    params.set("page", route.page);
  }

  params.delete("customer");
  params.delete("job");
  params.delete("jobBack");
  params.delete("quote");
  params.delete("invoice");

  if (
      (route.page === "customerProfile" ||
          route.page === "quoteForm" ||
          route.page === "invoiceForm") &&
      route.selectedCustomerId != null
  ) {
    params.set("customer", String(route.selectedCustomerId));
  }

  if (route.page === "scheduledJobProfile" && route.selectedScheduledJobId) {
    params.set("job", route.selectedScheduledJobId);
    params.set("jobBack", route.jobProfileBackPage);
  }

  if (route.page === "quoteForm" && route.selectedQuoteId) {
    params.set("quote", route.selectedQuoteId);
  }

  if (route.page === "invoiceForm" && route.selectedInvoiceId) {
    params.set("invoice", route.selectedInvoiceId);
  }

  const query = params.toString();

  return `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
}

export default function JobsApp({
  featureAccess,
  supportAccess,
  subscriptionPlan,
  subscriptionStaffAddonQuantity,
}: JobsAppProps = {}) {
  const supportOrganizationId = supportAccess?.organizationId ?? null;
  const isSupportAccess = Boolean(supportOrganizationId);
  const customerFeatureAccess = useMemo(
      () => normalizeCustomerFeatureAccess(featureAccess),
      [featureAccess]
  );
  const staffAddonQuantity = useMemo(
      () => normalizeStaffAddonQuantity(subscriptionStaffAddonQuantity),
      [subscriptionStaffAddonQuantity]
  );
  const activeSubscriptionPlan = useMemo(
      () => getSubscriptionPlan(subscriptionPlan),
      [subscriptionPlan]
  );
  const planFeatureAccess = useMemo(
      () =>
          isSupportAccess
              ? getDefaultCustomerFeatureAccess()
              : getPlanFeatureAccess(subscriptionPlan, staffAddonQuantity),
      [isSupportAccess, staffAddonQuantity, subscriptionPlan]
  );
  const hasGrowthPlan = isSupportAccess || hasGrowthFeatures(subscriptionPlan);
  const hasTeamPlanAccess = isSupportAccess || hasStaffManagementAccess(
      subscriptionPlan,
      staffAddonQuantity
  );
  const activeStaffLimit = useMemo(
      () => getSubscriptionStaffLimit(subscriptionPlan, staffAddonQuantity),
      [staffAddonQuantity, subscriptionPlan]
  );
  const initialWorkspaceRouteRef = useRef<WorkspaceRouteState | null>(null);
  if (initialWorkspaceRouteRef.current === null) {
    initialWorkspaceRouteRef.current = getWorkspaceRouteFromLocation();
  }
  const initialWorkspaceRoute = initialWorkspaceRouteRef.current;
  const [page, setPage] = useState<PageKey>(initialWorkspaceRoute.page);
  const [expandedNavSections, setExpandedNavSections] = useState<Record<string, boolean>>(
      () => getExpandedNavSections(getNavSectionTitle(initialWorkspaceRoute.page))
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
  const [schedulingRecommendations, setSchedulingRecommendations] = useState<
      SchedulingRecommendationRecord[]
  >(DEFAULT_PERSISTED_APP_STATE.schedulingRecommendations);
  const [schedulingAuditLogs, setSchedulingAuditLogs] = useState<
      SchedulingAuditLog[]
  >(DEFAULT_PERSISTED_APP_STATE.schedulingAuditLogs);
  const [quotes, setQuotes] = useState<Quote[]>(DEFAULT_PERSISTED_APP_STATE.quotes);
  const [quotesTableInitialized, setQuotesTableInitialized] = useState(
      DEFAULT_PERSISTED_APP_STATE.quotesTableInitialized
  );
  const [invoices, setInvoices] = useState<Invoice[]>(
      DEFAULT_PERSISTED_APP_STATE.invoices
  );
  const [expenseSuppliers, setExpenseSuppliers] = useState<ExpenseSupplier[]>(
      DEFAULT_PERSISTED_APP_STATE.expenseSuppliers
  );
  const [expenseProducts, setExpenseProducts] = useState<ExpenseProduct[]>(
      DEFAULT_PERSISTED_APP_STATE.expenseProducts
  );
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(
      DEFAULT_PERSISTED_APP_STATE.expenses
  );
  const [invoicesWriteFallbackActive, setInvoicesWriteFallbackActive] = useState(
      DEFAULT_PERSISTED_APP_STATE.invoicesWriteFallbackActive
  );
  const [recurringInvoiceTemplates, setRecurringInvoiceTemplates] = useState<
      RecurringInvoiceTemplateRecord[]
  >(DEFAULT_PERSISTED_APP_STATE.recurringInvoiceTemplates);
  const [recurringInvoiceTemplatesFallbackActive, setRecurringInvoiceTemplatesFallbackActive] =
      useState(DEFAULT_PERSISTED_APP_STATE.recurringInvoiceTemplatesFallbackActive);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
      initialWorkspaceRoute.selectedCustomerId
  );
  const [selectedScheduledJobId, setSelectedScheduledJobId] = useState<string | null>(
      initialWorkspaceRoute.selectedScheduledJobId
  );
  const [jobProfileBackPage, setJobProfileBackPage] = useState<"schedule" | "jobs">(
      initialWorkspaceRoute.jobProfileBackPage
  );
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(
      initialWorkspaceRoute.selectedQuoteId
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
      initialWorkspaceRoute.selectedInvoiceId
  );
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
  const [platformAnnouncement, setPlatformAnnouncement] =
      useState<PlatformAnnouncement | null>(null);
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loggedInStaffName, setLoggedInStaffName] = useState("Staff Member");
  const [editSessions, setEditSessions] = useState<EditSessionRecord[]>([]);
  const [editSaveRequest, setEditSaveRequest] = useState<{
    resourceKey: string;
    requestId: number;
  } | null>(null);
  const [editDiscardRequest, setEditDiscardRequest] = useState<{
    resourceKey: string;
    requestId: number;
  } | null>(null);
  const [inactiveEditResourceKey, setInactiveEditResourceKey] = useState<string | null>(
      null
  );
  const [refreshEditNotice, setRefreshEditNotice] =
      useState<EditSessionRecord | null>(null);
  const editSessionIdsRef = useRef<Record<string, string>>({});
  const editSessionChannelRef = useRef<BroadcastChannel | null>(null);
  const editRealtimeChannelRef = useRef<SupabaseRealtimeChannel | null>(null);
  const editSessionsRef = useRef<EditSessionRecord[]>([]);
  const handledFinishedSessionIdsRef = useRef<Set<string>>(new Set());
  const lastInactiveActionKeyRef = useRef<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [headerWeather, setHeaderWeather] = useState<HeaderWeatherState | null>(null);

  const getWritableOrganizationId = useCallback(() => {
    const organizationId = currentOrganizationId ?? supportOrganizationId;

    if (!organizationId) {
      throw new Error("Workspace is still loading. Try again in a moment.");
    }

    return organizationId;
  }, [currentOrganizationId, supportOrganizationId]);

  const withCurrentOrganizationId = useCallback(
      <T extends object>(row: T): T & { organization_id: string } => ({
        ...row,
        organization_id: getWritableOrganizationId(),
      }),
      [getWritableOrganizationId]
  );
  const [headerWeatherLoading, setHeaderWeatherLoading] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHelpLauncherOpen, setIsHelpLauncherOpen] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() =>
      readStoredBooleanPreference(ONBOARDING_COMPLETED_STORAGE_KEY, false)
  );
  const [addCustomerHelpRequestId, setAddCustomerHelpRequestId] = useState(0);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const shouldReplaceWorkspaceRouteRef = useRef(true);

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
  const activeStaffMembers = useMemo(
      () => staffMembers.filter((staffMember) => staffMember.isActive),
      [staffMembers]
  );
  const ownerStaffMember = useMemo(
      () =>
          activeStaffMembers.find((staffMember) => staffMember.isSystemAdmin) ??
          activeStaffMembers.find((staffMember) => staffMember.role === "Admin") ??
          activeStaffMembers[0] ??
          null,
      [activeStaffMembers]
  );
  const defaultAssignedStaffId =
      currentStaffMember?.id ?? ownerStaffMember?.id ?? null;
  const staffNameById = useMemo(() => {
    const lookup = new Map<number, string>();

    for (const staffMember of staffMembers) {
      lookup.set(staffMember.id, staffMember.fullName);
    }

    return lookup;
  }, [staffMembers]);
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
        const featureKey = getCustomerFeatureKey(nextPage);

        if (!planFeatureAccess[featureKey]) {
          return false;
        }

        if (!customerFeatureAccess[featureKey]) {
          return false;
        }

        if (!hasTeamPlanAccess && !currentUserIsAdmin) {
          return false;
        }

        if (!staffSystemReady || currentUserIsAdmin) {
          return true;
        }

        const accessKey = getPageAccessKey(nextPage);

        if (ADMIN_ONLY_PAGE_KEYS.has(accessKey)) {
          return false;
        }

        return allowedRolePages.has(accessKey);
      },
      [
        allowedRolePages,
        currentUserIsAdmin,
        customerFeatureAccess,
        hasTeamPlanAccess,
        planFeatureAccess,
        staffSystemReady,
      ]
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

  const defaultRotationWeeks = appSettings.defaultRotationWeeks;
  const activeRotationWeeks = useMemo(
      () => getActiveRotationWeeks(customers, defaultRotationWeeks),
      [customers, defaultRotationWeeks]
  );
  const activeWeekOptions = useMemo(
      () => getWeekOptions(activeRotationWeeks),
      [activeRotationWeeks]
  );
  const selectedCycleLabel = getRotationCycleLabel(
      selectedWeek,
      activeRotationWeeks
  );
  const baseRoundKey = getBaseRoundKey(selectedWeek, selectedDay);
  const activeRoundCycle = getActiveRoundCycle(activeRoundCycles, baseRoundKey);
  const roundKey = getRoundKeyForCycle(baseRoundKey, activeRoundCycle);
  const isLocked = !!lockedRounds[roundKey];
  const todayPanel = useMemo(
      () => getTodayPanelState(todayReferenceDate, activeRotationWeeks),
      [activeRotationWeeks, todayReferenceDate]
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
    if (!activeWeekOptions.includes(selectedWeek)) {
      setSelectedWeek(activeWeekOptions[0] ?? "Week 1");
    }
  }, [activeWeekOptions, selectedWeek]);

  useEffect(() => {
    setAppSettings(loadAppSettings());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", appSettings.primaryColor);
    root.style.setProperty("--brand-secondary", appSettings.secondaryColor);
  }, [appSettings.primaryColor, appSettings.secondaryColor]);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadHeaderWeather() {
      setHeaderWeatherLoading(true);

      try {
        const params = new URLSearchParams({
          latitude: String(HEADER_WEATHER_FALLBACK_COORDINATES.latitude),
          longitude: String(HEADER_WEATHER_FALLBACK_COORDINATES.longitude),
          current: "temperature_2m,weather_code",
          daily: "precipitation_probability_max",
          forecast_days: "1",
          timezone: "auto",
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load weather");
        }

        const data = (await response.json()) as {
          current?: {
            temperature_2m?: number;
            weather_code?: number;
          };
          daily?: {
            precipitation_probability_max?: Array<number | null>;
          };
        };
        const temperature =
            typeof data.current?.temperature_2m === "number"
                ? data.current.temperature_2m
                : null;
        const weatherCode =
            typeof data.current?.weather_code === "number"
                ? data.current.weather_code
                : null;
        const rainChanceValue = data.daily?.precipitation_probability_max?.[0];
        const rainChance =
            typeof rainChanceValue === "number" ? rainChanceValue : null;

        if (!abortController.signal.aborted) {
          setHeaderWeather({
            temperature,
            rainChance,
            label: getCompactWeatherLabel(weatherCode),
          });
        }
      } catch {
        if (!abortController.signal.aborted) {
          setHeaderWeather(null);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setHeaderWeatherLoading(false);
        }
      }
    }

    loadHeaderWeather();

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    const activeSectionTitle = getNavSectionTitle(page);
    setExpandedNavSections(getExpandedNavSections(activeSectionTitle));
  }, [page]);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (hasPageAccess(page) || !firstAccessiblePage) {
      return;
    }

    setExpandedNavSections(getExpandedNavSections(getNavSectionTitle(firstAccessiblePage)));
    setPage(firstAccessiblePage);
  }, [firstAccessiblePage, hasPageAccess, page]);

  useEffect(() => {
    function handleWorkspacePopState() {
      const nextRoute = getWorkspaceRouteFromLocation();

      shouldReplaceWorkspaceRouteRef.current = true;
      setIsUserMenuOpen(false);
      setSelectedCustomerId(nextRoute.selectedCustomerId);
      setSelectedScheduledJobId(nextRoute.selectedScheduledJobId);
      setJobProfileBackPage(nextRoute.jobProfileBackPage);
      setSelectedQuoteId(nextRoute.selectedQuoteId);
      setSelectedInvoiceId(nextRoute.selectedInvoiceId);
      if (nextRoute.page !== "quoteForm") {
        setPendingLeadQuoteDraft(null);
      }
      setExpandedNavSections(
          getExpandedNavSections(getNavSectionTitle(nextRoute.page))
      );
      setPage(nextRoute.page);
    }

    window.addEventListener("popstate", handleWorkspacePopState);

    return () => {
      window.removeEventListener("popstate", handleWorkspacePopState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextUrl = getWorkspaceRouteUrl({
      page,
      selectedCustomerId,
      selectedScheduledJobId,
      jobProfileBackPage,
      selectedQuoteId,
      selectedInvoiceId,
    });
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl === currentUrl) {
      shouldReplaceWorkspaceRouteRef.current = false;
      return;
    }

    if (shouldReplaceWorkspaceRouteRef.current) {
      window.history.replaceState(null, "", nextUrl);
      shouldReplaceWorkspaceRouteRef.current = false;
      return;
    }

    window.history.pushState(null, "", nextUrl);
  }, [
    jobProfileBackPage,
    page,
    selectedCustomerId,
    selectedInvoiceId,
    selectedQuoteId,
    selectedScheduledJobId,
  ]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === SETTINGS_STORAGE_KEY) {
        setAppSettings(loadAppSettings());
        return;
      }

      if (event.key === HELP_ENABLED_STORAGE_KEY) {
        setAppSettings((previousSettings) =>
            mergeAppSettings({
              ...previousSettings,
              helpEnabled: readStoredBooleanPreference(
                  HELP_ENABLED_STORAGE_KEY,
                  previousSettings.helpEnabled
              ),
            })
        );
        return;
      }

      if (event.key === ONBOARDING_COMPLETED_STORAGE_KEY) {
        setHasCompletedOnboarding(
            readStoredBooleanPreference(ONBOARDING_COMPLETED_STORAGE_KEY, false)
        );
      }
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
        const organizationId = getWritableOrganizationId();
        const { data: existingRows, error: existingRowsError } = await supabase
            .from("items")
            .select("id")
            .eq("organization_id", organizationId);

        if (existingRowsError) {
          throw existingRowsError;
        }

        if (nextQuoteServices.length > 0) {
          const { error: upsertError } = await supabase
              .from("items")
              .upsert(nextQuoteServices.map((service) =>
                withCurrentOrganizationId(mapQuoteServiceToCatalogItemRow(service))
              ), {
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
              .eq("organization_id", organizationId)
              .in("id", idsToDelete);

          if (deleteError) {
            throw deleteError;
          }
        }
      },
      [getWritableOrganizationId, withCurrentOrganizationId, workflowTablesReady.items]
  );

  const handleSaveSettings = useCallback(async (settings: AppSettings) => {
    const merged = mergeAppSettings(settings);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      writeStoredBooleanPreference(HELP_ENABLED_STORAGE_KEY, merged.helpEnabled);
    }

    setAppSettings(merged);

    try {
      await syncQuoteItemsTable(merged.quoteServices);
      const supabase = createSupabaseClient();
      const { error } = await supabase
          .from("organizations")
          .update({
            default_rotation_weeks: merged.defaultRotationWeeks,
            updated_at: new Date().toISOString(),
          })
          .eq("id", getWritableOrganizationId());

      if (error) {
        throw error;
      }

      const customersNeedingRotationClamp = customers
          .filter((customer) => customer.rotationWeeksOverride == null)
          .map((customer) => ({
            customer,
            week: normalizeWeekNumber(customer.week, merged.defaultRotationWeeks),
          }))
          .filter(({ customer, week }) => week !== customer.week);

      for (const { customer, week } of customersNeedingRotationClamp) {
        await saveCustomer({
          ...customer,
          week,
          cutFrequency: getCutFrequencyFromRotationWeeks(
              merged.defaultRotationWeeks
          ),
        });
      }

      setDatabaseError(
          getDatabaseSetupNotice(workflowTablesReady, staffTablesReady)
      );
    } catch (error) {
      if (isErrorWithMessage(error)) {
        setDatabaseError(formatDatabaseError(error));
      }

      throw error;
    }
  }, [
    customers,
    getWritableOrganizationId,
    staffTablesReady,
    syncQuoteItemsTable,
    workflowTablesReady,
  ]);

  const updateHelpEnabled = useCallback((enabled: boolean) => {
    setAppSettings((previousSettings) => {
      const merged = mergeAppSettings({
        ...previousSettings,
        helpEnabled: enabled,
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
        writeStoredBooleanPreference(HELP_ENABLED_STORAGE_KEY, enabled);
      }

      return merged;
    });
  }, []);

  const markOnboardingCompleted = useCallback(() => {
    writeStoredBooleanPreference(ONBOARDING_COMPLETED_STORAGE_KEY, true);
    setHasCompletedOnboarding(true);
  }, []);

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
        schedulingRecommendations,
        schedulingAuditLogs,
        quotes,
        invoices,
        expenseSuppliers,
        expenseProducts,
        expenses,
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
        expenseProducts,
        expenseSuppliers,
        expenses,
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
        schedulingAuditLogs,
        schedulingRecommendations,
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
          organization_id: getWritableOrganizationId(),
          id: APP_STATE_ROW_ID,
          data: nextState,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "organization_id,id",
        }
    );

    if (error) {
      throw error;
    }

    setDatabaseError(
        getDatabaseSetupNotice(workflowTablesReady, staffTablesReady)
    );
  }, [getWritableOrganizationId, staffTablesReady, workflowTablesReady]);

  const persistExpenseWorkspaceData = useCallback(
      async ({
        nextSuppliers = expenseSuppliers,
        nextProducts = expenseProducts,
        nextExpenses = expenses,
        nextSettings = appSettings,
      }: {
        nextSuppliers?: ExpenseSupplier[];
        nextProducts?: ExpenseProduct[];
        nextExpenses?: ExpenseRecord[];
        nextSettings?: AppSettings;
      }) => {
        if (!isDatabaseReady || !canSyncAppState) {
          return;
        }

        await persistAppStateSnapshot(
            buildPersistedAppState({
              expenseSuppliers: nextSuppliers,
              expenseProducts: nextProducts,
              expenses: nextExpenses,
              appSettings: nextSettings,
            })
        );
      },
      [
        appSettings,
        buildPersistedAppState,
        canSyncAppState,
        expenseProducts,
        expenseSuppliers,
        expenses,
        isDatabaseReady,
        persistAppStateSnapshot,
      ]
  );

  const saveExpenseSupplier = useCallback(
      async (supplierDraft: ExpenseSupplierDraft) => {
        const now = new Date().toISOString();
        const supplier: ExpenseSupplier = {
          id: createLocalEntityId("supplier"),
          name: supplierDraft.name.trim(),
          contactName: supplierDraft.contactName?.trim() ?? "",
          email: supplierDraft.email?.trim() ?? "",
          phone: supplierDraft.phone?.trim() ?? "",
          website: supplierDraft.website?.trim() ?? "",
          notes: supplierDraft.notes?.trim() ?? "",
          createdAt: now,
          updatedAt: now,
        };
        const nextSuppliers = [...expenseSuppliers, supplier];

        setExpenseSuppliers(nextSuppliers);
        await persistExpenseWorkspaceData({ nextSuppliers });
      },
      [expenseSuppliers, persistExpenseWorkspaceData]
  );

  const deleteExpenseSupplier = useCallback(
      async (supplierId: string) => {
        const now = new Date().toISOString();
        const nextSuppliers = expenseSuppliers.filter(
            (supplier) => supplier.id !== supplierId
        );
        const nextProducts = expenseProducts.map((product) =>
            product.supplierId === supplierId
                ? { ...product, supplierId: null, updatedAt: now }
                : product
        );
        const nextExpenses = expenses.map((expense) =>
            expense.supplierId === supplierId
                ? { ...expense, supplierId: null, updatedAt: now }
                : expense
        );

        setExpenseSuppliers(nextSuppliers);
        setExpenseProducts(nextProducts);
        setExpenses(nextExpenses);
        await persistExpenseWorkspaceData({
          nextSuppliers,
          nextProducts,
          nextExpenses,
        });
      },
      [expenseProducts, expenseSuppliers, expenses, persistExpenseWorkspaceData]
  );

  const saveQuoteItemSettings = useCallback(
      async (
          nextQuoteServices: QuoteService[],
          persistenceOverrides: {
            nextProducts?: ExpenseProduct[];
            nextSuppliers?: ExpenseSupplier[];
            nextExpenses?: ExpenseRecord[];
          } = {}
      ) => {
        const nextSettings = mergeAppSettings({
          ...appSettings,
          quoteServices: nextQuoteServices,
        });

        setAppSettings(nextSettings);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
              SETTINGS_STORAGE_KEY,
              JSON.stringify(nextSettings)
          );
          writeStoredBooleanPreference(
              HELP_ENABLED_STORAGE_KEY,
              nextSettings.helpEnabled
          );
        }

        await syncQuoteItemsTable(nextSettings.quoteServices);
        await persistExpenseWorkspaceData({
          ...persistenceOverrides,
          nextSettings,
        });
      },
      [appSettings, persistExpenseWorkspaceData, syncQuoteItemsTable]
  );

  const saveExpenseProduct = useCallback(
      async (productDraft: ExpenseProductDraft) => {
        const now = new Date().toISOString();
        const product: ExpenseProduct = {
          id: createLocalEntityId("product"),
          name: productDraft.name.trim(),
          supplierId: productDraft.supplierId || null,
          sku: productDraft.sku?.trim() ?? "",
          category: productDraft.category.trim() || "Materials",
          unitCost: roundCurrency(productDraft.unitCost),
          quotePrice: roundCurrency(productDraft.quotePrice || productDraft.unitCost),
          isQuoteItem: Boolean(productDraft.isQuoteItem),
          notes: productDraft.notes?.trim() ?? "",
          createdAt: now,
          updatedAt: now,
        };
        const nextProducts = [...expenseProducts, product];

        setExpenseProducts(nextProducts);

        if (product.isQuoteItem) {
          await saveQuoteItemSettings(
              mergeQuoteService(
                  appSettings.quoteServices,
                  mapExpenseProductToQuoteService(product)
              ),
              { nextProducts }
          );
          return;
        }

        await persistExpenseWorkspaceData({ nextProducts });
      },
      [
        appSettings.quoteServices,
        expenseProducts,
        persistExpenseWorkspaceData,
        saveQuoteItemSettings,
      ]
  );

  const deleteExpenseProduct = useCallback(
      async (productId: string) => {
        const now = new Date().toISOString();
        const nextProducts = expenseProducts.filter(
            (product) => product.id !== productId
        );
        const nextExpenses = expenses.map((expense) =>
            expense.productId === productId
                ? { ...expense, productId: null, updatedAt: now }
                : expense
        );

        setExpenseProducts(nextProducts);
        setExpenses(nextExpenses);
        await persistExpenseWorkspaceData({ nextProducts, nextExpenses });
      },
      [expenseProducts, expenses, persistExpenseWorkspaceData]
  );

  const addExpenseProductToQuoteItems = useCallback(
      async (productId: string) => {
        const existingProduct = expenseProducts.find(
            (product) => product.id === productId
        );

        if (!existingProduct) {
          throw new Error("Product not found.");
        }

        const now = new Date().toISOString();
        const quoteReadyProduct: ExpenseProduct = {
          ...existingProduct,
          isQuoteItem: true,
          updatedAt: now,
        };
        const nextProducts = expenseProducts.map((product) =>
            product.id === productId ? quoteReadyProduct : product
        );

        setExpenseProducts(nextProducts);
        await saveQuoteItemSettings(
            mergeQuoteService(
                appSettings.quoteServices,
                mapExpenseProductToQuoteService(quoteReadyProduct)
            ),
            { nextProducts }
        );
      },
      [appSettings.quoteServices, expenseProducts, saveQuoteItemSettings]
  );

  const saveExpenseRecord = useCallback(
      async (expenseDraft: ExpenseRecordDraft) => {
        const now = new Date().toISOString();
        const expense: ExpenseRecord = {
          id: createLocalEntityId("expense"),
          date: getInputDateValue(expenseDraft.date) || getTodayDateInputValue(),
          supplierId: expenseDraft.supplierId || null,
          productId: expenseDraft.productId || null,
          category: expenseDraft.category.trim() || "Other",
          description: expenseDraft.description.trim(),
          amount: roundCurrency(expenseDraft.amount),
          paymentMethod: expenseDraft.paymentMethod?.trim() ?? "",
          receiptReference: expenseDraft.receiptReference?.trim() ?? "",
          notes: expenseDraft.notes?.trim() ?? "",
          createdAt: now,
          updatedAt: now,
        };
        const nextExpenses = [expense, ...expenses];

        setExpenses(nextExpenses);
        await persistExpenseWorkspaceData({ nextExpenses });
      },
      [expenses, persistExpenseWorkspaceData]
  );

  const deleteExpenseRecord = useCallback(
      async (expenseId: string) => {
        const nextExpenses = expenses.filter((expense) => expense.id !== expenseId);

        setExpenses(nextExpenses);
        await persistExpenseWorkspaceData({ nextExpenses });
      },
      [expenses, persistExpenseWorkspaceData]
  );

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

        let organizationId = supportOrganizationId;

        if (!organizationId) {
          const { data: membership, error: membershipError } = await supabase
              .from("organization_members")
              .select("organization_id")
              .eq("user_id", user.id)
              .eq("status", "active")
              .limit(1)
              .maybeSingle();

          if (membershipError) {
            throw membershipError;
          }

          organizationId =
              typeof membership?.organization_id === "string"
                  ? membership.organization_id
                  : null;
        }

        const scopeToOrganization = <T,>(query: T): T =>
            organizationId
                ? (query as { eq: (column: string, value: string) => T }).eq(
                    "organization_id",
                    organizationId
                )
                : query;
        const withLoadedOrganizationId = <T extends object>(
            row: T
        ): T & { organization_id: string } => {
          if (!organizationId) {
            throw new Error("Workspace is still loading. Try again in a moment.");
          }

          return {
            ...row,
            organization_id: organizationId,
          };
        };

        setCurrentOrganizationId(organizationId);

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
          organizationResult,
        ] = await Promise.all([
          scopeToOrganization(
            supabase
                .from("customers")
                .select(CUSTOMER_SELECT_FIELDS)
          )
              .order("name", { ascending: true }),
          scopeToOrganization(
            supabase
                .from("visits")
                .select(VISIT_SELECT_FIELDS)
          )
              .order("visit_date", { ascending: false }),
          scopeToOrganization(
            supabase
                .from("customer_leads")
                .select(CUSTOMER_LEAD_SELECT_FIELDS)
          )
              .order("submitted_at", { ascending: false }),
          scopeToOrganization(
            supabase
                .from("monthly_payments")
                .select(MONTHLY_PAYMENT_SELECT_FIELDS)
          )
              .order("payment_month", { ascending: true })
              .order("customer_id", { ascending: true }),
          hasGrowthPlan
              ? scopeToOrganization(
                  supabase
                      .from("commercial_rams_documents")
                      .select(COMMERCIAL_RAMS_SELECT_FIELDS)
                )
                    .order("updated_at", { ascending: false })
                    .order("created_at", { ascending: false })
              : Promise.resolve({ data: [], error: null }),
          scopeToOrganization(
            supabase
                .from("items")
                .select("id,title,category,item_type,price,buy_price,created_at,updated_at")
          )
              .order("category", { ascending: true })
              .order("title", { ascending: true }),
          scopeToOrganization(
            supabase
                .from("quotes")
                .select(QUOTE_SELECT_FIELDS)
          )
              .order("date", { ascending: false }),
          scopeToOrganization(
            supabase
                .from("invoices")
                .select(INVOICE_SELECT_FIELDS)
          )
              .order("date", { ascending: false }),
          scopeToOrganization(
            supabase
                .from("recurring_invoice_templates")
                .select(RECURRING_INVOICE_TEMPLATE_SELECT_FIELDS)
          ),
          scopeToOrganization(
            supabase
                .from("scheduled_jobs")
                .select(SCHEDULED_JOB_SELECT_FIELDS)
          )
              .order("date", { ascending: true }),
          scopeToOrganization(
            supabase
                .from(APP_STATE_TABLE)
                .select("data")
          )
              .eq("id", APP_STATE_ROW_ID)
              .limit(1)
              .maybeSingle(),
          scopeToOrganization(
            supabase
                .from("staff_members")
                .select(STAFF_MEMBER_SELECT_FIELDS)
          )
              .order("full_name", { ascending: true }),
          scopeToOrganization(
            supabase
                .from("role_permissions")
                .select(ROLE_PERMISSION_SELECT_FIELDS)
          )
              .order("role", { ascending: true })
              .order("page_key", { ascending: true }),
          organizationId
              ? supabase
                    .from("organizations")
                    .select("default_rotation_weeks")
                    .eq("id", organizationId)
                    .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
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
              .eq("organization_id", organizationId ?? "")
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
        const organizationDefaultRotationWeeks =
            organizationResult.error || !isRecord(organizationResult.data)
                ? undefined
                : normalizeRotationWeeks(
                    organizationResult.data.default_rotation_weeks,
                    DEFAULT_ROTATION_WEEKS
                  );
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
                .upsert(
                    fallbackQuoteServices.map((service) =>
                        withLoadedOrganizationId(mapQuoteServiceToCatalogItemRow(service))
                    ),
                    {
                      onConflict: "id",
                    }
                )
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
                .insert(
                    nextState.quotes.map((quote) =>
                        withLoadedOrganizationId(mapQuoteToRow(quote))
                    )
                )
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
                .insert(
                    nextState.invoices.map((invoice) =>
                        withLoadedOrganizationId(mapInvoiceToRow(invoice))
                    )
                )
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
                .insert(
                    nextState.scheduledJobs.map((job) =>
                        withLoadedOrganizationId(mapScheduledJobToRow(job))
                    )
                )
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
                  createDefaultRolePermissions().map((permission) =>
                      withLoadedOrganizationId(mapRolePermissionToWriteRow(permission))
                  ),
                  {
                    onConflict: "organization_id,role,page_key",
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
                    withLoadedOrganizationId(
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
                .eq("organization_id", organizationId ?? "")
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
        setExpenseSuppliers(nextState.expenseSuppliers);
        setExpenseProducts(nextState.expenseProducts);
        setExpenses(nextState.expenses);
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
        setSchedulingRecommendations(nextState.schedulingRecommendations);
        setSchedulingAuditLogs(nextState.schedulingAuditLogs);
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
          helpEnabled: readStoredBooleanPreference(
              HELP_ENABLED_STORAGE_KEY,
              hasPersistedAppSettings
                  ? nextState.appSettings.helpEnabled
                  : localAppSettings.helpEnabled
          ),
          defaultRotationWeeks:
              organizationDefaultRotationWeeks ??
              (hasPersistedAppSettings
                  ? nextState.appSettings.defaultRotationWeeks
                  : localAppSettings.defaultRotationWeeks),
        });
        setAppSettings(resolvedAppSettings);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
              SETTINGS_STORAGE_KEY,
              JSON.stringify(resolvedAppSettings)
          );
          writeStoredBooleanPreference(
              HELP_ENABLED_STORAGE_KEY,
              resolvedAppSettings.helpEnabled
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
  }, [hasGrowthPlan, supportOrganizationId]);

  useEffect(() => {
    if (!currentUserId) {
      setPlatformAnnouncement(null);
      return;
    }

    let isCancelled = false;

    async function loadPlatformAnnouncement() {
      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
            .from("platform_announcements")
            .select(PLATFORM_ANNOUNCEMENT_SELECT)
            .eq("is_active", true)
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (isCancelled) {
          return;
        }

        if (error) {
          if (!isMissingTableError(error)) {
            console.error("Unable to load platform announcement:", error.message);
          }
          setPlatformAnnouncement(null);
          return;
        }

        const announcement = mapPlatformAnnouncementRow(
            data as PlatformAnnouncementRow | null
        );

        setPlatformAnnouncement(
            announcement.isActive && announcement.message.trim()
                ? announcement
                : null
        );
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error("Unable to load platform announcement:", error);
        setPlatformAnnouncement(null);
      }
    }

    loadPlatformAnnouncement();

    return () => {
      isCancelled = true;
    };
  }, [currentUserId]);

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

  const handleImportAllData = useCallback(
      async (payload: RoundHqFullDataExport) => {
        const importedData = payload.data;
        const importedSettings = mergeAppSettings(payload.settings);

        if (importedData.customers.length > activeSubscriptionPlan.customerLimit) {
          throw new Error(
              `${activeSubscriptionPlan.name} allows up to ${activeSubscriptionPlan.customerLimit.toLocaleString()} customers. This backup contains ${importedData.customers.length.toLocaleString()} customers.`
          );
        }

        if (
            !hasGrowthPlan &&
            importedData.customers.some((customer) => customer.customerType === "Commercial")
        ) {
          throw new Error(
              "This backup contains commercial customers. Upgrade to Growth before importing commercial data."
          );
        }

        const supabase = createSupabaseClient();
        const organizationId = getWritableOrganizationId();
        const deleteOrganizationRows = async (
            tableName: string,
            enabled = true
        ) => {
          if (!enabled) {
            return;
          }

          const { error } = await supabase
              .from(tableName)
              .delete()
              .eq("organization_id", organizationId);

          if (error) {
            throw error;
          }
        };
        const now = new Date().toISOString();

        await deleteOrganizationRows(
            "monthly_payments",
            workflowTablesReady.monthlyPayments
        );
        await deleteOrganizationRows("visits");
        await deleteOrganizationRows(
            "commercial_rams_documents",
            workflowTablesReady.commercialRams
        );
        await deleteOrganizationRows(
            "recurring_invoice_templates",
            workflowTablesReady.recurringInvoiceTemplates
        );
        await deleteOrganizationRows(
            "scheduled_jobs",
            workflowTablesReady.scheduledJobs
        );
        await deleteOrganizationRows("invoices", workflowTablesReady.invoices);
        await deleteOrganizationRows("quotes", workflowTablesReady.quotes);
        await deleteOrganizationRows(
            "customer_leads",
            workflowTablesReady.customerLeads
        );
        await deleteOrganizationRows("customers");

        const importedCustomerRows = importedData.customers.map((customer) =>
            withCurrentOrganizationId(mapCustomerToRow(customer))
        );
        const insertedCustomerResult =
            importedCustomerRows.length > 0
                ? await supabase
                    .from("customers")
                    .insert(importedCustomerRows)
                    .select(CUSTOMER_SELECT_FIELDS)
                : { data: [], error: null };

        if (insertedCustomerResult.error) {
          throw insertedCustomerResult.error;
        }

        const nextCustomers = ((insertedCustomerResult.data ?? []) as CustomerRow[]).map(
            mapCustomerRowToCustomer
        );
        const customerIdMap = new Map<number, number>();

        importedData.customers.forEach((customer, index) => {
          const importedId = Number(customer.id);
          const insertedCustomer = nextCustomers[index];

          if (Number.isFinite(importedId) && insertedCustomer) {
            customerIdMap.set(importedId, insertedCustomer.id);
          }
        });

        const getRemappedCustomerId = (customerId: number | null | undefined) => {
          if (customerId == null) {
            return null;
          }

          const mappedId = customerIdMap.get(Number(customerId));
          return mappedId ?? null;
        };
        const remapRequiredCustomerId = (
            customerId: number | null | undefined
        ) => {
          const mappedId = getRemappedCustomerId(customerId);
          return mappedId && Number.isFinite(mappedId) ? mappedId : null;
        };

        const nextVisits = importedData.visits
            .map((visit) => {
              const customerId = remapRequiredCustomerId(visit.customerId);

              return customerId ? { ...visit, customerId } : null;
            })
            .filter((visit): visit is VisitLog => Boolean(visit));
        const nextMonthlyPayments = importedData.payments
            .map((payment) => {
              const customerId = remapRequiredCustomerId(payment.customerId);

              return customerId ? { ...payment, customerId } : null;
            })
            .filter((payment): payment is MonthlyPayment => Boolean(payment));
        const nextCommercialRamsDocuments = sortCommercialRamsDocuments(
            importedData.commercialRamsDocuments.map((document) => ({
              ...document,
              customerId: getRemappedCustomerId(document.customerId),
            }))
        );
        const nextCustomerLeads = sortCustomerLeads(
            importedData.customerLeads.map((lead) => ({
              ...lead,
              convertedCustomerId: getRemappedCustomerId(
                  lead.convertedCustomerId ?? null
              ),
            }))
        );
        const nextQuotes: Quote[] = importedData.quotes.map((quote, index) => {
          const importedQuoteNumber = (quote as { quoteNumber?: unknown }).quoteNumber;

          return {
            ...quote,
            quoteNumber:
                typeof importedQuoteNumber === "string" && importedQuoteNumber.trim()
                    ? importedQuoteNumber.trim()
                    : `${importedSettings.quotePrefix || "Q"}-${String(index + 1).padStart(3, "0")}`,
            customerId: getRemappedCustomerId(quote.customerId),
          };
        });
        const nextInvoices = sortInvoices(
            importedData.invoices.map((invoice) => ({
              ...invoice,
              customerId: getRemappedCustomerId(invoice.customerId),
            }))
        );
        const nextRecurringInvoiceTemplates = sortRecurringInvoiceTemplates(
            importedData.recurringInvoiceTemplates.map((template) => ({
              ...template,
              customerId: getRemappedCustomerId(template.customerId),
            }))
        );
        const nextScheduledJobs = importedData.scheduledJobs.map((job) => ({
          ...job,
          customerId: getRemappedCustomerId(job.customerId ?? null),
        }));
        const nextRouteChangeHistory = importedData.routeChangeHistory.map(
            (record) => ({
              ...record,
              undoCustomers: record.undoCustomers.map((customer) => ({
                ...customer,
                customerId:
                    getRemappedCustomerId(customer.customerId) ?? customer.customerId,
              })),
            })
        );

        if (workflowTablesReady.monthlyPayments && nextMonthlyPayments.length > 0) {
          const { data, error } = await supabase
              .from("monthly_payments")
              .insert(
                  nextMonthlyPayments.map((payment) =>
                      withCurrentOrganizationId(mapMonthlyPaymentToWriteRow(payment))
                  )
              )
              .select(MONTHLY_PAYMENT_SELECT_FIELDS);

          if (error) {
            throw error;
          }

          setMonthlyPayments(
              sortMonthlyPayments(
                  ((data ?? []) as MonthlyPaymentRow[]).map(
                      mapMonthlyPaymentRowToMonthlyPayment
                  )
              )
          );
        } else {
          setMonthlyPayments(sortMonthlyPayments(nextMonthlyPayments));
        }

        if (nextVisits.length > 0) {
          const { data, error } = await supabase
              .from("visits")
              .insert(
                  nextVisits.map((visit) =>
                      withCurrentOrganizationId(mapVisitToRow(visit))
                  )
              )
              .select(VISIT_SELECT_FIELDS);

          if (error) {
            throw error;
          }

          setVisitLogs(((data ?? []) as VisitRow[]).map(mapVisitRowToVisit));
        } else {
          setVisitLogs([]);
        }

        if (
            workflowTablesReady.commercialRams &&
            nextCommercialRamsDocuments.length > 0
        ) {
          const { data, error } = await supabase
              .from("commercial_rams_documents")
              .insert(
                  nextCommercialRamsDocuments.map((document) =>
                      withCurrentOrganizationId(mapCommercialRamsToRow(document))
                  )
              )
              .select(COMMERCIAL_RAMS_SELECT_FIELDS);

          if (error) {
            throw error;
          }

          setCommercialRamsDocuments(
              sortCommercialRamsDocuments(
                  (((data ?? []) as unknown) as CommercialRamsRow[]).map(
                      mapCommercialRamsRowToDocument
                  )
              )
          );
        } else {
          setCommercialRamsDocuments(nextCommercialRamsDocuments);
        }

        if (workflowTablesReady.customerLeads && nextCustomerLeads.length > 0) {
          const { data, error } = await supabase
              .from("customer_leads")
              .insert(
                  nextCustomerLeads.map((lead) =>
                      withCurrentOrganizationId(mapCustomerLeadToWriteRow(lead))
                  )
              )
              .select(CUSTOMER_LEAD_SELECT_FIELDS);

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
        } else {
          setCustomerLeads(nextCustomerLeads);
        }

        await syncQuoteItemsTable(importedSettings.quoteServices);

        if (workflowTablesReady.quotes && nextQuotes.length > 0) {
          const { data, error } = await supabase
              .from("quotes")
              .insert(nextQuotes.map((quote) => withCurrentOrganizationId(mapQuoteToRow(quote))))
              .select(QUOTE_SELECT_FIELDS);

          if (error) {
            throw error;
          }

          setQuotes(((data ?? []) as QuoteRow[]).map(mapQuoteRowToQuote));
        } else {
          setQuotes(nextQuotes);
        }

        let nextInvoicesWriteFallbackActive =
            importedData.invoicesWriteFallbackActive;

        if (workflowTablesReady.invoices && nextInvoices.length > 0) {
          const { data, error } = await supabase
              .from("invoices")
              .insert(
                  nextInvoices.map((invoice) =>
                      withCurrentOrganizationId(mapInvoiceToRow(invoice))
                  )
              )
              .select(INVOICE_SELECT_FIELDS);

          if (error) {
            if (!isInvoiceWriteFallbackError(error)) {
              throw error;
            }

            nextInvoicesWriteFallbackActive = true;
          } else {
            setInvoices(((data ?? []) as InvoiceRow[]).map(mapInvoiceRowToInvoice));
          }
        }

        if (!workflowTablesReady.invoices || nextInvoicesWriteFallbackActive) {
          setInvoices(nextInvoices);
        } else if (nextInvoices.length === 0) {
          setInvoices([]);
        }

        let nextRecurringInvoiceTemplatesFallbackActive =
            importedData.recurringInvoiceTemplatesFallbackActive;

        if (
            workflowTablesReady.recurringInvoiceTemplates &&
            nextRecurringInvoiceTemplates.length > 0
        ) {
          const { data, error } = await supabase
              .from("recurring_invoice_templates")
              .insert(
                  nextRecurringInvoiceTemplates.map((template) =>
                      withCurrentOrganizationId(
                          mapRecurringInvoiceTemplateToRow(template)
                      )
                  )
              )
              .select(RECURRING_INVOICE_TEMPLATE_SELECT_FIELDS);

          if (error) {
            if (!isRecurringInvoiceTemplateFallbackError(error)) {
              throw error;
            }

            nextRecurringInvoiceTemplatesFallbackActive = true;
          } else {
            setRecurringInvoiceTemplates(
                sortRecurringInvoiceTemplates(
                    ((data ?? []) as RecurringInvoiceTemplateRow[]).map(
                        mapRecurringInvoiceTemplateRowToTemplate
                    )
                )
            );
          }
        }

        if (
            !workflowTablesReady.recurringInvoiceTemplates ||
            nextRecurringInvoiceTemplatesFallbackActive
        ) {
          setRecurringInvoiceTemplates(nextRecurringInvoiceTemplates);
        } else if (nextRecurringInvoiceTemplates.length === 0) {
          setRecurringInvoiceTemplates([]);
        }

        if (workflowTablesReady.scheduledJobs && nextScheduledJobs.length > 0) {
          const { data, error } = await supabase
              .from("scheduled_jobs")
              .insert(
                  nextScheduledJobs.map((job) =>
                      withCurrentOrganizationId(mapScheduledJobToRow(job))
                  )
              )
              .select(SCHEDULED_JOB_SELECT_FIELDS);

          if (error) {
            throw error;
          }

          setScheduledJobs(
              ((data ?? []) as ScheduledJobRow[]).map(mapScheduledJobRowToScheduledJob)
          );
        } else {
          setScheduledJobs(nextScheduledJobs);
        }

        let staffForImport = [...importedData.staffMembers];
        const importedCurrentStaff = findMatchingStaffMember(
            staffForImport,
            currentUserId,
            currentUserEmail
        );

        if (importedCurrentStaff) {
          staffForImport = staffForImport.map((staffMember) =>
              staffMember.id === importedCurrentStaff.id
                  ? {
                    ...staffMember,
                    authUserId: currentUserId,
                    email: currentUserEmail ?? staffMember.email,
                    role: "Admin",
                    isActive: true,
                    isSystemAdmin: true,
                    updatedAt: now,
                  }
                  : staffMember
          );
        } else if (currentUserEmail) {
          const nextStaffId =
              Math.max(0, ...staffForImport.map((staffMember) => staffMember.id)) + 1;

          staffForImport = [
            {
              id: nextStaffId,
              authUserId: currentUserId,
              email: currentUserEmail,
              fullName: loggedInStaffName || formatUserNameFromEmail(currentUserEmail),
              role: "Admin",
              isActive: true,
              phone: "",
              notes: "",
              isSystemAdmin: true,
              createdAt: now,
              updatedAt: now,
            },
            ...staffForImport,
          ];
        }

        const rolePermissionsForImport =
            importedData.rolePermissions.length > 0
                ? importedData.rolePermissions
                : createDefaultRolePermissions();

        if (staffTablesReady.rolePermissions) {
          await deleteOrganizationRows("role_permissions");
        }

        if (staffTablesReady.staffMembers) {
          await deleteOrganizationRows("staff_members");

          if (staffForImport.length > 0) {
            const { data, error } = await supabase
                .from("staff_members")
                .insert(
                    staffForImport.map((staffMember) =>
                        withCurrentOrganizationId(mapStaffMemberToWriteRow(staffMember))
                    )
                )
                .select(STAFF_MEMBER_SELECT_FIELDS);

            if (error) {
              throw error;
            }

            const insertedStaffMembers = sortStaffMembers(
                ((data ?? []) as StaffMemberRow[]).map(mapStaffMemberRowToStaffMember)
            );

            setStaffMembers(insertedStaffMembers);
            const matchedStaffMember = findMatchingStaffMember(
                insertedStaffMembers,
                currentUserId,
                currentUserEmail
            );

            if (matchedStaffMember?.fullName) {
              setLoggedInStaffName(matchedStaffMember.fullName);
            }
          } else {
            setStaffMembers([]);
          }
        } else {
          setStaffMembers(sortStaffMembers(staffForImport));
        }

        if (staffTablesReady.rolePermissions) {
          if (rolePermissionsForImport.length > 0) {
            const { data, error } = await supabase
                .from("role_permissions")
                .insert(
                    rolePermissionsForImport.map((permission) =>
                        withCurrentOrganizationId(
                            mapRolePermissionToWriteRow(permission)
                        )
                    )
                )
                .select(ROLE_PERMISSION_SELECT_FIELDS);

            if (error) {
              throw error;
            }

            setRolePermissions(
                ((data ?? []) as RolePermissionRow[]).map(
                    mapRolePermissionRowToRolePermission
                )
            );
          } else {
            setRolePermissions([]);
          }
        } else {
          setRolePermissions(rolePermissionsForImport);
        }

        const normalizedImportedState = normalizePersistedAppState({
          scheduledJobs: nextScheduledJobs,
          scheduledJobChecklists: importedData.scheduledJobChecklists,
          quoteFollowUps: importedData.quoteFollowUps,
          invoiceReminders: importedData.invoiceReminders,
          quoteHistory: importedData.quoteHistory,
          invoiceHistory: importedData.invoiceHistory,
          ignoredMoveSuggestionIds: importedData.ignoredMoveSuggestionIds,
          routeChangeHistory: nextRouteChangeHistory,
          routeNotes: importedData.routeNotes,
          schedulingRecommendations: importedData.schedulingRecommendations,
          schedulingAuditLogs: importedData.schedulingAuditLogs,
          quotes: nextQuotes,
          invoices: nextInvoices,
          expenseSuppliers: importedData.expenseSuppliers,
          expenseProducts: importedData.expenseProducts,
          expenses: importedData.expenses,
          recurringInvoiceTemplates: nextRecurringInvoiceTemplates,
          lockedRounds: importedData.lockedRounds,
          activeRoundCycles: importedData.activeRoundCycles,
          pendingCashPaymentDates: importedData.pendingCashPaymentDates,
          selectedWeek: importedData.selectedWeek,
          selectedDay: importedData.selectedDay,
          appSettings: importedSettings,
          quotesTableInitialized:
              importedData.quotesTableInitialized || nextQuotes.length > 0,
          invoicesWriteFallbackActive: nextInvoicesWriteFallbackActive,
          recurringInvoiceTemplatesFallbackActive:
              nextRecurringInvoiceTemplatesFallbackActive,
        });

        setCustomers(nextCustomers);
        setExpenseSuppliers(normalizedImportedState.expenseSuppliers);
        setExpenseProducts(normalizedImportedState.expenseProducts);
        setExpenses(normalizedImportedState.expenses);
        setInvoicesWriteFallbackActive(nextInvoicesWriteFallbackActive);
        setRecurringInvoiceTemplatesFallbackActive(
            nextRecurringInvoiceTemplatesFallbackActive
        );
        setScheduledJobChecklists(normalizedImportedState.scheduledJobChecklists);
        setQuoteFollowUps(normalizedImportedState.quoteFollowUps);
        setInvoiceReminders(normalizedImportedState.invoiceReminders);
        setQuoteHistory(normalizedImportedState.quoteHistory);
        setInvoiceHistory(normalizedImportedState.invoiceHistory);
        setIgnoredMoveSuggestionIds(normalizedImportedState.ignoredMoveSuggestionIds);
        setRouteChangeHistory(normalizedImportedState.routeChangeHistory);
        setRouteNotes(normalizedImportedState.routeNotes);
        setSchedulingRecommendations(
            normalizedImportedState.schedulingRecommendations
        );
        setSchedulingAuditLogs(normalizedImportedState.schedulingAuditLogs);
        setLockedRounds(normalizedImportedState.lockedRounds);
        setActiveRoundCycles(normalizedImportedState.activeRoundCycles);
        setPendingCashPaymentDates(normalizedImportedState.pendingCashPaymentDates);
        setSelectedWeek(normalizedImportedState.selectedWeek);
        setSelectedDay(normalizedImportedState.selectedDay);
        setQuotesTableInitialized(normalizedImportedState.quotesTableInitialized);
        setAppSettings(importedSettings);
        setSelectedCustomerId(null);
        setSelectedQuoteId(null);
        setSelectedInvoiceId(null);
        setSelectedScheduledJobId(null);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
              SETTINGS_STORAGE_KEY,
              JSON.stringify(importedSettings)
          );
          writeStoredBooleanPreference(
              HELP_ENABLED_STORAGE_KEY,
              importedSettings.helpEnabled
          );
        }

        const { error: organizationError } = await supabase
            .from("organizations")
            .update({
              default_rotation_weeks: importedSettings.defaultRotationWeeks,
              updated_at: now,
            })
            .eq("id", organizationId);

        if (organizationError) {
          throw organizationError;
        }

        await persistAppStateSnapshot(
            buildPersistedAppState({
              ...normalizedImportedState,
              appSettings: importedSettings,
              quotes: nextQuotes,
              invoices: nextInvoices,
              recurringInvoiceTemplates: nextRecurringInvoiceTemplates,
              scheduledJobs: nextScheduledJobs,
              invoicesWriteFallbackActive: nextInvoicesWriteFallbackActive,
              recurringInvoiceTemplatesFallbackActive:
                  nextRecurringInvoiceTemplatesFallbackActive,
            })
        );

        setDatabaseError(
            getDatabaseSetupNotice(workflowTablesReady, staffTablesReady)
        );
      },
      [
        activeSubscriptionPlan.customerLimit,
        activeSubscriptionPlan.name,
        buildPersistedAppState,
        currentUserEmail,
        currentUserId,
        getWritableOrganizationId,
        hasGrowthPlan,
        loggedInStaffName,
        persistAppStateSnapshot,
        staffTablesReady,
        syncQuoteItemsTable,
        withCurrentOrganizationId,
        workflowTablesReady,
      ]
  );

  async function createCustomer(customer: Customer) {
    if (customers.length >= activeSubscriptionPlan.customerLimit) {
      const limitHelp =
          activeSubscriptionPlan.key === "starter"
              ? " Upgrade to Growth to add more."
              : "";

      throw new Error(
          `${activeSubscriptionPlan.name} allows up to ${activeSubscriptionPlan.customerLimit.toLocaleString()} customers.${limitHelp}`
      );
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from("customers")
        .insert(withCurrentOrganizationId(mapCustomerToRow(customer)))
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
        .update(withCurrentOrganizationId(mapCustomerToRow(updatedCustomer)))
        .eq("id", updatedCustomer.id)
        .eq("organization_id", getWritableOrganizationId())
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
    const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId)
        .eq("organization_id", getWritableOrganizationId());

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
          .eq("organization_id", getWritableOrganizationId())
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
          .update(withCurrentOrganizationId(mapCustomerLeadToWriteRow(nextLead)))
          .eq("id", nextLead.id)
          .eq("organization_id", getWritableOrganizationId())
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
          .eq("organization_id", getWritableOrganizationId())
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
      cutFrequency: getCutFrequencyFromRotationWeeks(defaultRotationWeeks),
      rotationWeeksOverride: null,
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
          .eq("organization_id", getWritableOrganizationId())
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
            withCurrentOrganizationId(
                mapMonthlyPaymentToWriteRow({
                  customerId,
                  paymentMonth: normalizedMonth,
                  paymentDate,
                })
            ),
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
          .insert(withCurrentOrganizationId(mapCommercialRamsToRow(payload)))
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
          .update(withCurrentOrganizationId(mapCommercialRamsToRow(payload)))
          .eq("id", payload.id)
          .eq("organization_id", getWritableOrganizationId())
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
            .eq("id", documentId)
            .eq("organization_id", getWritableOrganizationId());

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
                .update(withCurrentOrganizationId(payload))
                .eq("id", visit.id)
                .eq("organization_id", getWritableOrganizationId())
            : supabase.from("visits").insert(withCurrentOrganizationId(payload));

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
          .eq("organization_id", getWritableOrganizationId())
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
          .insert(withCurrentOrganizationId(mapQuoteToRow(quote)))
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
          .update(withCurrentOrganizationId(mapQuoteToRow(updatedQuote)))
          .eq("id", updatedQuote.id)
          .eq("organization_id", getWritableOrganizationId())
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
          .insert(withCurrentOrganizationId(mapInvoiceToRow(invoice)))
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
          .update(withCurrentOrganizationId(mapInvoiceToRow(updatedInvoice)))
          .eq("id", updatedInvoice.id)
          .eq("organization_id", getWritableOrganizationId())
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

  async function createInvoicePaymentLink(invoiceId: string) {
    const response = await fetch("/api/invoices/payment-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invoiceId }),
    });
    const body = (await response.json().catch(() => null)) as
        | {
            invoice?: {
              id?: string;
              stripeCheckoutSessionId?: string | null;
              stripePaymentLinkUrl?: string | null;
              stripePaymentStatus?: StripeInvoicePaymentStatus | null;
              stripePaymentIntentId?: string | null;
              stripePaymentCompletedAt?: string | null;
              status?: InvoiceStatus;
            };
            error?: string;
          }
        | null;

    if (!response.ok || !body?.invoice) {
      throw new Error(body?.error || "Unable to create the invoice payment link.");
    }

    const existingInvoice =
        invoices.find((invoice) => invoice.id === invoiceId) ?? null;
    const updatedInvoice: Invoice | null = existingInvoice
        ? {
            ...existingInvoice,
            status: body.invoice.status ?? existingInvoice.status,
            stripeCheckoutSessionId:
                body.invoice.stripeCheckoutSessionId ?? undefined,
            stripePaymentLinkUrl: body.invoice.stripePaymentLinkUrl ?? undefined,
            stripePaymentStatus:
                body.invoice.stripePaymentStatus ??
                existingInvoice.stripePaymentStatus,
            stripePaymentIntentId:
                body.invoice.stripePaymentIntentId ??
                existingInvoice.stripePaymentIntentId,
            stripePaymentCompletedAt:
                body.invoice.stripePaymentCompletedAt ??
                existingInvoice.stripePaymentCompletedAt,
          }
        : null;

    setInvoices((prev) =>
        sortInvoices(
            prev.map((invoice) =>
                invoice.id === invoiceId && updatedInvoice ? updatedInvoice : invoice
            )
        )
    );

    if (updatedInvoice) {
      appendInvoiceHistory(
          invoiceId,
          createDocumentHistoryEntry(
              "updated",
              `Created Stripe payment link for invoice ${
                  updatedInvoice.invoiceNumber
              }.`
          )
      );
    }

    return updatedInvoice;
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
            `Sent by email${
                metadata.recipient ? ` to ${metadata.recipient.trim()}` : ""
            }.`,
            metadata
        )
    );
  }

  async function updateQuoteStatusFromList(
      quoteId: string,
      status: QuoteStatus
  ) {
    const existingQuote = quotes.find((quote) => quote.id === quoteId) ?? null;

    if (!existingQuote) {
      return;
    }

    const nextStatus = normalizeQuoteStatus(status);

    if (existingQuote.status === nextStatus) {
      if (
          nextStatus === "Accepted" &&
          !hasScheduledJobForQuote(existingQuote.id) &&
          !hasPendingSchedulingSuggestionForQuote(existingQuote.id)
      ) {
        await handleAcceptedQuoteScheduling(existingQuote);
      }

      return;
    }

    const nextQuote: Quote = {
      ...existingQuote,
      status: nextStatus,
    };
    const quoteSaved = await saveQuoteRecord(nextQuote);

    if (!quoteSaved) {
      return;
    }

    appendQuoteHistory(
        quoteId,
        createDocumentHistoryEntry(
            "updated",
            `Marked quote ${existingQuote.quoteNumber} as ${nextStatus}.`
        )
    );

    if (nextStatus === "Accepted") {
      await handleAcceptedQuoteScheduling(nextQuote);
    }
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
            `Sent by email${
                metadata.recipient ? ` to ${metadata.recipient.trim()}` : ""
            }.`,
            metadata
        )
    );
  }

  async function updateInvoiceStatusFromList(
      invoiceId: string,
      status: InvoiceStatus
  ) {
    const existingInvoice =
        invoices.find((invoice) => invoice.id === invoiceId) ?? null;

    if (!existingInvoice) {
      return;
    }

    const nextStatus = normalizeInvoiceStatus(status);

    if (existingInvoice.status === nextStatus) {
      return;
    }

    const invoiceSaved = await saveInvoiceRecord({
      ...existingInvoice,
      status: nextStatus,
    });

    if (!invoiceSaved) {
      return;
    }

    appendInvoiceHistory(
        invoiceId,
        createDocumentHistoryEntry(
            "updated",
            `Marked invoice ${existingInvoice.invoiceNumber} as ${nextStatus}.`
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
          .upsert(withCurrentOrganizationId(mapRecurringInvoiceTemplateToRow(payload)), {
            onConflict: "id",
          })
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
            .eq("id", templateId)
            .eq("organization_id", getWritableOrganizationId());

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
            .eq("organization_id", getWritableOrganizationId())
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
              .eq("organization_id", getWritableOrganizationId())
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
                    .eq("organization_id", getWritableOrganizationId())
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
            .eq("id", invoiceId)
            .eq("organization_id", getWritableOrganizationId());

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

  function normalizeScheduledJobAssignment(job: ScheduledJob): ScheduledJob {
    const assignedStaffName =
        job.assignedStaffId != null
            ? staffNameById.get(job.assignedStaffId) ?? job.assignedStaffName
            : job.assignedStaffName;

    return {
      ...job,
      assignedStaffId: job.assignedStaffId ?? null,
      assignedStaffName: assignedStaffName?.trim() || undefined,
    };
  }

  function getDefaultJobAssignment() {
    const assignedStaffId = defaultAssignedStaffId;

    return {
      assignedStaffId,
      assignedStaffName:
          assignedStaffId != null
              ? staffNameById.get(assignedStaffId)
              : undefined,
    };
  }

  async function createScheduledJobRecord(job: ScheduledJob) {
    const nextJob = normalizeScheduledJobAssignment(job);

    if (!workflowTablesReady.scheduledJobs) {
      setScheduledJobs((prev) =>
          [...prev, nextJob].sort((a, b) => a.date.localeCompare(b.date))
      );
      return nextJob;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
          .from("scheduled_jobs")
          .insert(withCurrentOrganizationId(mapScheduledJobToRow(nextJob)))
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
    const nextJob = normalizeScheduledJobAssignment(updatedJob);

    if (!workflowTablesReady.scheduledJobs) {
      setScheduledJobs((prev) =>
          prev
              .map((job) => (job.id === nextJob.id ? nextJob : job))
              .sort((a, b) => a.date.localeCompare(b.date))
      );
      return nextJob;
    }

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
          .from("scheduled_jobs")
          .update(withCurrentOrganizationId(mapScheduledJobToRow(nextJob)))
          .eq("id", nextJob.id)
          .eq("organization_id", getWritableOrganizationId())
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
            .eq("id", jobId)
            .eq("organization_id", getWritableOrganizationId());

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

    const activeStaffCount = staffMembers.filter(
        (staffMember) => staffMember.isActive
    ).length;

    if (values.isActive && activeStaffCount >= activeStaffLimit) {
      throw new Error(
          `${activeSubscriptionPlan.name} allows up to ${activeStaffLimit} active staff account${activeStaffLimit === 1 ? "" : "s"}.`
      );
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from("staff_members")
        .insert(
            withCurrentOrganizationId(
                mapStaffMemberToWriteRow({
                  ...values,
                  authUserId: null,
                  isSystemAdmin: false,
                })
            )
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

    const activeStaffCountExcludingCurrent = staffMembers.filter(
        (staffMember) => staffMember.isActive && staffMember.id !== staffMemberId
    ).length;

    if (
        nextIsActive &&
        !existingStaffMember.isSystemAdmin &&
        activeStaffCountExcludingCurrent >= activeStaffLimit
    ) {
      throw new Error(
          `${activeSubscriptionPlan.name} allows up to ${activeStaffLimit} active staff account${activeStaffLimit === 1 ? "" : "s"}.`
      );
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from("staff_members")
        .update(
            withCurrentOrganizationId(
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
        )
        .eq("id", staffMemberId)
        .eq("organization_id", getWritableOrganizationId())
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
        .eq("id", staffMemberId)
        .eq("organization_id", getWritableOrganizationId());

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
            withCurrentOrganizationId(
                mapRolePermissionToWriteRow({
                  role,
                  pageKey,
                  allowed,
                })
            ),
            {
              onConflict: "organization_id,role,page_key",
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

  const shouldRestrictWorkToCurrentStaff =
      staffSystemReady && !currentUserIsAdmin && Boolean(currentStaffMember?.id);
  const visibleRoundCustomers = useMemo(() => {
    if (!shouldRestrictWorkToCurrentStaff || !currentStaffMember?.id) {
      return customers;
    }

    return customers.filter(
        (customer) =>
            customer.isGrassCuttingCustomer &&
            customer.assignedStaffId === currentStaffMember.id
    );
  }, [currentStaffMember?.id, customers, shouldRestrictWorkToCurrentStaff]);
  const visibleScheduledJobs = useMemo(() => {
    if (!shouldRestrictWorkToCurrentStaff || !currentStaffMember?.id) {
      return scheduledJobs;
    }

    return scheduledJobs.filter(
        (job) => job.assignedStaffId === currentStaffMember.id
    );
  }, [
    currentStaffMember?.id,
    scheduledJobs,
    shouldRestrictWorkToCurrentStaff,
  ]);

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
        total: formatTemplateCurrency(activeWorkflowQuote.total, appSettings.currencyCode),
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
        total: formatTemplateCurrency(activeWorkflowInvoice.total, appSettings.currencyCode),
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

    if (!payload.emailRecipient) {
      throw new Error("Choose an email recipient before sending.");
    }

    await sendCustomerEmailMessage({
      recipient: payload.emailRecipient,
      subject: payload.emailSubject,
      message: payload.emailMessage,
      businessDetails: appSettings,
    });

    if (workflowMessageTarget.kind === "quote_follow_up") {
      await logQuoteFollowUpSent(workflowMessageTarget.quoteId);
    } else {
      await logInvoiceReminderSent(workflowMessageTarget.invoiceId);
    }

    setWorkflowMessageTarget(null);

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
    if (isHydrating || page !== "scheduledJobProfile" || selectedScheduledJob) {
      return;
    }

    setSelectedScheduledJobId(null);
    navigateToPage(jobProfileBackPage);
  }, [isHydrating, jobProfileBackPage, page, selectedScheduledJob]);

  useEffect(() => {
    if (
        isHydrating ||
        page !== "scheduledJobProfile" ||
        !shouldRestrictWorkToCurrentStaff ||
        !selectedScheduledJobId
    ) {
      return;
    }

    const canViewSelectedJob = visibleScheduledJobs.some(
        (job) => job.id === selectedScheduledJobId
    );

    if (!canViewSelectedJob) {
      setSelectedScheduledJobId(null);
      navigateToPage(jobProfileBackPage);
    }
  }, [
    isHydrating,
    jobProfileBackPage,
    page,
    selectedScheduledJobId,
    shouldRestrictWorkToCurrentStaff,
    visibleScheduledJobs,
  ]);

  useEffect(() => {
    if (isHydrating || page !== "customerProfile" || selectedCustomer) {
      return;
    }

    setSelectedCustomerId(null);
    navigateToPage("customers");
  }, [isHydrating, page, selectedCustomer]);

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

  function hasScheduledJobForQuote(quoteId: string) {
    return scheduledJobs.some((job) => (job.quoteIds ?? []).includes(quoteId));
  }

  function hasPendingSchedulingSuggestionForQuote(quoteId: string) {
    return schedulingRecommendations.some(
        (entry) => entry.quoteId === quoteId && entry.status === "pending"
    );
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
    const defaultQuoteAssignment = getDefaultJobAssignment();

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
      assignedStaffId:
          existingJob?.assignedStaffId ?? defaultQuoteAssignment.assignedStaffId,
      hasExistingJob: Boolean(existingJob),
    });
  }

  function getSchedulingServiceRoundDateKeys(searchDays = 60) {
    const today = new Date();
    const dateKeys = new Set<string>();

    for (let offset = 0; offset < searchDays; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const panelState = getTodayPanelState(date, defaultRotationWeeks);

      if (!panelState.selectedDay) {
        continue;
      }

      const hasRoundCustomers = customers.some(
          (customer) =>
              customer.isGrassCuttingCustomer &&
              customer.day === panelState.selectedDay &&
              isCustomerDueInSelectedWeek(
                  customer,
                  panelState.week,
                  defaultRotationWeeks
              )
      );

      if (hasRoundCustomers) {
        dateKeys.add(getInputDateValue(date.toISOString()) || date.toISOString().slice(0, 10));
      }
    }

    scheduledJobs.forEach((job) => {
      if (job.type === "Grass Cut" || job.type === "Commercial") {
        const dateKey = getInputDateValue(job.date);

        if (dateKey) {
          dateKeys.add(dateKey);
        }
      }
    });

    return Array.from(dateKeys);
  }

  function getSchedulingJobPostcode(job: ScheduledJob) {
    if (job.postcode?.trim()) {
      return job.postcode.trim();
    }

    const customer =
        job.customerId != null ? customerMap.get(job.customerId) ?? null : null;

    return (
      customer?.sitePostcode?.trim() ||
      customer?.postcode?.trim() ||
      undefined
    );
  }

  function getSchedulingQuotePostcode(quote: Quote) {
    return (
      quote.sitePostcode?.trim() ||
      quote.customerPostcode?.trim() ||
      undefined
    );
  }

  function getSchedulingDecision(quote: Quote) {
    return chooseSchedulingSlot({
      settings: appSettings.autoScheduling,
      quote: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        customerId: quote.customerId,
        customerName: quote.customerName,
        customerAddress: quote.customerAddress,
        customerPostcode: quote.customerPostcode,
        siteAddress: quote.siteAddress,
        sitePostcode: quote.sitePostcode,
        workType: quote.workType,
        estimatedDurationMinutes: quote.estimatedDurationMinutes,
        autoSchedulingPreference: quote.autoSchedulingPreference,
        autoSchedulingDisabled: quote.autoSchedulingDisabled,
        serviceRoundSchedulingPreference: quote.serviceRoundSchedulingPreference,
      },
      jobs: scheduledJobs.map((job) => ({
        id: job.id,
        title: job.title,
        date: job.date,
        startTime: job.startTime,
        finishTime: job.finishTime,
        customerId: job.customerId,
        customerName: job.customerName,
        type: job.type,
        status: job.status,
        quoteIds: job.quoteIds,
        workType: job.workType,
        postcode: getSchedulingJobPostcode(job),
        estimatedDurationMinutes: job.estimatedDurationMinutes,
      })),
      serviceRoundDateKeys: getSchedulingServiceRoundDateKeys(),
      now: new Date(),
      searchDays: 60,
    });
  }

  function buildSchedulingAuditLog(
      quote: Quote,
      decision: SchedulingDecision,
      emailStatus: {
        customerEmailSent?: boolean;
        operatorEmailSent?: boolean;
        customerEmailError?: string;
        operatorEmailError?: string;
      } = {}
  ): SchedulingAuditLog {
    return {
      id: crypto.randomUUID(),
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      customerId: quote.customerId,
      customerName: quote.customerName,
      chosenDate: decision.slot?.date,
      startTime: decision.slot?.startTime,
      finishTime: decision.slot?.finishTime,
      estimatedDurationMinutes: decision.estimatedDurationMinutes,
      workType: decision.workType,
      postcode: decision.postcode ?? getSchedulingQuotePostcode(quote),
      reason: decision.reason,
      reasonLabel: decision.reasonLabel,
      rejectedCandidates: decision.rejectedCandidates,
      status: decision.status,
      customerEmailSent: emailStatus.customerEmailSent === true,
      operatorEmailSent: emailStatus.operatorEmailSent === true,
      customerEmailError: emailStatus.customerEmailError,
      operatorEmailError: emailStatus.operatorEmailError,
      createdAt: new Date().toISOString(),
    };
  }

  function addSchedulingAuditLog(log: SchedulingAuditLog) {
    setSchedulingAuditLogs((previousLogs) => [log, ...previousLogs].slice(0, 200));
  }

  async function sendSchedulingNotifications(
      quote: Quote,
      decision: SchedulingDecision
  ) {
    const result: {
      customerEmailSent: boolean;
      operatorEmailSent: boolean;
      customerEmailError?: string;
      operatorEmailError?: string;
    } = {
      customerEmailSent: false,
      operatorEmailSent: false,
    };
    const customer =
        quote.customerId != null ? customerMap.get(quote.customerId) ?? null : null;
    const customerRecipient = customer
        ? getCustomerEmailAddresses(customer)[0]
        : undefined;
    const operatorRecipient =
        appSettings.businessEmail.trim() || currentUserEmail?.trim() || "";
    const emailDrafts = buildSchedulingEmailDrafts({
      quote: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        customerId: quote.customerId,
        customerName: quote.customerName,
        customerAddress: quote.customerAddress,
        customerPostcode: quote.customerPostcode,
        siteAddress: quote.siteAddress,
        sitePostcode: quote.sitePostcode,
      },
      decision,
      businessName: getBusinessDisplayName(appSettings),
      businessEmail: appSettings.businessEmail,
      businessPhone: appSettings.businessPhone,
    });

    if (customerRecipient) {
      try {
        await sendCustomerEmailMessage({
          recipient: customerRecipient,
          subject: emailDrafts.customerSubject,
          message: emailDrafts.customerMessage,
          businessDetails: appSettings,
        });
        result.customerEmailSent = true;
      } catch (error) {
        result.customerEmailError = isErrorWithMessage(error)
            ? error.message
            : "Unable to send customer scheduling email.";
      }
    } else {
      result.customerEmailError = "No customer email address saved.";
    }

    if (operatorRecipient) {
      try {
        await sendCustomerEmailMessage({
          recipient: operatorRecipient,
          subject: emailDrafts.operatorSubject,
          message: emailDrafts.operatorMessage,
          businessDetails: appSettings,
        });
        result.operatorEmailSent = true;
      } catch (error) {
        result.operatorEmailError = isErrorWithMessage(error)
            ? error.message
            : "Unable to send operator scheduling email.";
      }
    } else {
      result.operatorEmailError = "No operator email address configured.";
    }

    return result;
  }

  async function createPendingSchedulingSuggestion(
      quote: Quote,
      decision: SchedulingDecision
  ) {
    if (!decision.slot) {
      return false;
    }

    const recommendation: SchedulingRecommendationRecord = {
      id: crypto.randomUUID(),
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      customerId: quote.customerId,
      customerName: quote.customerName,
      slot: decision.slot,
      reason: decision.reason,
      reasonLabel: decision.reasonLabel,
      workType: decision.workType,
      estimatedDurationMinutes: decision.estimatedDurationMinutes ?? 0,
      postcode: decision.postcode,
      rejectedCandidates: decision.rejectedCandidates,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setSchedulingRecommendations((previousRecommendations) => [
      recommendation,
      ...previousRecommendations.filter(
          (entry) => entry.quoteId !== quote.id || entry.status !== "pending"
      ),
    ]);

    const quoteSaved = await saveQuoteRecord({
      ...quote,
      schedulingStatus: "suggested",
    });

    appendQuoteHistory(
        quote.id,
        createDocumentHistoryEntry(
            "updated",
            `Suggested scheduling slot for ${quote.quoteNumber}: ${decision.slot.date} ${decision.slot.startTime}-${decision.slot.finishTime}.`
        )
    );
    addSchedulingAuditLog(buildSchedulingAuditLog(quote, decision));

    return quoteSaved;
  }

  async function scheduleQuoteAtSlot(
      quote: Quote,
      slot: SchedulingSlot,
      decision: Pick<
          SchedulingDecision,
          "reason" | "reasonLabel" | "workType" | "estimatedDurationMinutes" | "postcode"
      >,
      options: { autoScheduled: boolean }
  ) {
    const relatedInvoiceIds = invoices
        .filter((invoice) => invoice.linkedQuoteId === quote.id)
        .map((invoice) => invoice.id);
    const existingJob =
        scheduledJobs.find((job) => (job.quoteIds ?? []).includes(quote.id)) ?? null;
    const jobAssignment =
        existingJob?.assignedStaffId != null
            ? {
                assignedStaffId: existingJob.assignedStaffId,
                assignedStaffName:
                    staffNameById.get(existingJob.assignedStaffId) ??
                    existingJob.assignedStaffName,
              }
            : getDefaultJobAssignment();
    const baseJob: ScheduledJob = {
      id: existingJob?.id ?? crypto.randomUUID(),
      title: existingJob?.title?.trim() || `Quoted Work - ${quote.customerName}`,
      date: slot.date,
      notes: quote.notes ?? existingJob?.notes ?? "",
      startTime: slot.startTime,
      finishTime: slot.finishTime,
      customerId: quote.customerId ?? existingJob?.customerId ?? null,
      customerName: quote.customerName,
      type: "Quote Accepted",
      status: existingJob?.status === "Cancelled" ? "Scheduled" : existingJob?.status ?? "Scheduled",
      quoteIds: Array.from(new Set([...(existingJob?.quoteIds ?? []), quote.id])),
      invoiceIds: Array.from(
          new Set([...(existingJob?.invoiceIds ?? []), ...relatedInvoiceIds])
      ),
      sourceQuoteId: quote.id,
      workType: decision.workType ?? quote.workType,
      estimatedDurationMinutes:
          decision.estimatedDurationMinutes ?? quote.estimatedDurationMinutes,
      postcode: decision.postcode ?? getSchedulingQuotePostcode(quote),
      autoScheduled: options.autoScheduled,
      autoScheduleReason: decision.reason,
      autoScheduleReasonLabel: decision.reasonLabel,
      assignedStaffId: jobAssignment.assignedStaffId ?? null,
      assignedStaffName: jobAssignment.assignedStaffName,
      createdAt: existingJob?.createdAt ?? new Date().toISOString(),
    };
    const persistedJob = existingJob
        ? await saveScheduledJobRecord(baseJob)
        : await createScheduledJobRecord(baseJob);

    return persistedJob;
  }

  async function handleAcceptedQuoteScheduling(quote: Quote) {
    const decision = getSchedulingDecision(quote);

    if (decision.status === "skipped" || decision.status === "manual_required") {
      await saveQuoteRecord({
        ...quote,
        schedulingStatus: decision.status === "skipped" ? "skipped" : "manual_required",
      });
      addSchedulingAuditLog(buildSchedulingAuditLog(quote, decision));
      return;
    }

    if (!decision.slot) {
      await saveQuoteRecord({
        ...quote,
        schedulingStatus: "manual_required",
      });
      addSchedulingAuditLog(
          buildSchedulingAuditLog(quote, {
            ...decision,
            status: "manual_required",
            reason: "no_available_slot",
            reasonLabel: "needs manual scheduling",
          })
      );
      return;
    }

    if (decision.status === "suggested") {
      await createPendingSchedulingSuggestion(quote, decision);
      return;
    }

    const scheduledJob = await scheduleQuoteAtSlot(quote, decision.slot, decision, {
      autoScheduled: true,
    });

    if (!scheduledJob) {
      await createPendingSchedulingSuggestion(quote, {
        ...decision,
        status: "suggested",
        effectiveMode: "suggest",
      });
      return;
    }

    const emailStatus = await sendSchedulingNotifications(quote, decision);

    await saveQuoteRecord({
      ...quote,
      status: "Scheduled",
      schedulingStatus: "scheduled",
      autoScheduledJobId: scheduledJob.id,
    });
    appendQuoteHistory(
        quote.id,
        createDocumentHistoryEntry(
            "updated",
            `Auto-scheduled quote ${quote.quoteNumber} for ${decision.slot.date} ${decision.slot.startTime}-${decision.slot.finishTime}.`
        )
    );
    addSchedulingAuditLog(buildSchedulingAuditLog(quote, decision, emailStatus));
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
    if (!hasGrowthPlan && job.type === "Commercial") {
      throw new Error("Commercial job tools are available on Growth.");
    }

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
      const shouldRunScheduling =
          nextQuote.status === "Accepted" &&
          !hasScheduledJobForQuote(nextQuote.id) &&
          !hasPendingSchedulingSuggestionForQuote(nextQuote.id) &&
          (
              existingQuote.status !== "Accepted" ||
              !existingQuote.schedulingStatus ||
              existingQuote.schedulingStatus === "manual_required" ||
              existingQuote.estimatedDurationMinutes !== nextQuote.estimatedDurationMinutes ||
              existingQuote.workType !== nextQuote.workType ||
              existingQuote.autoSchedulingPreference !== nextQuote.autoSchedulingPreference
          );

      const quoteSaved = await saveQuoteRecord(nextQuote);

      if (quoteSaved) {
        appendQuoteHistory(
            nextQuote.id,
            createDocumentHistoryEntry(
                "updated",
                describeQuoteChanges(existingQuote, nextQuote)
            )
        );
        if (shouldRunScheduling) {
          await handleAcceptedQuoteScheduling(nextQuote);
        }
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
    const shouldRunScheduling = nextQuote.status === "Accepted";

    const quoteCreated = await createQuoteRecord(nextQuote);

    if (quoteCreated) {
      appendQuoteHistory(
          nextQuote.id,
          createDocumentHistoryEntry(
              "created",
              `Created quote ${nextQuote.quoteNumber}.`
          )
      );
      if (shouldRunScheduling) {
        await handleAcceptedQuoteScheduling(nextQuote);
      }
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
      assignedStaffId,
    }: {
      quoteId: string;
      date: string;
      startTime: string;
      finishTime: string;
      assignedStaffId?: number | null;
    }) {
    const context = getQuoteSchedulingContext(quoteId);

    if (!context) {
      return false;
    }

    const { quote, relatedInvoiceIds, existingJob } = context;

    const trimmedStartTime = startTime.trim();
    const trimmedFinishTime = finishTime.trim();
    const selectedAssignment =
        assignedStaffId !== undefined
            ? {
                assignedStaffId,
                assignedStaffName:
                    assignedStaffId != null
                        ? staffNameById.get(assignedStaffId)
                        : undefined,
              }
            : getDefaultJobAssignment();

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
        sourceQuoteId: quote.id,
        workType: quote.workType ?? existingJob.workType,
        estimatedDurationMinutes:
            quote.estimatedDurationMinutes ?? existingJob.estimatedDurationMinutes,
        postcode: getSchedulingQuotePostcode(quote) ?? existingJob.postcode,
        autoScheduled: false,
        assignedStaffId: selectedAssignment.assignedStaffId ?? null,
        assignedStaffName: selectedAssignment.assignedStaffName,
      };

      const persistedJob = await saveScheduledJobRecord(updatedJob);

      if (!persistedJob) {
        return false;
      }

      const quoteSaved = await saveQuoteRecord({
        ...quote,
        status: "Scheduled",
        schedulingStatus: "scheduled",
        autoScheduledJobId: persistedJob.id,
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
      sourceQuoteId: quote.id,
      workType: quote.workType,
      estimatedDurationMinutes: quote.estimatedDurationMinutes,
      postcode: getSchedulingQuotePostcode(quote),
      autoScheduled: false,
      assignedStaffId: selectedAssignment.assignedStaffId ?? null,
      assignedStaffName: selectedAssignment.assignedStaffName,
      createdAt: new Date().toISOString(),
    };

    const persistedJob = await createScheduledJobRecord(newJob);

    if (!persistedJob) {
      return false;
    }

    const quoteSaved = await saveQuoteRecord({
      ...quote,
      status: "Scheduled",
      schedulingStatus: "scheduled",
      autoScheduledJobId: persistedJob.id,
    });

    if (!quoteSaved) {
      return false;
    }

    setPendingQuoteSchedule(null);
    return true;
  }

  async function acceptSchedulingRecommendation(recommendationId: string) {
    const recommendation =
        schedulingRecommendations.find(
            (entry) => entry.id === recommendationId && entry.status === "pending"
        ) ?? null;

    if (!recommendation) {
      return;
    }

    const context = getQuoteSchedulingContext(recommendation.quoteId);

    if (!context) {
      return;
    }

    const { quote } = context;
    const decision: SchedulingDecision = {
      status: "scheduled",
      effectiveMode: "suggest",
      reason: recommendation.reason,
      reasonLabel: recommendation.reasonLabel,
      slot: recommendation.slot,
      estimatedDurationMinutes: recommendation.estimatedDurationMinutes,
      workType: recommendation.workType,
      postcode: recommendation.postcode,
      rejectedCandidates: recommendation.rejectedCandidates,
    };
    const scheduledJob = await scheduleQuoteAtSlot(
        quote,
        recommendation.slot,
        decision,
        { autoScheduled: false }
    );

    if (!scheduledJob) {
      addSchedulingAuditLog(
          buildSchedulingAuditLog(quote, {
            ...decision,
            status: "manual_required",
            reason: "no_available_slot",
            reasonLabel: "needs manual scheduling",
          })
      );
      return;
    }

    await saveQuoteRecord({
      ...quote,
      status: "Scheduled",
      schedulingStatus: "scheduled",
      autoScheduledJobId: scheduledJob.id,
    });
    setSchedulingRecommendations((previousRecommendations) =>
        previousRecommendations.map((entry) =>
            entry.id === recommendation.id
                ? { ...entry, status: "accepted", decidedAt: new Date().toISOString() }
                : entry
        )
    );
    addSchedulingAuditLog(buildSchedulingAuditLog(quote, decision));
  }

  async function rejectSchedulingRecommendation(recommendationId: string) {
    const recommendation =
        schedulingRecommendations.find(
            (entry) => entry.id === recommendationId && entry.status === "pending"
        ) ?? null;

    if (!recommendation) {
      return;
    }

    const quote = quotes.find((entry) => entry.id === recommendation.quoteId) ?? null;
    const decidedAt = new Date().toISOString();

    setSchedulingRecommendations((previousRecommendations) =>
        previousRecommendations.map((entry) =>
            entry.id === recommendation.id
                ? { ...entry, status: "rejected", decidedAt }
                : entry
        )
    );

    if (quote) {
      await saveQuoteRecord({
        ...quote,
        schedulingStatus: "manual_required",
      });
      addSchedulingAuditLog(
          buildSchedulingAuditLog(quote, {
            status: "manual_required",
            effectiveMode: "suggest",
            reason: "no_available_slot",
            reasonLabel: "suggestion rejected",
            slot: recommendation.slot,
            estimatedDurationMinutes: recommendation.estimatedDurationMinutes,
            workType: recommendation.workType,
            postcode: recommendation.postcode,
            rejectedCandidates: recommendation.rejectedCandidates,
          })
      );
    }
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

    const invoiceCreated = await createInvoiceRecord(newInvoice, {
      navigateAfterSave: false,
    });

    if (!invoiceCreated) {
      return;
    }

    appendInvoiceHistory(
        newInvoice.id,
        createDocumentHistoryEntry(
            "created",
            `Created invoice ${newInvoice.invoiceNumber} from quote ${quote.quoteNumber}.`
        )
    );

    const relatedJobs = scheduledJobs.filter((job) =>
        (job.quoteIds ?? []).includes(quote.id)
    );

    for (const job of relatedJobs) {
      await saveScheduledJobRecord({
        ...job,
        invoiceIds: Array.from(new Set([...(job.invoiceIds ?? []), newInvoice.id])),
      });
    }

    setSelectedInvoiceId(newInvoice.id);
    setSelectedCustomerId(newInvoice.customerId ?? null);
    navigateToPage("invoiceForm");
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
                isCustomerDueInSelectedWeek(
                    existingCustomer,
                    customerWeek,
                    defaultRotationWeeks
                ) &&
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
      week: normalizeWeekNumber(
          customer.week as WeekName | string | number | null | undefined,
          getEffectiveRotationWeeks(customer as Partial<Customer> as Customer, defaultRotationWeeks)
      ),
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

    const effectiveRotationWeeks = getEffectiveRotationWeeks(
        nextCustomer as Partial<Customer> as Customer,
        defaultRotationWeeks
    );
    nextCustomer.week = normalizeWeekNumber(
        nextCustomer.week as WeekName | string | number | null | undefined,
        effectiveRotationWeeks
    );
    nextCustomer.cutFrequency = getCutFrequencyFromRotationWeeks(effectiveRotationWeeks);

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

    return await createCustomer(nextCustomer as Customer);
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

    const effectiveRotationWeeks = getEffectiveRotationWeeks(
        nextCustomer as Partial<Customer> as Customer,
        defaultRotationWeeks
    );
    nextCustomer.week = normalizeWeekNumber(
        nextCustomer.week as WeekName | string | number | null | undefined,
        effectiveRotationWeeks
    );
    nextCustomer.cutFrequency = getCutFrequencyFromRotationWeeks(effectiveRotationWeeks);

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
    const cutDateForWeek = new Date(`${normalizedCutDate}T12:00:00`);
    const visitWeek = getCycleWeek(
        Number.isNaN(cutDateForWeek.getTime()) ? new Date() : cutDateForWeek,
        getEffectiveRotationWeeks(customer, defaultRotationWeeks)
    );
    const visitRoundCycle = getActiveRoundCycle(
        activeRoundCycles,
        getBaseRoundKey(visitWeek, customer.day)
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
          visitWeek,
          customer.day,
          customer.customerType,
          visitRoundCycle
      ),
      week: visitWeek,
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
    const { error } = await supabase
        .from("visits")
        .delete()
        .eq("id", visitId)
        .eq("organization_id", getWritableOrganizationId());

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
        `Start a fresh ${selectedCycleLabel} ${selectedDay} service work round? The locked round will stay in History and Payments, and this screen will reset for the next cycle.`
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
    setIsUserMenuOpen(false);

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

  const publishEditSessions = useCallback((nextSessions: EditSessionRecord[]) => {
    const prunedSessions = pruneEditSessions(nextSessions);

    setEditSessions(prunedSessions);
    editSessionsRef.current = prunedSessions;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
          EDIT_SESSIONS_STORAGE_KEY,
          JSON.stringify(prunedSessions)
      );
    }

    editSessionChannelRef.current?.postMessage(prunedSessions);
    void editRealtimeChannelRef.current?.send({
      type: "broadcast",
      event: EDIT_SESSION_REALTIME_EVENT,
      payload: prunedSessions,
    });
  }, []);

  const updateEditSessions = useCallback(
      (
          updater: (
              sessions: EditSessionRecord[]
          ) => EditSessionRecord[]
      ) => {
        const currentSessions = pruneEditSessions(
            mergeEditSessionRecords(readStoredEditSessions(), editSessions)
        );

        publishEditSessions(updater(currentSessions));
      },
      [editSessions, publishEditSessions]
  );

  useEffect(() => {
    editSessionsRef.current = editSessions;
  }, [editSessions]);

  useEffect(() => {
    setEditSessions(pruneEditSessions(readStoredEditSessions()));

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== EDIT_SESSIONS_STORAGE_KEY) {
        return;
      }

      const storedSessions = pruneEditSessions(readStoredEditSessions());
      setEditSessions((currentSessions) =>
          pruneEditSessions(mergeEditSessionRecords(currentSessions, storedSessions))
      );
    };

    window.addEventListener("storage", handleStorage);

    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(EDIT_SESSION_CHANNEL_NAME);
      editSessionChannelRef.current = channel;
      channel.onmessage = (event: MessageEvent<unknown>) => {
        if (!Array.isArray(event.data)) {
          return;
        }

        const incomingSessions = pruneEditSessions(
            normalizeEditSessionRecords(event.data)
        );
        setEditSessions((currentSessions) =>
            pruneEditSessions(
                mergeEditSessionRecords(currentSessions, incomingSessions)
            )
        );
      };
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      editSessionChannelRef.current?.close();
      editSessionChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!currentOrganizationId) {
      return;
    }

    const supabase = createSupabaseClient();
    const channel = supabase.channel(
        `${EDIT_SESSION_CHANNEL_NAME}:${currentOrganizationId}`
    );
    editRealtimeChannelRef.current = channel;

    channel
        .on("broadcast", { event: EDIT_SESSION_REALTIME_EVENT }, (message) => {
          const incomingSessions = pruneEditSessions(
              normalizeEditSessionRecords(
                  (message as { payload?: unknown }).payload
              )
          );

          if (incomingSessions.length === 0) {
            return;
          }

          setEditSessions((currentSessions) =>
              pruneEditSessions(
                  mergeEditSessionRecords(currentSessions, incomingSessions)
              )
          );
        })
        .subscribe();

    const heartbeatId = window.setInterval(() => {
      const activeSessions = pruneEditSessions(editSessionsRef.current).filter(
          (session) => session.status === "active"
      );

      if (activeSessions.length === 0) {
        return;
      }

      void channel.send({
        type: "broadcast",
        event: EDIT_SESSION_REALTIME_EVENT,
        payload: activeSessions,
      });
    }, EDIT_SESSION_HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeatId);

      if (editRealtimeChannelRef.current === channel) {
        editRealtimeChannelRef.current = null;
      }

      void channel.unsubscribe();
    };
  }, [currentOrganizationId]);

  const currentEditorIdentity = useMemo(
      () => ({
        userId: currentUserId ?? "local-user",
        staffId: currentStaffMember?.id ?? null,
        name: currentStaffMember?.fullName || loggedInStaffName,
        email: currentStaffMember?.email ?? currentUserEmail,
        phone: currentStaffMember?.phone ?? null,
        isAdmin: currentUserIsAdmin,
      }),
      [
        currentStaffMember?.email,
        currentStaffMember?.fullName,
        currentStaffMember?.id,
        currentStaffMember?.phone,
        currentUserEmail,
        currentUserId,
        currentUserIsAdmin,
        loggedInStaffName,
      ]
  );

  const upsertLocalEditSession = useCallback(
      (resource: EditResource, draft: unknown, dirty: boolean) => {
        const resourceKey = getEditResourceKey(resource);
        const now = new Date().toISOString();
        const existingSessionId =
            editSessionIdsRef.current[resourceKey] ?? createEditSessionId();
        editSessionIdsRef.current[resourceKey] = existingSessionId;

        updateEditSessions((sessions) => {
          const existingSession =
              sessions.find((session) => session.sessionId === existingSessionId) ??
              null;
          const nextSession: EditSessionRecord = {
            ...existingSession,
            sessionId: existingSessionId,
            resourceKey,
            resourceType: resource.type,
            resourceId: resource.id,
            resourceLabel: getEditResourceLabel(resource.type, draft) || resource.label,
            editorUserId: currentEditorIdentity.userId,
            editorStaffId: currentEditorIdentity.staffId,
            editorName: currentEditorIdentity.name,
            editorEmail: currentEditorIdentity.email,
            editorPhone: currentEditorIdentity.phone,
            editorIsAdmin: currentEditorIdentity.isAdmin,
            dirty,
            draft,
            status: "active",
            startedAt: existingSession?.startedAt ?? now,
            lastActiveAt: now,
            updatedAt: now,
            finishedAt: undefined,
            finishedByUserId: undefined,
          };

          return [
            nextSession,
            ...sessions.filter((session) => session.sessionId !== existingSessionId),
          ];
        });

        if (inactiveEditResourceKey === resourceKey) {
          setInactiveEditResourceKey(null);
          lastInactiveActionKeyRef.current = null;
        }
      },
      [currentEditorIdentity, inactiveEditResourceKey, updateEditSessions]
  );

  const finishLocalEditSession = useCallback(
      (resourceKey: string, status: EditSessionRecord["status"]) => {
        const now = new Date().toISOString();

        updateEditSessions((sessions) =>
            sessions.map((session) =>
                session.resourceKey === resourceKey &&
                session.editorUserId === currentEditorIdentity.userId &&
                session.status === "active"
                    ? {
                        ...session,
                        dirty: false,
                        status,
                        updatedAt: now,
                        finishedAt: now,
                        finishedByUserId: currentEditorIdentity.userId,
                      }
                    : session
            )
        );
        delete editSessionIdsRef.current[resourceKey];
        setInactiveEditResourceKey(null);
        lastInactiveActionKeyRef.current = null;
      },
      [currentEditorIdentity.userId, updateEditSessions]
  );

  const getEditFormCollaboration = useCallback(
      <TDraft,>(resource: EditResource): EditFormCollaboration<TDraft> => {
        const resourceKey = getEditResourceKey(resource);

        return {
          saveRequestId:
              editSaveRequest?.resourceKey === resourceKey
                  ? editSaveRequest.requestId
                  : 0,
          discardRequestId:
              editDiscardRequest?.resourceKey === resourceKey
                  ? editDiscardRequest.requestId
                  : 0,
          onDraftChange: (draft, dirty) => {
            upsertLocalEditSession(resource, draft, dirty);
          },
          onSaveComplete: () => finishLocalEditSession(resourceKey, "saved"),
          onDiscardComplete: () => finishLocalEditSession(resourceKey, "discarded"),
        };
      },
      [
        editDiscardRequest,
        editSaveRequest,
        finishLocalEditSession,
        upsertLocalEditSession,
      ]
  );

  const requestEditSave = useCallback((resourceKey: string) => {
    setEditSaveRequest({ resourceKey, requestId: Date.now() });
    setInactiveEditResourceKey(null);
  }, []);

  const requestEditDiscard = useCallback((resourceKey: string) => {
    setEditDiscardRequest({ resourceKey, requestId: Date.now() });
    setInactiveEditResourceKey(null);
  }, []);

  const markStillWorking = useCallback(
      (session: EditSessionRecord) => {
        const now = new Date().toISOString();

        updateEditSessions((sessions) =>
            sessions.map((entry) =>
                entry.sessionId === session.sessionId
                    ? { ...entry, lastActiveAt: now, updatedAt: now, status: "active" }
                    : entry
            )
        );
        setInactiveEditResourceKey(null);
        lastInactiveActionKeyRef.current = null;
      },
      [updateEditSessions]
  );

  const activeLocalDirtySession = useMemo(
      () =>
          editSessions.find(
              (session) =>
                  session.editorUserId === currentEditorIdentity.userId &&
                  session.status === "active" &&
                  session.dirty
          ) ?? null,
      [currentEditorIdentity.userId, editSessions]
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const session = activeLocalDirtySession;

      if (!session) {
        setInactiveEditResourceKey(null);
        lastInactiveActionKeyRef.current = null;
        return;
      }

      const inactiveForMs = Date.now() - new Date(session.lastActiveAt).getTime();
      const warningAfterMs = appSettings.editInactivityMinutes * 60 * 1000;

      if (inactiveForMs < warningAfterMs) {
        return;
      }

      const actionKey = `${session.sessionId}:${session.lastActiveAt}:${appSettings.editInactiveAction}`;

      if (lastInactiveActionKeyRef.current === actionKey) {
        return;
      }

      lastInactiveActionKeyRef.current = actionKey;

      if (appSettings.editInactiveAction === "auto_save") {
        requestEditSave(session.resourceKey);
        return;
      }

      if (appSettings.editInactiveAction === "auto_discard") {
        requestEditDiscard(session.resourceKey);
        return;
      }

      setInactiveEditResourceKey(session.resourceKey);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [
    activeLocalDirtySession,
    appSettings.editInactiveAction,
    appSettings.editInactivityMinutes,
    requestEditDiscard,
    requestEditSave,
  ]);

  const visibleEditResourceKeys = useMemo(() => {
    const keys = new Set<string>();

    if (page === "customerProfile" && selectedCustomer) {
      keys.add(getEditResourceKey({
        type: "customer",
        id: String(selectedCustomer.id),
        label: selectedCustomer.name,
      }));
    }

    if (page === "quoteForm") {
      keys.add(
          getEditResourceKey({
            type: "quote",
            id: selectedQuote?.id ?? `new-${currentEditorIdentity.userId}`,
            label: selectedQuote?.quoteNumber ?? "New quote",
          })
      );
    }

    if (page === "invoiceForm") {
      keys.add(
          getEditResourceKey({
            type: "invoice",
            id: selectedInvoice?.id ?? `new-${currentEditorIdentity.userId}`,
            label: selectedInvoice?.invoiceNumber ?? "New invoice",
          })
      );
    }

    return keys;
  }, [
    currentEditorIdentity.userId,
    page,
    selectedCustomer,
    selectedInvoice,
    selectedQuote,
  ]);

  const otherActiveEditSessions = useMemo(
      () =>
          editSessions.filter(
              (session) =>
                  session.status === "active" &&
                  session.editorUserId !== currentEditorIdentity.userId
          ),
      [currentEditorIdentity.userId, editSessions]
  );

  useEffect(() => {
    const finishedSession = editSessions.find((session) => {
      if (
          session.editorUserId === currentEditorIdentity.userId ||
          session.status !== "saved" ||
          handledFinishedSessionIdsRef.current.has(session.sessionId)
      ) {
        return false;
      }

      if (visibleEditResourceKeys.size === 0) {
        return page === `${session.resourceType}s`;
      }

      return visibleEditResourceKeys.has(session.resourceKey);
    });

    if (!finishedSession) {
      return;
    }

    handledFinishedSessionIdsRef.current.add(finishedSession.sessionId);
    setRefreshEditNotice(finishedSession);
  }, [currentEditorIdentity.userId, editSessions, page, visibleEditResourceKeys]);

  useEffect(() => {
    const externallyClosedSession = editSessions.find(
        (session) =>
            session.editorUserId === currentEditorIdentity.userId &&
            (session.status === "discarded" || session.status === "saved") &&
            session.finishedByUserId &&
            session.finishedByUserId !== currentEditorIdentity.userId &&
            !handledFinishedSessionIdsRef.current.has(session.sessionId)
    );

    if (!externallyClosedSession) {
      return;
    }

    handledFinishedSessionIdsRef.current.add(externallyClosedSession.sessionId);
    requestEditDiscard(externallyClosedSession.resourceKey);
  }, [currentEditorIdentity.userId, editSessions, requestEditDiscard]);

  async function handleAdminSaveEditSession(session: EditSessionRecord) {
    if (!currentUserIsAdmin || !session.draft) {
      return;
    }

    if (session.resourceType === "customer") {
      const draftCustomer = session.draft as Customer;
      const existingCustomer =
          customers.find((customer) => customer.id === draftCustomer.id) ?? null;

      if (existingCustomer) {
        await saveCustomer(draftCustomer);
      } else {
        await createCustomer(draftCustomer);
      }
    }

    if (session.resourceType === "quote") {
      await addQuote(session.draft as Quote);
    }

    if (session.resourceType === "invoice") {
      await addInvoice(session.draft as Invoice);
    }

    const now = new Date().toISOString();
    updateEditSessions((sessions) =>
        sessions.map((entry) =>
            entry.sessionId === session.sessionId
                ? {
                    ...entry,
                    dirty: false,
                    status: "saved",
                    updatedAt: now,
                    finishedAt: now,
                    finishedByUserId: currentEditorIdentity.userId,
                  }
                : entry
        )
    );
  }

  function handleAdminDiscardEditSession(session: EditSessionRecord) {
    if (!currentUserIsAdmin) {
      return;
    }

    const now = new Date().toISOString();
    updateEditSessions((sessions) =>
        sessions.map((entry) =>
            entry.sessionId === session.sessionId
                ? {
                    ...entry,
                    dirty: false,
                    status: "discarded",
                    updatedAt: now,
                    finishedAt: now,
                    finishedByUserId: currentEditorIdentity.userId,
                  }
                : entry
        )
    );
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

  const staffInitials = getPersonInitials(loggedInStaffName);
  const staffFirstName = getFirstName(loggedInStaffName);
  const staffRoleLabel =
      currentStaffMember?.role ?? (currentUserIsAdmin ? "Administrator" : "Team member");
  const pageDisplayLabel = getPageDisplayLabel(page);
  const headerTitle =
      page === "dashboard" ? `Welcome back, ${staffFirstName}` : pageDisplayLabel;
  const headerSubtitle =
      page === "dashboard"
          ? "Here's what's happening with your business today."
          : `Today is ${todayPanel.week}, ${todayPanel.dayLabel}. You are currently viewing`;
  const roundStatusLabel = todayPanel.selectedDay
      ? isTodayLocked
          ? "Round is locked"
          : "Round is active"
      : "No round scheduled today";
  const roundStatusClassName = todayPanel.selectedDay
      ? isTodayLocked
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-600";
  const notificationCount = dashboardAttentionItems.length + newLeadsCount;
  const weatherTemperatureLabel =
      headerWeather?.temperature !== null && headerWeather?.temperature !== undefined
          ? `${Math.round(headerWeather.temperature)}C`
          : "Weather";
  const weatherDetailLabel = headerWeather
      ? `${headerWeather.label}${
          headerWeather.rainChance !== null && headerWeather.rainChance !== undefined
              ? ` - ${Math.round(headerWeather.rainChance)}% rain`
              : ""
      }`
      : headerWeatherLoading
          ? "Loading"
          : "Unavailable";
  const inactiveEditSession =
      inactiveEditResourceKey && activeLocalDirtySession?.resourceKey === inactiveEditResourceKey
          ? activeLocalDirtySession
          : null;
  const visibleOtherActiveEditSessions = otherActiveEditSessions
      .filter((session) => {
        if (currentUserIsAdmin && session.dirty) {
          return true;
        }

        if (visibleEditResourceKeys.size > 0) {
          return visibleEditResourceKeys.has(session.resourceKey);
        }

        return page === `${session.resourceType}s`;
      })
      .slice(0, 3);
  const helpTourActions: HelpTourActions = {
    navigateToPage: (nextPage: HelpTourPage) => {
      navigateToPage(nextPage as PageKey);
    },
    openAddCustomer: () => {
      navigateToPage("customers");
      window.setTimeout(
          () => setAddCustomerHelpRequestId((requestId) => requestId + 1),
          160
      );
    },
    openUserMenu: () => {
      setIsUserMenuOpen(true);
    },
    raiseSupportTicket: (searchTerm) => {
      const requestedGuide = searchTerm?.trim() ?? "";
      const params = new URLSearchParams({ new: "1" });

      if (requestedGuide) {
        params.set("subject", `Guide request: ${requestedGuide}`);
        params.set(
          "body",
          `I searched In App Help for "${requestedGuide}" but could not find a guide.`
        );
      }

      window.location.href = `/support?${params.toString()}#new-ticket`;
    },
  };

  if (isHydrating) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#edf1f2] p-6">
          <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              RoundHQ
            </p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
              Loading job data...
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Preparing the latest RoundHQ workspace data.
            </p>
          </div>
        </div>
    );
  }

  return (
      <HelpProvider
          helpEnabled={appSettings.helpEnabled}
          hasCompletedOnboarding={hasCompletedOnboarding}
          launcherOpen={isHelpLauncherOpen}
          onLauncherOpenChange={setIsHelpLauncherOpen}
          onHelpEnabledChange={updateHelpEnabled}
          onOnboardingCompleted={markOnboardingCompleted}
          actions={helpTourActions}
      >
      <div className="min-h-screen bg-[#f7faf9] text-[#071426]">
        <div className="flex min-h-screen">
          <aside className="hidden w-[280px] shrink-0 flex-col bg-[#003c35] px-4 py-6 text-white shadow-[20px_0_60px_rgba(0,60,53,0.18)] lg:flex">
            <div className="px-2">
              <button
                  type="button"
                  onClick={() => navigateToPage("dashboard")}
                  aria-label="Go to dashboard"
                  className="rounded-xl p-1 transition hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-[#20c766]"
              >
                <img
                    src="/roundhq-logo-long-white.png"
                    alt="RoundHQ"
                    className="h-auto max-h-12 w-[178px] object-contain"
                />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left">
              <span className="block text-xs font-black uppercase tracking-[0.16em] text-[#20c766]">
                {activeSubscriptionPlan.name} plan
              </span>
              <span className="mt-1 block text-sm font-semibold text-white/78">
                {activeSubscriptionPlan.priceLabel} per business / month
              </span>
              {activeSubscriptionPlan.key === "starter" ? (
                  <a
                      href="/billing"
                      className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#20c766] px-3 py-2 text-xs font-black text-[#003c35] shadow-[0_12px_28px_rgba(32,199,102,0.24)] transition hover:bg-[#2ee074]"
                  >
                    Upgrade to Growth
                  </a>
              ) : (
                  <a
                      href="/billing"
                      className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-black text-white/80 transition hover:bg-white/[0.12] hover:text-white"
                  >
                    Manage billing
                  </a>
              )}
            </div>

            <nav className="mt-8 flex-1 space-y-3 overflow-y-auto pr-1">
              {accessibleNavSections.map((section) => {
                const activeSection = getNavSectionTitle(page) === section.title;
                const sectionIsSingleItem = section.items.length === 1;
                const sectionIsExpanded =
                    expandedNavSections[section.title] ?? activeSection;
                const SectionChevron = sectionIsExpanded ? ChevronDown : ChevronRight;
                const SectionIcon = section.items[0]?.icon ?? LayoutDashboard;
                const sectionBadgeCount =
                    section.items.some((item) => item.key === "leads") ? newLeadsCount : 0;
                const sectionTourTarget = section.items
                    .map((item) => NAV_TOUR_TARGETS[item.key])
                    .find(Boolean);

                return (
                    <div key={section.title} className="space-y-1.5">
                      <button
                          type="button"
                          data-tour={sectionTourTarget}
                          onClick={() =>
                              sectionIsSingleItem
                                  ? handleSidebarNavigation(section.items[0].key)
                                  : toggleNavSection(section.title)
                          }
                          aria-expanded={sectionIsSingleItem ? undefined : sectionIsExpanded}
                          className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                              activeSection
                                  ? "bg-[#20c766]/15 text-white shadow-[inset_0_0_0_1px_rgba(32,199,102,0.2)]"
                                  : "text-white/72 hover:bg-white/[0.07] hover:text-white"
                          }`}
                      >
                        <span
                            className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                                activeSection
                                    ? "bg-[#20c766] text-[#003c35]"
                                    : "bg-white/[0.07] text-white/70 group-hover:bg-white/[0.12] group-hover:text-white"
                            }`}
                        >
                          <SectionIcon size={18} />
                        </span>
                        <span className="min-w-0 flex-1 font-bold">{section.title}</span>
                        {sectionBadgeCount > 0 ? (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">
                              {sectionBadgeCount}
                            </span>
                        ) : null}
                        {sectionIsSingleItem ? null : (
                            <SectionChevron
                                size={16}
                                className={`shrink-0 transition ${
                                    sectionIsExpanded ? "rotate-0 text-white" : "text-white/50"
                                }`}
                            />
                        )}
                      </button>

                      {!sectionIsSingleItem && sectionIsExpanded ? (
                          <div className="space-y-1 pl-3">
                            {section.items.map(({ key, label, icon: Icon }) => {
                              const active = page === key;
                              const itemBadgeCount = key === "leads" ? newLeadsCount : 0;

                              return (
                                  <button
                                      key={key}
                                      type="button"
                                      data-tour={NAV_TOUR_TARGETS[key]}
                                      onClick={() => handleSidebarNavigation(key)}
                                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition ${
                                          active
                                              ? "bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                                              : "text-white/62 hover:bg-white/[0.06] hover:text-white"
                                      }`}
                                  >
                                    <span
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                                            active
                                                ? "bg-[#20c766]/18 text-[#20c766]"
                                                : "bg-white/[0.05] text-white/60 group-hover:text-white"
                                        }`}
                                    >
                                      <Icon size={16} />
                                    </span>
                                    <span className="min-w-0 flex-1 font-semibold">{label}</span>
                                    {itemBadgeCount > 0 ? (
                                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">
                                          {itemBadgeCount}
                                        </span>
                                    ) : null}
                                  </button>
                              );
                            })}
                          </div>
                      ) : null}
                    </div>
                );
              })}

              {accessibleNavSections.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white/65">
                    No pages are enabled for this account yet.
                  </div>
              ) : null}
            </nav>

          </aside>

          <main className="min-w-0 flex-1 bg-[#f7faf9]">
            <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-4 py-5 sm:px-6 lg:px-8">
              <div className="mb-5 rounded-2xl bg-[#003c35] px-4 py-4 text-white shadow-[0_18px_45px_rgba(0,60,53,0.18)] lg:hidden">
                <div className="flex items-center justify-between gap-4">
                  <img
                      src="/roundhq-logo-long-white.png"
                      alt="RoundHQ"
                      className="h-auto max-h-10 w-[150px] object-contain"
                  />
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20c766] text-sm font-black">
                    {staffInitials}
                  </div>
                </div>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {accessibleNavSections.flatMap((section) =>
                      section.items.map(({ key, label, icon: Icon }) => {
                        const active = page === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                data-tour={NAV_TOUR_TARGETS[key]}
                                onClick={() => handleSidebarNavigation(key)}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                                    active
                                        ? "bg-[#20c766] text-[#003c35]"
                                        : "bg-white/[0.08] text-white/75"
                                }`}
                            >
                              <Icon size={16} />
                              {label}
                            </button>
                        );
                      })
                  )}
                </div>
              </div>

              <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-[#071426]">
                    {headerTitle}
                  </h1>
                  {page === "dashboard" ? (
                      <p className="mt-1 text-sm font-medium text-[#667085]">
                        {headerSubtitle}
                      </p>
                  ) : (
                      <div className="mt-3 inline-flex max-w-full flex-col gap-2 rounded-2xl border border-[#d7efe5] bg-white/90 p-2 shadow-[0_10px_26px_rgba(7,20,38,0.05)]">
                        <p className="px-2 pt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
                          Today is{" "}
                          <span className="font-black text-[#003c35]">
                            {todayPanel.week}, {todayPanel.dayLabel}
                          </span>
                          . You are currently viewing
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                              value={selectedWeek}
                              aria-label="Select week to view"
                              onChange={(e) => setSelectedWeek(e.target.value as WeekName)}
                              className="h-9 rounded-xl border border-[#d7efe5] bg-[#f7faf9] px-3 text-xs font-bold text-[#071426] outline-none transition hover:border-emerald-200 hover:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                          >
                            {activeWeekOptions.map((week) => (
                                <option key={week} value={week}>
                                  {getRotationCycleLabel(week, activeRotationWeeks)}
                                </option>
                            ))}
                          </select>
                          <select
                              value={selectedDay}
                              aria-label="Select day to view"
                              onChange={(e) => setSelectedDay(e.target.value as DayName)}
                              className="h-9 rounded-xl border border-[#d7efe5] bg-[#f7faf9] px-3 text-xs font-bold text-[#071426] outline-none transition hover:border-emerald-200 hover:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                          >
                            {DAY_OPTIONS.map((day) => (
                                <option key={day} value={day}>
                                  {day}
                                </option>
                            ))}
                          </select>
                          <span
                              className={`inline-flex h-9 items-center rounded-xl border px-3 text-xs font-bold ${roundStatusClassName}`}
                          >
                            {roundStatusLabel}
                          </span>
                        </div>
                      </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div
                      className="hidden h-11 items-center gap-2 rounded-full border border-[#d7efe5] bg-white px-3 text-[#071426] shadow-[0_10px_24px_rgba(7,20,38,0.05)] sm:flex"
                      title={`Weather overview for ${HEADER_WEATHER_LOCATION_LABEL}`}
                      aria-label={`Weather overview for ${HEADER_WEATHER_LOCATION_LABEL}`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                      <CloudSun size={17} />
                    </span>
                    <span className="leading-none">
                      <span className="block text-xs font-black text-[#071426]">
                        {weatherTemperatureLabel}
                      </span>
                      <span className="mt-1 block text-[11px] font-semibold text-[#667085]">
                        {weatherDetailLabel}
                      </span>
                    </span>
                  </div>
                  <button
                      type="button"
                      aria-label="Notifications"
                      title="Notifications"
                      onClick={() => navigateToPage(newLeadsCount > 0 ? "leads" : "actions")}
                      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#071426] shadow-[0_10px_24px_rgba(7,20,38,0.05)] transition hover:-translate-y-0.5 hover:text-emerald-700"
                  >
                    <Bell size={19} />
                    {notificationCount > 0 ? (
                        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#20c766] ring-2 ring-white" />
                    ) : null}
                  </button>
                  <button
                      type="button"
                      aria-label="Need help?"
                      title="Need Help?"
                      data-tour="in-app-help-button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsHelpLauncherOpen(true);
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#071426] shadow-[0_10px_24px_rgba(7,20,38,0.05)] transition hover:-translate-y-0.5 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    <HelpCircle size={19} />
                  </button>
                  <div ref={userMenuRef} className="relative">
                    <button
                        type="button"
                        data-tour="user-menu-pill"
                        onClick={() => setIsUserMenuOpen((open) => !open)}
                        aria-haspopup="menu"
                        aria-expanded={isUserMenuOpen}
                        className="flex items-center gap-3 rounded-full border border-[#e5e7eb] bg-white py-1.5 pl-1.5 pr-4 shadow-[0_10px_24px_rgba(7,20,38,0.05)] transition hover:-translate-y-0.5 hover:border-emerald-200"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20c766] text-sm font-black text-white">
                        {staffInitials}
                      </div>
                      <div className="hidden min-w-0 text-left sm:block">
                        <p className="truncate text-sm font-bold text-[#071426]">
                          {loggedInStaffName}
                        </p>
                        <p className="truncate text-xs font-medium text-[#667085]">
                          {staffRoleLabel}
                        </p>
                      </div>
                      <ChevronDown
                          size={16}
                          className={`hidden text-[#667085] transition sm:block ${
                              isUserMenuOpen ? "rotate-180" : ""
                          }`}
                      />
                    </button>

                    {isUserMenuOpen ? (
                        <div
                            role="menu"
                            className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-[0_22px_55px_rgba(7,20,38,0.14)]"
                        >
                          <a
                              href="/support"
                              role="menuitem"
                              data-tour="support-menu-item"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#071426] transition hover:bg-[#f7faf9] hover:text-emerald-700"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                              <HelpCircle size={17} />
                            </span>
                            <span>
                              <span className="block">Helpdesk</span>
                              <span className="text-xs font-medium text-[#667085]">
                                View guides and raise tickets
                              </span>
                            </span>
                          </a>
                          <a
                              href="/billing"
                              role="menuitem"
                              data-tour="billing-menu-item"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#071426] transition hover:bg-[#f7faf9] hover:text-emerald-700"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                              <CreditCard size={17} />
                            </span>
                            <span>
                              <span className="block">Billing</span>
                              <span className="text-xs font-medium text-[#667085]">
                                {activeSubscriptionPlan.name} plan - manage billing
                              </span>
                            </span>
                          </a>
                          <div className="my-2 border-t border-[#e5e7eb]" />
                          <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                void handleLogout();
                              }}
                              disabled={isLoggingOut}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#071426] transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                              <LogOut size={17} />
                            </span>
                            <span>
                              <span className="block">
                                {isLoggingOut ? "Signing out..." : "Log out"}
                              </span>
                              <span className="text-xs font-medium text-[#667085]">
                                End this session
                              </span>
                            </span>
                          </button>
                        </div>
                    ) : null}
                  </div>
                </div>
              </header>

              {isSupportAccess ? (
                  <section className="mb-5 rounded-3xl border border-emerald-200 bg-[#003c35] px-4 py-3 text-sm text-white shadow-sm">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-black">Support access</p>
                        <p className="mt-1 text-white/78">
                          You are viewing and editing {supportAccess?.workspaceName ?? "this customer workspace"}.
                        </p>
                      </div>
                      <a
                          href="/admin"
                          className="inline-flex w-fit items-center justify-center rounded-xl bg-[#20c766] px-4 py-2 text-xs font-black text-[#003c35] transition hover:bg-[#2ee074]"
                      >
                        Back to admin
                      </a>
                    </div>
                  </section>
              ) : null}

              {databaseError && (
                  <section className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
                    {databaseError}
                  </section>
              )}

              {refreshEditNotice ? (
                  <section className="mb-5 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-black">Changes have been made.</p>
                        <p className="mt-1 text-emerald-800">
                          {refreshEditNotice.editorName} finished editing{" "}
                          {refreshEditNotice.resourceLabel}. Would you like to refresh?
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700"
                        >
                          Refresh now
                        </button>
                        <button
                            type="button"
                            onClick={() => setRefreshEditNotice(null)}
                            className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-800 transition hover:bg-emerald-100"
                        >
                          Later
                        </button>
                      </div>
                    </div>
                  </section>
              ) : null}

              {inactiveEditSession ? (
                  <section className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <p className="font-black">You have been inactive.</p>
                        <p className="mt-1 text-amber-900">
                          Unsaved changes on {inactiveEditSession.resourceLabel} could be discarded.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => markStillWorking(inactiveEditSession)}
                            className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-black text-amber-900 transition hover:bg-amber-100"
                        >
                          I&apos;m still working
                        </button>
                        <button
                            type="button"
                            onClick={() => requestEditSave(inactiveEditSession.resourceKey)}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
                        >
                          I&apos;m finished, save changes
                        </button>
                        <button
                            type="button"
                            onClick={() => requestEditDiscard(inactiveEditSession.resourceKey)}
                            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-50"
                        >
                          Discard changes
                        </button>
                      </div>
                    </div>
                  </section>
              ) : null}

              {visibleOtherActiveEditSessions.length > 0 ? (
                  <section className="mb-5 rounded-3xl border border-blue-100 bg-white px-4 py-3 text-sm shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-black text-slate-900">Active edits</p>
                        <div className="mt-2 space-y-2">
                          {visibleOtherActiveEditSessions.map((session) => (
                              <div
                                  key={session.sessionId}
                                  className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                              >
                                <p className="font-semibold text-slate-900">
                                  {session.editorName} is editing {session.resourceLabel}
                                  {session.dirty ? " with unsaved changes" : ""}.
                                </p>
                                <div className="mt-1 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                                  {session.editorPhone ? (
                                      <a
                                          href={`tel:${session.editorPhone}`}
                                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900"
                                      >
                                        <Phone size={13} />
                                        {session.editorPhone}
                                      </a>
                                  ) : null}
                                  {session.editorEmail ? <span>{session.editorEmail}</span> : null}
                                </div>
                                {currentUserIsAdmin && session.dirty ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <button
                                          type="button"
                                          onClick={() => void handleAdminSaveEditSession(session)}
                                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700"
                                      >
                                        <Save size={14} />
                                        Save unsaved changes
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => handleAdminDiscardEditSession(session)}
                                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50"
                                      >
                                        <Trash2 size={14} />
                                        Discard unsaved changes
                                      </button>
                                    </div>
                                ) : null}
                              </div>
                          ))}
                        </div>
                      </div>
                      <button
                          type="button"
                          onClick={() => setEditSessions([])}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                      >
                        <X size={14} />
                        Hide
                      </button>
                    </div>
                  </section>
              ) : null}

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
                          {activeWeekOptions.map((week) => (
                              <option key={week} value={week}>
                                {getRotationCycleLabel(week, activeRotationWeeks)}
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
                      customers={visibleRoundCustomers}
                      scheduledJobs={visibleScheduledJobs}
                      quotes={quotes}
                      invoices={invoices}
                      monthlyPayments={monthlyPayments}
                      grassCutSeasonStart={appSettings.grassCutSeasonStart}
                      grassCutSeasonEnd={appSettings.grassCutSeasonEnd}
                      roundCycle={activeRoundCycle}
                      selectedWeek={selectedWeek}
                      selectedDay={selectedDay}
                      defaultRotationWeeks={defaultRotationWeeks}
                      activeRotationWeeks={activeRotationWeeks}
                      currencyCode={appSettings.currencyCode}
                      isLocked={isLocked}
                      showWeatherWidget={appSettings.showWeatherWidget}
                      showRevenueWidget={appSettings.showRevenueWidget}
                      showJobsWidget={appSettings.showJobsWidget}
                      showUnpaidWidget={appSettings.showUnpaidWidget}
                      showRecentActivityWidget={appSettings.showRecentActivityWidget}
                      showAdvancedInsights={hasGrowthPlan}
                      announcement={platformAnnouncement}
                      attentionItems={dashboardAttentionItems}
                      onGoToRounds={() => navigateToPage("rounds")}
                      onGoToActions={
                          hasGrowthPlan ? () => navigateToPage("actions") : undefined
                      }
                      onGoToMap={() => navigateToPage("map")}
                      onGoToCustomers={() => navigateToPage("customers")}
                      onGoToQuoteForm={() => openNewQuoteForm()}
                      onGoToInvoiceForm={() => openNewInvoiceForm()}
                      onGoToSchedule={() => navigateToPage("schedule")}
                      onGoToPayments={() => navigateToPage("payments")}
                      onGoToCustomerProfit={
                          hasGrowthPlan
                              ? () => navigateToPage("customerProfit")
                              : undefined
                      }
                      weekOptions={activeWeekOptions}
                      dayOptions={DAY_OPTIONS}
                      onWeekChange={(week) => setSelectedWeek(week as WeekName)}
                      onDayChange={(day) => setSelectedDay(day as DayName)}
                      onOpenCustomer={openCustomerProfile}
                      onOpenQuote={openEditQuoteForm}
                      onOpenInvoice={openEditInvoiceForm}
                      onSendQuoteFollowUp={
                          hasGrowthPlan ? openQuoteFollowUpDialog : undefined
                      }
                      onSendInvoiceReminder={
                          hasGrowthPlan ? openInvoiceReminderDialog : undefined
                      }
                  />
              )}

              {page === "schedule" && (
                  <SchedulePage
                      key={pendingQuoteSchedule?.quoteId ?? "manual-schedule"}
                      jobs={visibleScheduledJobs}
                      customers={visibleRoundCustomers}
                      grassCutSeasonStart={appSettings.grassCutSeasonStart}
                      grassCutSeasonEnd={appSettings.grassCutSeasonEnd}
                      defaultRotationWeeks={defaultRotationWeeks}
                      activeRotationWeeks={activeRotationWeeks}
                      allowCommercialTools={hasGrowthPlan}
                      staffMembers={staffMembers}
                      defaultAssignedStaffId={defaultAssignedStaffId}
                      onAddJob={addScheduledJob}
                      pendingQuoteSchedule={pendingQuoteSchedule}
                      onScheduleQuote={scheduleQuoteFromCalendar}
                      onClearPendingQuoteSchedule={clearPendingQuoteSchedule}
                      onOpenJob={(jobId) => openScheduledJob(jobId, "schedule")}
                  />
              )}

              {page === "jobs" && (
                  <JobsPage
                      jobs={visibleScheduledJobs}
                      customers={customers}
                      quotes={quotes}
                      invoices={invoices}
                      staffMembers={staffMembers}
                      allowCommercialTools={hasGrowthPlan}
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
                      staffMembers={staffMembers}
                      defaultAssignedStaffId={defaultAssignedStaffId}
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
                      customers={visibleRoundCustomers as any}
                      visits={visitLogs as any}
                      selectedWeek={selectedWeek}
                      selectedDay={selectedDay}
                      defaultRotationWeeks={defaultRotationWeeks}
                      activeRotationWeeks={activeRotationWeeks}
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
                      customers={visibleRoundCustomers}
                      selectedWeek={selectedWeek}
                      selectedDay={selectedDay}
                      defaultRotationWeeks={defaultRotationWeeks}
                      weekOptions={activeWeekOptions}
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
                      defaultRotationWeeks={defaultRotationWeeks}
                      customerLimit={activeSubscriptionPlan.customerLimit}
                      allowCommercialTools={hasGrowthPlan}
                      staffMembers={staffMembers}
                      defaultAssignedStaffId={defaultAssignedStaffId}
                      autoOpenAddCustomerRequestId={addCustomerHelpRequestId}
                      onAdd={addCustomer as any}
                      onUpdate={updateCustomer as any}
                      onDelete={deleteCustomer}
                      onOpenCustomer={openCustomerProfile}
                      getCustomerEditCollaboration={(customer) =>
                          getEditFormCollaboration<Customer>({
                            type: "customer",
                            id: customer ? String(customer.id) : `new-${currentEditorIdentity.userId}`,
                            label: customer?.name ?? "New customer",
                          })
                      }
                  />
              )}

              {page === "customerProfit" && (
                  <CustomerProfitPage
                      customers={customers}
                      visits={visitLogs}
                      monthlyPayments={monthlyPayments}
                      grassCutSeasonStart={appSettings.grassCutSeasonStart}
                      grassCutSeasonEnd={appSettings.grassCutSeasonEnd}
                      defaultRotationWeeks={defaultRotationWeeks}
                      onOpenCustomer={openCustomerProfile}
                  />
              )}

              {page === "payments" && (
                  <PaymentsPage
                      customers={customers}
                      visits={visitLogs}
                      monthlyPayments={monthlyPayments}
                      defaultRotationWeeks={defaultRotationWeeks}
                      activeRotationWeeks={activeRotationWeeks}
                      weekOptions={activeWeekOptions}
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

              {page === "expenses" && (
                  <ExpensesPage
                      suppliers={expenseSuppliers}
                      products={expenseProducts}
                      expenses={expenses}
                      currencyCode={appSettings.currencyCode}
                      onSaveSupplier={saveExpenseSupplier}
                      onDeleteSupplier={deleteExpenseSupplier}
                      onSaveProduct={saveExpenseProduct}
                      onDeleteProduct={deleteExpenseProduct}
                      onSaveExpense={saveExpenseRecord}
                      onDeleteExpense={deleteExpenseRecord}
                      onAddProductToQuoteItems={addExpenseProductToQuoteItems}
                  />
              )}

              {page === "customerProfile" && selectedCustomer && (
                  <CustomerProfilePage
                      customer={selectedCustomer}
                      visits={selectedCustomerVisits as any}
                      commercialRamsDocuments={commercialRamsDocuments.filter(
                          (document) => document.customerId === selectedCustomer.id
                      )}
                      invoices={invoices as any}
                      invoiceHistory={invoiceHistory}
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
                        logoUrl: appSettings.logoUrl,
                        primaryColor: appSettings.primaryColor,
                        secondaryColor: appSettings.secondaryColor,
                        pdfHeaderStyle: appSettings.pdfHeaderStyle,
                        pdfLogoBackground: appSettings.pdfLogoBackground,
                        pdfLogoScale: appSettings.pdfLogoScale,
                        pdfShowLogo: appSettings.pdfShowLogo,
                        pdfShowFooter: appSettings.pdfShowFooter,
                        pdfShowBusinessDetails: appSettings.pdfShowBusinessDetails,
                        pdfFooterText: appSettings.pdfFooterText,
                        emailFromName: appSettings.emailFromName,
                        emailFromAddress: appSettings.emailFromAddress,
                        emailReplyTo: appSettings.emailReplyTo,
                        smtpHost: appSettings.smtpHost,
                        smtpPort: appSettings.smtpPort,
                        smtpSecure: appSettings.smtpSecure,
                        smtpUsername: appSettings.smtpUsername,
                        smtpPassword: appSettings.smtpPassword,
                      }}
                      lastVisit={selectedCustomerLastVisit}
                      totalSpent={selectedCustomerTotalSpent}
                      outstanding={selectedCustomerOutstanding}
                      grassCutSeasonStart={appSettings.grassCutSeasonStart}
                      grassCutSeasonEnd={appSettings.grassCutSeasonEnd}
                      defaultRotationWeeks={defaultRotationWeeks}
                      allowCommercialTools={hasGrowthPlan}
                      staffMembers={staffMembers}
                      defaultAssignedStaffId={defaultAssignedStaffId}
                      onBack={goBackToCustomers}
                      onOpenPayments={() => navigateToPage("payments")}
                      onTogglePaid={togglePaid}
                      onUpdateCustomer={updateCustomer}
                      getCustomerEditCollaboration={(customer) =>
                          getEditFormCollaboration<Customer>({
                            type: "customer",
                            id: String(customer.id),
                            label: customer.name,
                          })
                      }
                      onCreateQuote={(customerId: number) => openNewQuoteForm(customerId)}
                      onCreateInvoice={(customerId: number) =>
                          openNewInvoiceForm(customerId)
                      }
                      onOpenInvoice={openEditInvoiceForm}
                      onMarkInvoiceSent={markInvoiceSent}
                  />
              )}

              {page === "history" && (
                  <HistoryPage
                      visitLogs={visitLogs as any}
                      customers={visibleRoundCustomers as any}
                      updatePaymentStatus={togglePaid as any}
                      onClearHistory={clearVisitHistory}
                      isClearingHistory={isClearingHistory}
                  />
              )}

              {page === "actions" && (
                  <ActionsPage
                      visits={visitLogs as any}
                      customers={visibleRoundCustomers as any}
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
                      customers={visibleRoundCustomers as any}
                      visits={visitLogs as any}
                      selectedWeek={selectedWeek}
                      selectedDay={selectedDay}
                      defaultRotationWeeks={defaultRotationWeeks}
                      activeRotationWeeks={activeRotationWeeks}
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
                        logoUrl: appSettings.logoUrl,
                        primaryColor: appSettings.primaryColor,
                        secondaryColor: appSettings.secondaryColor,
                        pdfHeaderStyle: appSettings.pdfHeaderStyle,
                        pdfLogoBackground: appSettings.pdfLogoBackground,
                        pdfLogoScale: appSettings.pdfLogoScale,
                        pdfShowLogo: appSettings.pdfShowLogo,
                        pdfShowFooter: appSettings.pdfShowFooter,
                        pdfShowBusinessDetails: appSettings.pdfShowBusinessDetails,
                        pdfFooterText: appSettings.pdfFooterText,
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
                      onUpdateStatus={updateQuoteStatusFromList}
                      onConvertToSchedule={beginQuoteScheduling}
                      schedulingRecommendations={schedulingRecommendations}
                      onAcceptSchedulingSuggestion={acceptSchedulingRecommendation}
                      onRejectSchedulingSuggestion={rejectSchedulingRecommendation}
                      onConvertToInvoice={convertQuoteToInvoice}
                      allowQuoteConversionWorkflows={hasGrowthPlan}
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
                      defaultRotationWeeks={defaultRotationWeeks}
                      allowCommercialTools={hasGrowthPlan}
                      editCollaboration={getEditFormCollaboration<Quote>({
                        type: "quote",
                        id: selectedQuote?.id ?? `new-${currentEditorIdentity.userId}`,
                        label: selectedQuote?.quoteNumber ?? "New quote",
                      })}
                      onSave={addQuote as any}
                      onCreateCustomer={addCustomer}
                      onConvertToInvoice={
                          selectedQuote ? convertQuoteToInvoice : undefined
                      }
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
                        logoUrl: appSettings.logoUrl,
                        primaryColor: appSettings.primaryColor,
                        secondaryColor: appSettings.secondaryColor,
                        pdfHeaderStyle: appSettings.pdfHeaderStyle,
                        pdfLogoBackground: appSettings.pdfLogoBackground,
                        pdfLogoScale: appSettings.pdfLogoScale,
                        pdfShowLogo: appSettings.pdfShowLogo,
                        pdfShowFooter: appSettings.pdfShowFooter,
                        pdfShowBusinessDetails: appSettings.pdfShowBusinessDetails,
                        pdfFooterText: appSettings.pdfFooterText,
                        emailFromName: appSettings.emailFromName,
                        emailFromAddress: appSettings.emailFromAddress,
                        emailReplyTo: appSettings.emailReplyTo,
                        smtpHost: appSettings.smtpHost,
                        smtpPort: appSettings.smtpPort,
                        smtpSecure: appSettings.smtpSecure,
                        smtpUsername: appSettings.smtpUsername,
                        smtpPassword: appSettings.smtpPassword,
                      }}
                      stripeInvoicePaymentsEnabled={
                        appSettings.stripePaymentLinksEnabled &&
                        appSettings.stripeConnectChargesEnabled &&
                        appSettings.stripeConnectStatus === "enabled"
                      }
                      onCreate={() => openNewInvoiceForm()}
                      onEdit={openEditInvoiceForm}
                      onDelete={deleteInvoiceRecord}
                      onUpdateStatus={updateInvoiceStatusFromList}
                      onMarkSent={markInvoiceSent}
                      onCreatePaymentLink={createInvoicePaymentLink}
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
                      defaultRotationWeeks={defaultRotationWeeks}
                      allowCommercialTools={hasGrowthPlan}
                      editCollaboration={getEditFormCollaboration<Invoice>({
                        type: "invoice",
                        id: selectedInvoice?.id ?? `new-${currentEditorIdentity.userId}`,
                        label: selectedInvoice?.invoiceNumber ?? "New invoice",
                      })}
                      onSave={addInvoice as any}
                      onCreateCustomer={addCustomer}
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
                        logoUrl: appSettings.logoUrl,
                        primaryColor: appSettings.primaryColor,
                        secondaryColor: appSettings.secondaryColor,
                        pdfHeaderStyle: appSettings.pdfHeaderStyle,
                        pdfLogoBackground: appSettings.pdfLogoBackground,
                        pdfLogoScale: appSettings.pdfLogoScale,
                        pdfShowLogo: appSettings.pdfShowLogo,
                        pdfShowFooter: appSettings.pdfShowFooter,
                        pdfShowBusinessDetails: appSettings.pdfShowBusinessDetails,
                        pdfFooterText: appSettings.pdfFooterText,
                      }}
                      onCreate={createCommercialRamsRecord}
                      onUpdate={saveCommercialRamsRecord}
                      onDelete={deleteCommercialRamsRecord}
                  />
              )}

              {page === "settings" && (
                  <SettingsPage
                      initialSettings={appSettings}
                      accountEmail={currentUserEmail}
                      showGrowthSettings={hasGrowthPlan}
                      exportData={{
                        customers,
                        quotes,
                        invoices,
                        payments: monthlyPayments,
                        visits: visitLogs,
                        scheduledJobs,
                        scheduledJobChecklists,
                        recurringInvoiceTemplates,
                        commercialRamsDocuments,
                        customerLeads,
                        staffMembers,
                        rolePermissions,
                        expenseSuppliers,
                        expenseProducts,
                        expenses,
                        quoteFollowUps,
                        invoiceReminders,
                        quoteHistory,
                        invoiceHistory,
                        routeChangeHistory,
                        routeNotes,
                        schedulingRecommendations,
                        schedulingAuditLogs,
                        lockedRounds,
                        activeRoundCycles,
                        pendingCashPaymentDates,
                        ignoredMoveSuggestionIds,
                        selectedWeek,
                        selectedDay,
                        quotesTableInitialized,
                        invoicesWriteFallbackActive,
                        recurringInvoiceTemplatesFallbackActive,
                      }}
                      onImportData={handleImportAllData}
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
                      staffLimit={activeStaffLimit}
                      staffAddOnQuantity={staffAddonQuantity}
                      subscriptionPlanName={activeSubscriptionPlan.name}
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
      </HelpProvider>
  );
}
