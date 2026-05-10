export type PageKey =
  | "dashboard"
  | "rounds"
  | "commercial"
  | "routeEfficiency"
  | "history"
  | "customers"
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
  | "Friday";

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

export type NotCutReason =
  | "Too Wet"
  | "Access Blocked"
  | "Customer Request"
  | "Overgrown - Requires Quote"
  | "Unsafe"
  | "Dog in Garden"
  | "Gate Locked"
  | "Other";

export type Staff = {
  id: number;
  name: string;
  role: string | null;
};

export type StaffRole = "Admin" | "Staff" | "Operator";

export type StaffPageAccessKey =
  | "dashboard"
  | "schedule"
  | "rounds"
  | "history"
  | "map"
  | "actions"
  | "commercial"
  | "commercialDocs"
  | "customers"
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
  type: "created" | "updated" | "sent";
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
  | "reply"
  | "quote"
  | "converted";

export type CustomerLeadActivity = {
  id: string;
  type: CustomerLeadActivityType;
  occurredAt: string;
  title: string;
  detail?: string;
  relatedId?: string;
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
