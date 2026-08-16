import {
  GRASS_CUT_AREA_OPTIONS,
  type Customer,
  type CutFrequency,
  type DayName,
  type GrassCutArea,
  type MonthlyPayment,
  type RotationWeeks,
  type VisitLog,
  type WeekNumber,
} from "./types";
import {
  DEFAULT_ROTATION_WEEKS,
  getCycleWeek,
  getEffectiveRotationWeeks,
  getRotationDays,
  getRotationWeeksFromCutFrequency,
} from "./rotation";
import {
  DEFAULT_CURRENCY_CODE,
  formatCurrencyAmount,
  type CurrencyCode,
} from "./currency";
import { formatUkDate, getBusinessIsoDate } from "@/lib/dates";

export const dayOrder = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
export const APPROX_SPEED_MPH = 20;
const CALENDAR_DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_GRASS_CUT_SEASON_START = "01-01";
export const DEFAULT_GRASS_CUT_SEASON_END = "12-31";

export function getInputDateValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.slice(0, 10) : "";
}

function parseStoredDate(value: string | null | undefined) {
  const dateValue = getInputDateValue(value);

  if (!dateValue) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  return {
    year,
    monthIndex: month - 1,
    day,
  };
}

export function formatStoredDate(value: string | null | undefined) {
  const parsed = parseStoredDate(value);

  if (!parsed) {
    return "â€”";
  }

  return formatUkDate(`${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`);
}

export function toStoredDateTime(value: string | null | undefined) {
  const dateValue = getInputDateValue(value);
  return dateValue ? `${dateValue}T12:00:00.000Z` : null;
}

export function getTodayDateInputValue() {
  return getBusinessIsoDate();
}

