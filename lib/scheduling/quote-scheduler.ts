export const SCHEDULING_DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type SchedulingDayName = (typeof SCHEDULING_DAY_NAMES)[number];

export const DEFAULT_QUOTE_WORK_TYPE_OPTIONS = [
  "Hedge cutting",
  "Grass cutting",
  "Pressure washing",
  "Garden clearance",
  "Other",
] as const;

export const QUOTE_WORK_TYPE_OPTIONS = DEFAULT_QUOTE_WORK_TYPE_OPTIONS;

export type QuoteWorkType = string;
export type SchedulingMode = "off" | "suggest" | "auto";
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
export type PostcodeGroupingPreference = "none" | "outward" | "sector";

export type SchedulingTimeWindow = {
  start: string;
  end: string;
};

export type SchedulingDayHours = SchedulingTimeWindow & {
  enabled: boolean;
};

export type SchedulingUnavailableWindow = SchedulingTimeWindow & {
  id: string;
  day: SchedulingDayName;
  label?: string;
};

export type AutoSchedulingSettings = {
  enabled: boolean;
  mode: SchedulingMode;
  workCategories: string[];
  workingDays: SchedulingDayName[];
  workingHours: Record<SchedulingDayName, SchedulingDayHours>;
  unavailableWindows: SchedulingUnavailableWindow[];
  allowServiceRoundDays: boolean;
  defaultTravelBufferMinutes: number;
  maxJobsPerDay: number | null;
  postcodeGrouping: PostcodeGroupingPreference;
};

export type SchedulingQuote = {
  id: string;
  quoteNumber?: string;
  customerId: number | null;
  customerName: string;
  customerAddress?: string;
  customerPostcode?: string;
  siteAddress?: string;
  sitePostcode?: string;
  workType?: QuoteWorkType;
  estimatedDurationMinutes?: number | null;
  autoSchedulingPreference?: QuoteAutoSchedulingPreference;
  autoSchedulingDisabled?: boolean;
  serviceRoundSchedulingPreference?: ServiceRoundSchedulingPreference;
};

export type SchedulingExistingJob = {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  finishTime?: string;
  customerId?: number | null;
  customerName?: string;
  type?: string;
  status?: string;
  quoteIds?: string[];
  workType?: QuoteWorkType;
  postcode?: string;
  estimatedDurationMinutes?: number | null;
};

export type SchedulingSlot = {
  date: string;
  startTime: string;
  finishTime: string;
};

export type RejectedSchedulingCandidate = {
  date: string;
  startTime?: string;
  reason: string;
};

export type SchedulingDecisionReason =
  | "off"
  | "quote_disabled"
  | "already_scheduled"
  | "missing_estimated_time"
  | "job_too_long"
  | "no_working_hours"
  | "same_work_type"
  | "location_grouping"
  | "same_work_type_future"
  | "next_available"
  | "no_available_slot";

export type SchedulingDecision = {
  status: "scheduled" | "suggested" | "manual_required" | "skipped";
  effectiveMode: SchedulingMode;
  reason: SchedulingDecisionReason;
  reasonLabel: string;
  slot: SchedulingSlot | null;
  estimatedDurationMinutes: number | null;
  workType?: QuoteWorkType;
  postcode?: string;
  rejectedCandidates: RejectedSchedulingCandidate[];
};

export type SchedulingEmailDrafts = {
  customerSubject: string;
  customerMessage: string;
  operatorSubject: string;
  operatorMessage: string;
};

type CandidateSlot = SchedulingSlot & {
  priority: number;
  reason: SchedulingDecisionReason;
  reasonLabel: string;
  hasSameWorkType: boolean;
  hasNearbyLocation: boolean;
};

type BusyInterval = {
  start: number;
  end: number;
};

const DEFAULT_DAY_HOURS: SchedulingDayHours = {
  enabled: true,
  start: "08:00",
  end: "17:00",
};

const DEFAULT_DISABLED_DAY_HOURS: SchedulingDayHours = {
  enabled: false,
  start: "08:00",
  end: "17:00",
};

