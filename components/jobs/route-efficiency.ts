import { APPROX_SPEED_MPH, getCustomerDisplayAddress } from "./helpers";
import {
  DEFAULT_ROTATION_WEEKS,
  getActiveRotationWeeks,
  getRotationCycleLabel,
  getWeekOptions,
  isCustomerDueInSelectedWeek,
  normalizeRotationWeeks,
} from "./rotation";
import type { Customer, DayName, RotationWeeks, WeekNumber } from "./types";

export type RouteKey = `${WeekNumber}-${DayName}`;

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RouteSummary = {
  key: RouteKey;
  week: WeekNumber;
  day: DayName;
  label: string;
  customers: Customer[];
  orderedCustomers: Customer[];
  optimizedCustomers: Customer[];
  stops: number;
  mappedStops: number;
  unmappedStops: number;
  routeValue: number;
  currentMiles: number;
  optimizedMiles: number;
  potentialSavedMiles: number;
  estimatedMinutes: number;
  score: number;
  centroid: RoutePoint | null;
};

export type RouteOrderSuggestion = {
  id: string;
  routeKey: RouteKey;
  routeLabel: string;
  savedMiles: number;
  currentMiles: number;
  optimizedMiles: number;
  customerOrder: Customer[];
};

export type BadFitFlag = {
  id: string;
  customerId: number;
  customerName: string;
  routeKey: RouteKey;
  routeLabel: string;
  distanceFromRouteMiles: number;
  averageRouteDistanceMiles: number;
  address: string;
};

export type MoveCustomerSuggestion = {
  id: string;
  customerId: number;
  customerName: string;
  fromRouteKey: RouteKey;
  fromRouteLabel: string;
  toWeek: WeekNumber;
  toDay: DayName;
  toRouteKey: RouteKey;
  toRouteLabel: string;
  distanceToCurrentRouteMiles: number;
  distanceToSuggestedRouteMiles: number;
  savedMiles: number;
  currentRouteStops: number;
  suggestedRouteStops: number;
  address: string;
};

export type RouteCustomerSnapshot = {
  customerId: number;
  customerName: string;
  week: WeekNumber;
  day: DayName;
  routeOrder?: number;
};

export type RouteChangeRecord = {
  id: string;
  type: "reorder" | "move";
  title: string;
  detail: string;
  reason: string;
  routeLabel: string;
  savedMiles: number;
  affectedCustomerCount: number;
  occurredAt: string;
  undoCustomers: RouteCustomerSnapshot[];
  undoneAt?: string;
};

export type RouteNotes = Record<string, string>;

export const ROUTE_WEEKS: WeekNumber[] = getWeekOptions(4);
export const ROUTE_DAYS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function getRouteKey(week: WeekNumber, day: DayName): RouteKey {
  return `${week}-${day}`;
}

export function hasRouteCoordinates(
  customer: Pick<Customer, "latitude" | "longitude">
) {
  return (
    typeof customer.latitude === "number" &&
    Number.isFinite(customer.latitude) &&
    typeof customer.longitude === "number" &&
    Number.isFinite(customer.longitude)
  );
}

