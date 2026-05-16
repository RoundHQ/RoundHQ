"use client";

import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Ban,
  CheckCircle2,
  Compass,
  FileText,
  GripVertical,
  LocateFixed,
  MapPin,
  RotateCcw,
  Route,
  Shuffle,
  TrendingUp,
  Undo2,
} from "lucide-react";

import {
  buildBadFitFlags,
  buildMoveCustomerSuggestions,
  buildRouteOrderSuggestions,
  buildRouteSummaries,
  getRouteDistance,
  getRouteKey,
  type MoveCustomerSuggestion,
  type RouteChangeRecord,
  type RouteCustomerSnapshot,
  type RouteKey,
  type RouteNotes,
  type RouteSummary,
} from "./route-efficiency";
import {
  DEFAULT_ROTATION_WEEKS,
  isCustomerDueInSelectedWeek,
  normalizeRotationWeeks,
} from "./rotation";
import type { Customer, DayName, RotationWeeks, WeekNumber } from "./types";

type Props = {
  customers: Customer[];
  selectedWeek: WeekNumber;
  selectedDay: DayName;
  defaultRotationWeeks?: RotationWeeks;
  weekOptions?: WeekNumber[];
  ignoredMoveSuggestionIds: string[];
  routeChangeHistory: RouteChangeRecord[];
  routeNotes: RouteNotes;
  onUpdateCustomer: (customer: Customer) => Promise<unknown>;
  onIgnoreMoveSuggestion: (suggestionId: string) => Promise<void> | void;
  onRecordRouteChange: (change: RouteChangeRecord) => Promise<void> | void;
  onMarkRouteChangeUndone: (changeId: string) => Promise<void> | void;
  onSaveRouteNote: (routeKey: RouteKey, note: string) => Promise<void> | void;
  onOpenCustomer: (customerId: number) => void;
  onGoToMap?: () => void;
};

type PendingRouteChange =
  | {
      type: "reorder";
      route: RouteSummary;
      nextCustomers: Customer[];
      nextMiles: number;
      source: "suggested" | "manual";
      reason: string;
    }
  | {
      type: "move";
      suggestion: MoveCustomerSuggestion;
      customer: Customer;
      nextRouteOrder: number;
      reason: string;
    };

function formatMoney(value: number | null | undefined) {
  return `\u00a3${Number(value ?? 0).toFixed(2)}`;
}