export function normalizeSeasonMonthDay(
  value: string | null | undefined,
  fallback: string
) {
  const trimmedValue = String(value ?? "").trim();
  const fullDateMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const monthDayMatch = trimmedValue.match(/^(\d{2})-(\d{2})$/);

  const month = Number(fullDateMatch?.[2] ?? monthDayMatch?.[1]);
  const day = Number(fullDateMatch?.[3] ?? monthDayMatch?.[2]);

  if (!Number.isInteger(month) || !Number.isInteger(day)) {
    return fallback;
  }

  const candidate = new Date(2000, month - 1, day);

  if (
    candidate.getFullYear() !== 2000 ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return fallback;
  }

  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getSeasonDateInputValue(
  value: string | null | undefined,
  fallback: string,
  referenceYear = new Date().getFullYear()
) {
  const normalizedMonthDay = normalizeSeasonMonthDay(value, fallback);
  return `${referenceYear}-${normalizedMonthDay}`;
}

function getSeasonMonthDayNumber(value: string) {
  const [month, day] = value.split("-").map(Number);
  return month * 100 + day;
}

function getSeasonMonthDayParts(value: string, fallback: string) {
  const normalizedValue = normalizeSeasonMonthDay(value, fallback);
  const [month, day] = normalizedValue.split("-").map(Number);

  return {
    normalizedValue,
    month,
    day,
    numericValue: getSeasonMonthDayNumber(normalizedValue),
  };
}

function toCalendarDate(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const parsed = parseStoredDate(value);

  if (!parsed) {
    return null;
  }

  return new Date(parsed.year, parsed.monthIndex, parsed.day);
}

export function isDateWithinRecurringSeason(
  date: Date,
  seasonStart: string | null | undefined,
  seasonEnd: string | null | undefined
) {
  const normalizedStart = normalizeSeasonMonthDay(
    seasonStart,
    DEFAULT_GRASS_CUT_SEASON_START
  );
  const normalizedEnd = normalizeSeasonMonthDay(
    seasonEnd,
    DEFAULT_GRASS_CUT_SEASON_END
  );
  const dateValue = (date.getMonth() + 1) * 100 + date.getDate();
  const startValue = getSeasonMonthDayNumber(normalizedStart);
  const endValue = getSeasonMonthDayNumber(normalizedEnd);

  if (startValue <= endValue) {
    return dateValue >= startValue && dateValue <= endValue;
  }

  return dateValue >= startValue || dateValue <= endValue;
}

export function getSeasonDateRange(
  seasonStartYear: number,
  seasonStart: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_START,
  seasonEnd: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_END
) {
  const start = getSeasonMonthDayParts(
    seasonStart ?? DEFAULT_GRASS_CUT_SEASON_START,
    DEFAULT_GRASS_CUT_SEASON_START
  );
  const end = getSeasonMonthDayParts(
    seasonEnd ?? DEFAULT_GRASS_CUT_SEASON_END,
    DEFAULT_GRASS_CUT_SEASON_END
  );
  const wrapsYear = start.numericValue > end.numericValue;
  const startDate = new Date(seasonStartYear, start.month - 1, start.day);
  const endDate = new Date(
    wrapsYear ? seasonStartYear + 1 : seasonStartYear,
    end.month - 1,
    end.day
  );

  return {
    normalizedSeasonStart: start.normalizedValue,
    normalizedSeasonEnd: end.normalizedValue,
    wrapsYear,
    startDate,
    endDate,
  };
}

export function isDateInSeasonRange(
  value: Date | string | null | undefined,
  seasonStartYear: number,
  seasonStart: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_START,
  seasonEnd: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_END
) {
  const date = toCalendarDate(value);

  if (!date) {
    return false;
  }

  const range = getSeasonDateRange(seasonStartYear, seasonStart, seasonEnd);

  return date >= range.startDate && date <= range.endDate;
}

export function parseEmailAddresses(value: string | null | undefined) {
  return Array.from(
    new Map(
      String(value ?? "")
        .split(/[\n,;]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => [entry.toLowerCase(), entry])
    ).values()
  );
}

export function getCustomerEmailAddresses(
  customer: Pick<Customer, "email" | "contactEmails">
) {
  const emailMap = new Map<string, string>();

  for (const email of customer.contactEmails ?? []) {
    const normalized = email.trim();

    if (!normalized) {
      continue;
    }

    emailMap.set(normalized.toLowerCase(), normalized);
  }

  const primaryEmail = customer.email?.trim();

  if (primaryEmail) {
    emailMap.set(primaryEmail.toLowerCase(), primaryEmail);
  }

  return Array.from(emailMap.values());
}

function getGrassCutAreaMatch(value: string): GrassCutArea | null {
  const normalisedValue = value.trim().toLowerCase();

  if (!normalisedValue) {
    return null;
  }

  if (normalisedValue.includes("all")) return "All";
  if (normalisedValue.includes("front")) return "Front";
  if (normalisedValue.includes("back") || normalisedValue.includes("rear")) {
    return "Back";
  }
  if (normalisedValue.includes("side")) return "Side";

  return null;
}

export function normalizeGrassCutAreas(
  value: unknown,
  isGrassCuttingCustomer = true
): GrassCutArea[] {
  if (!isGrassCuttingCustomer) {
    return [];
  }

  const rawValues = Array.isArray(value)
    ? value.flatMap((entry) => String(entry ?? "").split(/[\n,;|/]+/))
    : typeof value === "string"
      ? value.split(/[\n,;|/]+/)
      : [];
  const selectedAreas = new Set<GrassCutArea>();

  for (const rawValue of rawValues) {
    const matchedArea = getGrassCutAreaMatch(String(rawValue));

    if (matchedArea) {
      selectedAreas.add(matchedArea);
    }
  }

  if (selectedAreas.has("All")) {
    return ["All"];
  }

  const specificAreas = GRASS_CUT_AREA_OPTIONS.filter(
    (area) => area !== "All" && selectedAreas.has(area)
  );

  return specificAreas.length > 0 ? specificAreas : ["All"];
}

export function formatGrassCutAreas(
  customer: Pick<Customer, "grassCutAreas" | "isGrassCuttingCustomer">
) {
  if (!customer.isGrassCuttingCustomer) {
    return "Not on service round";
  }

  const grassCutAreas = normalizeGrassCutAreas(
    customer.grassCutAreas,
    customer.isGrassCuttingCustomer
  );

  return grassCutAreas.includes("All") ? "All" : grassCutAreas.join(", ");
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}

export function buildLocationLine(town?: string, postcode?: string) {
  return [normalizeOptionalText(town), normalizeOptionalText(postcode)]
    .filter(Boolean)
    .join(", ");
}

export function getCustomerDisplayAddress(
  customer:
    | Pick<Customer, "customerType" | "siteName" | "address" | "town" | "postcode" | "savedAddresses" | "serviceAddressId">
    | null
    | undefined
) {
  if (!customer) {
    return "";
  }

  const siteName =
    customer.customerType === "Commercial"
      ? normalizeOptionalText(customer.siteName)
      : undefined;
  const address = normalizeOptionalText(customer.address);
  const location = buildLocationLine(customer.town, customer.postcode);

  return [siteName, address, location].filter(Boolean).join(", ");
}

function getCalendarDayNumber(date: Date) {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / CALENDAR_DAY_MS
  );
}

