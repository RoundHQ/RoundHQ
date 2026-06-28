export type PageKey =
  | "technician"
  | "dashboard"
  | "rounds"
  | "commercial"
  | "routeEfficiency"
  | "history"
  | "customers"
  | "expenses"
  | "payments"
  | "customerProfile"
  | "staff"
  | "map"
  | "actions";

export type DayName =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type RotationWeeks = 1 | 2 | 3 | 4;
export type WeekNumber = "Week 1" | "Week 2" | "Week 3" | "Week 4";
export type VisitStatus = "completed" | "not_cut";
export type PaymentMethod = "Monthly" | "On Day Transfer" | "Cash";
export type CustomerType = "Residential" | "Commercial";
export type CutFrequency = "Weekly" | "Fortnightly" | "3 Weekly" | "Monthly";
export const GRASS_CUT_AREA_OPTIONS = ["Front", "Back", "Side", "All"] as const;
export type GrassCutArea = (typeof GRASS_CUT_AREA_OPTIONS)[number];
export const RAMS_WORK_TYPE_OPTIONS = [
  "Grounds Maintenance",
  "Hedge Trimming",
  "Pressure Washing",
  "Gutter Cleaning",
  "Grounds Maintenance",
  "Other",
] as const;
export type RamsWorkType = (typeof RAMS_WORK_TYPE_OPTIONS)[number];
export type RamsYesNo = "Yes" | "No";

export const DEFAULT_NOT_CUT_REASONS = [
  "Too Wet",
  "Access Blocked",
  "Customer Request",
  "Overgrown - Requires Quote",
  "Unsafe",
  "Dog in Garden",
  "Gate Locked",
  "Other",
] as const;

export type NotCutReason = string;

export type Staff = {
  id: number;
  name: string;
  role: string | null;
};

export type StaffRole = "Admin" | "Manager" | "Staff" | "Operator";

export type StaffPageAccessKey =
  | "technician"
  | "dashboard"
  | "schedule"
  | "rounds"
  | "history"
  | "map"
  | "actions"
  | "commercial"
  | "commercialDocs"
  | "customers"
  | "expenses"
  | "quotes"
  | "invoices"
  | "staff"
  | "settings";

