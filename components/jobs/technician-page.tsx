"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  LogOut,
  MapPin,
  Navigation,
  Phone,
  Route,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import {
  getInputDateValue,
  getWorkdayFromDate,
} from "@/components/jobs/helpers";
import {
  DEFAULT_ROTATION_WEEKS,
  isCustomerDueOnDate,
} from "@/components/jobs/rotation";
import type {
  Customer,
  NotCutReason,
  RotationWeeks,
  ScheduledJob,
  StaffMember,
  VisitLog,
} from "@/components/jobs/types";

type TechnicianTab = "today" | "route" | "schedule" | "profile";

type CompletionDraft = {
  notes: string;
  notCutReason: NotCutReason;
  paid: boolean;
};

type RouteItem =
  | {
      key: string;
      kind: "round";
      customer: Customer;
      routeOrder: number;
      currentVisit: VisitLog | null;
    }
  | {
      key: string;
      kind: "scheduled";
      job: ScheduledJob;
      customer: Customer | null;
      routeOrder: number;
    };

type Props = {
  staffMember: StaffMember | null;
  customers: Customer[];
  scheduledJobs: ScheduledJob[];
  visits: VisitLog[];
  today: Date;
  defaultRotationWeeks?: RotationWeeks;
  notCutReasons: readonly NotCutReason[];
  databaseNotice?: string | null;
  getCurrentVisit: (customerId: number) => VisitLog | null;
  onMarkVisit: (
    customerId: number,
    status: "cut" | "not_cut",
    extra?: { notes?: string; notCutReason?: NotCutReason; paid?: boolean }
  ) => Promise<void>;
  onToggleScheduledJobCompleted: (jobId: string) => Promise<void>;
  onLogout: () => Promise<void>;
};

const TAB_OPTIONS: {
  key: TechnicianTab;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}[] = [
  { key: "today", label: "Today", icon: ClipboardList },
  { key: "route", label: "Route", icon: Route },
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "profile", label: "Profile", icon: UserRound },
];

function getAddressParts(customer: Customer | null) {
  if (!customer) {
    return [];
  }

  return [customer.address, customer.town, customer.postcode]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
}

