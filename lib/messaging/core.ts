import { createHash } from "crypto";
import { DEFAULT_BUSINESS_TIME_ZONE, normalizeBusinessTimeZone } from "@/lib/dates";

export type CustomerMessageChannel = "email" | "sms";
export type CustomerMessageKind =
  | "quote"
  | "invoice"
  | "quote_follow_up"
  | "invoice_follow_up"
  | "service_reminder"
  | "job_completion";
export type CustomerMessageStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "cancelled";

export function normalizeEmailAddress(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

export function normalizeSmsPhoneNumber(value: string) {
  let normalized = value.trim().replace(/[^\d+]/g, "");

  if (normalized.startsWith("00")) {
    normalized = `+${normalized.slice(2)}`;
  } else if (normalized.startsWith("0")) {
    normalized = `+44${normalized.slice(1)}`;
  } else if (!normalized.startsWith("+")) {
    normalized = `+${normalized}`;
  }

  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : "";
}

export function normalizeUkMobileNumber(value: string) {
  const normalized = normalizeSmsPhoneNumber(value);
  return /^\+447\d{9}$/.test(normalized) ? normalized : "";
}

export function normalizeAlphanumericSenderId(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return /^[A-Za-z0-9 ]{1,11}$/.test(normalized) && /[A-Za-z]/.test(normalized)
    ? normalized
    : "";
}
export function renderMessageTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>
) {
  return template.replace(/{{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*}}/g, (match, key) => {
    const value = values[key];
    return value === null || value === undefined ? match : String(value);
  });
}

export function getMessageIdempotencyKey(input: {
  organizationId: string;
  customerId?: number | null;
  channel: CustomerMessageChannel;
  kind: CustomerMessageKind;
  relatedType?: string | null;
  relatedId?: string | null;
  occurrence?: string | null;
}) {
  return createHash("sha256")
    .update(
      [
        input.organizationId,
        input.customerId ?? "none",
        input.channel,
        input.kind,
        input.relatedType ?? "none",
        input.relatedId ?? "none",
        input.occurrence ?? "once",
      ].join(":"),
      "utf8"
    )
    .digest("hex");
}

function getLocalMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: normalizeBusinessTimeZone(timeZone),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function parseClock(value: string, fallback: number) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  const hour = Number(match?.[1]);
  const minute = Number(match?.[2]);
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60
    ? hour * 60 + minute
    : fallback;
}

export function isInsideQuietHours(options: {
  date?: Date;
  timeZone?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}) {
  const now = options.date ?? new Date();
  const localMinutes = getLocalMinutes(
    now,
    options.timeZone ?? DEFAULT_BUSINESS_TIME_ZONE
  );
  const start = parseClock(options.quietHoursStart ?? "20:00", 20 * 60);
  const end = parseClock(options.quietHoursEnd ?? "08:00", 8 * 60);

  if (start === end) {
    return false;
  }

  return start < end
    ? localMinutes >= start && localMinutes < end
    : localMinutes >= start || localMinutes < end;
}

export function getNextPermittedSendTime(options: {
  requestedAt?: Date;
  timeZone?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}) {
  const requestedAt = new Date((options.requestedAt ?? new Date()).getTime());

  if (!isInsideQuietHours({ ...options, date: requestedAt })) {
    return requestedAt;
  }

  const candidate = new Date(requestedAt);

  for (let index = 0; index < 24 * 60; index += 5) {
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 5);

    if (!isInsideQuietHours({ ...options, date: candidate })) {
      return candidate;
    }
  }

  return requestedAt;
}