export function getWorkdayFromDate(date: Date): {
  dayLabel: string;
  selectedDay: DayName | null;
} {
  switch (date.getDay()) {
    case 1:
      return { dayLabel: "Monday", selectedDay: "Monday" };
    case 2:
      return { dayLabel: "Tuesday", selectedDay: "Tuesday" };
    case 3:
      return { dayLabel: "Wednesday", selectedDay: "Wednesday" };
    case 4:
      return { dayLabel: "Thursday", selectedDay: "Thursday" };
    case 5:
      return { dayLabel: "Friday", selectedDay: "Friday" };
    case 6:
      return { dayLabel: "Saturday", selectedDay: "Saturday" };
    default:
      return { dayLabel: "Sunday", selectedDay: "Sunday" };
  }
}

export function getFortnightWeek(date: Date): WeekNumber {
  return getCycleWeek(date, 2);
}

export function getSeasonStartYear(
  value: Date | string,
  seasonStart: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_START
) {
  const date = toCalendarDate(value);

  if (!date) {
    return getSeasonStartYear(new Date(), seasonStart);
  }

  const start = getSeasonMonthDayParts(
    seasonStart ?? DEFAULT_GRASS_CUT_SEASON_START,
    DEFAULT_GRASS_CUT_SEASON_START
  );
  const dateValue = (date.getMonth() + 1) * 100 + date.getDate();

  return dateValue >= start.numericValue ? date.getFullYear() : date.getFullYear() - 1;
}

export function getConfiguredSeasonStartYear(
  value: Date | string,
  seasonStart: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_START
) {
  return getSeasonStartYear(value, seasonStart);
}

export function getSeasonLabel(
  seasonStartYear: number,
  seasonStart: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_START,
  seasonEnd: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_END
) {
  const range = getSeasonDateRange(seasonStartYear, seasonStart, seasonEnd);

  if (range.startDate.getFullYear() === range.endDate.getFullYear()) {
    return String(range.startDate.getFullYear());
  }

  return `${seasonStartYear}/${String(range.endDate.getFullYear()).slice(-2)}`;
}

