"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Navigation } from "lucide-react";
import {
  buildPaymentYearMonths,
  formatGrassCutAreas,
  formatStoredDate,
  getConfiguredSeasonStartYear,
  getCustomerDisplayAddress,
  getInputDateValue,
  getMonthlyPlanCharge,
  getTodayDateInputValue,
  isDateInSeasonRange,
} from "./helpers";
import {
  DEFAULT_ROTATION_WEEKS,
  getRotationCycleLabel,
  isCustomerDueInSelectedWeek,
  normalizeRotationWeeks,
} from "./rotation";
import type {
  Customer,
  VisitLog,
  DayName,
  MonthlyPayment,
  WeekNumber,
  NotCutReason,
  RotationWeeks,
} from "./types";
import { DEFAULT_NOT_CUT_REASONS } from "./types";

type Props = {
  customers: Customer[];
  visits: VisitLog[];
  selectedWeek: WeekNumber;
  selectedDay: DayName;
  defaultRotationWeeks?: RotationWeeks;
  activeRotationWeeks?: RotationWeeks;
  monthlyPayments: MonthlyPayment[];
  grassCutSeasonStart: string;
  grassCutSeasonEnd: string;
  monthlyPaymentsReady: boolean;
  notCutReasons?: NotCutReason[];
  isLocked: boolean;
  getCurrentVisit: (customerId: number) => VisitLog | null;
  onUpdateCustomer: (customer: Customer) => Promise<unknown>;
  onMarkVisit: (
    customerId: number,
    status: "cut" | "not_cut",
    extra?: { notes?: string; notCutReason?: NotCutReason; paid?: boolean }
  ) => void;
  onSetPaidStatus: (visitId: number | string, paid: boolean) => void;
  onSaveMonthlyPayment: (
    customerId: number,
    paymentMonth: string,
    paymentDate: string | null
  ) => Promise<void>;
  onSaveVisitPaymentDate: (
    visitId: number | string,
    paymentDate: string | null
  ) => Promise<void>;
  pendingCashPaymentDates: Record<string, string>;
  onSetPendingCashPayment: (customerId: number, paid: boolean) => void;
  onCompleteRound: () => void;
};

type Point = {
  latitude: number;
  longitude: number;
};

type OutstandingPaymentItem =
  | {
      kind: "monthly";
      key: string;
      label: string;
      dueFrom: string;
      amount: number;
      paymentMonth: string;
    }
  | {
      kind: "visit";
      key: string;
      label: string;
      dueFrom: string;
      amount: number;
      visitId: VisitLog["id"];
    };

type CustomerOutstandingPaymentSummary = {
  customerId: number;
  method: string;
  amount: number;
  items: OutstandingPaymentItem[];
};

type GoogleMapInstance = {
  fitBounds: (bounds: GoogleLatLngBounds, padding?: number) => void;
};

type GoogleMarker = {
  addListener: (eventName: string, handler: () => void) => void;
  getPosition: () => unknown;
  setMap: (map: GoogleMapInstance | null) => void;
};

type GoogleLatLngBounds = {
  extend: (position: unknown) => void;
};

type GoogleDirectionsRenderer = {
  set: (key: string, value: unknown) => void;
  setDirections: (result: unknown) => void;
  setMap: (map: GoogleMapInstance) => void;
};

type GoogleDirectionsService = {
  route: (
    request: Record<string, unknown>,
    callback: (result: unknown, status: string) => void
  ) => void;
};

const PAY_ON_DAY_PAYMENT_METHODS = new Set(["Cash", "On Day Transfer"]);

function formatMoney(value: number | null | undefined) {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

function getMonthlyOutstandingStartDate(monthKey: string) {
  const normalizedMonth = getInputDateValue(monthKey);

  if (!normalizedMonth) {
    return "";
  }

  const [year, month] = normalizedMonth.split("-").map(Number);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return "";
  }

  const outstandingDate = new Date(year, month + 1, 1);

  return `${outstandingDate.getFullYear()}-${String(
    outstandingDate.getMonth() + 1
  ).padStart(2, "0")}-01`;
}

function isPayOnDayCustomer(customer: Customer) {
  return PAY_ON_DAY_PAYMENT_METHODS.has(customer.paymentMethod ?? "Monthly");
}

