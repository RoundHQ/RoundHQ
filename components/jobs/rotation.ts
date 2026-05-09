import type { Customer, CutFrequency, RotationWeeks, WeekNumber } from "./types";

export const DEFAULT_ROTATION_WEEKS: RotationWeeks = 2;
export const ROTATION_WEEK_OPTIONS: RotationWeeks[] = [1, 2, 3, 4];
export const WEEK_OPTIONS: WeekNumber[] = ["Week 1", "Week 2", "Week 3", "Week 4"];

const CALENDAR_DAY_MS = 24 * 60 * 60 * 1000;
const ROTATION_ANCHOR_DATE = {
  year: 2026,
  monthIndex: 3,
  day: 20,
  weekIndex: 1,
};

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function getCalendarDayNumber(date: Date) {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / CALENDAR_DAY_MS
  );
}

export function normalizeRotationWeeks(
  value: unknown,
  fallback: RotationWeeks = DEFAULT_ROTATION_WEEKS
): RotationWeeks {
  const parsed = Number(value);
  return ROTATION_WEEK_OPTIONS.includes(parsed as RotationWeeks)
    ? (parsed as RotationWeeks)
    : fallback;
}

export function normalizeNullableRotationWeeks(value: unknown): RotationWeeks | null {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return ROTATION_WEEK_OPTIONS.includes(parsed as RotationWeeks)
    ? (parsed as RotationWeeks)
    : null;
}

export function getRotationLabel(rotationWeeks: RotationWeeks) {
  switch (rotationWeeks) {
    case 1:
      return "Weekly";
    case 2:
      return "Fortnightly";
    case 3:
      return "Every 3 weeks";
    default:
      return "Monthly / 4-weekly";
  }
}

export function getCutFrequencyFromRotationWeeks(
  rotationWeeks: RotationWeeks
): CutFrequency {
  switch (rotationWeeks) {
    case 1:
      return "Weekly";
    case 2:
      return "Fortnightly";
    case 3:
      return "3 Weekly";
    default:
      return "Monthly";
  }
}

export function getRotationWeeksFromCutFrequency(
  frequency: CutFrequency | string | null | undefined
): RotationWeeks {
  const normalized = String(frequency ?? "").trim().toLowerCase();

  if (normalized.includes("week") && normalized.includes("1")) return 1;
  if (normalized === "weekly" || normalized === "week") return 1;
  if (normalized.includes("3")) return 3;
  if (normalized.includes("month") || normalized.includes("4")) return 4;
  return 2;
}

export function getEffectiveRotationWeeks(
  customer: Pick<Customer, "rotationWeeksOverride" | "cutFrequency"> | null | undefined,
  defaultRotationWeeks: RotationWeeks | number | null | undefined = DEFAULT_ROTATION_WEEKS
): RotationWeeks {
  return (
    normalizeNullableRotationWeeks(customer?.rotationWeeksOverride) ??
    normalizeRotationWeeks(defaultRotationWeeks)
  );
}

export function getWeekOptions(rotationWeeks: RotationWeeks | number): WeekNumber[] {
  const normalizedRotationWeeks = normalizeRotationWeeks(rotationWeeks);
  return WEEK_OPTIONS.slice(0, normalizedRotationWeeks);
}

export function getActiveRotationWeeks(
  customers: Array<Pick<Customer, "rotationWeeksOverride" | "cutFrequency">>,
  defaultRotationWeeks: RotationWeeks | number | null | undefined = DEFAULT_ROTATION_WEEKS
): RotationWeeks {
  const businessDefault = normalizeRotationWeeks(defaultRotationWeeks);
  const maximumRotationWeeks = customers.reduce<number>(
    (max, customer) =>
      Math.max(max, getEffectiveRotationWeeks(customer, businessDefault)),
    businessDefault
  );

  return normalizeRotationWeeks(maximumRotationWeeks, businessDefault);
}

