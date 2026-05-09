import type {
  Customer,
  CutFrequency,
  CustomerType,
  DayName,
  NotCutReason,
  PaymentMethod,
  RotationWeeks,
  VisitLog,
  WeekNumber,
} from "@/components/jobs/types";
import {
  getCustomerEmailAddresses,
  normalizeGrassCutAreas,
  parseEmailAddresses,
} from "@/components/jobs/helpers";
import {
  getCutFrequencyFromRotationWeeks,
  getRotationWeeksFromCutFrequency,
  normalizeNullableRotationWeeks,
  normalizeWeekNumber,
} from "@/components/jobs/rotation";

export type CustomerRow = {
  id: number;
  name: string;
  address: string;
  postcode: string | null;
  town: string | null;
  phone: string | null;
  email: string | null;
  contact_emails: string[] | null;
  is_grass_cutting_customer: boolean | null;
  grass_cut_areas: unknown;
  week: string | number | null;
  day: string | null;
  customer_type: string | null;
  cut_frequency: string | null;
  rotation_weeks_override?: number | null;
  site_name: string | null;
  site_address: string | null;
  site_town: string | null;
  site_postcode: string | null;
  payment_method: string | null;
  access_notes: string | null;
  notes: string | null;
  assigned_staff_id: number | null;
  route_order: number | null;
  created_at: string | null;
  price: number | null;
  lat: number | null;
  lng: number | null;
};

type DatabaseWeekNumber = 1 | 2 | 3 | 4;

export type CustomerWriteRow = {
  name: string;
  address: string;
  postcode: string | null;
  town: string | null;
  phone: string | null;
  email: string | null;
  contact_emails: string[];
  is_grass_cutting_customer: boolean;
  grass_cut_areas: string[];
  week: DatabaseWeekNumber;
  day: DayName;
  customer_type: CustomerType;
  cut_frequency: CutFrequency;
  rotation_weeks_override: RotationWeeks | null;
  site_name: string | null;
  site_address: string | null;
  site_town: string | null;
  site_postcode: string | null;
  payment_method: PaymentMethod | null;
  access_notes: string | null;
  notes: string | null;
  assigned_staff_id: number | null;
  route_order: number;
  created_at: string;
  price: number;
  lat: number | null;
  lng: number | null;
};

export type VisitRow = {
  id: string | number;
  customer_id: number;
  visit_date: string;
  week: string | number | null;
  day: string | null;
  status: string | null;
  notes: string | null;
  payment_status: string | null;
  paid_at: string | null;
  created_at: string | null;
  reason: string | null;
  round_key?: string | null;
  customer_type?: string | null;
  price_at_visit?: number | string | null;
};

export type VisitLegacyWriteRow = {
  customer_id: number;
  visit_date: string;
  week: DatabaseWeekNumber | null;
  day: DayName | null;
  status: "completed" | "not_cut";
  notes: string | null;
  payment_status: "Paid" | "Not Paid";
  paid_at: string | null;
  created_at: string;
  reason: NotCutReason | null;
};

export type VisitWriteRow = VisitLegacyWriteRow & {
  round_key: string | null;
  customer_type: CustomerType | null;
  price_at_visit: number | null;
};

export const VISIT_LEGACY_SELECT_FIELDS =
  "id,customer_id,visit_date,week,day,status,notes,payment_status,paid_at,created_at,reason";
export const VISIT_SELECT_FIELDS = `${VISIT_LEGACY_SELECT_FIELDS},round_key,customer_type,price_at_visit`;

const DAY_OPTIONS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];
const CUSTOMER_TYPES: CustomerType[] = ["Residential", "Commercial"];
const CUT_FREQUENCIES: CutFrequency[] = [
  "Weekly",
  "Fortnightly",
  "3 Weekly",
  "Monthly",
];
const PAYMENT_METHODS: PaymentMethod[] = ["Monthly", "On Day Transfer", "Cash"];
const NOT_CUT_REASONS: NotCutReason[] = [
  "Too Wet",
  "Access Blocked",
  "Customer Request",
  "Overgrown - Requires Quote",
  "Unsafe",
  "Dog in Garden",
  "Gate Locked",
  "Other",
];