export function buildSeasonMonths(
  seasonStartYear: number,
  seasonStart: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_START,
  seasonEnd: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_END
) {
  const range = getSeasonDateRange(seasonStartYear, seasonStart, seasonEnd);
  const months = [];
  const cursor = new Date(
    range.startDate.getFullYear(),
    range.startDate.getMonth(),
    1
  );
  const lastMonth = new Date(range.endDate.getFullYear(), range.endDate.getMonth(), 1);

  while (cursor <= lastMonth) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const nextMonthStart = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      1
    );
    const start = `${monthStart.getFullYear()}-${String(
      monthStart.getMonth() + 1
    ).padStart(2, "0")}-01`;
    const endExclusive = `${nextMonthStart.getFullYear()}-${String(
      nextMonthStart.getMonth() + 1
    ).padStart(2, "0")}-01`;

    months.push({
      key: start,
      label: monthStart.toLocaleString("en-GB", { month: "short" }),
      fullLabel: monthStart.toLocaleString("en-GB", {
        month: "short",
        year: "numeric",
      }),
      year: monthStart.getFullYear(),
      monthIndex: monthStart.getMonth(),
      start,
      endExclusive,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

export function buildPaymentYearMonths(
  seasonStartYear: number,
  seasonStart: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_START
) {
  const start = getSeasonMonthDayParts(
    seasonStart ?? DEFAULT_GRASS_CUT_SEASON_START,
    DEFAULT_GRASS_CUT_SEASON_START
  );

  return Array.from({ length: 12 }, (_, index) => {
    const monthStart = new Date(seasonStartYear, start.month - 1 + index, 1);
    const nextMonthStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      1
    );
    const key = `${monthStart.getFullYear()}-${String(
      monthStart.getMonth() + 1
    ).padStart(2, "0")}-01`;

    return {
      key,
      label: monthStart.toLocaleString("en-GB", { month: "short" }),
      fullLabel: monthStart.toLocaleString("en-GB", {
        month: "short",
        year: "numeric",
      }),
      year: monthStart.getFullYear(),
      monthIndex: monthStart.getMonth(),
      start: key,
      endExclusive: `${nextMonthStart.getFullYear()}-${String(
        nextMonthStart.getMonth() + 1
      ).padStart(2, "0")}-01`,
    };
  });
}

export function formatCurrency(
  value: number | null | undefined,
  currencyCode: CurrencyCode | string = DEFAULT_CURRENCY_CODE
) {
  return formatCurrencyAmount(value, currencyCode);
}

export function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineMiles(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

export function formatMiles(miles: number) {
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `~${hours} hr`;
  return `~${hours}h ${remaining}m`;
}

export function getFrequencyBadgeClass(frequency: CutFrequency) {
  if (frequency === "Weekly") return "bg-teal-600 text-white";
  if (frequency === "Fortnightly") return "bg-emerald-600 text-white";
  if (frequency === "3 Weekly") return "bg-amber-500 text-black";
  return "bg-sky-600 text-white";
}

export function getFrequencyDays(frequency: CutFrequency) {
  return getRotationDays(getRotationWeeksFromCutFrequency(frequency));
}

export function getMonthlyPlanCharge(customer: Customer | null | undefined) {
  const amount = Number((customer as any)?.grassCutAmount ?? 0);
  return amount;
}

export function getEstimatedCustomerMonthlyValue(
  customer: Customer,
  defaultRotationWeeks: RotationWeeks | number | null | undefined = DEFAULT_ROTATION_WEEKS
) {
  const amount = Number((customer as any)?.grassCutAmount ?? 0);
  const effectiveRotationWeeks = getEffectiveRotationWeeks(
    customer,
    defaultRotationWeeks
  );

  if (!customer.isGrassCuttingCustomer) return 0;
  if ((customer.paymentMethod ?? "Monthly") === "Monthly") {
    return getMonthlyPlanCharge(customer);
  }

  return amount * (52 / 12 / effectiveRotationWeeks);
}

export function getSeasonCutSlotCount(
  frequencyOrRotationWeeks: CutFrequency | RotationWeeks | number,
  seasonStartYear: number,
  seasonStart: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_START,
  seasonEnd: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_END
) {
  const range = getSeasonDateRange(seasonStartYear, seasonStart, seasonEnd);
  const dayCount =
    getCalendarDayNumber(range.endDate) - getCalendarDayNumber(range.startDate);
  const frequencyDays =
    typeof frequencyOrRotationWeeks === "string"
      ? getFrequencyDays(frequencyOrRotationWeeks)
      : getRotationDays(frequencyOrRotationWeeks);

  return Math.max(1, Math.floor(dayCount / frequencyDays) + 1);
}

export function getEstimatedCustomerYearlyValue(
  customer: Customer,
  seasonStart: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_START,
  seasonEnd: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_END,
  defaultRotationWeeks: RotationWeeks | number | null | undefined = DEFAULT_ROTATION_WEEKS
) {
  if (!customer.isGrassCuttingCustomer) return 0;

  const currentSeasonStartYear = getConfiguredSeasonStartYear(
    new Date(),
    seasonStart
  );

  if ((customer.paymentMethod ?? "Monthly") === "Monthly") {
    return getMonthlyPlanCharge(customer) * 12;
  }

  const amount = Number((customer as any)?.grassCutAmount ?? 0);
  const effectiveRotationWeeks = getEffectiveRotationWeeks(
    customer,
    defaultRotationWeeks
  );

  return (
    amount *
    getSeasonCutSlotCount(
      effectiveRotationWeeks,
      currentSeasonStartYear,
      seasonStart,
      seasonEnd
    )
  );
}

export function getLastVisitForCustomer(customerId: number, visitLogs: VisitLog[]) {
  return visitLogs
    .filter((log) => log.customerId === customerId)
    .sort((a, b) => +new Date(b.visitDate) - +new Date(a.visitDate))[0];
}

export function formatNextDue(
  customer: Customer,
  visitLogs: VisitLog[],
  defaultRotationWeeks: RotationWeeks | number | null | undefined = DEFAULT_ROTATION_WEEKS
) {
  const lastVisit = getLastVisitForCustomer(customer.id, visitLogs);
  if (!lastVisit) return "Due now";

  const base = new Date(lastVisit.visitDate);
  base.setDate(
    base.getDate() +
      getRotationDays(getEffectiveRotationWeeks(customer, defaultRotationWeeks))
  );
  return formatUkDate(base);
}

export function getCustomerTotals(
    customerId: number,
    visitLogs: VisitLog[],
    customers: Customer[],
    monthlyPayments: MonthlyPayment[] = [],
    seasonStart: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_START,
    seasonEnd: string | null | undefined = DEFAULT_GRASS_CUT_SEASON_END,
    seasonStartYear = getConfiguredSeasonStartYear(new Date(), seasonStart)
) {
  const customer = customers.find((c) => c.id === customerId);
  const price = Number((customer as any)?.grassCutAmount ?? 0);

  const visits = visitLogs.filter(
      (v) =>
        v.customerId === customerId &&
        v.status === "completed" &&
        isDateInSeasonRange(v.visitDate, seasonStartYear, seasonStart, seasonEnd)
  );

  if ((customer?.paymentMethod ?? "Monthly") === "Monthly") {
    const monthlyCharge = getMonthlyPlanCharge(customer);
    const paymentMonths = buildPaymentYearMonths(seasonStartYear, seasonStart);
    const currentMonthKey = getInputDateValue(new Date().toISOString()).slice(0, 7);
    const dueMonths = new Set(
      paymentMonths
        .filter((month) => month.key.slice(0, 7) <= currentMonthKey)
        .map((month) => month.key.slice(0, 7))
    );
    const paidMonths = new Set(
      monthlyPayments
        .filter((payment) => payment.customerId === customerId)
        .filter((payment) => Boolean(getInputDateValue(payment.paymentDate)))
        .filter((payment) =>
          paymentMonths.some(
            (month) => month.key === getInputDateValue(payment.paymentMonth)
          )
        )
        .map((payment) => getInputDateValue(payment.paymentMonth).slice(0, 7))
    );
    const outstandingMonths = Array.from(dueMonths).filter(
      (paymentMonth) => !paidMonths.has(paymentMonth)
    ).length;

    const lastVisit = [...visits].sort(
      (a, b) => +new Date(b.visitDate) - +new Date(a.visitDate)
    )[0];

    return {
      totalSpent: paidMonths.size * monthlyCharge,
      outstanding: outstandingMonths * monthlyCharge,
      lastVisit: lastVisit?.visitDate ?? null,
    };
  }

  const totalSpent =
      visits.filter((v) => v.paymentStatus === "Paid").length * price;

  const outstanding =
      visits.filter((v) => v.paymentStatus !== "Paid").length * price;

  const lastVisit = [...visits].sort(
      (a, b) => +new Date(b.visitDate) - +new Date(a.visitDate)
  )[0];

  return {
    totalSpent,
    outstanding,
    lastVisit: lastVisit?.visitDate ?? null,
  };
}

export function latestDate(dates: string[]) {
  if (!dates.length) return null;

  const sorted = [...dates].sort(
    (a, b) => +new Date(b) - +new Date(a)
  );

  return new Date(sorted[0]);
}