function formatMiles(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)} mi`;
}

function formatMinutes(value: number) {
  if (value <= 0) {
    return "0 min";
  }

  if (value < 60) {
    return `${value} min`;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScoreClassName(score: number) {
  if (score >= 90) return "bg-emerald-100 text-emerald-700";
  if (score >= 75) return "bg-sky-100 text-sky-700";
  if (score >= 55) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function getSelectedRoute(
  routeSummaries: RouteSummary[],
  selectedRouteKey: RouteKey
) {
  return routeSummaries.find((summary) => summary.key === selectedRouteKey) ?? null;
}

function getCustomerSnapshot(customer: Customer): RouteCustomerSnapshot {
  return {
    customerId: customer.id,
    customerName: customer.name,
    week: customer.week,
    day: customer.day,
    routeOrder: Number.isFinite(customer.routeOrder)
      ? Number(customer.routeOrder)
      : undefined,
  };
}

function getMoveNextRouteOrder(
  customers: Customer[],
  suggestion: MoveCustomerSuggestion,
  defaultRotationWeeks: RotationWeeks
) {
  return (
    Math.max(
      0,
      ...customers
        .filter(
          (entry) =>
            entry.isGrassCuttingCustomer &&
            isCustomerDueInSelectedWeek(
              entry,
              suggestion.toWeek,
              defaultRotationWeeks
            ) &&
            entry.day === suggestion.toDay
        )
        .map((entry) =>
          Number.isFinite(entry.routeOrder) ? Number(entry.routeOrder) : 0
        )
    ) + 1
  );
}

function getReorderAffectedCustomers(route: RouteSummary, nextCustomers: Customer[]) {
  return nextCustomers.filter(
    (customer, index) => (customer.routeOrder ?? 0) !== index + 1
  );
}

function haveSameCustomerOrder(left: Customer[], right: Customer[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((customer, index) => customer.id === right[index]?.id);
}

function moveCustomerInOrder(customers: Customer[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return customers;
  }

  const nextCustomers = [...customers];
  const [movedCustomer] = nextCustomers.splice(fromIndex, 1);

  if (!movedCustomer) {
    return customers;
  }

  nextCustomers.splice(toIndex, 0, movedCustomer);
  return nextCustomers;
}

function getLatestUndoableChange(routeChangeHistory: RouteChangeRecord[]) {
  return routeChangeHistory.find(
    (change) => !change.undoneAt && change.undoCustomers.length > 0
  );
}

export default function RouteEfficiencyPage({
  customers,
  selectedWeek,
  selectedDay,
  defaultRotationWeeks = DEFAULT_ROTATION_WEEKS,
  weekOptions,
  ignoredMoveSuggestionIds,
  routeChangeHistory,
  routeNotes,
  onUpdateCustomer,
  onIgnoreMoveSuggestion,
  onRecordRouteChange,
  onMarkRouteChangeUndone,
  onSaveRouteNote,
  onOpenCustomer,
  onGoToMap,
}: Props) {
  const [selectedRouteKey, setSelectedRouteKey] = useState<RouteKey>(
    getRouteKey(selectedWeek, selectedDay)
  );
  const [savingSuggestionId, setSavingSuggestionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingRouteChange | null>(null);
  const [routeNoteDraft, setRouteNoteDraft] = useState("");
  const [isSavingRouteNote, setIsSavingRouteNote] = useState(false);
  const [isUndoingRouteChange, setIsUndoingRouteChange] = useState(false);
  const [manualRouteCustomers, setManualRouteCustomers] = useState<Customer[]>([]);
  const [draggedCustomerId, setDraggedCustomerId] = useState<number | null>(null);
  const ignoredSuggestionSet = useMemo(
    () => new Set(ignoredMoveSuggestionIds),
    [ignoredMoveSuggestionIds]
  );
  const normalizedDefaultRotationWeeks = normalizeRotationWeeks(defaultRotationWeeks);
  const routeSummaries = useMemo(
    () =>
      buildRouteSummaries(
        customers,
        normalizedDefaultRotationWeeks,
        weekOptions
      ),
    [customers, normalizedDefaultRotationWeeks, weekOptions]
  );
  const selectedRoute =
    getSelectedRoute(routeSummaries, selectedRouteKey) ?? routeSummaries[0] ?? null;
  const selectedRouteNote = selectedRoute ? routeNotes[selectedRoute.key] ?? "" : "";
  const routeOrderSuggestions = useMemo(
    () => buildRouteOrderSuggestions(routeSummaries),
    [routeSummaries]
  );
  const badFitFlags = useMemo(
    () => buildBadFitFlags(routeSummaries).slice(0, 8),
    [routeSummaries]
  );
  const moveSuggestions = useMemo(
    () =>
      buildMoveCustomerSuggestions(routeSummaries, ignoredSuggestionSet).slice(0, 8),
    [ignoredSuggestionSet, routeSummaries]
  );
  const selectedRoutePayOnDayValue = selectedRoute
    ? selectedRoute.customers
        .filter(
          (customer) =>
            customer.paymentMethod === "Cash" ||
            customer.paymentMethod === "On Day Transfer"
        )
        .reduce((total, customer) => total + Number(customer.grassCutAmount ?? 0), 0)
    : 0;
  const bestRoute = [...routeSummaries]
    .filter((summary) => summary.stops > 0)
    .sort((left, right) => right.score - left.score)[0];
  const weakestRoute = [...routeSummaries]
    .filter((summary) => summary.stops > 0)
    .sort((left, right) => left.score - right.score)[0];
  const totalStops = routeSummaries.reduce((total, summary) => total + summary.stops, 0);
  const totalMiles = routeSummaries.reduce(
    (total, summary) => total + summary.currentMiles,
    0
  );
  const totalPotentialSavedMiles = routeSummaries.reduce(
    (total, summary) => total + summary.potentialSavedMiles,
    0
  );
  const latestUndoableChange = getLatestUndoableChange(routeChangeHistory);
  const manualOrderChanged = selectedRoute
    ? !haveSameCustomerOrder(manualRouteCustomers, selectedRoute.orderedCustomers)
    : false;
  const manualRouteMiles = getRouteDistance(manualRouteCustomers);
  const manualSavedMiles = selectedRoute
    ? selectedRoute.currentMiles - manualRouteMiles
    : 0;

  useEffect(() => {
    setRouteNoteDraft(selectedRouteNote);
  }, [selectedRouteNote, selectedRoute?.key]);

  useEffect(() => {
    setManualRouteCustomers(selectedRoute?.orderedCustomers ?? []);
    setDraggedCustomerId(null);
  }, [selectedRoute]);

  function openSuggestedReorderPreview(route: RouteSummary) {
    setPendingChange({
      type: "reorder",
      route,
      nextCustomers: route.optimizedCustomers,
      nextMiles: route.optimizedMiles,
      source: "suggested",
      reason: `Reordered ${route.label} to reduce estimated route miles.`,
    });
    setStatusMessage(null);
  }

  function openManualReorderPreview(route: RouteSummary) {
    setPendingChange({
      type: "reorder",
      route,
      nextCustomers: manualRouteCustomers,
      nextMiles: manualRouteMiles,
      source: "manual",
      reason: `Manually reordered ${route.label}.`,
    });
    setStatusMessage(null);
  }

  function openMovePreview(suggestion: MoveCustomerSuggestion) {
    const customer = customers.find((entry) => entry.id === suggestion.customerId);

    if (!customer) {
      return;
    }

    setPendingChange({
      type: "move",
      suggestion,
      customer,
      nextRouteOrder: getMoveNextRouteOrder(
        customers,
        suggestion,
        normalizedDefaultRotationWeeks
      ),
      reason: `Moved because the customer sits closer to ${suggestion.toRouteLabel}.`,
    });
    setStatusMessage(null);
  }

  function handleManualDragStart(customerId: number) {
    setDraggedCustomerId(customerId);
  }

  function handleManualDragOver(
    event: DragEvent<HTMLDivElement>,
    targetCustomerId: number
  ) {
    event.preventDefault();

    if (draggedCustomerId == null || draggedCustomerId === targetCustomerId) {
      return;
    }

    setManualRouteCustomers((currentCustomers) => {
      const fromIndex = currentCustomers.findIndex(
        (customer) => customer.id === draggedCustomerId
      );
      const toIndex = currentCustomers.findIndex(
        (customer) => customer.id === targetCustomerId
      );

      return moveCustomerInOrder(currentCustomers, fromIndex, toIndex);
    });
  }

  function handleManualDrop() {
    setDraggedCustomerId(null);
  }

  function moveManualCustomer(customerId: number, direction: -1 | 1) {
    setManualRouteCustomers((currentCustomers) => {
      const currentIndex = currentCustomers.findIndex(
        (customer) => customer.id === customerId
      );
      const nextIndex = currentIndex + direction;

      return moveCustomerInOrder(currentCustomers, currentIndex, nextIndex);
    });
  }

  function resetManualRouteOrder() {
    setManualRouteCustomers(selectedRoute?.orderedCustomers ?? []);
    setDraggedCustomerId(null);
  }

  async function confirmPendingRouteChange() {
    if (!pendingChange) {
      return;
    }

    const savingKey =
      pendingChange.type === "reorder"
        ? `reorder:${pendingChange.route.key}`
        : pendingChange.suggestion.id;

    setSavingSuggestionId(savingKey);
    setStatusMessage(null);

    try {
      if (pendingChange.type === "reorder") {
        const route = pendingChange.route;
        const nextCustomers = pendingChange.nextCustomers;
        const affectedCustomers = getReorderAffectedCustomers(route, nextCustomers);

        for (let index = 0; index < nextCustomers.length; index += 1) {
          const customer = nextCustomers[index];
          const nextRouteOrder = index + 1;

          if ((customer.routeOrder ?? 0) === nextRouteOrder) {
            continue;
          }

          await onUpdateCustomer({
            ...customer,
            routeOrder: nextRouteOrder,
          });
        }

        await onRecordRouteChange({
          id: `route-change-${Date.now()}-${route.key}`,
          type: "reorder",
          title:
            pendingChange.source === "manual"
              ? `Manual reorder ${route.label}`
              : `Reordered ${route.label}`,
          detail: `${formatMiles(route.currentMiles)} to ${formatMiles(
            pendingChange.nextMiles
          )}; ${affectedCustomers.length} stops changed order.`,
          reason:
            pendingChange.reason.trim() ||
            (pendingChange.source === "manual"
              ? `Manually reordered ${route.label}.`
              : `Reordered ${route.label}.`),
          routeLabel: route.label,
          savedMiles: Math.max(0, route.currentMiles - pendingChange.nextMiles),
          affectedCustomerCount: affectedCustomers.length,
          occurredAt: new Date().toISOString(),
          undoCustomers: route.orderedCustomers.map(getCustomerSnapshot),
        });

        setStatusMessage(`${route.label} route order updated.`);
        setManualRouteCustomers(nextCustomers);
      } else {
        const { customer, suggestion, nextRouteOrder } = pendingChange;

        await onUpdateCustomer({
          ...customer,
          week: suggestion.toWeek,
          day: suggestion.toDay,
          routeOrder: nextRouteOrder,
        });
        await onIgnoreMoveSuggestion(suggestion.id);
        await onRecordRouteChange({
          id: `route-change-${Date.now()}-${suggestion.id}`,
          type: "move",
          title: `Moved ${suggestion.customerName}`,
          detail: `${suggestion.fromRouteLabel} to ${suggestion.toRouteLabel}; route order ${nextRouteOrder}.`,
          reason:
            pendingChange.reason.trim() ||
            `Moved because the customer sits closer to ${suggestion.toRouteLabel}.`,
          routeLabel: suggestion.toRouteLabel,
          savedMiles: suggestion.savedMiles,
          affectedCustomerCount: 1,
          occurredAt: new Date().toISOString(),
          undoCustomers: [getCustomerSnapshot(customer)],
        });

        setStatusMessage(
          `${suggestion.customerName} moved to ${suggestion.toRouteLabel}.`
        );
      }

      setPendingChange(null);
    } catch {
      setStatusMessage("Unable to save that route change right now.");
    } finally {
      setSavingSuggestionId(null);
    }
  }

  async function handleUndoLatestRouteChange() {
    if (!latestUndoableChange) {
      return;
    }

    setIsUndoingRouteChange(true);
    setStatusMessage(null);

    try {
      for (const snapshot of latestUndoableChange.undoCustomers) {
        const customer = customers.find((entry) => entry.id === snapshot.customerId);

        if (!customer) {
          continue;
        }

        await onUpdateCustomer({
          ...customer,
          week: snapshot.week,
          day: snapshot.day,
          routeOrder: snapshot.routeOrder,
        });
      }

      await onMarkRouteChangeUndone(latestUndoableChange.id);
      setStatusMessage(`Undid: ${latestUndoableChange.title}.`);
    } catch {
      setStatusMessage("Unable to undo the last route change right now.");
    } finally {
      setIsUndoingRouteChange(false);
    }
  }

  async function handleSaveRouteNote() {
    if (!selectedRoute) {
      return;
    }

    setIsSavingRouteNote(true);
    setStatusMessage(null);

    try {
      await onSaveRouteNote(selectedRoute.key, routeNoteDraft);
      setStatusMessage(
        routeNoteDraft.trim()
          ? `${selectedRoute.label} route note saved.`
          : `${selectedRoute.label} route note cleared.`
      );
    } catch {
      setStatusMessage("Unable to save that route note right now.");
    } finally {
      setIsSavingRouteNote(false);
    }
  }

  async function handleIgnoreMoveSuggestion(suggestion: MoveCustomerSuggestion) {
    setSavingSuggestionId(suggestion.id);
    setStatusMessage(null);

    try {
      await onIgnoreMoveSuggestion(suggestion.id);
      setStatusMessage(`Ignored suggestion for ${suggestion.customerName}.`);
    } catch {
      setStatusMessage("Unable to ignore that suggestion right now.");
    } finally {
      setSavingSuggestionId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
              Service Schedule
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Route Efficiency
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-white/75">
              Review route order, mileage, far-away customers, and move
              suggestions across all service work rounds.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleUndoLatestRouteChange()}
              disabled={!latestUndoableChange || isUndoingRouteChange}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Undo2 size={16} />
              {isUndoingRouteChange ? "Undoing..." : "Undo Last Change"}
            </button>
            {onGoToMap ? (
              <button
                type="button"
                onClick={onGoToMap}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <MapPin size={16} />
                Open Map
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {statusMessage ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Total stops
          </p>
          <p className="mt-2 text-4xl font-black text-slate-900">{totalStops}</p>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Est. route miles
          </p>
          <p className="mt-2 text-4xl font-black text-slate-900">
            {formatMiles(totalMiles)}
          </p>
        </section>

        <section className="rounded-[22px] border border-emerald-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-emerald-700">
            Possible saving
          </p>
          <p className="mt-2 text-4xl font-black text-slate-900">
            {formatMiles(totalPotentialSavedMiles)}
          </p>
        </section>

        <section className="rounded-[22px] border border-amber-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-amber-700">
            Move ideas
          </p>
          <p className="mt-2 text-4xl font-black text-slate-900">
            {moveSuggestions.length}
          </p>
        </section>
      </div>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Daily route summary
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Week-by-week scorecard
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-emerald-700">
                Best
              </p>
              <p className="font-black text-slate-900">
                {bestRoute ? `${bestRoute.label} (${bestRoute.score})` : "-"}
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-amber-700">
                Needs work
              </p>
              <p className="font-black text-slate-900">
                {weakestRoute ? `${weakestRoute.label} (${weakestRoute.score})` : "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {routeSummaries.map((summary) => (
            <button
              key={summary.key}
              type="button"
              onClick={() => setSelectedRouteKey(summary.key)}
              className={`rounded-2xl border p-4 text-left transition hover:bg-slate-50 ${
                selectedRoute?.key === summary.key
                  ? "border-emerald-300 bg-emerald-50/60"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-900">{summary.label}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {summary.stops} stops {"\u00b7"} {summary.mappedStops} mapped
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-black ${getScoreClassName(
                    summary.score
                  )}`}
                >
                  {summary.score}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-400">Miles</p>
                  <p className="font-black text-slate-900">
                    {formatMiles(summary.currentMiles)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-400">Value</p>
                  <p className="font-black text-slate-900">
                    {formatMoney(summary.routeValue)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedRoute ? (
        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Selected route
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">
                {selectedRoute.label}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedRoute.unmappedStops > 0
                  ? `${selectedRoute.unmappedStops} customer${
                      selectedRoute.unmappedStops === 1 ? "" : "s"
                    } need coordinates before route scoring is complete.`
                  : "All customers on this route have coordinates."}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[620px]">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Time
                </p>
                <p className="font-black text-slate-900">
                  {formatMinutes(selectedRoute.estimatedMinutes)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Pay-on-day
                </p>
                <p className="font-black text-slate-900">
                  {formatMoney(selectedRoutePayOnDayValue)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Save
                </p>
                <p className="font-black text-slate-900">
                  {formatMiles(selectedRoute.potentialSavedMiles)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openSuggestedReorderPreview(selectedRoute)}
                disabled={
                  selectedRoute.potentialSavedMiles < 0.2 ||
                  savingSuggestionId === `reorder:${selectedRoute.key}`
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Shuffle size={16} />
                {savingSuggestionId === `reorder:${selectedRoute.key}`
                  ? "Saving..."
                  : "Preview Suggested"}
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-500" />
                  <p className="text-sm font-black text-slate-900">Route notes</p>
                </div>
                <textarea
                  value={routeNoteDraft}
                  onChange={(event) => setRouteNoteDraft(event.target.value)}
                  placeholder="Gate codes, avoid school time, awkward parking, start here first..."
                  className="mt-3 min-h-[86px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleSaveRouteNote()}
                disabled={isSavingRouteNote || routeNoteDraft === selectedRouteNote}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 size={15} />
                {isSavingRouteNote ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <GripVertical size={17} className="text-slate-400" />
                  <p className="text-sm font-black text-slate-900">
                    Manual route order
                  </p>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Drag customers into your preferred order, then preview before
                  saving.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-slate-500">Draft miles </span>
                  <span className="font-black text-slate-900">
                    {formatMiles(manualRouteMiles)}
                  </span>
                  <span
                    className={`ml-2 font-semibold ${
                      manualSavedMiles >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {manualSavedMiles >= 0 ? "saves" : "adds"}{" "}
                    {formatMiles(Math.abs(manualSavedMiles))}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetManualRouteOrder}
                  disabled={!manualOrderChanged}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw size={15} />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => selectedRoute && openManualReorderPreview(selectedRoute)}
                  disabled={!manualOrderChanged}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  Preview Manual Order
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
            {manualRouteCustomers.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                No customers on this route.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {manualRouteCustomers.map((customer, index) => (
                  <div
                    key={customer.id}
                    onDragOver={(event) => handleManualDragOver(event, customer.id)}
                    onDrop={handleManualDrop}
                    onDragEnd={handleManualDrop}
                    className={`grid w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 md:grid-cols-[auto_auto_minmax(0,1fr)_0.6fr_0.7fr_auto_auto] md:items-center ${
                      draggedCustomerId === customer.id ? "bg-emerald-50" : ""
                    }`}
                  >
                    <span
                      draggable
                      onDragStart={() => handleManualDragStart(customer.id)}
                      className="inline-flex cursor-grab items-center justify-center rounded-lg p-1 text-slate-300 active:cursor-grabbing"
                      aria-label={`Drag ${customer.name}`}
                    >
                      <GripVertical size={17} />
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-700">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {customer.name}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {customer.address || customer.postcode || "-"}
                      </p>
                    </div>
                    <p className="font-semibold text-slate-700">
                      {formatMoney(customer.grassCutAmount)}
                    </p>
                    <p className="font-semibold text-slate-600">
                      {customer.paymentMethod ?? "Monthly"}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveManualCustomer(customer.id, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${customer.name} up`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveManualCustomer(customer.id, 1)}
                        disabled={index === manualRouteCustomers.length - 1}
                        aria-label={`Move ${customer.name} down`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowDown size={15} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenCustomer(customer.id)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Open
                      <ArrowRight className="text-slate-300" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Reorder suggestions
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">
                Route order score
              </h2>
            </div>
            <Route className="text-slate-400" size={22} />
          </div>

          <div className="mt-4 space-y-3">
            {routeOrderSuggestions.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                No major route-order savings found.
              </div>
            ) : (
              routeOrderSuggestions.slice(0, 5).map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-black text-slate-900">
                        {suggestion.routeLabel}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Save about {formatMiles(suggestion.savedMiles)} by
                        reordering this round.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const route = routeSummaries.find(
                          (summary) => summary.key === suggestion.routeKey
                        );
                        if (route) openSuggestedReorderPreview(route);
                      }}
                      disabled={savingSuggestionId === `reorder:${suggestion.routeKey}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} />
                      Preview
                    </button>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase text-slate-400">
                    Suggested order
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {suggestion.customerOrder.map((customer) => customer.name).join(" -> ")}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Bad fit flags
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">
                Far from route
              </h2>
            </div>
            <LocateFixed className="text-amber-500" size={22} />
          </div>

          <div className="mt-4 space-y-3">
            {badFitFlags.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                No customers are standing far outside their route cluster.
              </div>
            ) : (
              badFitFlags.map((flag) => (
                <button
                  key={flag.id}
                  type="button"
                  onClick={() => onOpenCustomer(flag.customerId)}
                  className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-900">
                        {flag.customerName}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {flag.routeLabel} {"\u00b7"} {flag.address || "-"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">
                      {formatMiles(flag.distanceFromRouteMiles)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Route average is {formatMiles(flag.averageRouteDistanceMiles)} from
                    centre.
                  </p>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Reason log
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Route change history
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Every applied route reorder or customer move is logged with the
              reason and undo snapshot.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleUndoLatestRouteChange()}
            disabled={!latestUndoableChange || isUndoingRouteChange}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Undo2 size={15} />
            {isUndoingRouteChange ? "Undoing..." : "Undo Latest"}
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {routeChangeHistory.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
              No route changes have been applied yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {routeChangeHistory.slice(0, 8).map((change) => (
                <div
                  key={change.id}
                  className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.2fr)_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black text-slate-900">
                        {change.title}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          change.undoneAt
                            ? "bg-slate-100 text-slate-600"
                            : change.type === "move"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {change.undoneAt
                          ? "Undone"
                          : change.type === "move"
                            ? "Move"
                            : "Reorder"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(change.occurredAt)} {"\u00b7"}{" "}
                      {change.routeLabel} {"\u00b7"}{" "}
                      {formatMiles(change.savedMiles)} estimated saving
                    </p>
                  </div>
                  <p className="text-sm text-slate-600">{change.reason}</p>
                  <p className="text-sm font-semibold text-slate-500">
                    {change.affectedCustomerCount} affected
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Move customer helper
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Suggested route moves
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              These are customers whose coordinates sit closer to another round.
              Use Ignore when the suggestion does not make sense for how you work.
            </p>
          </div>
          <Compass className="text-sky-500" size={22} />
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {moveSuggestions.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 lg:col-span-2">
              No visible move suggestions. Ignored suggestions stay hidden.
            </div>
          ) : (
            moveSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenCustomer(suggestion.customerId)}
                      className="truncate text-left font-black text-slate-900 hover:underline"
                    >
                      {suggestion.customerName}
                    </button>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {suggestion.address || "-"}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-700">
                    Save {formatMiles(suggestion.savedMiles)}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      From
                    </p>
                    <p className="font-black text-slate-900">
                      {suggestion.fromRouteLabel}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatMiles(suggestion.distanceToCurrentRouteMiles)} from centre
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-emerald-700">
                      To
                    </p>
                    <p className="font-black text-slate-900">
                      {suggestion.toRouteLabel}
                    </p>
                    <p className="text-xs text-emerald-700">
                      {formatMiles(suggestion.distanceToSuggestedRouteMiles)} from centre
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openMovePreview(suggestion)}
                    disabled={savingSuggestionId === suggestion.id}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <TrendingUp size={15} />
                    {savingSuggestionId === suggestion.id ? "Saving..." : "Preview Move"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleIgnoreMoveSuggestion(suggestion)}
                    disabled={savingSuggestionId === suggestion.id}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Ban size={15} />
                    Ignore
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {pendingChange ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[24px] bg-white shadow-2xl">
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Preview route change
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">
                    {pendingChange.type === "reorder"
                      ? `Reorder ${pendingChange.route.label}`
                      : `Move ${pendingChange.suggestion.customerName}`}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review the impact before anything is saved.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingChange(null)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {pendingChange.type === "reorder" ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        Route
                      </p>
                      <p className="font-black text-slate-900">
                        {pendingChange.route.label}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        Current
                      </p>
                      <p className="font-black text-slate-900">
                        {formatMiles(pendingChange.route.currentMiles)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase text-emerald-700">
                        New
                      </p>
                      <p className="font-black text-slate-900">
                        {formatMiles(pendingChange.nextMiles)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase text-amber-700">
                        Stops affected
                      </p>
                      <p className="font-black text-slate-900">
                        {
                          getReorderAffectedCustomers(
                            pendingChange.route,
                            pendingChange.nextCustomers
                          ).length
                        }
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-black text-slate-900">
                        Current order
                      </p>
                      <div className="mt-3 space-y-2">
                        {pendingChange.route.orderedCustomers.map((customer, index) => (
                          <div
                            key={customer.id}
                            className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-slate-600">
                              {index + 1}
                            </span>
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {customer.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 p-4">
                      <p className="text-sm font-black text-slate-900">
                        New order
                      </p>
                      <div className="mt-3 space-y-2">
                        {pendingChange.nextCustomers.map(
                          (customer, index) => (
                            <div
                              key={customer.id}
                              className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-emerald-700">
                                {index + 1}
                              </span>
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {customer.name}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        From
                      </p>
                      <p className="font-black text-slate-900">
                        {pendingChange.suggestion.fromRouteLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase text-emerald-700">
                        To
                      </p>
                      <p className="font-black text-slate-900">
                        {pendingChange.suggestion.toRouteLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-sky-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase text-sky-700">
                        New order
                      </p>
                      <p className="font-black text-slate-900">
                        #{pendingChange.nextRouteOrder}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase text-amber-700">
                        Est. saving
                      </p>
                      <p className="font-black text-slate-900">
                        {formatMiles(pendingChange.suggestion.savedMiles)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-black text-slate-900">
                      Confirm impact
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Current route distance
                        </p>
                        <p className="font-black text-slate-900">
                          {formatMiles(
                            pendingChange.suggestion.distanceToCurrentRouteMiles
                          )}{" "}
                          from centre
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 px-3 py-2">
                        <p className="text-xs font-semibold uppercase text-emerald-700">
                          Suggested route distance
                        </p>
                        <p className="font-black text-slate-900">
                          {formatMiles(
                            pendingChange.suggestion.distanceToSuggestedRouteMiles
                          )}{" "}
                          from centre
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-black text-slate-900">
                  Reason for log
                </span>
                <textarea
                  value={pendingChange.reason}
                  onChange={(event) =>
                    setPendingChange((current) =>
                      current ? { ...current, reason: event.target.value } : current
                    )
                  }
                  className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPendingChange(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmPendingRouteChange()}
                  disabled={Boolean(savingSuggestionId)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  {savingSuggestionId ? "Saving..." : "Confirm Change"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