function normalizeWeek(value: string | number | null | undefined): WeekNumber {
  return normalizeWeekNumber(value, 4);
}

function serializeWeek(value: WeekNumber | number | null | undefined): DatabaseWeekNumber {
  const match = String(value ?? "").match(/(\d+)/);
  const parsed = Number(match?.[1] ?? value ?? 1);
  return ([1, 2, 3, 4].includes(parsed) ? parsed : 1) as DatabaseWeekNumber;
}

function serializeRouteOrder(value: number | null | undefined) {
  const routeOrder = Number(value);
  return Number.isFinite(routeOrder) && routeOrder >= 0 ? Math.floor(routeOrder) : 0;
}

function normalizeDay(value: string | null | undefined): DayName {
  return DAY_OPTIONS.includes(value as DayName) ? (value as DayName) : "Monday";
}

function normalizeCustomerType(value: string | null | undefined): CustomerType {
  return CUSTOMER_TYPES.includes(value as CustomerType)
      ? (value as CustomerType)
      : "Residential";
}

function normalizeOptionalCustomerType(
    value: string | null | undefined
): CustomerType | undefined {
  return CUSTOMER_TYPES.includes(value as CustomerType)
      ? (value as CustomerType)
      : undefined;
}

function normalizeCutFrequency(value: string | null | undefined): CutFrequency {
  return CUT_FREQUENCIES.includes(value as CutFrequency)
      ? (value as CutFrequency)
      : "Fortnightly";
}

function normalizePaymentMethod(
    value: string | null | undefined
): PaymentMethod | undefined {
  return PAYMENT_METHODS.includes(value as PaymentMethod)
      ? (value as PaymentMethod)
      : undefined;
}

function normalizeNotCutReason(
    value: string | null | undefined
): NotCutReason | undefined {
  return NOT_CUT_REASONS.includes(value as NotCutReason)
      ? (value as NotCutReason)
      : undefined;
}