export const DEFAULT_AUTO_SCHEDULING_SETTINGS: AutoSchedulingSettings = {
  enabled: false,
  mode: "off",
  workCategories: [...DEFAULT_QUOTE_WORK_TYPE_OPTIONS],
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  workingHours: {
    Monday: DEFAULT_DAY_HOURS,
    Tuesday: DEFAULT_DAY_HOURS,
    Wednesday: DEFAULT_DAY_HOURS,
    Thursday: DEFAULT_DAY_HOURS,
    Friday: DEFAULT_DAY_HOURS,
    Saturday: DEFAULT_DISABLED_DAY_HOURS,
    Sunday: DEFAULT_DISABLED_DAY_HOURS,
  },
  unavailableWindows: [],
  allowServiceRoundDays: true,
  defaultTravelBufferMinutes: 15,
  maxJobsPerDay: null,
  postcodeGrouping: "outward",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clampInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

function normalizeTime(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const match = value
    .trim()
    .match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/);

  if (!match) {
    return fallback;
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function normalizeSchedulingDayName(value: unknown): SchedulingDayName | null {
  return SCHEDULING_DAY_NAMES.includes(value as SchedulingDayName)
    ? (value as SchedulingDayName)
    : null;
}

export function normalizeQuoteWorkType(value: unknown): QuoteWorkType {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || "Other";
}

export function normalizeSchedulingMode(value: unknown): SchedulingMode {
  if (value === "suggest" || value === "auto") {
    return value;
  }

  return "off";
}

export function normalizeQuoteAutoSchedulingPreference(
  value: unknown
): QuoteAutoSchedulingPreference {
  if (value === "disabled" || value === "suggest" || value === "auto") {
    return value;
  }

  return "default";
}

export function normalizeServiceRoundSchedulingPreference(
  value: unknown
): ServiceRoundSchedulingPreference {
  if (value === "allow" || value === "avoid" || value === "force") {
    return value;
  }

  return "default";
}

export function normalizePostcodeGroupingPreference(
  value: unknown
): PostcodeGroupingPreference {
  if (value === "none" || value === "sector") {
    return value;
  }

  return "outward";
}

function normalizeStringOptions(value: unknown, fallback: readonly string[]) {
  const source = Array.isArray(value) ? value : fallback;
  const normalized = Array.from(
    new Map(
      source
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
        .map((entry) => [entry.toLowerCase(), entry])
    ).values()
  );

  return normalized.length ? normalized : ["Other"];
}

function normalizeDayHours(
  value: unknown,
  fallback: SchedulingDayHours
): SchedulingDayHours {
  const entry = isRecord(value) ? value : {};
  const start = normalizeTime(entry.start, fallback.start);
  const end = normalizeTime(entry.end, fallback.end);
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);

  return {
    enabled:
      typeof entry.enabled === "boolean" ? entry.enabled : fallback.enabled,
    start,
    end: endMinutes > startMinutes ? end : fallback.end,
  };
}

export function normalizeAutoSchedulingSettings(
  value?: Partial<AutoSchedulingSettings> | null
): AutoSchedulingSettings {
  const source = isRecord(value) ? value : {};
  const workingDays = Array.isArray(source.workingDays)
    ? Array.from(
        new Set(
          source.workingDays
            .map(normalizeSchedulingDayName)
            .filter((day): day is SchedulingDayName => Boolean(day))
        )
      )
    : DEFAULT_AUTO_SCHEDULING_SETTINGS.workingDays;
  const rawWorkingHours: Record<string, unknown> = isRecord(source.workingHours)
    ? source.workingHours
    : {};
  const workingHours = Object.fromEntries(
    SCHEDULING_DAY_NAMES.map((day) => [
      day,
      normalizeDayHours(
        rawWorkingHours[day],
        DEFAULT_AUTO_SCHEDULING_SETTINGS.workingHours[day]
      ),
    ])
  ) as Record<SchedulingDayName, SchedulingDayHours>;
  const unavailableWindows = Array.isArray(source.unavailableWindows)
    ? source.unavailableWindows
        .map((entry, index): SchedulingUnavailableWindow | null => {
          if (!isRecord(entry)) {
            return null;
          }

          const day = normalizeSchedulingDayName(entry.day);

          if (!day) {
            return null;
          }

          const start = normalizeTime(entry.start, "12:00");
          const end = normalizeTime(entry.end, "13:00");

          if (parseTimeToMinutes(end) <= parseTimeToMinutes(start)) {
            return null;
          }

          return {
            id:
              typeof entry.id === "string" && entry.id.trim()
                ? entry.id.trim()
                : `unavailable-${index + 1}`,
            day,
            start,
            end,
            label:
              typeof entry.label === "string" && entry.label.trim()
                ? entry.label.trim()
                : undefined,
          };
        })
        .filter((entry): entry is SchedulingUnavailableWindow => Boolean(entry))
    : [];

  return {
    enabled: source.enabled === true,
    mode: normalizeSchedulingMode(source.mode),
    workCategories: normalizeStringOptions(
      source.workCategories,
      DEFAULT_AUTO_SCHEDULING_SETTINGS.workCategories
    ),
    workingDays: workingDays.length
      ? workingDays
      : DEFAULT_AUTO_SCHEDULING_SETTINGS.workingDays,
    workingHours,
    unavailableWindows,
    allowServiceRoundDays: source.allowServiceRoundDays !== false,
    defaultTravelBufferMinutes: clampInteger(
      source.defaultTravelBufferMinutes,
      DEFAULT_AUTO_SCHEDULING_SETTINGS.defaultTravelBufferMinutes,
      0,
      180
    ),
    maxJobsPerDay:
      source.maxJobsPerDay == null || source.maxJobsPerDay === 0
        ? null
        : clampInteger(source.maxJobsPerDay, 8, 1, 40),
    postcodeGrouping: normalizePostcodeGroupingPreference(source.postcodeGrouping),
  };
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayName(date: Date): SchedulingDayName {
  const dayIndex = date.getDay();
  return SCHEDULING_DAY_NAMES[
    dayIndex === 0 ? 6 : dayIndex - 1
  ] as SchedulingDayName;
}

function normalizeDateKey(value: string) {
  const parsedDate = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? "" : toDateKey(parsedDate);
}

function getQuotePostcode(quote: SchedulingQuote) {
  return (quote.sitePostcode || quote.customerPostcode || "").trim();
}

function getPostcodeGroup(
  postcode: string | undefined,
  preference: PostcodeGroupingPreference
) {
  if (!postcode || preference === "none") {
    return "";
  }

  const normalized = postcode.toUpperCase().replace(/\s+/g, " ").trim();
  const [outward, inward = ""] = normalized.split(" ");

  if (!outward) {
    return "";
  }

  if (preference === "sector") {
    const sector = inward.match(/^\d/)?.[0] ?? "";
    return sector ? `${outward} ${sector}` : outward;
  }

  return outward;
}

function jobMatchesWorkType(job: SchedulingExistingJob, workType?: QuoteWorkType) {
  if (!workType) {
    return false;
  }

  if (job.workType === workType) {
    return true;
  }

  const normalizedWorkType = workType.toLowerCase();
  return (
    job.title.toLowerCase().includes(normalizedWorkType) ||
    (job.type ?? "").toLowerCase().includes(normalizedWorkType)
  );
}

function intervalsOverlap(left: BusyInterval, right: BusyInterval) {
  return left.start < right.end && right.start < left.end;
}

function getServiceRoundRestriction(
  preference: ServiceRoundSchedulingPreference,
  allowServiceRoundDays: boolean,
  isServiceRoundDay: boolean
) {
  if (preference === "force") {
    return isServiceRoundDay ? null : "not_service_round_day";
  }

  if (preference === "avoid") {
    return isServiceRoundDay ? "service_round_day_avoided" : null;
  }

  if (!allowServiceRoundDays && preference !== "allow" && isServiceRoundDay) {
    return "service_round_day_blocked";
  }

  return null;
}

function getReasonLabel(reason: SchedulingDecisionReason) {
  switch (reason) {
    case "same_work_type":
      return "work type grouping";
    case "location_grouping":
      return "location grouping";
    case "same_work_type_future":
      return "nearest future day with similar work";
    case "next_available":
      return "next available slot";
    case "missing_estimated_time":
      return "missing estimated time";
    case "job_too_long":
      return "job is longer than the configured working day";
    case "already_scheduled":
      return "quote already has a scheduled job";
    case "quote_disabled":
      return "auto-scheduling disabled for this quote";
    case "off":
      return "auto-scheduling is off";
    case "no_working_hours":
      return "no working hours configured";
    default:
      return "needs manual scheduling";
  }
}

function getJobsForDate(jobs: SchedulingExistingJob[], dateKey: string) {
  return jobs.filter((job) => normalizeDateKey(job.date) === dateKey);
}

function getBusyIntervals(
  dateJobs: SchedulingExistingJob[],
  unavailableWindows: SchedulingUnavailableWindow[],
  day: SchedulingDayName,
  bufferMinutes: number
): BusyInterval[] {
  const jobIntervals = dateJobs
    .map((job): BusyInterval | null => {
      if (!job.startTime || !job.finishTime) {
        return null;
      }

      const start = parseTimeToMinutes(normalizeTime(job.startTime, "00:00"));
      const end = parseTimeToMinutes(normalizeTime(job.finishTime, "00:00"));

      if (end <= start) {
        return null;
      }

      return {
        start: Math.max(0, start - bufferMinutes),
        end: Math.min(24 * 60, end + bufferMinutes),
      };
    })
    .filter((interval): interval is BusyInterval => Boolean(interval));
  const unavailableIntervals = unavailableWindows
    .filter((window) => window.day === day)
    .map((window) => ({
      start: parseTimeToMinutes(window.start),
      end: parseTimeToMinutes(window.end),
    }));

  return [...jobIntervals, ...unavailableIntervals].sort(
    (left, right) => left.start - right.start
  );
}

function getCandidateReason(options: {
  dateKey: string;
  firstSameWorkTypeDate: string | null;
  hasSameWorkType: boolean;
  hasNearbyLocation: boolean;
}): Pick<CandidateSlot, "priority" | "reason" | "reasonLabel"> {
  if (options.hasSameWorkType) {
    return {
      priority: 1,
      reason:
        options.firstSameWorkTypeDate === options.dateKey
          ? "same_work_type"
          : "same_work_type_future",
      reasonLabel: getReasonLabel(
        options.firstSameWorkTypeDate === options.dateKey
          ? "same_work_type"
          : "same_work_type_future"
      ),
    };
  }

  if (options.hasNearbyLocation) {
    return {
      priority: 2,
      reason: "location_grouping",
      reasonLabel: getReasonLabel("location_grouping"),
    };
  }

  return {
    priority: 4,
    reason: "next_available",
    reasonLabel: getReasonLabel("next_available"),
  };
}

export function chooseSchedulingSlot(input: {
  settings: AutoSchedulingSettings;
  quote: SchedulingQuote;
  jobs: SchedulingExistingJob[];
  serviceRoundDateKeys?: string[];
  now?: Date;
  searchDays?: number;
}): SchedulingDecision {
  const settings = normalizeAutoSchedulingSettings(input.settings);
  const preference = normalizeQuoteAutoSchedulingPreference(
    input.quote.autoSchedulingPreference
  );
  const effectiveMode =
    preference === "suggest" || preference === "auto"
      ? preference
      : settings.mode;
  const estimatedDurationMinutes =
    typeof input.quote.estimatedDurationMinutes === "number" &&
    Number.isFinite(input.quote.estimatedDurationMinutes)
      ? Math.max(0, Math.round(input.quote.estimatedDurationMinutes))
      : null;
  const quotePostcode = getQuotePostcode(input.quote);
  const quotePostcodeGroup = getPostcodeGroup(
    quotePostcode,
    settings.postcodeGrouping
  );
  const rejectedCandidates: RejectedSchedulingCandidate[] = [];
  const workType = input.quote.workType
    ? normalizeQuoteWorkType(input.quote.workType)
    : undefined;

  const finishDecision = (
    status: SchedulingDecision["status"],
    reason: SchedulingDecisionReason,
    slot: SchedulingSlot | null = null
  ): SchedulingDecision => ({
    status,
    effectiveMode,
    reason,
    reasonLabel: getReasonLabel(reason),
    slot,
    estimatedDurationMinutes,
    workType,
    postcode: quotePostcode || undefined,
    rejectedCandidates: rejectedCandidates.slice(0, 80),
  });

  if (!settings.enabled || effectiveMode === "off") {
    return finishDecision("skipped", "off");
  }

  if (input.quote.autoSchedulingDisabled || preference === "disabled") {
    return finishDecision("skipped", "quote_disabled");
  }

  if (input.jobs.some((job) => (job.quoteIds ?? []).includes(input.quote.id))) {
    return finishDecision("skipped", "already_scheduled");
  }

  if (!estimatedDurationMinutes) {
    return finishDecision("manual_required", "missing_estimated_time");
  }

  const serviceRoundPreference = normalizeServiceRoundSchedulingPreference(
    input.quote.serviceRoundSchedulingPreference
  );
  const serviceRoundDateKeys = new Set(
    (input.serviceRoundDateKeys ?? [])
      .map(normalizeDateKey)
      .filter(Boolean)
  );
  const baseDate = input.now ?? new Date();
  const startDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate()
  );
  const searchDays = Math.max(1, Math.min(365, input.searchDays ?? 60));
  const candidates: CandidateSlot[] = [];
  const workingDays = new Set(settings.workingDays);
  const sameWorkTypeDates = new Set<string>();

  for (let offset = 0; offset < searchDays; offset += 1) {
    const date = addDays(startDate, offset);
    const dateKey = toDateKey(date);
    const dateJobs = getJobsForDate(input.jobs, dateKey);

    if (dateJobs.some((job) => jobMatchesWorkType(job, workType))) {
      sameWorkTypeDates.add(dateKey);
    }
  }

  const firstSameWorkTypeDate =
    Array.from(sameWorkTypeDates).sort((left, right) =>
      left.localeCompare(right)
    )[0] ?? null;
  let sawWorkingHours = false;
  let maxDailyAvailableMinutes = 0;

  for (let offset = 0; offset < searchDays; offset += 1) {
    const date = addDays(startDate, offset);
    const dateKey = toDateKey(date);
    const day = getDayName(date);
    const hours = settings.workingHours[day];

    if (!workingDays.has(day) || !hours.enabled) {
      rejectedCandidates.push({ date: dateKey, reason: "not_working_day" });
      continue;
    }

    const workingStart = parseTimeToMinutes(hours.start);
    const workingEnd = parseTimeToMinutes(hours.end);
    const workingMinutes = workingEnd - workingStart;

    if (workingMinutes <= 0) {
      rejectedCandidates.push({ date: dateKey, reason: "invalid_working_hours" });
      continue;
    }

    sawWorkingHours = true;
    maxDailyAvailableMinutes = Math.max(maxDailyAvailableMinutes, workingMinutes);

    const serviceRoundRestriction = getServiceRoundRestriction(
      serviceRoundPreference,
      settings.allowServiceRoundDays,
      serviceRoundDateKeys.has(dateKey)
    );

    if (serviceRoundRestriction) {
      rejectedCandidates.push({
        date: dateKey,
        reason: serviceRoundRestriction,
      });
      continue;
    }

    const dateJobs = getJobsForDate(input.jobs, dateKey);

    if (
      settings.maxJobsPerDay != null &&
      dateJobs.filter((job) => job.status !== "Cancelled").length >=
        settings.maxJobsPerDay
    ) {
      rejectedCandidates.push({ date: dateKey, reason: "max_jobs_reached" });
      continue;
    }

    const busyIntervals = getBusyIntervals(
      dateJobs,
      settings.unavailableWindows,
      day,
      settings.defaultTravelBufferMinutes
    );
    const hasSameWorkType = dateJobs.some((job) =>
      jobMatchesWorkType(job, workType)
    );
    const hasNearbyLocation =
      Boolean(quotePostcodeGroup) &&
      dateJobs.some(
        (job) =>
          getPostcodeGroup(job.postcode, settings.postcodeGrouping) ===
          quotePostcodeGroup
      );
    const reasonDetails = getCandidateReason({
      dateKey,
      firstSameWorkTypeDate,
      hasSameWorkType,
      hasNearbyLocation,
    });

    for (
      let slotStart = workingStart;
      slotStart + estimatedDurationMinutes <= workingEnd;
      slotStart += 15
    ) {
      const slotEnd = slotStart + estimatedDurationMinutes;
      const interval = { start: slotStart, end: slotEnd };
      const blockingInterval = busyIntervals.find((busy) =>
        intervalsOverlap(interval, busy)
      );

      if (blockingInterval) {
        rejectedCandidates.push({
          date: dateKey,
          startTime: minutesToTime(slotStart),
          reason: "existing_job_or_unavailable_time",
        });
        continue;
      }

      candidates.push({
        date: dateKey,
        startTime: minutesToTime(slotStart),
        finishTime: minutesToTime(slotEnd),
        hasSameWorkType,
        hasNearbyLocation,
        ...reasonDetails,
      });
    }
  }

  if (!sawWorkingHours) {
    return finishDecision("manual_required", "no_working_hours");
  }

  if (estimatedDurationMinutes > maxDailyAvailableMinutes) {
    return finishDecision("manual_required", "job_too_long");
  }

  const chosen = candidates.sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    if (left.date !== right.date) {
      return left.date.localeCompare(right.date);
    }

    return left.startTime.localeCompare(right.startTime);
  })[0];

  if (!chosen) {
    return finishDecision("manual_required", "no_available_slot");
  }

  return {
    status: effectiveMode === "suggest" ? "suggested" : "scheduled",
    effectiveMode,
    reason: chosen.reason,
    reasonLabel: chosen.reasonLabel,
    slot: {
      date: chosen.date,
      startTime: chosen.startTime,
      finishTime: chosen.finishTime,
    },
    estimatedDurationMinutes,
    workType,
    postcode: quotePostcode || undefined,
    rejectedCandidates: rejectedCandidates.slice(0, 80),
  };
}