export function getWeekNumberIndex(week: WeekNumber | string | number | null | undefined) {
  if (typeof week === "number") {
    return Number.isFinite(week) ? Math.max(0, Math.floor(week) - 1) : 0;
  }

  const match = String(week ?? "").match(/(\d+)/);
  const parsed = Number(match?.[1] ?? 1);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed) - 1) : 0;
}

export function normalizeWeekNumber(
  week: WeekNumber | string | number | null | undefined,
  rotationWeeks: RotationWeeks | number = 4
): WeekNumber {
  const normalizedRotationWeeks = normalizeRotationWeeks(rotationWeeks, 4);
  const oneBased = Math.min(
    normalizedRotationWeeks,
    Math.max(1, getWeekNumberIndex(week) + 1)
  );
  return `Week ${oneBased}` as WeekNumber;
}

export function getCycleWeek(
  date: Date,
  rotationWeeks: RotationWeeks | number = DEFAULT_ROTATION_WEEKS
): WeekNumber {
  const normalizedRotationWeeks = normalizeRotationWeeks(rotationWeeks);
  const anchorDate = new Date(
    ROTATION_ANCHOR_DATE.year,
    ROTATION_ANCHOR_DATE.monthIndex,
    ROTATION_ANCHOR_DATE.day
  );
  const anchorWeekIndex = Math.min(
    ROTATION_ANCHOR_DATE.weekIndex,
    normalizedRotationWeeks - 1
  );
  const dayOffset = getCalendarDayNumber(date) - getCalendarDayNumber(anchorDate);
  const weekOffset = Math.floor(dayOffset / 7);

  return normalizeWeekNumber(
    positiveModulo(anchorWeekIndex + weekOffset, normalizedRotationWeeks) + 1,
    normalizedRotationWeeks
  );
}

export function getRotationCycleLabel(
  week: WeekNumber | string | number | null | undefined,
  rotationWeeks: RotationWeeks | number
) {
  const normalizedRotationWeeks = normalizeRotationWeeks(rotationWeeks);

  if (normalizedRotationWeeks === 1) {
    return "This week";
  }

  return `Week ${
    getWeekNumberIndex(normalizeWeekNumber(week, normalizedRotationWeeks)) + 1
  } of ${normalizedRotationWeeks}`;
}

export function isCustomerDueInSelectedWeek(
  customer: Pick<Customer, "week" | "rotationWeeksOverride" | "cutFrequency">,
  selectedWeek: WeekNumber | string,
  defaultRotationWeeks: RotationWeeks | number | null | undefined = DEFAULT_ROTATION_WEEKS
) {
  const effectiveRotationWeeks = getEffectiveRotationWeeks(
    customer,
    defaultRotationWeeks
  );
  const selectedWeekIndex = getWeekNumberIndex(selectedWeek);
  const customerWeekIndex = getWeekNumberIndex(
    normalizeWeekNumber(customer.week, effectiveRotationWeeks)
  );

  return (
    positiveModulo(selectedWeekIndex - customerWeekIndex, effectiveRotationWeeks) ===
    0
  );
}

export function isCustomerDueOnDate(
  customer: Pick<Customer, "week" | "day" | "rotationWeeksOverride" | "cutFrequency">,
  date: Date,
  selectedDay: string | null,
  defaultRotationWeeks: RotationWeeks | number | null | undefined = DEFAULT_ROTATION_WEEKS
) {
  if (!selectedDay || customer.day !== selectedDay) {
    return false;
  }

  const effectiveRotationWeeks = getEffectiveRotationWeeks(
    customer,
    defaultRotationWeeks
  );

  return (
    normalizeWeekNumber(customer.week, effectiveRotationWeeks) ===
    getCycleWeek(date, effectiveRotationWeeks)
  );
}

export function getRotationDays(rotationWeeks: RotationWeeks | number) {
  return normalizeRotationWeeks(rotationWeeks) * 7;
}