export function mapCustomerRowToCustomer(row: CustomerRow): Customer {
  const contactEmails = Array.isArray(row.contact_emails)
      ? row.contact_emails
      : parseEmailAddresses(row.email);
  const rotationWeeksOverride = normalizeNullableRotationWeeks(
    row.rotation_weeks_override
  );
  const cutFrequency = rotationWeeksOverride
    ? getCutFrequencyFromRotationWeeks(rotationWeeksOverride)
    : normalizeCutFrequency(row.cut_frequency);

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    postcode: row.postcode ?? undefined,
    town: row.town ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    contactEmails,
    isGrassCuttingCustomer: row.is_grass_cutting_customer ?? true,
    grassCutAreas: normalizeGrassCutAreas(
      row.grass_cut_areas,
      row.is_grass_cutting_customer ?? true
    ),
    week: normalizeWeek(row.week),
    day: normalizeDay(row.day),
    customerType: normalizeCustomerType(row.customer_type),
    cutFrequency,
    rotationWeeksOverride,
    grassCutAmount: Number(row.price ?? 0),
    siteName: row.site_name ?? undefined,
    siteAddress: row.site_address ?? undefined,
    siteTown: row.site_town ?? undefined,
    sitePostcode: row.site_postcode ?? undefined,
    paymentMethod: normalizePaymentMethod(row.payment_method),
    accessNotes: row.access_notes ?? undefined,
    notes: row.notes ?? undefined,
    assignedStaffId: row.assigned_staff_id ?? null,
    routeOrder: row.route_order ?? undefined,
    latitude: row.lat ?? null,
    longitude: row.lng ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export function mapCustomerToRow(customer: Customer): CustomerWriteRow {
  const contactEmails = getCustomerEmailAddresses(customer);
  const rotationWeeksOverride = normalizeNullableRotationWeeks(
    customer.rotationWeeksOverride
  );
  const legacyRotationWeeks =
    rotationWeeksOverride ?? getRotationWeeksFromCutFrequency(customer.cutFrequency);

  return {
    name: customer.name.trim(),
    address: customer.address.trim(),
    postcode: customer.postcode?.trim() || null,
    town: customer.town?.trim() || null,
    phone: customer.phone?.trim() || null,
    email: contactEmails[0] ?? (customer.email?.trim() || null),
    contact_emails: contactEmails,
    is_grass_cutting_customer: Boolean(customer.isGrassCuttingCustomer),
    grass_cut_areas: normalizeGrassCutAreas(
      customer.grassCutAreas,
      customer.isGrassCuttingCustomer
    ),
    week: serializeWeek(customer.week),
    day: customer.day,
    customer_type: customer.customerType,
    cut_frequency: getCutFrequencyFromRotationWeeks(legacyRotationWeeks),
    rotation_weeks_override: rotationWeeksOverride,
    site_name: customer.siteName?.trim() || null,
    site_address: customer.siteAddress?.trim() || null,
    site_town: customer.siteTown?.trim() || null,
    site_postcode: customer.sitePostcode?.trim() || null,
    payment_method: customer.paymentMethod ?? null,
    access_notes: customer.accessNotes?.trim() || null,
    notes: customer.notes?.trim() || null,
    assigned_staff_id: customer.assignedStaffId ?? null,
    route_order: serializeRouteOrder(customer.routeOrder),
    created_at: customer.createdAt,
    price: Number(customer.grassCutAmount ?? 0),
    lat: customer.latitude ?? null,
    lng: customer.longitude ?? null,
  };
}

export function mapVisitRowToVisit(row: VisitRow): VisitLog {
  const paymentStatus = row.payment_status === "Paid" ? "Paid" : "Not Paid";
  const priceAtVisit = Number(row.price_at_visit);

  return {
    id: row.id,
    customerId: row.customer_id,
    visitDate: row.visit_date,
    createdAt: row.created_at ?? row.visit_date,
    week: row.week ? normalizeWeek(row.week) : undefined,
    day: row.day ? normalizeDay(row.day) : undefined,
    status: row.status === "not_cut" ? "not_cut" : "completed",
    notes: row.notes ?? undefined,
    notCutReason: normalizeNotCutReason(row.reason),
    paymentStatus,
    paid: paymentStatus === "Paid",
    paidAt: row.paid_at,
    roundKey: row.round_key ?? undefined,
    customerType: normalizeOptionalCustomerType(row.customer_type),
    priceAtVisit: Number.isFinite(priceAtVisit) ? priceAtVisit : undefined,
  };
}

function normalizeVisitPrice(value: number | null | undefined) {
  const price = Number(value);
  return Number.isFinite(price) ? price : null;
}

export function mapVisitToLegacyRow(visit: VisitLog): VisitLegacyWriteRow {
  return {
    customer_id: visit.customerId,
    visit_date: visit.visitDate,
    week: visit.week != null ? serializeWeek(visit.week) : null,
    day: visit.day ?? null,
    status: visit.status,
    notes: visit.notes?.trim() || null,
    payment_status: visit.paymentStatus === "Paid" ? "Paid" : "Not Paid",
    paid_at: visit.paymentStatus === "Paid" ? visit.paidAt ?? new Date().toISOString() : null,
    created_at: (visit as { createdAt?: string }).createdAt ?? new Date().toISOString(),
    reason: visit.notCutReason ?? null,
  };
}

export function mapVisitToRow(visit: VisitLog): VisitWriteRow {
  return {
    ...mapVisitToLegacyRow(visit),
    round_key: visit.roundKey?.trim() || null,
    customer_type: visit.customerType ?? null,
    price_at_visit: normalizeVisitPrice(visit.priceAtVisit),
  };
}