function formatDisplayDate(dateKey: string) {
  const parsedDate = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateKey;
  }

  return parsedDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDuration(minutes: number | null | undefined) {
  if (!minutes) {
    return "Not set";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return [
    hours > 0 ? `${hours}h` : "",
    remainingMinutes > 0 ? `${remainingMinutes}m` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildSchedulingEmailDrafts(input: {
  quote: SchedulingQuote;
  decision: SchedulingDecision;
  businessName: string;
  businessEmail?: string;
  businessPhone?: string;
}): SchedulingEmailDrafts {
  const slot = input.decision.slot;
  const scheduledDate = slot ? formatDisplayDate(slot.date) : "the next visit";
  const startWindow = slot?.startTime ?? "the agreed time";
  const endWindow = slot
    ? minutesToTime(parseTimeToMinutes(slot.startTime) + 30)
    : "shortly after";
  const quoteReference = input.quote.quoteNumber || input.quote.id;
  const contactLine = [input.businessPhone, input.businessEmail]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" | ");

  return {
    customerSubject: `Quote ${quoteReference} accepted - job scheduled`,
    customerMessage: [
      `Hi ${input.quote.customerName},`,
      "",
      `Thanks for accepting quote ${quoteReference}.`,
      `Your job has been scheduled for ${scheduledDate}. We expect to arrive between ${startWindow} and ${endWindow}. This is an approximate time and may vary slightly depending on weather, traffic, and earlier jobs.`,
      "",
      contactLine ? `If you need to contact us: ${contactLine}` : "",
      "",
      "Kind regards,",
      input.businessName,
    ]
      .filter(Boolean)
      .join("\n"),
    operatorSubject: `Auto-scheduled ${quoteReference} for ${input.quote.customerName}`,
    operatorMessage: [
      `Quote ${quoteReference} has been automatically scheduled.`,
      "",
      `Customer: ${input.quote.customerName}`,
      `Address: ${
        input.quote.siteAddress ||
        input.quote.customerAddress ||
        input.quote.sitePostcode ||
        input.quote.customerPostcode ||
        "Not provided"
      }`,
      `Work type: ${input.decision.workType ?? "Other"}`,
      `Estimated time: ${formatDuration(input.decision.estimatedDurationMinutes)}`,
      slot
        ? `Scheduled: ${formatDisplayDate(slot.date)} ${slot.startTime}-${slot.finishTime}`
        : "Scheduled: Needs manual scheduling",
      `Reason: ${input.decision.reasonLabel}`,
    ].join("\n"),
  };
}