function getCustomerAddress(customer: Customer) {
  return getCustomerDisplayAddress(customer);
}

function hasCoordinates(customer: Customer) {
  return (
    typeof customer.latitude === "number" &&
    !Number.isNaN(customer.latitude) &&
    typeof customer.longitude === "number" &&
    !Number.isNaN(customer.longitude)
  );
}

function buildGoogleMapsLink(customer: Customer) {
  const query = hasCoordinates(customer)
    ? `${customer.latitude},${customer.longitude}`
    : getCustomerAddress(customer);

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

function buildDirectionsLink(customers: Customer[]) {
  if (!customers.length) return "#";

  const stops = customers.map((customer) => {
    if (hasCoordinates(customer)) {
      return `${customer.latitude},${customer.longitude}`;
    }
    return getCustomerAddress(customer);
  });

  const encodedStops = stops.map((stop) => encodeURIComponent(stop));

  if (encodedStops.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodedStops[0]}`;
  }

  const origin = encodedStops[0];
  const destination = encodedStops[encodedStops.length - 1];
  const waypoints = encodedStops.slice(1, -1).join("|");

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
    waypoints ? `&waypoints=${waypoints}` : ""
  }&travelmode=driving`;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMiles(a: Point, b: Point) {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return earthRadiusMiles * c;
}

function nearestNeighbourSort(customers: Customer[], startPoint?: Point | null) {
  const withCoords = customers.filter(hasCoordinates);
  const withoutCoords = customers.filter((c) => !hasCoordinates(c));

  if (withCoords.length <= 1) {
    return [...withCoords, ...withoutCoords];
  }

  const remaining = [...withCoords];
  const ordered: Customer[] = [];

  let current: Customer;

  if (startPoint) {
    let bestIndex = 0;
    let bestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const distance = haversineMiles(startPoint, {
        latitude: candidate.latitude!,
        longitude: candidate.longitude!,
      });

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    current = remaining.splice(bestIndex, 1)[0];
  } else {
    remaining.sort((a, b) => (a.routeOrder ?? 9999) - (b.routeOrder ?? 9999));
    current = remaining.shift()!;
  }

  ordered.push(current);

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const distance = haversineMiles(
        { latitude: current.latitude!, longitude: current.longitude! },
        { latitude: candidate.latitude!, longitude: candidate.longitude! }
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    current = remaining.splice(bestIndex, 1)[0];
    ordered.push(current);
  }

  return [...ordered, ...withoutCoords];
}

function getGeolocationErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    switch (Number((error as { code?: unknown }).code)) {
      case 1:
        return "Allow location access to optimise the route from where you are.";
      case 2:
        return "Your location could not be determined right now.";
      case 3:
        return "Finding your location timed out. Try again in a moment.";
      default:
        break;
    }
  }

  return "Unable to optimise the route right now.";
}

