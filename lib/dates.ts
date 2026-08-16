export const DEFAULT_BUSINESS_TIME_ZONE = "Europe/London";
export const UK_DATE_LOCALE = "en-GB";

type DateInput = Date | string | number;

function toDate(value: DateInput) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }

  return new Date(value);
}

export function normalizeBusinessTimeZone(value?: string | null) {
  const candidate = value?.trim() || DEFAULT_BUSINESS_TIME_ZONE;

  try {
    new Intl.DateTimeFormat(UK_DATE_LOCALE, { timeZone: candidate }).format();
    return candidate;
  } catch {
    return DEFAULT_BUSINESS_TIME_ZONE;
  }
}

export function getBusinessDateParts(
  value: DateInput = new Date(),
  timeZone: string = DEFAULT_BUSINESS_TIME_ZONE
) {
  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat(UK_DATE_LOCALE, {
    timeZone: normalizeBusinessTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));

  if (!year || !month || !day) {
    return null;
  }

  return {
    year,
    month,
    day,
    weekday: get("weekday"),
    isoDate: `${String(year).padStart(4, "0")}-${String(month).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`,
  };
}

export function getBusinessDate(
  value: DateInput = new Date(),
  timeZone: string = DEFAULT_BUSINESS_TIME_ZONE
) {
  const parts = getBusinessDateParts(value, timeZone);
  return parts
    ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12))
    : new Date(Number.NaN);
}

export function getBusinessIsoDate(
  value: DateInput = new Date(),
  timeZone: string = DEFAULT_BUSINESS_TIME_ZONE
) {
  return getBusinessDateParts(value, timeZone)?.isoDate ?? "";
}

export function formatUkDate(
  value: DateInput | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
  timeZone: string = DEFAULT_BUSINESS_TIME_ZONE
) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(UK_DATE_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: normalizeBusinessTimeZone(timeZone),
    ...options,
  }).format(date);
}

export function formatUkDateTime(
  value: DateInput | null | undefined,
  timeZone: string = DEFAULT_BUSINESS_TIME_ZONE
) {
  return formatUkDate(
    value,
    { hour: "2-digit", minute: "2-digit", hour12: false },
    timeZone
  );
}

export function addCalendarDays(isoDate: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);

  if (!match) {
    return isoDate;
  }

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days, 12)
  );
  return date.toISOString().slice(0, 10);
}

export function zonedLocalDateTimeToUtc(
  isoDate: string,
  clockTime: string,
  timeZone: string = DEFAULT_BUSINESS_TIME_ZONE
) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(clockTime);

  if (!dateMatch || !timeMatch) {
    return new Date(Number.NaN);
  }

  const desired = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2])
  );
  let candidate = new Date(desired);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat(UK_DATE_LOCALE, {
      timeZone: normalizeBusinessTimeZone(timeZone),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(candidate);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);
    const represented = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute")
    );
    const difference = desired - represented;
    if (difference === 0) break;
    candidate = new Date(candidate.getTime() + difference);
  }

  return candidate;
}