function getNavigationUrl(customer: Customer | null) {
  if (!customer) {
    return null;
  }

  const destination =
    typeof customer.latitude === "number" &&
    typeof customer.longitude === "number" &&
    !Number.isNaN(customer.latitude) &&
    !Number.isNaN(customer.longitude)
      ? `${customer.latitude},${customer.longitude}`
      : getAddressParts(customer).join(", ");

  if (!destination) {
    return null;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination
  )}&travelmode=driving`;
}

function getPhoneHref(phone?: string) {
  const normalizedPhone = phone?.replace(/[^\d+]/g, "") ?? "";
  return normalizedPhone ? `tel:${normalizedPhone}` : null;
}

function getRouteItemStatus(item: RouteItem) {
  if (item.kind === "scheduled") {
    return item.job.status === "Completed" ? "Completed" : item.job.status;
  }

  if (!item.currentVisit) {
    return "To do";
  }

  return item.currentVisit.status === "completed" ? "Completed" : "Not complete";
}

function isRouteItemDone(item: RouteItem) {
  if (item.kind === "scheduled") {
    return item.job.status === "Completed";
  }

  return item.currentVisit?.status === "completed";
}

function getItemCustomer(item: RouteItem) {
  return item.kind === "round" ? item.customer : item.customer;
}

function getItemTitle(item: RouteItem) {
  if (item.kind === "scheduled") {
    return item.job.customerName?.trim() || item.job.title;
  }

  return item.customer.name;
}

function getItemService(item: RouteItem) {
  if (item.kind === "scheduled") {
    return item.job.workType || item.job.type;
  }

  return item.customer.isGrassCuttingCustomer
    ? item.customer.cutFrequency
    : item.customer.customerType;
}

function getItemNotes(item: RouteItem) {
  if (item.kind === "scheduled") {
    return item.job.notes?.trim() ?? "";
  }

  return item.customer.notes?.trim() ?? "";
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(value);
}

function getVisitDateKey(visit: VisitLog) {
  return getInputDateValue(visit.visitDate) || visit.visitDate.slice(0, 10);
}

export default function TechnicianPage({
  staffMember,
  customers,
  scheduledJobs,
  visits,
  today,
  defaultRotationWeeks = DEFAULT_ROTATION_WEEKS,
  notCutReasons,
  databaseNotice,
  getCurrentVisit,
  onMarkVisit,
  onToggleScheduledJobCompleted,
  onLogout,
}: Props) {
  const [activeTab, setActiveTab] = useState<TechnicianTab>("today");
  const [activeCompletionKey, setActiveCompletionKey] = useState<string | null>(null);
  const [completionMode, setCompletionMode] = useState<"complete" | "not_complete">(
    "complete"
  );
  const [draft, setDraft] = useState<CompletionDraft>({
    notes: "",
    notCutReason: notCutReasons[0] ?? "Other",
    paid: false,
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const todayKey = getInputDateValue(today.toISOString()) || today.toISOString().slice(0, 10);
  const { selectedDay } = getWorkdayFromDate(today);

  const customerById = useMemo(() => {
    const lookup = new Map<number, Customer>();

    for (const customer of customers) {
      lookup.set(customer.id, customer);
    }

    return lookup;
  }, [customers]);

  const routeItems = useMemo<RouteItem[]>(() => {
    const roundItems: RouteItem[] = selectedDay
      ? customers
          .filter(
            (customer) =>
              customer.isGrassCuttingCustomer &&
              isCustomerDueOnDate(
                customer,
                today,
                selectedDay,
                defaultRotationWeeks
              )
          )
          .map((customer, index) => ({
            key: `round-${customer.id}`,
            kind: "round" as const,
            customer,
            routeOrder: customer.routeOrder ?? index + 1,
            currentVisit: getCurrentVisit(customer.id),
          }))
      : [];

    const scheduledItems: RouteItem[] = scheduledJobs
      .filter((job) => (getInputDateValue(job.date) || job.date.slice(0, 10)) === todayKey)
      .map((job, index) => ({
        key: `scheduled-${job.id}`,
        kind: "scheduled" as const,
        job,
        customer: job.customerId != null ? customerById.get(job.customerId) ?? null : null,
        routeOrder: roundItems.length + index + 1,
      }));

    return [...roundItems, ...scheduledItems].sort((left, right) => {
      if (left.routeOrder !== right.routeOrder) {
        return left.routeOrder - right.routeOrder;
      }

      return getItemTitle(left).localeCompare(getItemTitle(right));
    });
  }, [
    customerById,
    customers,
    defaultRotationWeeks,
    getCurrentVisit,
    scheduledJobs,
    selectedDay,
    today,
    todayKey,
  ]);

  const nextItem = routeItems.find((item) => !isRouteItemDone(item)) ?? null;
  const completedCount = routeItems.filter(isRouteItemDone).length;
  const remainingCount = Math.max(0, routeItems.length - completedCount);
  const activeCompletionItem =
    routeItems.find((item) => item.key === activeCompletionKey) ?? nextItem;
  const todayCompletedVisitCount = visits.filter(
    (visit) =>
      customerById.has(visit.customerId) &&
      visit.status === "completed" &&
      getVisitDateKey(visit) === todayKey
  ).length;

  function openCompletion(item: RouteItem, mode: "complete" | "not_complete") {
    setActiveCompletionKey(item.key);
    setCompletionMode(mode);
    setDraft({
      notes: item.kind === "round" ? item.currentVisit?.notes ?? "" : item.job.notes ?? "",
      notCutReason:
        item.kind === "round"
          ? item.currentVisit?.notCutReason ?? notCutReasons[0] ?? "Other"
          : notCutReasons[0] ?? "Other",
      paid: item.kind === "round" ? item.currentVisit?.paid === true : false,
    });
    setError(null);
  }

  function moveToNextItem(currentKey: string) {
    const currentIndex = routeItems.findIndex((item) => item.key === currentKey);
    const laterItem = routeItems
      .slice(currentIndex + 1)
      .find((item) => !isRouteItemDone(item));

    setActiveCompletionKey(laterItem?.key ?? null);
  }

  async function saveCompletion(item: RouteItem) {
    setSavingKey(item.key);
    setError(null);

    try {
      if (item.kind === "scheduled") {
        await onToggleScheduledJobCompleted(item.job.id);
      } else {
        await onMarkVisit(
          item.customer.id,
          completionMode === "complete" ? "cut" : "not_cut",
          {
            notes: draft.notes.trim() || undefined,
            notCutReason:
              completionMode === "not_complete" ? draft.notCutReason : undefined,
            paid: draft.paid,
          }
        );
      }

      moveToNextItem(item.key);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save this visit."
      );
    } finally {
      setSavingKey(null);
    }
  }

  function renderRouteItem(item: RouteItem, emphasized = false) {
    const customer = getItemCustomer(item);
    const addressParts = getAddressParts(customer);
    const phoneHref = getPhoneHref(customer?.phone);
    const navigationUrl = getNavigationUrl(customer);
    const status = getRouteItemStatus(item);
    const notes = getItemNotes(item);
    const accessNotes = customer?.accessNotes?.trim() ?? "";

    return (
      <article
        key={item.key}
        className={`rounded-[24px] border bg-white p-4 shadow-sm ${
          emphasized ? "border-emerald-200 ring-4 ring-emerald-50" : "border-slate-200"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
                #{item.routeOrder}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-black ${
                  status === "Completed"
                    ? "bg-emerald-50 text-emerald-700"
                    : status === "Not complete"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-sky-50 text-sky-700"
                }`}
              >
                {status}
              </span>
              {item.kind === "round" ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {item.customer.paymentMethod ?? "Payment not set"}
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950">
              {getItemTitle(item)}
            </h3>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              {getItemService(item)}
            </p>
          </div>
          <ChevronRight className="mt-1 shrink-0 text-slate-300" size={20} />
        </div>

        {addressParts.length > 0 ? (
          <div className="mt-4 flex gap-2 text-sm text-slate-600">
            <MapPin className="mt-0.5 shrink-0 text-slate-400" size={16} />
            <p>{addressParts.join(", ")}</p>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {phoneHref ? (
            <a
              href={phoneHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800"
            >
              <Phone size={17} />
              Call customer
            </a>
          ) : null}
          {navigationUrl ? (
            <a
              href={navigationUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(16,185,129,0.22)]"
            >
              <Navigation size={17} />
              Start navigation
            </a>
          ) : null}
        </div>

        {accessNotes || notes ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {accessNotes ? (
              <div className="rounded-2xl bg-amber-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                  Access notes
                </p>
                <p className="mt-1 text-sm text-amber-950">{accessNotes}</p>
              </div>
            ) : null}
            {notes ? (
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Service notes
                </p>
                <p className="mt-1 text-sm text-slate-700">{notes}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {item.kind === "round" ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => openCompletion(item, "complete")}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white"
            >
              <CheckCircle2 size={18} />
              Mark Complete
            </button>
            <button
              type="button"
              onClick={() => openCompletion(item, "not_complete")}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800"
            >
              <XCircle size={18} />
              Mark Not Complete
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => saveCompletion(item)}
            disabled={savingKey === item.key || item.job.status === "Completed"}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 size={18} />
            {item.job.status === "Completed"
              ? "Completed"
              : savingKey === item.key
                ? "Saving..."
                : "Mark Complete"}
          </button>
        )}
      </article>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7faf9] pb-24 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white/95 px-4 py-4 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
              Technician mode
            </p>
            <h1 className="truncate text-2xl font-black tracking-tight">
              Today&apos;s Route
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {formatDateLabel(today)}
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#003c35] text-sm font-black text-white">
            {(staffMember?.fullName ?? "RH")
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("") || "RH"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        {databaseNotice ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {databaseNotice}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Next job
            </p>
            <p className="mt-2 truncate text-lg font-black">
              {nextItem ? getItemTitle(nextItem) : "Route complete"}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Remaining
            </p>
            <p className="mt-2 text-lg font-black">{remainingCount}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Completed today
            </p>
            <p className="mt-2 text-lg font-black">{todayCompletedVisitCount}</p>
          </div>
        </section>

        <div className="hidden gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm sm:flex">
          {TAB_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black ${
                activeTab === key
                  ? "bg-[#003c35] text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "today" ? (
          <section className="space-y-4">
            {nextItem ? renderRouteItem(nextItem, true) : (
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                <p className="text-lg font-black">All assigned jobs are complete.</p>
                <p className="mt-1 text-sm font-semibold">
                  You can review the route or check your schedule below.
                </p>
              </div>
            )}

            {routeItems.filter((item) => item.key !== nextItem?.key).length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-lg font-black">Remaining route</h2>
                {routeItems
                  .filter((item) => item.key !== nextItem?.key)
                  .map((item) => renderRouteItem(item))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "route" ? (
          <section className="space-y-3">
            <h2 className="text-lg font-black">Full route order</h2>
            {routeItems.length > 0 ? (
              routeItems.map((item) => renderRouteItem(item))
            ) : (
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">
                No assigned jobs are due today.
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "schedule" ? (
          <section className="space-y-3">
            <h2 className="text-lg font-black">Upcoming assigned jobs</h2>
            {scheduledJobs.length > 0 ? (
              scheduledJobs.slice(0, 12).map((job) => {
                const customer =
                  job.customerId != null ? customerById.get(job.customerId) ?? null : null;
                return (
                  <div
                    key={job.id}
                    className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">
                          {job.customerName || job.title}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {getInputDateValue(job.date) || job.date}
                          {job.startTime ? ` at ${job.startTime.slice(0, 5)}` : ""}
                        </p>
                        {customer ? (
                          <p className="mt-1 text-sm text-slate-500">
                            {getAddressParts(customer).join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                        {job.status}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">
                No scheduled jobs are assigned yet.
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "profile" ? (
          <section className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Signed in as
              </p>
              <h2 className="mt-2 text-xl font-black">
                {staffMember?.fullName ?? "Staff member"}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {staffMember?.email ?? "No email on staff record"}
              </p>
              {staffMember?.phone ? (
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {staffMember.phone}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <Clock className="text-emerald-700" size={20} />
                <p className="mt-3 text-2xl font-black">{routeItems.length}</p>
                <p className="text-sm font-semibold text-slate-500">Assigned today</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <CheckCircle2 className="text-emerald-700" size={20} />
                <p className="mt-3 text-2xl font-black">{completedCount}</p>
                <p className="text-sm font-semibold text-slate-500">Completed</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <WalletCards className="text-emerald-700" size={20} />
                <p className="mt-3 text-2xl font-black">{remainingCount}</p>
                <p className="text-sm font-semibold text-slate-500">Still to do</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onLogout()}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </section>
        ) : null}
      </main>

      {activeCompletionItem?.kind === "round" && activeCompletionKey ? (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4 sm:bottom-6">
          <div className="mx-auto max-w-2xl rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_80px_rgba(7,20,38,0.22)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Save visit log
                </p>
                <h3 className="mt-1 text-lg font-black">
                  {activeCompletionItem.customer.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveCompletionKey(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                aria-label="Close completion panel"
              >
                <XCircle size={18} />
              </button>
            </div>

            {completionMode === "not_complete" ? (
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-black text-slate-700">
                  Reason
                </span>
                <select
                  value={draft.notCutReason}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      notCutReason: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold"
                >
                  {notCutReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-black text-slate-700">
                Visit note
              </span>
              <textarea
                value={draft.notes}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, notes: event.target.value }))
                }
                className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"
                placeholder="Optional note"
              />
            </label>

            <label className="mt-3 flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
              <input
                type="checkbox"
                checked={draft.paid}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, paid: event.target.checked }))
                }
                className="h-5 w-5 rounded border-slate-300"
              />
              <span className="text-sm font-black text-slate-700">
                Mark paid for this visit
              </span>
            </label>

            {error ? (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => saveCompletion(activeCompletionItem)}
              disabled={savingKey === activeCompletionItem.key}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#003c35] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 size={18} />
              {savingKey === activeCompletionItem.key ? "Saving..." : "Save and next"}
            </button>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-3 py-2 shadow-[0_-16px_40px_rgba(7,20,38,0.08)] sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {TAB_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black ${
                activeTab === key
                  ? "bg-[#003c35] text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