export default function MapPage({
  customers,
  visits,
  selectedWeek,
  selectedDay,
  defaultRotationWeeks = DEFAULT_ROTATION_WEEKS,
  activeRotationWeeks,
  monthlyPayments,
  grassCutSeasonStart,
  grassCutSeasonEnd,
  monthlyPaymentsReady,
  notCutReasons,
  isLocked,
  getCurrentVisit,
  onUpdateCustomer,
  onMarkVisit,
  onSetPaidStatus,
  onSaveMonthlyPayment,
  onSaveVisitPaymentDate,
  pendingCashPaymentDates,
  onSetPendingCashPayment,
  onCompleteRound,
}: Props) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null
  );
  const [routeStarted, setRouteStarted] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  const [showNotCutModal, setShowNotCutModal] = useState(false);
  const resolvedNotCutReasons = useMemo(
    () =>
      Array.from(
        new Map(
          (notCutReasons?.length ? notCutReasons : DEFAULT_NOT_CUT_REASONS)
            .map((reason) => reason.trim())
            .filter(Boolean)
            .map((reason) => [reason.toLowerCase(), reason])
        ).values()
      ),
    [notCutReasons]
  );
  const [notCutReason, setNotCutReason] = useState<NotCutReason>(
    resolvedNotCutReasons[0] ?? "Other"
  );
  const [notCutComment, setNotCutComment] = useState("");
  const [routeComment, setRouteComment] = useState("");
  const [isSavingRouteComment, setIsSavingRouteComment] = useState(false);
  const [routeCommentStatus, setRouteCommentStatus] = useState<string | null>(null);
  const [isMarkingOutstandingPaid, setIsMarkingOutstandingPaid] = useState(false);
  const [outstandingPaymentStatus, setOutstandingPaymentStatus] = useState<string | null>(null);
  const [isOptimizingRoute, setIsOptimizingRoute] = useState(false);
  const [routePlanningStatus, setRoutePlanningStatus] = useState<string | null>(null);
  const [showCommentEditor, setShowCommentEditor] = useState(false);
  const normalizedDefaultRotationWeeks = normalizeRotationWeeks(defaultRotationWeeks);
  const routeRotationWeeks = normalizeRotationWeeks(
    activeRotationWeeks ?? normalizedDefaultRotationWeeks
  );
  const selectedCycleLabel = getRotationCycleLabel(selectedWeek, routeRotationWeeks);

  useEffect(() => {
    if (!resolvedNotCutReasons.includes(notCutReason)) {
      setNotCutReason(resolvedNotCutReasons[0] ?? "Other");
    }
  }, [notCutReason, resolvedNotCutReasons]);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const directionsRendererRef = useRef<GoogleDirectionsRenderer | null>(null);

  const dayStops = useMemo(() => {
    const filtered = customers.filter(
        (customer) =>
            customer.isGrassCuttingCustomer &&
            isCustomerDueInSelectedWeek(
              customer,
              selectedWeek,
              normalizedDefaultRotationWeeks
            ) &&
            customer.day === selectedDay
    );

    return nearestNeighbourSort(filtered);
  }, [customers, normalizedDefaultRotationWeeks, selectedWeek, selectedDay]);

  const selectedCustomer =
    dayStops.find((c) => c.id === selectedCustomerId) ?? dayStops[0] ?? null;

  const currentStop =
    routeStarted && dayStops.length > 0 ? dayStops[currentStopIndex] : null;

  const selectedOrCurrentCustomer = currentStop ?? selectedCustomer;
  const seasonStartYear = useMemo(
    () => getConfiguredSeasonStartYear(new Date(), grassCutSeasonStart),
    [grassCutSeasonStart]
  );
  const paymentYearMonths = useMemo(
    () => buildPaymentYearMonths(seasonStartYear, grassCutSeasonStart),
    [grassCutSeasonStart, seasonStartYear]
  );
  const monthlyPaymentLookup = useMemo(() => {
    const lookup = new Map<string, MonthlyPayment>();

    monthlyPayments.forEach((payment) => {
      lookup.set(`${payment.customerId}:${getInputDateValue(payment.paymentMonth)}`, payment);
    });

    return lookup;
  }, [monthlyPayments]);
  const selectedCustomerOutstanding = useMemo<CustomerOutstandingPaymentSummary | null>(() => {
    if (!selectedOrCurrentCustomer) {
      return null;
    }

    const todayValue = getTodayDateInputValue();
    const method = selectedOrCurrentCustomer.paymentMethod ?? "Monthly";

    if (method === "Monthly") {
      const monthlyCharge = getMonthlyPlanCharge(selectedOrCurrentCustomer);
      const items: OutstandingPaymentItem[] = paymentYearMonths
        .filter((month) => {
          const outstandingStartDate = getMonthlyOutstandingStartDate(month.key);
          const payment = monthlyPaymentLookup.get(
            `${selectedOrCurrentCustomer.id}:${month.key}`
          );

          return (
            Boolean(outstandingStartDate) &&
            outstandingStartDate <= todayValue &&
            !getInputDateValue(payment?.paymentDate)
          );
        })
        .map((month) => ({
          kind: "monthly" as const,
          key: `monthly:${month.key}`,
          label: `${month.fullLabel} payment`,
          dueFrom: getMonthlyOutstandingStartDate(month.key),
          amount: monthlyCharge,
          paymentMonth: month.key,
        }));

      if (items.length === 0) {
        return null;
      }

      return {
        customerId: selectedOrCurrentCustomer.id,
        method,
        amount: items.reduce((total, item) => total + item.amount, 0),
        items,
      };
    }

    if (!isPayOnDayCustomer(selectedOrCurrentCustomer)) {
      return null;
    }

    const items: OutstandingPaymentItem[] = visits
      .filter((visit) => visit.customerId === selectedOrCurrentCustomer.id)
      .filter((visit) => visit.status === "completed")
      .filter((visit) =>
        isDateInSeasonRange(
          visit.visitDate,
          seasonStartYear,
          grassCutSeasonStart,
          grassCutSeasonEnd
        )
      )
      .filter((visit) => !getInputDateValue(visit.paidAt))
      .sort(
        (left, right) =>
          new Date(left.visitDate).getTime() - new Date(right.visitDate).getTime()
      )
      .map((visit) => ({
        kind: "visit" as const,
        key: `visit:${visit.id}`,
        label: `Cut ${formatStoredDate(visit.visitDate)}`,
        dueFrom: getInputDateValue(visit.visitDate),
        amount: Number(
          visit.priceAtVisit ?? selectedOrCurrentCustomer.grassCutAmount ?? 0
        ),
        visitId: visit.id,
      }));

    if (items.length === 0) {
      return null;
    }

    return {
      customerId: selectedOrCurrentCustomer.id,
      method,
      amount: items.reduce((total, item) => total + item.amount, 0),
      items,
    };
  }, [
    grassCutSeasonEnd,
    grassCutSeasonStart,
    monthlyPaymentLookup,
    paymentYearMonths,
    seasonStartYear,
    selectedOrCurrentCustomer,
    visits,
  ]);
  const selectedOutstandingHasMonthlyItems =
    selectedCustomerOutstanding?.items.some((item) => item.kind === "monthly") ?? false;
  const canMarkOutstandingPaid =
    Boolean(selectedCustomerOutstanding) &&
    (!selectedOutstandingHasMonthlyItems || monthlyPaymentsReady);

  useEffect(() => {
    if (!dayStops.length) {
      setSelectedCustomerId(null);
      setCurrentStopIndex(0);
      setRouteStarted(false);
      return;
    }

    const exists = dayStops.some((c) => c.id === selectedCustomerId);
    if (!exists) {
      setSelectedCustomerId(dayStops[0].id);
    }
  }, [dayStops, selectedCustomerId]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    if (!mapInstanceRef.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 55.8642, lng: -4.2518 },
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      }) as GoogleMapInstance;

      const renderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: false,
      }) as GoogleDirectionsRenderer;

      renderer.setMap(map);
      mapInstanceRef.current = map;
      directionsRendererRef.current = renderer;
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    let hasBounds = false;

    dayStops.forEach((customer, index) => {
      if (!hasCoordinates(customer)) return;

      const isCurrent = currentStop?.id === customer.id;
      const isSelected =
        !currentStop && selectedOrCurrentCustomer?.id === customer.id;

      const marker = new window.google.maps.Marker({
        position: {
          lat: customer.latitude!,
          lng: customer.longitude!,
        },
        map: mapInstanceRef.current,
        label: {
          text: String(index + 1),
          color: "#ffffff",
          fontWeight: "700",
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isCurrent || isSelected ? 13 : 10,
          fillColor: isCurrent ? "#16a34a" : isSelected ? "#0f766e" : "#1f2937",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        title: customer.name,
      });

      marker.addListener("click", () => {
        setSelectedCustomerId(customer.id);
        if (routeStarted) {
          const idx = dayStops.findIndex((c) => c.id === customer.id);
          if (idx >= 0) setCurrentStopIndex(idx);
        }
      });

      markersRef.current.push(marker);
      bounds.extend(marker.getPosition());
      hasBounds = true;
    });

    if (hasBounds) {
      mapInstanceRef.current.fitBounds(bounds, 60);
    }

    if (routeStarted && dayStops.length >= 2 && window.google?.maps) {
      const directionsService =
        new window.google.maps.DirectionsService() as GoogleDirectionsService;
      const routeCandidates = dayStops.filter(
        (customer) => hasCoordinates(customer) || getCustomerAddress(customer)
      );

      if (routeCandidates.length >= 2) {
        directionsService.route(
          {
            origin: hasCoordinates(routeCandidates[0])
              ? {
                  lat: routeCandidates[0].latitude!,
                  lng: routeCandidates[0].longitude!,
                }
              : getCustomerAddress(routeCandidates[0]),
            destination: hasCoordinates(routeCandidates[routeCandidates.length - 1])
              ? {
                  lat: routeCandidates[routeCandidates.length - 1].latitude!,
                  lng: routeCandidates[routeCandidates.length - 1].longitude!,
                }
              : getCustomerAddress(routeCandidates[routeCandidates.length - 1]),
            waypoints: routeCandidates.slice(1, -1).slice(0, 23).map((customer) => ({
              location: hasCoordinates(customer)
                ? { lat: customer.latitude!, lng: customer.longitude! }
                : getCustomerAddress(customer),
              stopover: true,
            })),
            travelMode: window.google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false,
          },
          (result: unknown, status: string) => {
            if (status === "OK") {
              directionsRendererRef.current?.setDirections(result);
            }
          }
        );
      }
    } else {
      directionsRendererRef.current?.set("directions", null);
    }
  }, [dayStops, selectedOrCurrentCustomer, currentStop, routeStarted]);

  function startRoute() {
    if (!dayStops.length) return;
    setRouteStarted(true);
    setCurrentStopIndex(0);
    setSelectedCustomerId(dayStops[0].id);
  }

  function moveToNextStop() {
    if (currentStopIndex < dayStops.length - 1) {
      const nextIndex = currentStopIndex + 1;
      setCurrentStopIndex(nextIndex);
      setSelectedCustomerId(dayStops[nextIndex].id);
    }
  }

  function handleMarkCut() {
    if (!currentStop) return;
    onMarkVisit(currentStop.id, "cut", {
      paid:
        currentStop.paymentMethod === "Cash"
          ? Boolean(pendingCashPaymentDates[String(currentStop.id)])
          : undefined,
    });
    moveToNextStop();
  }

  function handleOpenNotCut() {
    setNotCutReason(resolvedNotCutReasons[0] ?? "Other");
    setNotCutComment("");
    setShowNotCutModal(true);
  }

  function handleSubmitNotCut() {
    if (!currentStop) return;
    onMarkVisit(currentStop.id, "not_cut", {
      notCutReason,
      notes: notCutComment,
      paid:
        currentStop.paymentMethod === "Cash"
          ? Boolean(pendingCashPaymentDates[String(currentStop.id)])
          : undefined,
    });
    setShowNotCutModal(false);
    moveToNextStop();
  }

  const currentVisit = currentStop ? getCurrentVisit(currentStop.id) : null;
  const selectedVisit = selectedOrCurrentCustomer
    ? getCurrentVisit(selectedOrCurrentCustomer.id)
    : null;
  const currentVisitIsPaid =
    currentVisit?.paid === true || currentVisit?.paymentStatus === "Paid";
  const selectedVisitIsPaid =
    selectedVisit?.paid === true || selectedVisit?.paymentStatus === "Paid";
  const currentCustomerNotes = currentStop?.notes?.trim() ?? "";
  const routeCommentValue = routeComment.trim();
  const hasRouteCommentChanges =
    currentStop !== null && routeCommentValue !== currentCustomerNotes;
  const selectedCustomerIsCash =
    selectedOrCurrentCustomer?.paymentMethod === "Cash";
  const currentStopIsCashCustomer = currentStop?.paymentMethod === "Cash";
  const selectedPendingCashPaid = selectedOrCurrentCustomer
    ? Boolean(pendingCashPaymentDates[String(selectedOrCurrentCustomer.id)])
    : false;
  const selectedCashPaymentLabel = !selectedCustomerIsCash
    ? "Not a cash customer"
    : selectedVisit
    ? selectedVisitIsPaid
      ? "Paid"
      : "Not Paid"
    : selectedPendingCashPaid === true
    ? "Paid selected"
    : selectedOrCurrentCustomer && currentStop?.id === selectedOrCurrentCustomer.id
    ? "Not Paid selected"
    : "No visit recorded yet";
  const mappableStopsCount = dayStops.filter(hasCoordinates).length;

  useEffect(() => {
    setRoutePlanningStatus(null);
  }, [selectedWeek, selectedDay]);

  useEffect(() => {
    setOutstandingPaymentStatus(null);
  }, [selectedOrCurrentCustomer?.id]);

  useEffect(() => {
    setRouteComment(currentStop?.notes ?? "");
    setRouteCommentStatus(null);
    setShowCommentEditor(false);
  }, [currentStop?.id, currentStop?.notes]);

  function handleCurrentStopPaidChange(paid: boolean) {
    if (!currentStop) return;

    if (currentVisit) {
      onSetPaidStatus(currentVisit.id, paid);
      return;
    }

    onSetPendingCashPayment(currentStop.id, paid);
  }

  async function handleMarkOutstandingPaid() {
    if (!selectedCustomerOutstanding || isMarkingOutstandingPaid) {
      return;
    }

    if (!canMarkOutstandingPaid) {
      setOutstandingPaymentStatus(
        "Monthly payment tracking is not ready yet. Check the payments setup first."
      );
      return;
    }

    setIsMarkingOutstandingPaid(true);
    setOutstandingPaymentStatus(null);

    try {
      const paymentDate = getTodayDateInputValue();

      for (const item of selectedCustomerOutstanding.items) {
        if (item.kind === "monthly") {
          await onSaveMonthlyPayment(
            selectedCustomerOutstanding.customerId,
            item.paymentMonth,
            paymentDate
          );
        } else {
          await onSaveVisitPaymentDate(item.visitId, paymentDate);
        }
      }

      setOutstandingPaymentStatus("Outstanding payments marked as paid.");
    } catch {
      setOutstandingPaymentStatus(
        "Unable to mark these payments as paid right now."
      );
    } finally {
      setIsMarkingOutstandingPaid(false);
    }
  }

  async function handleSaveRouteComment() {
    if (!currentStop || !hasRouteCommentChanges) return;

    setIsSavingRouteComment(true);
    setRouteCommentStatus(null);

    try {
      await onUpdateCustomer({
        ...currentStop,
        notes: routeCommentValue || undefined,
      });
      setRouteCommentStatus(
        routeCommentValue ? "Customer notes updated." : "Customer notes cleared."
      );
    } catch {
      setRouteCommentStatus("Unable to update customer notes right now.");
    } finally {
      setIsSavingRouteComment(false);
    }
  }

  async function handleOptimizeRoute() {
    if (isOptimizingRoute) {
      return;
    }

    if (!dayStops.length) {
      setRoutePlanningStatus("There are no service visits to optimise for this day.");
      return;
    }

    if (mappableStopsCount === 0) {
      setRoutePlanningStatus(
        "Add map coordinates to these customers before optimising the route."
      );
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setRoutePlanningStatus("Location services are not available in this browser.");
      return;
    }

    setIsOptimizingRoute(true);
    setRoutePlanningStatus(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const optimizedStops = nearestNeighbourSort(dayStops, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      for (let index = 0; index < optimizedStops.length; index += 1) {
        const customer = optimizedStops[index];
        const nextRouteOrder = index + 1;

        if ((customer.routeOrder ?? 0) === nextRouteOrder) {
          continue;
        }

        await onUpdateCustomer({
          ...customer,
          routeOrder: nextRouteOrder,
        });
      }

      const firstStop = optimizedStops[0] ?? null;
      const unmappedStops = optimizedStops.filter(
        (customer) => !hasCoordinates(customer)
      ).length;

      if (firstStop) {
        setSelectedCustomerId(firstStop.id);
        if (routeStarted) {
          setCurrentStopIndex(0);
        }
      }

      setRoutePlanningStatus(
        unmappedStops > 0
          ? `Route optimised from your current location. ${unmappedStops} stop${
              unmappedStops === 1 ? "" : "s"
            } without coordinates stayed at the end.`
          : firstStop
          ? `Route optimised from your current location. ${firstStop.name} is now first.`
          : "Route optimised from your current location."
      );
    } catch (error) {
      setRoutePlanningStatus(getGeolocationErrorMessage(error));
    } finally {
      setIsOptimizingRoute(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
              Day Route
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              {selectedCycleLabel} · {selectedDay}
            </h2>
            <p className="mt-2 text-sm text-white/75">
              Showing all stops for this day on the map.
            </p>
          </div>

          <div className="flex flex-col gap-2 xl:items-end">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={startRoute}
                disabled={!dayStops.length}
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
              >
                Start Route
              </button>

              <button
                onClick={handleOptimizeRoute}
                disabled={!dayStops.length || mappableStopsCount === 0 || isOptimizingRoute}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LocateFixed size={16} />
                {isOptimizingRoute ? "Optimising..." : "Optimize Route"}
              </button>

              <button
                onClick={onCompleteRound}
                disabled={isLocked || !dayStops.length}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLocked ? "Round Locked" : "Complete Selected Round"}
              </button>
            </div>

            {routePlanningStatus && (
              <p className="text-sm text-white/80 xl:max-w-md xl:text-right">
                {routePlanningStatus}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Stops Today
          </p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            {dayStops.length}
          </p>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Residential
          </p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            {dayStops.filter((c) => c.customerType === "Residential").length}
          </p>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Commercial
          </p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            {dayStops.filter((c) => c.customerType === "Commercial").length}
          </p>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Day Value
          </p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            {formatMoney(
              dayStops.reduce(
                (sum, customer) => sum + Number(customer.grassCutAmount ?? 0),
                0
              )
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Current Focus
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              {selectedOrCurrentCustomer?.name ?? "No stop selected"}
            </h3>

            {selectedOrCurrentCustomer ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Address
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {getCustomerAddress(selectedOrCurrentCustomer)}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Service Amount
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatMoney(selectedOrCurrentCustomer.grassCutAmount)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Payment Type
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {selectedOrCurrentCustomer.paymentMethod ?? "Monthly"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Service Areas
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatGrassCutAreas(selectedOrCurrentCustomer)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Current Status
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {selectedVisit?.status === "completed"
                        ? "Completed"
                        : selectedVisit?.status === "not_cut"
                        ? `Not Completed${
                            selectedVisit.notCutReason
                              ? ` - ${selectedVisit.notCutReason}`
                              : ""
                          }`
                        : "Not Started"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Cash Payment
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {selectedCashPaymentLabel}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Access Notes
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {selectedOrCurrentCustomer.accessNotes?.trim() ||
                        "No access notes added."}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Customer Notes
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {selectedOrCurrentCustomer.notes?.trim() ||
                        "No customer notes added."}
                    </p>
                  </div>
                </div>

                {selectedCustomerOutstanding ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-black text-rose-800">
                          Payment Outstanding
                        </p>
                        <p className="mt-1 text-sm text-rose-700">
                          {formatMoney(selectedCustomerOutstanding.amount)} outstanding
                          via {selectedCustomerOutstanding.method}.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleMarkOutstandingPaid}
                        disabled={
                          isMarkingOutstandingPaid || !canMarkOutstandingPaid
                        }
                        className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isMarkingOutstandingPaid ? "Marking..." : "Mark As Paid"}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedCustomerOutstanding.items.map((item) => (
                        <span
                          key={item.key}
                          className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700"
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>

                    {selectedOutstandingHasMonthlyItems && !monthlyPaymentsReady && (
                      <p className="mt-3 text-xs font-semibold text-rose-700">
                        Monthly payment tracking is not ready yet.
                      </p>
                    )}

                    {outstandingPaymentStatus && (
                      <p className="mt-3 text-xs font-semibold text-rose-700">
                        {outstandingPaymentStatus}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-black text-emerald-800">
                      Nothing Outstanding
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      No unpaid cuts or monthly payments are showing for this
                      customer.
                    </p>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  {routeStarted && currentStop ? (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Current Stop Actions
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Mark this stop, record cash payment, or add a note.
                          </p>
                        </div>

                        <label className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={showCommentEditor}
                            onChange={(event) =>
                              setShowCommentEditor(event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                          />
                          Add Comment
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleMarkCut}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Completed
                        </button>

                        <button
                          onClick={handleOpenNotCut}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Not Completed
                        </button>

                        {currentStopIsCashCustomer && (
                          <>
                            <button
                              onClick={() => handleCurrentStopPaidChange(true)}
                              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                                currentVisitIsPaid ||
                                (!currentVisit &&
                                  Boolean(
                                    pendingCashPaymentDates[String(currentStop.id)]
                                  ))
                                  ? "border-sky-300 bg-sky-100 text-sky-800"
                                  : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                              }`}
                            >
                              Paid
                            </button>

                            <button
                              onClick={() => handleCurrentStopPaidChange(false)}
                              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                                !currentVisitIsPaid &&
                                (!currentVisit
                                  ? !pendingCashPaymentDates[String(currentStop.id)]
                                  : true)
                                  ? "border-amber-300 bg-amber-100 text-amber-800"
                                  : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              }`}
                            >
                              Not Paid
                            </button>
                          </>
                        )}
                      </div>

                      {showCommentEditor && (
                        <div className="rounded-2xl bg-white p-4">
                          <div className="flex flex-col gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Customer Comment
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                This updates the customer&apos;s notes everywhere in
                                the app.
                              </p>
                            </div>

                            <textarea
                              value={routeComment}
                              onChange={(e) => {
                                setRouteComment(e.target.value);
                                setRouteCommentStatus(null);
                              }}
                              rows={4}
                              placeholder="Add a note for this customer"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                            />

                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs text-slate-500">
                                {routeCommentStatus ?? " "}
                              </p>

                              <button
                                onClick={handleSaveRouteComment}
                                disabled={
                                  !hasRouteCommentChanges || isSavingRouteComment
                                }
                                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isSavingRouteComment
                                  ? "Saving..."
                                  : "Update Notes"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {currentVisit?.notCutReason && (
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Not Completed Reason
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {currentVisit.notCutReason}
                          </p>
                          {currentVisit.notes && (
                            <p className="mt-2 text-sm text-slate-500">
                              {currentVisit.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Start the route to mark stops, record payment, and update
                      notes.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No customer selected.
              </p>
            )}
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 px-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Live Map
                </p>
                <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                  {routeStarted ? "Route Started" : "All Stops Visible"}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={buildDirectionsLink(dayStops)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Navigation size={16} />
                  Open Round in Maps
                </a>

                {selectedOrCurrentCustomer && (
                  <a
                    href={buildGoogleMapsLink(selectedOrCurrentCustomer)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Navigation size={16} />
                    Open This Stop In Maps
                  </a>
                )}

                {routeStarted && currentStop && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Current Stop: {currentStopIndex + 1}
                  </span>
                )}
              </div>
            </div>

            <div
              ref={mapRef}
              className="h-[560px] w-full overflow-hidden rounded-[20px] border border-slate-200"
            />
          </section>
        </div>

        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Stop Order
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                Day Stops
              </h3>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {dayStops.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No stops for this day.
              </div>
            ) : (
              dayStops.map((customer, index) => {
                const active =
                  selectedOrCurrentCustomer?.id === customer.id ||
                  currentStop?.id === customer.id;
                const visit = getCurrentVisit(customer.id);
                const hasPendingCashPayment = Boolean(
                  pendingCashPaymentDates[String(customer.id)]
                );
                const paid =
                  visit?.paid === true ||
                  visit?.paymentStatus === "Paid";

                return (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomerId(customer.id);
                      if (routeStarted) setCurrentStopIndex(index);
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[#244d51] bg-[#edf7f7]"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Stop {index + 1}
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {customer.name}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {getCustomerAddress(customer)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {customer.customerType}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                            visit?.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : visit?.status === "not_cut"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {visit?.status === "completed"
                            ? "Completed"
                            : visit?.status === "not_cut"
                            ? "Not Completed"
                            : "Not Started"}
                        </span>

                        {customer.paymentMethod === "Cash" &&
                          (visit || hasPendingCashPayment) && (
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                              paid || hasPendingCashPayment
                                ? "bg-sky-100 text-sky-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {paid || hasPendingCashPayment ? "Paid" : "Not Paid"}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>

      {showNotCutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-xl">
            <h3 className="text-xl font-black tracking-tight text-slate-900">
              Not Completed Reason
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Record why this visit was not completed.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Reason
                </label>
                <select
                  value={notCutReason}
                  onChange={(e) =>
                    setNotCutReason(e.target.value as NotCutReason)
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                >
                  {resolvedNotCutReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Comment
                </label>
                <textarea
                  value={notCutComment}
                  onChange={(e) => setNotCutComment(e.target.value)}
                  className="min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                  placeholder="Add any extra detail here..."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={handleSubmitNotCut}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Save Reason
              </button>

              <button
                onClick={() => setShowNotCutModal(false)}
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