export type StaffMember = {
  id: number;
  authUserId?: string | null;
  email: string;
  fullName: string;
  role: StaffRole;
  isActive: boolean;
  phone?: string;
  notes?: string;
  isSystemAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type RolePermission = {
  role: StaffRole;
  pageKey: StaffPageAccessKey;
  allowed: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Customer = {
  id: number;
  name: string;
  address: string;
  postcode?: string;
  town?: string;
  phone?: string;
  email?: string;
  contactEmails?: string[];

  isGrassCuttingCustomer: boolean;
  grassCutAreas?: GrassCutArea[];

  week: WeekNumber;
  day: DayName;

  customerType: CustomerType;
  cutFrequency: CutFrequency;
  rotationWeeksOverride?: RotationWeeks | null;
  grassCutAmount: number;
  siteName?: string;
  siteAddress?: string;
  siteTown?: string;
  sitePostcode?: string;

  paymentMethod?: PaymentMethod;

  accessNotes?: string;
  notes?: string;

  assignedStaffId?: number | null;
  routeOrder?: number;

  latitude?: number | null;
  longitude?: number | null;

  createdAt: string;
};

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  price: number;
};

export const QUOTE_STATUS_OPTIONS = [
  "Draft",
  "Approved",
  "Sent",
  "Accepted",
  "Scheduled",
  "Declined",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUS_OPTIONS)[number];

export const DEFAULT_QUOTE_WORK_TYPE_OPTIONS = [
  "Hedge cutting",
  "Grass cutting",
  "Pressure washing",
  "Garden clearance",
  "Other",
] as const;

export const QUOTE_WORK_TYPE_OPTIONS = DEFAULT_QUOTE_WORK_TYPE_OPTIONS;

export type QuoteWorkType = string;
export type QuoteAutoSchedulingPreference =
  | "default"
  | "disabled"
  | "suggest"
  | "auto";
export type ServiceRoundSchedulingPreference =
  | "default"
  | "allow"
  | "avoid"
  | "force";

export const INVOICE_STATUS_OPTIONS = [
  "Draft",
  "Approved",
  "Sent",
  "Accepted",
  "Declined",
  "Unpaid",
  "Paid",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUS_OPTIONS)[number];
export type StripeInvoicePaymentStatus =
  | "not_created"
  | "open"
  | "paid"
  | "expired";

export const RECURRING_INVOICE_FREQUENCY_OPTIONS = [
  "Monthly",
  "Quarterly",
  "Yearly",
] as const;

export type RecurringInvoiceFrequency =
  (typeof RECURRING_INVOICE_FREQUENCY_OPTIONS)[number];

export const DOCUMENT_DELIVERY_METHOD_OPTIONS = ["email"] as const;

export type DocumentDeliveryMethod =
  (typeof DOCUMENT_DELIVERY_METHOD_OPTIONS)[number];

export type Quote = {
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

export type Invoice = {
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

export type QuoteFollowUpState = {
  followUpCount: number;
  lastFollowedUpOn?: string;
};

export type InvoiceReminderState = {
  reminderCount: number;
  lastReminderSentOn?: string;
};

export type DocumentHistoryEntry = {
  id: string;
  type: "created" | "updated" | "sent" | "read";
  occurredAt: string;
  summary: string;
  method?: DocumentDeliveryMethod;
  recipient?: string;
};

export type CustomerLeadSource =
  | "website"
  | "email"
  | "facebook"
  | "whatsapp"
  | "ai_receptionist"
  | "manual";

export type CustomerLeadStatus =
  | "new"
  | "reviewing"
  | "replied"
  | "converted"
  | "archived";

export type CustomerLeadPreferredContact =
  | DocumentDeliveryMethod
  | "phone";

export type CustomerLeadExtractedData = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  town?: string;
  postcode?: string;
  customerType?: CustomerType;
  service?: string;
  notes?: string;
  mediaUrls?: string[];
  confidence?: number;
  priority?: "normal" | "high";
  urgency?: string;
};

export type CustomerLeadReply = {
  id: string;
  sentAt: string;
  recipient: string;
  subject: string;
  message: string;
};

export type CustomerLeadActivityType =
  | "received"
  | "status"
  | "note"
  | "ai_receptionist_call"
  | "reply"
  | "quote"
  | "converted";

export type CustomerLeadActivityMetadata = Record<string, unknown>;

export type CustomerLeadActivity = {
  id: string;
  type: CustomerLeadActivityType;
  occurredAt: string;
  title: string;
  detail?: string;
  relatedId?: string;
  metadata?: CustomerLeadActivityMetadata;
};

export type CustomerLead = {
  id: string;
  source: CustomerLeadSource;
  status: CustomerLeadStatus;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  town?: string;
  postcode?: string;
  customerType?: CustomerType;
  service?: string;
  preferredContact?: CustomerLeadPreferredContact;
  message: string;
  notes?: string;
  extractedData: CustomerLeadExtractedData;
  rawPayload?: Record<string, unknown>;
  replyHistory: CustomerLeadReply[];
  activityHistory: CustomerLeadActivity[];
  submittedAt: string;
  createdAt: string;
  updatedAt?: string;
  convertedCustomerId?: number | null;
};

export type CustomerLeadCustomerDraft = {
  name: string;
  customerType: CustomerType;
  address: string;
  town: string;
  postcode: string;
  phone: string;
  email: string;
  service: string;
  notes: string;
  isGrassCuttingCustomer: boolean;
};

export type DashboardAttentionItem = {
  id: string;
  kind: "quote_follow_up" | "invoice_overdue";
  title: string;
  customerName: string;
  badge: string;
  badgeTone: "amber" | "rose";
  meta: string;
  detail: string;
  documentId: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
};

export type RecurringInvoiceTemplate = {
  id: string;
  sourceInvoiceId?: string;
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
  status: InvoiceStatus;
  items: LineItem[];
  notes?: string;
  terms?: string;
  vatRate?: number;
  dueDaysAfterIssue?: number;
  linkedQuoteId?: string;
  frequency: RecurringInvoiceFrequency;
  nextSendDate: string;
  nextDueDate?: string;
  preferredSendMethod?: DocumentDeliveryMethod;
  sendTo?: string;
  isActive: boolean;
  lastGeneratedDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ScheduledJobType =
  | "One Off"
  | "Quote Accepted"
  | "Grass Cut"
  | "Commercial";

export type ScheduledJobStatus =
  | "Scheduled"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export type ScheduledJob = {
  id: string;
  title: string;
  date: string;
  notes?: string;
  startTime?: string;
  finishTime?: string;
  customerName?: string;

  type: ScheduledJobType;
  status: ScheduledJobStatus;

  customerId?: number | null;

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

export type VisitLog = {
  id: string | number;
  customerId: number;
  visitDate: string;
  createdAt?: string;
  week?: WeekNumber;
  day?: DayName;
  status: VisitStatus;
  notes?: string;
  notCutReason?: NotCutReason;
  paymentStatus?: "Paid" | "Not Paid";
  paid?: boolean;
  paidAt?: string | null;
  roundKey?: string;
  customerType?: CustomerType;
  priceAtVisit?: number;
};

export type MonthlyPayment = {
  id: number;
  customerId: number;
  paymentMonth: string;
  paymentDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PaymentReconciliationMatchStatus =
  | "matched"
  | "possible_match"
  | "needs_review"
  | "no_match"
  | "already_imported"
  | "ignored";

export type PaymentReconciliationImportStatus =
  | "reviewing"
  | "imported"
  | "partially_imported"
  | "undone";

export type PaymentReconciliationAllocationType =
  | "visit"
  | "invoice"
  | "monthly_payment"
  | "credit"
  | "on_account";

export type PaymentReconciliationAllocation = {
  id: string;
  type: PaymentReconciliationAllocationType;
  targetId?: string;
  targetLabel: string;
  amount: number;
  paymentDate?: string;
  serviceDate?: string;
  isPartial?: boolean;
  isOverpayment?: boolean;
};

export type StatementImportRecord = {
  id: string;
  fileName: string;
  fileType: string;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  matchedCount: number;
  manualMatchedCount: number;
  ignoredCount: number;
  totalAmount: number;
  status: PaymentReconciliationImportStatus;
  importedBy?: string;
  undoneAt?: string;
  undoneBy?: string;
  createdAt: string;
  updatedAt?: string;
};

export type StatementImportRowRecord = {
  id: string;
  statementImportId: string;
  transactionDate: string;
  description: string;
  customerNameFromStatement?: string;
  amount: number;
  suggestedCustomerId?: number | null;
  selectedCustomerId?: number | null;
  selectedVisitIds?: Array<string | number>;
  selectedInvoiceIds?: string[];
  allocations: PaymentReconciliationAllocation[];
  matchConfidence: number;
  matchReason: string;
  matchStatus: PaymentReconciliationMatchStatus;
  status: PaymentReconciliationMatchStatus | "confirmed" | "imported" | "undone";
  duplicateOfPaymentId?: string;
  createdPaymentId?: string;
  rawRow: Record<string, string>;
  transactionFingerprint: string;
  createdAt: string;
};

export type PaymentMatchingRule = {
  id: string;
  customerId: number;
  matchType:
    | "description_contains"
    | "customer_contains"
    | "reference_contains"
    | "address_contains"
    | "postcode_contains"
    | "amount_equals";
  matchValue: string;
  confidenceWeight: number;
  createdBy?: string;
  lastUsedAt?: string;
  useCount: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type PaymentIgnoreRule = {
  id: string;
  matchType: "description_contains" | "customer_contains" | "amount_equals";
  matchValue: string;
  createdBy?: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type CustomerPaymentFingerprint = {
  id: string;
  customerId: number;
  typicalAmount?: number;
  typicalReference?: string;
  typicalPaymentDelayDays?: number;
  usuallyPaysMultipleVisits?: boolean;
  lastSeenAt?: string;
  confidenceScore: number;
  createdAt: string;
  updatedAt?: string;
};

export type CustomerCreditBalance = {
  id: string;
  customerId: number;
  amount: number;
  sourceImportRowId?: string;
  note?: string;
  isReversed?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type PaymentAuditEvent = {
  id: string;
  statementImportId?: string;
  statementImportRowId?: string;
  customerId?: number | null;
  eventType:
    | "import_created"
    | "row_confirmed"
    | "row_ignored"
    | "manual_match"
    | "payment_created"
    | "credit_created"
    | "import_undone";
  summary: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
};

export type CommercialRamsDocument = {
  id: string;
  customerId: number | null;
  customerName: string;
  customerAddress?: string;
  customerTown?: string;
  customerPostcode?: string;
  siteName?: string;
  siteAddress?: string;
  siteTown?: string;
  sitePostcode?: string;
  jobTitle: string;
  referenceNumber?: string;
  revision?: string;
  startDate?: string;
  estimatedDuration?: string;
  preparedBy?: string;
  workType: RamsWorkType;
  operatives?: string;
  siteSupervisor?: string;
  emergencyContact?: string;
  customScope?: string;
  publicAccess: RamsYesNo;
  publicAccessNotes?: string;
  workingAtHeight: RamsYesNo;
  workingAtHeightNotes?: string;
  chemicals: RamsYesNo;
  chemicalsNotes?: string;
  vehicleMovement: RamsYesNo;
  vehicleMovementNotes?: string;
  poweredMachinery: RamsYesNo;
  poweredMachineryNotes?: string;
  services: RamsYesNo;
  servicesNotes?: string;
  methodNotes?: string;
  additionalHazards?: string;
  siteContact?: string;
  siteContactNumber?: string;
  nearestHospital?: string;
  emergencyProcedure?: string;
  clientApprovalName?: string;
  approvalRole?: string;
  createdAt: string;
  updatedAt?: string;
};

export type HistoryVisit = VisitLog & {
  customerName: string;
  customerAddress: string;
  customerType: CustomerType;
};

export type LegInfo = {
  miles: number;
  minutes: number;
};

export type WeatherState = {
  temperature: number | null;
  rainChance: number | null;
  windSpeed: number | null;
  weatherCode: number | null;
  label: string;
  bestWindow: string;
  rainStartText: string;
};
