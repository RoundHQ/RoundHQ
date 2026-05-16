"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  getCustomerDisplayAddress,
  isDateWithinRecurringSeason,
  getWorkdayFromDate,
} from "./helpers";
import {
  DEFAULT_ROTATION_WEEKS,
  getCycleWeek,
  getRotationCycleLabel,
  isCustomerDueOnDate,
  normalizeRotationWeeks,
} from "./rotation";
import type { Customer, DayName, RotationWeeks, WeekNumber } from "./types";

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

type ScheduleEntry = ScheduledJob & {
  isVirtual?: boolean;
  grassCutCount?: number;
  roundWeek?: WeekNumber;
  roundDay?: DayName;
  residentialCount?: number;
  commercialCount?: number;
};

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

type Props = {
  jobs: ScheduledJob[];
  customers: Customer[];
  grassCutSeasonStart: string;
  grassCutSeasonEnd: string;
  defaultRotationWeeks?: RotationWeeks;
  activeRotationWeeks?: RotationWeeks;
  allowCommercialTools?: boolean;
  onAddJob: (job: ScheduledJob) => void | boolean | Promise<void | boolean>;
  pendingQuoteSchedule: PendingQuoteSchedule | null;
  onScheduleQuote: (details: {
    quoteId: string;
    date: string;
    startTime: string;
    finishTime: string;
  }) => void | boolean | Promise<void | boolean>;
  onClearPendingQuoteSchedule: () => void;
  onOpenJob: (jobId: string) => void;
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getMondayFirstIndex(jsDay: number) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function getMonthGrid(viewDate: Date) {
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const startOffset = getMondayFirstIndex(monthStart.getDay());
  const gridStart = addDays(monthStart, -startOffset);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(addDays(gridStart, i));
  }

  return {
    monthStart,
    monthEnd,
    days,
  };
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getJobBadgeClass(type?: ScheduledJobType, status?: ScheduledJobStatus) {
  switch (status) {
    case "Completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "In Progress":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "Cancelled":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      break;
  }

  switch (type) {
    case "Grass Cut":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Commercial":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "Quote Accepted":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getJobTypeLabel(type?: ScheduledJobType | null) {
  return type === "Grass Cut" ? "Service Visit" : type ?? "One Off";
}

function getJobCardClass(status?: ScheduledJobStatus) {
  switch (status) {
    case "Completed":
      return "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/70";
    case "In Progress":
      return "border-sky-200 bg-sky-50 hover:bg-sky-100/70";
    case "Cancelled":
      return "border-rose-200 bg-rose-50 hover:bg-rose-100/70";
    default:
      return "border-slate-200 bg-slate-50 hover:bg-slate-100";
  }
}

function formatTimeValue(value?: string) {
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

  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatJobTimeRange(startTime?: string, finishTime?: string) {
  const formattedStart = formatTimeValue(startTime);
  const formattedFinish = formatTimeValue(finishTime);

  if (formattedStart && formattedFinish) {
    return `${formattedStart} - ${formattedFinish}`;
  }

  if (formattedStart) {
    return `Starts ${formattedStart}`;
  }

  if (formattedFinish) {
    return `Finishes ${formattedFinish}`;
  }

  return null;
}

function compareJobTimes(left?: string, right?: string) {
  const leftValue = left?.trim() ? left.trim() : "99:99";
  const rightValue = right?.trim() ? right.trim() : "99:99";
  return leftValue.localeCompare(rightValue);
}

function formatCountLabel(value: number, label: string) {
  if (value <= 0) {
    return null;
  }

  return `${value} ${label}`;
}

function buildGrassCutSummary(
  date: Date,
  customers: Customer[],
  grassCutSeasonStart: string,
  grassCutSeasonEnd: string,
  defaultRotationWeeks: RotationWeeks,
  activeRotationWeeks: RotationWeeks
): ScheduleEntry | null {
  if (
    !isDateWithinRecurringSeason(
      date,
      grassCutSeasonStart,
      grassCutSeasonEnd
    )
  ) {
    return null;
  }

  const { selectedDay } = getWorkdayFromDate(date);

  if (!selectedDay) {
    return null;
  }

  const roundWeek = getCycleWeek(date, activeRotationWeeks);
  const scheduledCustomers = customers.filter(
    (customer) =>
      customer.isGrassCuttingCustomer &&
      isCustomerDueOnDate(customer, date, selectedDay, defaultRotationWeeks)
  );

  if (scheduledCustomers.length === 0) {
    return null;
  }

  const residentialCount = scheduledCustomers.filter(
    (customer) => customer.customerType !== "Commercial"
  ).length;
  const commercialCount = scheduledCustomers.length - residentialCount;
  const breakdown = [
    formatCountLabel(residentialCount, "residential"),
    formatCountLabel(commercialCount, "commercial"),
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: `grass-summary-${toDateInputValue(date)}`,
    title: `${getRotationCycleLabel(roundWeek, activeRotationWeeks)} Service Visits`,
    date: toDateInputValue(date),
    notes: breakdown || undefined,
    customerId: null,
    customerName: `${scheduledCustomers.length} customer${
      scheduledCustomers.length === 1 ? "" : "s"
    } scheduled`,
    type: "Grass Cut",
    status: "Scheduled",
    quoteIds: [],
    invoiceIds: [],
    createdAt: `${toDateInputValue(date)}T00:00:00.000Z`,
    isVirtual: true,
    grassCutCount: scheduledCustomers.length,
    roundWeek,
    roundDay: selectedDay,
    residentialCount,
    commercialCount,
  };
}

export default function SchedulePage({
  jobs,
  customers,
  grassCutSeasonStart,
  grassCutSeasonEnd,
  defaultRotationWeeks = DEFAULT_ROTATION_WEEKS,
  activeRotationWeeks,
  allowCommercialTools = true,
  onAddJob,
  pendingQuoteSchedule,
  onScheduleQuote,
  onClearPendingQuoteSchedule,
  onOpenJob,
}: Props) {
  const today = new Date();

  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(toDateInputValue(today));
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"job" | "quote">("job");
  const normalizedDefaultRotationWeeks =
    normalizeRotationWeeks(defaultRotationWeeks);
  const calendarRotationWeeks = normalizeRotationWeeks(
    activeRotationWeeks ?? normalizedDefaultRotationWeeks
  );

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [jobType, setJobType] = useState<ScheduledJobType>("One Off");
  const [linkedCustomerId, setLinkedCustomerId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [finishTime, setFinishTime] = useState("");

  const { monthStart, days } = useMemo(() => getMonthGrid(viewDate), [viewDate]);

  const jobsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();

    for (const job of jobs) {
      if (!map.has(job.date)) {
        map.set(job.date, []);
      }
      map.get(job.date)!.push(job);
    }

    const summaryDates = new Set<string>([
      selectedDate,
      ...days.map((day) => toDateInputValue(day)),
    ]);

    for (const dateKey of summaryDates) {
      const summaryJob = buildGrassCutSummary(
        fromDateInputValue(dateKey),
        customers,
        grassCutSeasonStart,
        grassCutSeasonEnd,
        normalizedDefaultRotationWeeks,
        calendarRotationWeeks
      );

      if (!summaryJob) {
        continue;
      }

      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }

      map.get(dateKey)!.push(summaryJob);
    }

    for (const [key, list] of map.entries()) {
      list.sort((a, b) => {
        if (a.isVirtual && !b.isVirtual) {
          return -1;
        }

        if (!a.isVirtual && b.isVirtual) {
          return 1;
        }

        const timeCompare = compareJobTimes(a.startTime, b.startTime);

        if (timeCompare !== 0) {
          return timeCompare;
        }

        return a.title.localeCompare(b.title);
      });
      map.set(key, list);
    }

    return map;
  }, [
    customers,
    days,
    grassCutSeasonEnd,
    grassCutSeasonStart,
    jobs,
    calendarRotationWeeks,
    normalizedDefaultRotationWeeks,
    selectedDate,
  ]);

  const selectedDateJobs = jobsByDate.get(selectedDate) ?? [];
  const scheduledItemCount = useMemo(
    () =>
      Array.from(jobsByDate.values()).reduce(
        (total, dayJobs) => total + dayJobs.length,
        0
      ),
    [jobsByDate]
  );

  useEffect(() => {
    if (!pendingQuoteSchedule) {
      return;
    }

    const focusDate =
      pendingQuoteSchedule.scheduledDate ?? toDateInputValue(new Date());

    setSelectedDate(focusDate);
    setViewDate(fromDateInputValue(focusDate));
  }, [pendingQuoteSchedule]);

  function openNewJobModal(date?: string) {
    setSelectedDate(date ?? toDateInputValue(today));
    setModalMode("job");
    setTitle("");
    setNotes("");
    setJobType("One Off");
    setLinkedCustomerId("");
    setStartTime("");
    setFinishTime("");
    setShowModal(true);
  }

  function openQuoteScheduleModal(date?: string) {
    if (!pendingQuoteSchedule) {
      return;
    }

    setSelectedDate(
      date ?? pendingQuoteSchedule.scheduledDate ?? toDateInputValue(today)
    );
    setModalMode("quote");
    setStartTime(pendingQuoteSchedule.startTime ?? "");
    setFinishTime(pendingQuoteSchedule.finishTime ?? "");
    setShowModal(true);
  }

  function handleDateSelection(date: string) {
    setSelectedDate(date);

    if (pendingQuoteSchedule) {
      openQuoteScheduleModal(date);
      return;
    }

    openNewJobModal(date);
  }

  async function handleAddJob() {
    if (!title.trim() || !selectedDate) return;

    const selectedCustomer =
      linkedCustomerId !== ""
        ? customers.find((customer) => customer.id === Number(linkedCustomerId)) ?? null
        : null;

    try {
      const result = await onAddJob({
        id: crypto.randomUUID(),
        title: title.trim(),
        date: selectedDate,
        notes: notes.trim(),
        type: jobType,
        status: "Scheduled",
        customerId: linkedCustomerId ? Number(linkedCustomerId) : null,
        customerName: selectedCustomer?.name,
        quoteIds: [],
        invoiceIds: [],
        createdAt: new Date().toISOString(),
      });

      if (result === false) {
        return;
      }

      setShowModal(false);
      setModalMode("job");
    } catch {
      // Leave the modal open if the save fails.
    }
  }

  async function handleScheduleQuote() {
    if (!pendingQuoteSchedule || !selectedDate) {
      return;
    }

    const trimmedStartTime = startTime.trim();
    const trimmedFinishTime = finishTime.trim();

    if (!trimmedStartTime || !trimmedFinishTime) {
      window.alert("Enter an approximate start time and finish time.");
      return;
    }

    if (trimmedFinishTime <= trimmedStartTime) {
      window.alert("Finish time needs to be later than the start time.");
      return;
    }

    try {
      const result = await onScheduleQuote({
        quoteId: pendingQuoteSchedule.quoteId,
        date: selectedDate,
        startTime: trimmedStartTime,
        finishTime: trimmedFinishTime,
      });

      if (result === false) {
        return;
      }

      setShowModal(false);
      setModalMode("job");
    } catch {
      // Leave the modal open if the save fails.
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
              Job Scheduling
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Schedule</h2>
            <p className="mt-2 text-sm text-white/75">
              Manage one-off jobs, accepted quotes, and scheduled work.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openNewJobModal()}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              <Plus size={16} />
              New Appointment
            </button>

            <button
              onClick={() => {
                setViewDate(new Date());
                setSelectedDate(toDateInputValue(new Date()));
              }}
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Today
            </button>
          </div>
        </div>
      </section>

      {pendingQuoteSchedule && (
        <section className="rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Quote Scheduling
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                {pendingQuoteSchedule.quoteNumber} - {pendingQuoteSchedule.customerName}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Click a date on the calendar, then add an approximate start and finish time to
                save this quote onto the schedule.
              </p>
              {pendingQuoteSchedule.hasExistingJob ? (
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Existing booking found
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openQuoteScheduleModal(selectedDate)}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Book Selected Date
              </button>

              <button
                onClick={onClearPendingQuoteSchedule}
                className="rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                Cancel Quote Scheduling
              </button>
            </div>
          </div>
        </section>
      )}

      <section
        data-tour="schedule-week-view"
        className="rounded-[22px] border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
              }
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={() =>
                setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
              }
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <h3 className="text-center text-xl font-black tracking-tight text-slate-900">
            {monthStart.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h3>

          <div className="text-sm text-slate-500">
            {scheduledItemCount} scheduled item{scheduledItemCount === 1 ? "" : "s"}
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayKey = toDateInputValue(day);
            const dayJobs = jobsByDate.get(dayKey) ?? [];
            const inMonth = isSameMonth(day, viewDate);
            const isToday = isSameDay(day, today);
            const isSelected = dayKey === selectedDate;

            return (
              <button
                key={dayKey}
                onClick={() => handleDateSelection(dayKey)}
                className={`min-h-[140px] border-b border-r border-slate-200 p-2 text-left align-top transition ${
                  inMonth ? "bg-white" : "bg-slate-50/80"
                } ${isSelected ? "ring-2 ring-inset ring-[#244d51]" : ""} hover:bg-slate-50`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-sm font-bold ${
                      isToday
                        ? "bg-[#244d51] text-white"
                        : inMonth
                        ? "text-slate-900"
                        : "text-slate-400"
                    }`}
                  >
                    {day.getDate()}
                  </span>

                  {dayJobs.length > 0 && (
                    <span className="text-[11px] font-semibold text-slate-400">
                      {dayJobs.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {dayJobs.slice(0, 3).map((job) => (
                    <div
                      key={job.id}
                      data-tour="job-card"
                      className={`truncate rounded-md border px-2 py-1 text-[11px] font-medium ${
                        job.isVirtual ? "cursor-default" : "cursor-pointer"
                      } ${getJobBadgeClass(
                        job.type,
                        job.status
                      )}`}
                      onClick={(event) => {
                        event.stopPropagation();

                        if (!job.isVirtual) {
                          onOpenJob(job.id);
                        }
                      }}
                    >
                      {job.startTime
                        ? `${formatTimeValue(job.startTime)} - ${job.title}`
                        : job.title}
                    </div>
                  ))}

                  {dayJobs.length > 3 && (
                    <div className="text-[11px] font-semibold text-slate-500">
                      +{dayJobs.length - 3} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Selected Date
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              {new Date(selectedDate).toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h3>
          </div>

          <button
            onClick={() => {
              if (pendingQuoteSchedule) {
                openQuoteScheduleModal(selectedDate);
                return;
              }

              openNewJobModal(selectedDate);
            }}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {pendingQuoteSchedule ? "Book Quote on This Date" : "Add Job to This Date"}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {selectedDateJobs.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              No jobs or service visits scheduled for this date.
            </div>
          ) : (
            selectedDateJobs.map((job) => {
              const jobTimeRange = formatJobTimeRange(job.startTime, job.finishTime);
              const canOpenJob = !job.isVirtual;
              const scheduleMetaLine = job.isVirtual
                ? `${job.roundDay} round - ${job.grassCutCount ?? 0} customer${
                    job.grassCutCount === 1 ? "" : "s"
                  } scheduled`
                : `${getJobTypeLabel(job.type)}${
                    job.customerName ? ` - ${job.customerName}` : ""
                  }`;

              return (
                <div
                  key={job.id}
                  data-tour="job-card"
                  onClick={canOpenJob ? () => onOpenJob(job.id) : undefined}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 transition md:flex-row md:items-start md:justify-between ${
                    canOpenJob ? "cursor-pointer" : "cursor-default"
                  } ${getJobCardClass(
                    job.status
                  )}`}
                >
                  <div>
                    <p className="font-semibold text-slate-900">{job.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{scheduleMetaLine}</p>
                    {jobTimeRange ? (
                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        {jobTimeRange}
                      </p>
                    ) : null}
                    {job.notes ? (
                      <p className="mt-2 text-sm text-slate-600">{job.notes}</p>
                    ) : null}
                  </div>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getJobBadgeClass(
                      job.type,
                      job.status
                    )}`}
                  >
                    {job.status === "Scheduled"
                      ? getJobTypeLabel(job.type)
                      : `${job.status} - ${getJobTypeLabel(job.type)}`}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-xl">
            <h3 className="text-xl font-black tracking-tight text-slate-900">
              {modalMode === "quote" ? "Schedule Quoted Work" : "Add Appointment"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {new Date(selectedDate).toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>

            <div className="mt-5 space-y-4">
              {modalMode === "quote" && pendingQuoteSchedule ? (
                <>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Quote
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {pendingQuoteSchedule.quoteNumber}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {pendingQuoteSchedule.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {pendingQuoteSchedule.customerName}
                    </p>
                    {pendingQuoteSchedule.notes?.trim() ? (
                      <p className="mt-3 text-sm text-slate-600">
                        {pendingQuoteSchedule.notes.trim()}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Approx. Start Time
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Approx. Finish Time
                      </label>
                      <input
                        type="time"
                        value={finishTime}
                        onChange={(event) => setFinishTime(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Job Title
                    </label>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Enter job title"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Job Type
                    </label>
                    <select
                      value={jobType}
                      onChange={(event) => setJobType(event.target.value as ScheduledJobType)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    >
                      <option value="One Off">One Off</option>
                      <option value="Quote Accepted">Quote Accepted</option>
                      <option value="Grass Cut">Service Visit</option>
                      {allowCommercialTools ? (
                        <option value="Commercial">Commercial</option>
                      ) : null}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Linked Customer
                    </label>
                    <select
                      value={linkedCustomerId}
                      onChange={(event) => setLinkedCustomerId(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    >
                      <option value="">No linked customer</option>
                      {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                          {customer.name} - {getCustomerDisplayAddress(customer)}
                      </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Add job notes"
                      className="min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={modalMode === "quote" ? handleScheduleQuote : handleAddJob}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {modalMode === "quote" ? "Save to Schedule" : "Save Appointment"}
              </button>

              <button
                onClick={() => {
                  setShowModal(false);
                  setModalMode("job");
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