export function getRoutePoint(customer: Customer): RoutePoint | null {
  if (!hasRouteCoordinates(customer)) {
    return null;
  }

  return {
    latitude: customer.latitude as number,
    longitude: customer.longitude as number,
  };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function getMilesBetweenPoints(a: RoutePoint, b: RoutePoint) {
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

function getMilesBetweenCustomers(a: Customer, b: Customer) {
  const pointA = getRoutePoint(a);
  const pointB = getRoutePoint(b);

  if (!pointA || !pointB) {
    return 0;
  }

  return getMilesBetweenPoints(pointA, pointB);
}

export function getRouteDistance(customers: Customer[]) {
  const mappedCustomers = customers.filter(hasRouteCoordinates);

  if (mappedCustomers.length <= 1) {
    return 0;
  }

  return mappedCustomers.reduce((total, customer, index) => {
    const nextCustomer = mappedCustomers[index + 1];

    if (!nextCustomer) {
      return total;
    }

    return total + getMilesBetweenCustomers(customer, nextCustomer);
  }, 0);
}

function sortByRouteOrder(customers: Customer[]) {
  return [...customers].sort((left, right) => {
    const leftOrder = Number.isFinite(left.routeOrder)
      ? Number(left.routeOrder)
      : Number.MAX_SAFE_INTEGER;
    const rightOrder = Number.isFinite(right.routeOrder)
      ? Number(right.routeOrder)
      : Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

export function nearestNeighbourRoute(customers: Customer[]) {
  const withCoords = customers.filter(hasRouteCoordinates);
  const withoutCoords = customers.filter((customer) => !hasRouteCoordinates(customer));

  if (withCoords.length <= 1) {
    return [...withCoords, ...withoutCoords];
  }

  const remaining = sortByRouteOrder(withCoords);
  const ordered: Customer[] = [];
  let current = remaining.shift()!;

  ordered.push(current);

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;

    remaining.forEach((candidate, index) => {
      const distance = getMilesBetweenCustomers(current, candidate);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    current = remaining.splice(bestIndex, 1)[0];
    ordered.push(current);
  }

  return [...ordered, ...withoutCoords];
}

function getCentroid(customers: Customer[]): RoutePoint | null {
  const mappedCustomers = customers.filter(hasRouteCoordinates);

  if (mappedCustomers.length === 0) {
    return null;
  }

  const totals = mappedCustomers.reduce(
    (sum, customer) => ({
      latitude: sum.latitude + (customer.latitude as number),
      longitude: sum.longitude + (customer.longitude as number),
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: totals.latitude / mappedCustomers.length,
    longitude: totals.longitude / mappedCustomers.length,
  };
}

function getRouteScore(currentMiles: number, optimizedMiles: number, mappedStops: number) {
  if (mappedStops <= 1 || currentMiles <= 0) {
    return mappedStops <= 1 ? 100 : 0;
  }

  const ratio = optimizedMiles > 0 ? optimizedMiles / currentMiles : 1;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

export function buildRouteSummaries(
  customers: Customer[],
  defaultRotationWeeks: RotationWeeks = DEFAULT_ROTATION_WEEKS,
  routeWeeks?: WeekNumber[]
) {
  const normalizedDefaultRotationWeeks = normalizeRotationWeeks(defaultRotationWeeks);
  const weeks =
    routeWeeks?.length
      ? routeWeeks
      : getWeekOptions(
          getActiveRotationWeeks(customers, normalizedDefaultRotationWeeks)
        );
  const routeRotationWeeks = normalizeRotationWeeks(
    weeks.length || normalizedDefaultRotationWeeks
  );

  return weeks.flatMap((week) =>
    ROUTE_DAYS.map<RouteSummary>((day) => {
      const routeCustomers = customers.filter(
        (customer) =>
          customer.isGrassCuttingCustomer &&
          isCustomerDueInSelectedWeek(
            customer,
            week,
            normalizedDefaultRotationWeeks
          ) &&
          customer.day === day
      );
      const orderedCustomers = sortByRouteOrder(routeCustomers);
      const optimizedCustomers = nearestNeighbourRoute(orderedCustomers);
      const mappedStops = routeCustomers.filter(hasRouteCoordinates).length;
      const currentMiles = getRouteDistance(orderedCustomers);
      const optimizedMiles = getRouteDistance(optimizedCustomers);

      return {
        key: getRouteKey(week, day),
        week,
        day,
        label: `${getRotationCycleLabel(week, routeRotationWeeks)} ${day}`,
        customers: routeCustomers,
        orderedCustomers,
        optimizedCustomers,
        stops: routeCustomers.length,
        mappedStops,
        unmappedStops: routeCustomers.length - mappedStops,
        routeValue: routeCustomers.reduce(
          (total, customer) => total + Number(customer.grassCutAmount ?? 0),
          0
        ),
        currentMiles,
        optimizedMiles,
        potentialSavedMiles: Math.max(0, currentMiles - optimizedMiles),
        estimatedMinutes:
          currentMiles > 0 ? Math.round((currentMiles / APPROX_SPEED_MPH) * 60) : 0,
        score: getRouteScore(currentMiles, optimizedMiles, mappedStops),
        centroid: getCentroid(routeCustomers),
      };
    })
  );
}

export function buildRouteOrderSuggestions(routeSummaries: RouteSummary[]) {
  return routeSummaries
    .filter(
      (summary) =>
        summary.mappedStops >= 4 &&
        summary.potentialSavedMiles >= 0.5 &&
        summary.currentMiles > summary.optimizedMiles * 1.12
    )
    .map<RouteOrderSuggestion>((summary) => ({
      id: `reorder:${summary.key}:${summary.orderedCustomers
        .map((customer) => customer.id)
        .join("-")}:to:${summary.optimizedCustomers
        .map((customer) => customer.id)
        .join("-")}`,
      routeKey: summary.key,
      routeLabel: summary.label,
      savedMiles: summary.potentialSavedMiles,
      currentMiles: summary.currentMiles,
      optimizedMiles: summary.optimizedMiles,
      customerOrder: summary.optimizedCustomers,
    }))
    .sort((left, right) => right.savedMiles - left.savedMiles);
}

export function buildBadFitFlags(routeSummaries: RouteSummary[]) {
  return routeSummaries.flatMap((summary) => {
    if (!summary.centroid || summary.mappedStops < 3) {
      return [];
    }

    const distances = summary.customers
      .filter(hasRouteCoordinates)
      .map((customer) => ({
        customer,
        distance: getMilesBetweenPoints(summary.centroid!, getRoutePoint(customer)!),
      }));
    const averageDistance =
      distances.reduce((total, entry) => total + entry.distance, 0) /
      Math.max(distances.length, 1);
    const threshold = Math.max(2.5, averageDistance * 2.2);

    return distances
      .filter((entry) => entry.distance >= threshold)
      .map<BadFitFlag>((entry) => ({
        id: `bad-fit:${summary.key}:${entry.customer.id}`,
        customerId: entry.customer.id,
        customerName: entry.customer.name,
        routeKey: summary.key,
        routeLabel: summary.label,
        distanceFromRouteMiles: entry.distance,
        averageRouteDistanceMiles: averageDistance,
        address: getCustomerDisplayAddress(entry.customer),
      }));
  });
}

export function buildMoveCustomerSuggestions(
  routeSummaries: RouteSummary[],
  ignoredSuggestionIds: Set<string>
) {
  const summariesWithCentroids = routeSummaries.filter(
    (summary) => summary.centroid && summary.mappedStops >= 2
  );
  const suggestions: MoveCustomerSuggestion[] = [];

  summariesWithCentroids.forEach((currentSummary) => {
    currentSummary.customers
      .filter(hasRouteCoordinates)
      .forEach((customer) => {
        const customerPoint = getRoutePoint(customer);

        if (!customerPoint || !currentSummary.centroid) {
          return;
        }

        const distanceToCurrentRoute = getMilesBetweenPoints(
          customerPoint,
          currentSummary.centroid
        );
        const bestAlternative = summariesWithCentroids
          .filter((summary) => summary.key !== currentSummary.key)
          .map((summary) => ({
            summary,
            distance: getMilesBetweenPoints(customerPoint, summary.centroid!),
          }))
          .sort((left, right) => left.distance - right.distance)[0];

        if (!bestAlternative) {
          return;
        }

        const savedMiles = distanceToCurrentRoute - bestAlternative.distance;

        if (
          savedMiles < 1.5 ||
          distanceToCurrentRoute < bestAlternative.distance * 1.35
        ) {
          return;
        }

        const suggestionId = `move:${customer.id}:${currentSummary.key}:to:${bestAlternative.summary.key}`;

        if (ignoredSuggestionIds.has(suggestionId)) {
          return;
        }

        suggestions.push({
          id: suggestionId,
          customerId: customer.id,
          customerName: customer.name,
          fromRouteKey: currentSummary.key,
          fromRouteLabel: currentSummary.label,
          toWeek: bestAlternative.summary.week,
          toDay: bestAlternative.summary.day,
          toRouteKey: bestAlternative.summary.key,
          toRouteLabel: bestAlternative.summary.label,
          distanceToCurrentRouteMiles: distanceToCurrentRoute,
          distanceToSuggestedRouteMiles: bestAlternative.distance,
          savedMiles,
          currentRouteStops: currentSummary.stops,
          suggestedRouteStops: bestAlternative.summary.stops,
          address: getCustomerDisplayAddress(customer),
        });
      });
  });

  return suggestions.sort((left, right) => right.savedMiles - left.savedMiles);
}
