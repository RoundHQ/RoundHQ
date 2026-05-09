"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  CloudSun,
  CreditCard,
  FilePlus2,
  FileText,
  Receipt,
  ReceiptText,
  Route,
  UserPlus,
} from "lucide-react";
import {
  buildPaymentYearMonths,
  getConfiguredSeasonStartYear,
  getCustomerDisplayAddress,
  getInputDateValue,
  getMonthlyPlanCharge,
  isDateInSeasonRange,
} from "./helpers";
import {
  buildCustomerProfitRows,
  formatCustomerProfitDate,
} from "./customer-profit";
import {
  DEFAULT_ROTATION_WEEKS,
  getEffectiveRotationWeeks,
  getRotationCycleLabel,
  getRotationDays,
  isCustomerDueInSelectedWeek,
  normalizeRotationWeeks,
} from "./rotation";
import type {
  Customer,
  DashboardAttentionItem,
  MonthlyPayment,
  RotationWeeks,
  VisitLog,
  WeatherState,
} from "./types";

type ScheduledJob = {
  id: string;
  title: string;
  date: string;
  notes?: string;
  customerName?: string;
  customerId?: number | null;
  type: "One Off" | "Quote Accepted" | "Grass Cut" | "Commercial";
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
  quoteIds?: string[];
  invoiceIds?: string[];
  createdAt: string;
};

type Props = {
  visits: VisitLog[];
  customers: Customer[];
  scheduledJobs: ScheduledJob[];
  monthlyPayments: MonthlyPayment[];
  grassCutSeasonStart: string;
  grassCutSeasonEnd: string;
  roundCycle: number;
  selectedWeek: string;
  selectedDay: string;
  defaultRotationWeeks?: RotationWeeks;
  activeRotationWeeks?: RotationWeeks;
  isLocked: boolean;
  showWeatherWidget: boolean;
  showRevenueWidget: boolean;
  showJobsWidget: boolean;
  showUnpaidWidget: boolean;
  showRecentActivityWidget: boolean;
  attentionItems: DashboardAttentionItem[];
  onGoToRounds?: () => void;
  onGoToActions?: () => void;
  onGoToMap?: () => void;
  onGoToCustomers?: () => void;
  onGoToQuoteForm?: () => void;
  onGoToInvoiceForm?: () => void;
  onGoToSchedule?: () => void;
  onGoToPayments?: () => void;
  onGoToCustomerProfit?: () => void;
  weekOptions?: string[];
  dayOptions?: string[];
  onWeekChange?: (week: string) => void;
  onDayChange?: (day: string) => void;
  onOpenCustomer?: (customerId: number) => void;
  onOpenQuote?: (quoteId: string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
  onSendQuoteFollowUp?: (quoteId: string) => void;
  onSendInvoiceReminder?: (invoiceId: string) => void;
};

type OutstandingPaymentSnapshot = {
  total: number;
  monthly: number;
  onDayTransfer: number;
  cash: number;
};

const DEFAULT_WEATHER_COORDINATES = {
  latitude: 55.8642,
  longitude: -4.2518,
};

function formatMoney(value: number) {
  return `\u00a3${value.toFixed(2)}`;
}

function formatDateForInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDateFromInputValue(value: string | null | undefined) {
  const normalized = getInputDateValue(value);

  if (!normalized) {
    return null;
  }

  const [year, month, day] = normalized.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function getMonthlyOutstandingStartDate(monthKey: string) {
  const monthDate = getDateFromInputValue(monthKey);

  if (!monthDate) {
    return "";
  }

  return formatDateForInput(
    new Date(monthDate.getFullYear(), monthDate.getMonth() + 2, 1)
  );
}

function getEstimatedMonthlyValue(
  customer: Customer,
  defaultRotationWeeks: RotationWeeks
) {
  const amount = Number(customer.grassCutAmount ?? 0);
  const rotationWeeks = getEffectiveRotationWeeks(customer, defaultRotationWeeks);
  return amount * (52 / 12 / rotationWeeks);
}

function getEstimatedYearlyValue(
  customer: Customer,
  defaultRotationWeeks: RotationWeeks
) {
  const amount = Number(customer.grassCutAmount ?? 0);
  return amount * Math.floor(365 / getRotationDays(
    getEffectiveRotationWeeks(customer, defaultRotationWeeks)
  ));
}

function hasCoordinates(customer: Customer) {
  return (
    typeof customer.latitude === "number" &&
    !Number.isNaN(customer.latitude) &&
    typeof customer.longitude === "number" &&
    !Number.isNaN(customer.longitude)
  );
}

function getVisitRoundKeyForCustomer(
  selectedWeek: string,
  selectedDay: string,
  customerType: Customer["customerType"],
  roundCycle: number
) {
  const baseRoundKey = `${selectedWeek}-${selectedDay}-${customerType}`;
  return roundCycle <= 1 ? baseRoundKey : `${baseRoundKey}::${roundCycle}`;
}

function getWeatherLabel(weatherCode: number | null) {
  switch (weatherCode) {
    case 0:
      return "Clear sky";
    case 1:
      return "Mainly clear";
    case 2:
      return "Partly cloudy";
    case 3:
      return "Overcast";
    case 45:
    case 48:
      return "Fog";
    case 51:
    case 53:
    case 55:
      return "Drizzle";
    case 56:
    case 57:
      return "Freezing drizzle";
    case 61:
    case 63:
    case 65:
      return "Rain";
    case 66:
    case 67:
      return "Freezing rain";
    case 71:
    case 73:
    case 75:
    case 77:
      return "Snow";
    case 80:
    case 81:
    case 82:
      return "Rain showers";
    case 85:
    case 86:
      return "Snow showers";
    case 95:
      return "Thunderstorm";
    case 96:
    case 99:
      return "Thunderstorm with hail";
    default:
      return "Live forecast";
  }
}

function isWetWeatherCode(weatherCode: number | null) {
  return (
    weatherCode !== null &&
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(
      weatherCode
    )
  );
}

function getWeatherNarrative(weather: WeatherState) {
  const rainChance = weather.rainChance ?? 0;
  const windSpeed = weather.windSpeed ?? 0;
  const wetWeather = isWetWeatherCode(weather.weatherCode);

  if (wetWeather || rainChance >= 60) {
    return {
      title: "Avoid outdoor work today",
      body: `Rain risk is ${Math.round(rainChance)}% for this area.`,
      tone: "border-red-200 bg-red-50 text-red-700",
      bodyTone: "text-red-500",
    };
  }

  if (rainChance >= 30 || windSpeed >= 28) {
    return {
      title: "Plan around the weather",
      body: `Keep an eye on showers and gusts around ${Math.round(windSpeed)} km/h.`,
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      bodyTone: "text-amber-600",
    };
  }

  return {
    title: "Good service window",
    body: "Dryer, calmer conditions look suitable for routine work.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    bodyTone: "text-emerald-600",
  };
}

export default function DashboardPage({
  visits,
  customers,
  scheduledJobs,
  monthlyPayments,
  grassCutSeasonStart,
  grassCutSeasonEnd,
  roundCycle,
  selectedWeek,
  selectedDay,
  defaultRotationWeeks = DEFAULT_ROTATION_WEEKS,
  activeRotationWeeks,
  isLocked,
  showWeatherWidget,
  showRevenueWidget,
  showJobsWidget,
  showUnpaidWidget,
  showRecentActivityWidget,
  attentionItems,
  onGoToRounds,
  onGoToActions,
  onGoToMap,
  onGoToCustomers,
  onGoToQuoteForm,
  onGoToInvoiceForm,
  onGoToSchedule,
  onGoToPayments,
  onGoToCustomerProfit,
  weekOptions,
  dayOptions,
  onWeekChange,
  onDayChange,
  onOpenCustomer,
  onOpenQuote,
  onOpenInvoice,
  onSendQuoteFollowUp,
  onSendInvoiceReminder,
}: Props) {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(showWeatherWidget);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const normalizedDefaultRotationWeeks = normalizeRotationWeeks(defaultRotationWeeks);
  const roundRotationWeeks = normalizeRotationWeeks(
    activeRotationWeeks ?? normalizedDefaultRotationWeeks
  );
  const selectedCycleLabel = getRotationCycleLabel(
    selectedWeek,
    roundRotationWeeks
  );

  const todaysCustomers = useMemo(
    () =>
      customers
        .filter(
          (customer) =>
            customer.isGrassCuttingCustomer &&
            isCustomerDueInSelectedWeek(
              customer,
              selectedWeek,
              normalizedDefaultRotationWeeks
            ) &&
            customer.day === selectedDay
        )
        .sort((left, right) => {
          const leftOrder = left.routeOrder ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = right.routeOrder ?? Number.MAX_SAFE_INTEGER;

          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }

          return left.name.localeCompare(right.name);
        }),
    [customers, normalizedDefaultRotationWeeks, selectedDay, selectedWeek]
  );

  const weatherCoordinates = useMemo(() => {
    const routeCustomers = todaysCustomers.filter(hasCoordinates);
    const fallbackCustomers = customers.filter(hasCoordinates);
    const sourceCustomers =
      routeCustomers.length > 0 ? routeCustomers : fallbackCustomers;

    if (sourceCustomers.length === 0) {
      return DEFAULT_WEATHER_COORDINATES;
    }

    const totals = sourceCustomers.reduce(
      (sum, customer) => ({
        latitude: sum.latitude + (customer.latitude ?? 0),
        longitude: sum.longitude + (customer.longitude ?? 0),
      }),
      { latitude: 0, longitude: 0 }
    );

    return {
      latitude: totals.latitude / sourceCustomers.length,
      longitude: totals.longitude / sourceCustomers.length,
    };
  }, [customers, todaysCustomers]);

  const currentVisitsByCustomer = useMemo(() => {
    const lookup = new Map<number, VisitLog>();

    todaysCustomers.forEach((customer) => {
      const expectedRoundKey = getVisitRoundKeyForCustomer(
        selectedWeek,
        selectedDay,
        customer.customerType,
        roundCycle
      );
      const latestVisit = visits
        .filter((visit) => {
          if (visit.customerId !== customer.id) return false;

          if (visit.roundKey) {
            return visit.roundKey === expectedRoundKey;
          }

          if (roundCycle > 1 && !isLocked) {
            return false;
          }

          if (visit.week && visit.day) {
            return (
              visit.week === selectedWeek &&
              visit.day === selectedDay &&
              (visit.customerType
                ? visit.customerType === customer.customerType
                : true)
            );
          }

          return false;
        })
        .sort(
          (left, right) =>
            new Date(right.visitDate).getTime() -
            new Date(left.visitDate).getTime()
        )[0];

      if (latestVisit) {
        lookup.set(customer.id, latestVisit);
      }
    });

    return lookup;
  }, [isLocked, roundCycle, selectedDay, selectedWeek, todaysCustomers, visits]);

  const todaysVisits = Array.from(currentVisitsByCustomer.values());
  const todaysCustomerMap = new Map(
    todaysCustomers.map((customer) => [customer.id, customer])
  );

  const completedVisits = todaysVisits.filter(
    (visit) => visit.status === "completed"
  );

  const notCutVisits = todaysVisits.filter((visit) => visit.status === "not_cut");

  const dayValueByPaymentMethod = todaysCustomers.reduce(
    (totals, customer) => {
      const amount = Number(customer.grassCutAmount ?? 0);
      const paymentMethod = customer.paymentMethod ?? "Monthly";

      if (paymentMethod === "Cash") {
        totals.cash += amount;
      } else if (paymentMethod === "On Day Transfer") {
        totals.onDayTransfer += amount;
      } else {
        totals.monthly += amount;
      }

      return totals;
    },
    {
      monthly: 0,
      onDayTransfer: 0,
      cash: 0,
    }
  );

  const outstandingPaymentSnapshot = useMemo<OutstandingPaymentSnapshot>(() => {
    const today = new Date();
    const todayValue = formatDateForInput(today);
    const seasonStartYear = getConfiguredSeasonStartYear(
      today,
      grassCutSeasonStart
    );
    const paymentYearMonths = buildPaymentYearMonths(
      seasonStartYear,
      grassCutSeasonStart
    );
    const monthlyPaymentLookup = new Map<string, MonthlyPayment>();

    monthlyPayments.forEach((payment) => {
      monthlyPaymentLookup.set(
        `${payment.customerId}:${getInputDateValue(payment.paymentMonth)}`,
        payment
      );
    });

    const monthly = customers
      .filter((customer) => customer.isGrassCuttingCustomer)
      .filter((customer) => (customer.paymentMethod ?? "Monthly") === "Monthly")
      .reduce((total, customer) => {
        const outstandingMonthCount = paymentYearMonths.filter((month) => {
          const outstandingStartDate = getMonthlyOutstandingStartDate(month.key);
          const payment = monthlyPaymentLookup.get(`${customer.id}:${month.key}`);

          return (
            Boolean(outstandingStartDate) &&
            outstandingStartDate <= todayValue &&
            !getInputDateValue(payment?.paymentDate)
          );
        }).length;

        return total + outstandingMonthCount * getMonthlyPlanCharge(customer);
      }, 0);

    const customersById = new Map(
      customers.map((customer) => [customer.id, customer])
    );
    let onDayTransfer = 0;
    let cash = 0;

    visits
      .filter((visit) => visit.status === "completed")
      .filter((visit) =>
        isDateInSeasonRange(
          visit.visitDate,
          seasonStartYear,
          grassCutSeasonStart,
          grassCutSeasonEnd
        )
      )
      .forEach((visit) => {
        const customer = customersById.get(visit.customerId);
        const paymentMethod = customer?.paymentMethod ?? "Monthly";

        if (
          !customer?.isGrassCuttingCustomer ||
          (paymentMethod !== "On Day Transfer" && paymentMethod !== "Cash") ||
          getInputDateValue(visit.paidAt)
        ) {
          return;
        }

        const amount = Number(visit.priceAtVisit ?? customer.grassCutAmount ?? 0);

        if (paymentMethod === "On Day Transfer") {
          onDayTransfer += amount;
        } else {
          cash += amount;
        }
      });

    return {
      total: monthly + onDayTransfer + cash,
      monthly,
      onDayTransfer,
      cash,
    };
  }, [
    customers,
    grassCutSeasonEnd,
    grassCutSeasonStart,
    monthlyPayments,
    visits,
  ]);

  const customerProfitRows = useMemo(
    () =>
      buildCustomerProfitRows({
        customers,
        visits,
        monthlyPayments,
        grassCutSeasonStart,
        grassCutSeasonEnd,
        defaultRotationWeeks: normalizedDefaultRotationWeeks,
      }),
    [
      customers,
      grassCutSeasonEnd,
      grassCutSeasonStart,
      monthlyPayments,
      normalizedDefaultRotationWeeks,
      visits,
    ]
  );

  const weekFilters = weekOptions?.length ? weekOptions : [selectedWeek];

  const monthlyBookValue = customers.reduce(
    (sum, customer) =>
      sum + getEstimatedMonthlyValue(customer, normalizedDefaultRotationWeeks),
    0
  );

  const yearlyBookValue = customers.reduce(
    (sum, customer) =>
      sum + getEstimatedYearlyValue(customer, normalizedDefaultRotationWeeks),
    0
  );

  const recentVisits = [...visits]
    .sort(
      (a, b) =>
        new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
    )
    .slice(0, 5);

  const todayStr = new Date().toISOString().split("T")[0];
  const scheduledWorkCount = scheduledJobs.filter((job) => job.date >= todayStr)
    .length;

  useEffect(() => {
    if (!showWeatherWidget) {
      setWeather(null);
      setWeatherError(null);
      setWeatherLoading(false);
      return;
    }

    const abortController = new AbortController();

    async function loadWeather() {
      setWeatherLoading(true);
      setWeatherError(null);

      try {
        const params = new URLSearchParams({
          latitude: weatherCoordinates.latitude.toFixed(4),
          longitude: weatherCoordinates.longitude.toFixed(4),
          current: "temperature_2m,weather_code,wind_speed_10m",
          daily: "precipitation_probability_max",
          forecast_days: "1",
          timezone: "auto",
        });

        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
          { signal: abortController.signal }
        );

        if (!response.ok) {
          throw new Error("Weather request failed");
        }

        const data = await response.json();
        const current = data.current ?? {};
        const daily = data.daily ?? {};
        const rainChance = Array.isArray(daily.precipitation_probability_max)
          ? daily.precipitation_probability_max[0]
          : null;

        const nextWeather: WeatherState = {
          temperature:
            typeof current.temperature_2m === "number"
              ? current.temperature_2m
              : null,
          rainChance: typeof rainChance === "number" ? rainChance : null,
          windSpeed:
            typeof current.wind_speed_10m === "number"
              ? current.wind_speed_10m
              : null,
          weatherCode:
            typeof current.weather_code === "number"
              ? current.weather_code
              : null,
          label: getWeatherLabel(
            typeof current.weather_code === "number"
              ? current.weather_code
              : null
          ),
          bestWindow: "Live route-area forecast",
          rainStartText:
            typeof rainChance === "number"
              ? `Precipitation chance is ${Math.round(rainChance)}% today.`
              : "Precipitation chance unavailable right now.",
        };

        setWeather(nextWeather);
      } catch {
        if (abortController.signal.aborted) {
          return;
        }

        setWeather(null);
        setWeatherError("Live weather is unavailable right now.");
      } finally {
        if (!abortController.signal.aborted) {
          setWeatherLoading(false);
        }
      }
    }

    loadWeather();

    return () => {
      abortController.abort();
    };
  }, [showWeatherWidget, weatherCoordinates.latitude, weatherCoordinates.longitude]);

  const weatherNarrative = weather ? getWeatherNarrative(weather) : null;
  const showInsightsSection =
    showRecentActivityWidget || showWeatherWidget;
  const quoteAttentionCount = attentionItems.filter(
    (item) => item.kind === "quote_follow_up"
  ).length;
  const invoiceAttentionCount = attentionItems.filter(
    (item) => item.kind === "invoice_overdue"
  ).length;
  const visibleAttentionItems = attentionItems.slice(0, 4);
  const dayValueTotal =
    dayValueByPaymentMethod.monthly +
    dayValueByPaymentMethod.onDayTransfer +
    dayValueByPaymentMethod.cash;
  const routeRemainingCount = Math.max(
    todaysCustomers.length - completedVisits.length - notCutVisits.length,
    0
  );
  const todayDateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  const visibleRoundCustomers = todaysCustomers.slice(0, 8);
  const hiddenRoundCustomerCount =
    todaysCustomers.length - visibleRoundCustomers.length;
  const outstandingBreakdownRows = [
    {
      label: "Monthly",
      amount: outstandingPaymentSnapshot.monthly,
      barClassName: "bg-amber-500",
      textClassName: "text-amber-700",
    },
    {
      label: "On Day Transfer",
      amount: outstandingPaymentSnapshot.onDayTransfer,
      barClassName: "bg-sky-500",
      textClassName: "text-sky-700",
    },
    {
      label: "Cash",
      amount: outstandingPaymentSnapshot.cash,
      barClassName: "bg-emerald-500",
      textClassName: "text-emerald-700",
    },
  ];
  const visibleCustomerProfitRows = customerProfitRows.slice(0, 8);
  const customerProfitReviewRows = customerProfitRows
    .filter(
      (row) =>
        row.outstanding > 0 ||
        row.notCutCount > 0 ||
        row.completedVisitCount === 0
    )
    .sort((left, right) => {
      if (right.outstanding !== left.outstanding) {
        return right.outstanding - left.outstanding;
      }

      if (right.notCutCount !== left.notCutCount) {
        return right.notCutCount - left.notCutCount;
      }

      return left.customerName.localeCompare(right.customerName);
    })
    .slice(0, 5);
  const totalCustomerProfitBeforeExpenses = customerProfitRows.reduce(
    (total, row) => total + row.paidRevenue,
    0
  );
  const totalCustomerProfitOutstanding = customerProfitRows.reduce(
    (total, row) => total + row.outstanding,
    0
  );
  const bestCustomerProfitRow = customerProfitRows[0] ?? null;
  const insightsGridClassName =
    showRecentActivityWidget && showWeatherWidget
      ? "grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]"
      : "grid gap-4";
  const panelClassName =
    "rounded-[20px] border border-[#e5e7eb] bg-white shadow-[0_18px_45px_rgba(7,20,38,0.06)]";
  const subtleButtonClassName =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-semibold text-[#071426] shadow-[0_10px_24px_rgba(7,20,38,0.05)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700";
  const routeMapCustomers =
    todaysCustomers.length > 0 ? todaysCustomers.slice(0, 5) : customers.slice(0, 5);
  const routeMapPoints = [
    { left: "30%", top: "24%" },
    { left: "50%", top: "42%" },
    { left: "62%", top: "64%" },
    { left: "78%", top: "38%" },
    { left: "48%", top: "72%" },
  ];
  const paidTodayVisits = todaysVisits.filter((visit) => {
    const paid = visit.paid === true || visit.paymentStatus === "Paid";
    return paid;
  });
  const paidTodayTotal = paidTodayVisits.reduce((total, visit) => {
    const customer = todaysCustomerMap.get(visit.customerId);
    return total + Number(visit.priceAtVisit ?? customer?.grassCutAmount ?? 0);
  }, 0);
  const workloadBars = [
    ...weekFilters.map((week, index) => ({
      label: getRotationCycleLabel(week, roundRotationWeeks),
      value: customers.filter(
        (customer) =>
          customer.isGrassCuttingCustomer &&
          isCustomerDueInSelectedWeek(
            customer,
            week,
            normalizedDefaultRotationWeeks
          )
      ).length,
      tone: index === 0 ? "bg-[#20c766]" : "bg-[#dfe7e4]",
      kind: "round" as const,
    })),
    {
      label: "Scheduled",
      value: scheduledWorkCount,
      tone: "bg-[#dfe7e4]",
      kind: "scheduled" as const,
    },
  ];
  const workloadMax = Math.max(...workloadBars.map((bar) => bar.value), 1);
  const dayFilters = dayOptions?.length ? dayOptions : [selectedDay];

  return (
    <div className="space-y-5 text-[#071426]">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={onGoToRounds}
            className={`${panelClassName} p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(7,20,38,0.09)]`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
              Today&apos;s Jobs
            </p>
            <p className="mt-4 text-3xl font-black tracking-tight text-[#071426]">
              {todaysCustomers.length}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <CheckCircle2 size={15} />
              {routeRemainingCount === 0 ? "On track" : `${routeRemainingCount} remaining`}
            </p>
          </button>

          <button
            type="button"
            onClick={onGoToActions}
            className={`${panelClassName} p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(7,20,38,0.09)]`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
              Visit Status
            </p>
            <p className="mt-4 text-3xl font-black tracking-tight text-[#071426]">
              {completedVisits.length} / {todaysCustomers.length}
            </p>
            <p
              className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold ${
                notCutVisits.length > 0 ? "text-orange-600" : "text-emerald-600"
              }`}
            >
              <CircleAlert size={15} />
              {notCutVisits.length > 0 ? `${notCutVisits.length} not completed` : "On track"}
            </p>
          </button>

          <button
            type="button"
            onClick={onGoToPayments}
            className={`${panelClassName} p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(7,20,38,0.09)]`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
              Total Owed
            </p>
            <p className="mt-4 text-3xl font-black tracking-tight text-[#071426]">
              {formatMoney(outstandingPaymentSnapshot.total)}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <CheckCircle2 size={15} />
              View arrears
            </p>
          </button>

          <button
            type="button"
            onClick={onGoToActions}
            className={`${panelClassName} p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(7,20,38,0.09)]`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
              Day Value
            </p>
            <p className="mt-4 text-3xl font-black tracking-tight text-[#071426]">
              {formatMoney(dayValueTotal)}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <CheckCircle2 size={15} />
              On track
            </p>
          </button>
        </div>

        <div className={`${panelClassName} flex flex-col gap-3 p-4 xl:min-w-[410px]`}>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={selectedWeek}
              onChange={(event) => onWeekChange?.(event.target.value)}
              className="rounded-xl border border-[#e5e7eb] bg-[#f7faf9] px-3 py-2.5 text-sm font-semibold text-[#071426] outline-none transition focus:border-emerald-400"
            >
              {weekFilters.map((week) => (
                <option key={week} value={week}>
                  {getRotationCycleLabel(week, roundRotationWeeks)}
                </option>
              ))}
            </select>
            <select
              value={selectedDay}
              onChange={(event) => onDayChange?.(event.target.value)}
              className="rounded-xl border border-[#e5e7eb] bg-[#f7faf9] px-3 py-2.5 text-sm font-semibold text-[#071426] outline-none transition focus:border-emerald-400"
            >
              {dayFilters.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGoToCustomers}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#20c766] px-4 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(32,199,102,0.28)] transition hover:-translate-y-0.5 hover:bg-[#16ad55]"
            >
              <UserPlus size={17} />
              New Customer
            </button>
            <button type="button" onClick={onGoToQuoteForm} className={subtleButtonClassName}>
              <FilePlus2 size={16} />
              Quote
            </button>
            <button type="button" onClick={onGoToInvoiceForm} className={subtleButtonClassName}>
              <ReceiptText size={16} />
              Invoice
            </button>
            <button
              type="button"
              onClick={onGoToPayments}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#003c35] px-4 py-3 text-sm font-bold text-white shadow-[0_16px_32px_rgba(0,60,53,0.2)] transition hover:-translate-y-0.5 hover:bg-[#022f2a]"
            >
              <CreditCard size={16} />
              Payments
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-12">
        <section className={`${panelClassName} p-5 xl:col-span-5`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-black tracking-tight text-[#071426]">
                Today&apos;s Round
              </h3>
              <p className="mt-1 text-sm text-[#667085]">
                {todayDateLabel} - {selectedCycleLabel} {selectedDay}
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToSchedule}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              View schedule
            </button>
          </div>

          <div className="mt-5 overflow-hidden">
            {visibleRoundCustomers.length === 0 ? (
              <div className="rounded-2xl bg-[#f7faf9] px-4 py-8 text-center">
                <ClipboardList className="mx-auto text-emerald-500" size={24} />
                <p className="mt-3 text-sm font-semibold text-[#667085]">
                  No customers on this round.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleRoundCustomers.slice(0, 6).map((customer) => {
                  const visit = currentVisitsByCustomer.get(customer.id);
                  const statusLabel =
                    visit?.status === "completed"
                      ? "Completed"
                      : visit?.status === "not_cut"
                      ? "Not completed"
                      : "Due";
                  const statusClassName =
                    visit?.status === "completed"
                      ? "bg-emerald-50 text-emerald-700"
                      : visit?.status === "not_cut"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-blue-50 text-blue-700";

                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => onOpenCustomer?.(customer.id)}
                      className="grid w-full gap-3 py-3 text-left transition hover:bg-[#f7faf9] sm:grid-cols-[minmax(0,1.25fr)_auto_auto_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#071426]">
                          {customer.name}
                        </p>
                        <p className="truncate text-sm text-[#667085]">
                          {getCustomerDisplayAddress(customer) || "-"}
                        </p>
                      </div>
                      <span className="w-fit rounded-md bg-[#f2f5f4] px-2.5 py-1 text-xs font-semibold text-[#475467]">
                        {customer.customerType}
                      </span>
                      <span className="w-fit rounded-md bg-[#f2f5f4] px-2.5 py-1 text-xs font-semibold text-[#475467]">
                        {customer.paymentMethod ?? "Monthly"}
                      </span>
                      <span
                        className={`inline-flex w-fit items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold ${statusClassName}`}
                      >
                        {statusLabel}
                        <ArrowRight size={13} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {hiddenRoundCustomerCount > 0 && (
            <p className="mt-3 text-sm font-semibold text-slate-500">
              {hiddenRoundCustomerCount} more customer
              {hiddenRoundCustomerCount === 1 ? "" : "s"} on this round.
            </p>
          )}
        </section>

        <section className={`${panelClassName} p-5 xl:col-span-3`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black tracking-tight text-[#071426]">
                Live Map
              </h3>
              <p className="mt-1 text-sm text-[#667085]">Route preview</p>
            </div>
            <Route className="text-emerald-500" size={22} />
          </div>

          <div className="relative mt-5 min-h-[250px] overflow-hidden rounded-2xl bg-[#f4f7f6]">
            <div className="absolute inset-0 opacity-70">
              <div className="absolute left-[-12%] top-[22%] h-[2px] w-[130%] rotate-[-21deg] bg-white" />
              <div className="absolute left-[-8%] top-[58%] h-[2px] w-[120%] rotate-[17deg] bg-white" />
              <div className="absolute left-[26%] top-[-10%] h-[120%] w-[2px] rotate-[28deg] bg-white" />
              <div className="absolute left-[70%] top-[-10%] h-[120%] w-[2px] rotate-[-18deg] bg-white" />
            </div>
            {routeMapCustomers.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm font-semibold text-[#667085]">
                Add customers with route details to preview the day.
              </div>
            ) : (
              routeMapCustomers.map((customer, index) => {
                const point = routeMapPoints[index % routeMapPoints.length];
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => onOpenCustomer?.(customer.id)}
                    title={customer.name}
                    className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#20c766] to-[#087f48] text-sm font-black text-white shadow-[0_12px_25px_rgba(0,80,55,0.25)] ring-4 ring-white/80"
                    style={{ left: point.left, top: point.top }}
                  >
                    {index + 1}
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={onGoToMap}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-semibold text-[#071426] transition hover:bg-[#f7faf9]"
          >
            <Route size={16} />
            Open full map
          </button>
        </section>

        <section className={`${panelClassName} p-5 xl:col-span-4`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black tracking-tight text-[#071426]">
                  Payments Snapshot
                </h3>
                <p className="mt-5 text-3xl font-black tracking-tight text-[#071426]">
                  {formatMoney(outstandingPaymentSnapshot.total)}
                </p>
                <p className="mt-1 text-sm text-[#667085]">Total unpaid</p>
              </div>
              <button
                type="button"
                onClick={onGoToPayments}
                className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
              >
                View all
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {outstandingBreakdownRows.map((row) => (
                <div key={row.label} className="border-b border-slate-100 pb-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-4">
                    <p className={`text-sm font-semibold ${row.textClassName}`}>
                      {row.label}
                    </p>
                    <p className="text-sm font-bold text-[#071426]">
                      {formatMoney(row.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {showUnpaidWidget && (
              <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600">
                    <CalendarDays size={18} />
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">
                    {paidTodayVisits.length} payments received today
                  </p>
                </div>
                <p className="text-xl font-black text-[#003c35]">
                  {formatMoney(paidTodayTotal)}
                </p>
              </div>
            )}
          </section>
      </div>

      {(showJobsWidget || showRevenueWidget) && (
        <div className="grid gap-5 xl:grid-cols-12">
          {showJobsWidget && (
            <section className={`${panelClassName} p-5 xl:col-span-4`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-[#071426]">
                    Workload
                  </h3>
                  <p className="mt-1 text-sm text-[#667085]">Season rhythm</p>
                </div>
                <button
                  type="button"
                  onClick={onGoToRounds}
                  className="rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  This week
                </button>
              </div>

              <div className="mt-6 flex h-40 items-end gap-8 border-b border-slate-200 px-4">
                {workloadBars.map((bar) => (
                  <button
                    key={bar.label}
                    type="button"
                    onClick={bar.kind === "scheduled" ? onGoToSchedule : onGoToRounds}
                    className="flex flex-1 flex-col items-center gap-3"
                  >
                    <div
                      className={`flex w-full max-w-[70px] items-end justify-center rounded-t-xl ${bar.tone} text-sm font-black text-white`}
                      style={{
                        height: `${Math.max((bar.value / workloadMax) * 110, 26)}px`,
                      }}
                    >
                      <span className="pb-2">{bar.value}</span>
                    </div>
                    <span className="whitespace-nowrap text-xs font-semibold text-[#475467]">
                      {bar.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {showRevenueWidget && (
            <section className={`${panelClassName} p-5 xl:col-span-3`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-[#071426]">
                    Revenue View
                  </h3>
                  <p className="mt-1 text-sm text-[#667085]">Book value</p>
                </div>
                <button
                  type="button"
                  onClick={onGoToCustomerProfit}
                  className="rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  This month
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-5">
                  <p className="text-sm font-semibold text-emerald-700">
                    Monthly book
                  </p>
                  <p className="mt-4 text-3xl font-black text-[#071426]">
                    {formatMoney(monthlyBookValue)}
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-5">
                  <p className="text-sm font-semibold text-blue-700">
                    Yearly book
                  </p>
                  <p className="mt-4 text-3xl font-black text-[#071426]">
                    {formatMoney(yearlyBookValue)}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className={`${panelClassName} p-5 xl:col-span-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black tracking-tight text-[#071426]">
                  Workflow Automation
                </h3>
                <p className="mt-1 text-sm text-[#667085]">Follow-ups and reminders</p>
              </div>
              <button
                type="button"
                onClick={onGoToActions}
                className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
              >
                View all
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={onGoToActions}
                className="flex items-center justify-between rounded-2xl border border-[#e5e7eb] px-4 py-4 text-left transition hover:bg-[#f7faf9]"
              >
                <span className="inline-flex items-center gap-3 text-sm font-semibold text-emerald-700">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle2 size={17} />
                  </span>
                  {quoteAttentionCount} quotes
                </span>
              </button>
              <button
                type="button"
                onClick={onGoToActions}
                className="flex items-center justify-between rounded-2xl border border-[#e5e7eb] px-4 py-4 text-left transition hover:bg-[#f7faf9]"
              >
                <span className="inline-flex items-center gap-3 text-sm font-semibold text-rose-600">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50">
                    <CircleAlert size={17} />
                  </span>
                  {invoiceAttentionCount} invoices
                </span>
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-[#e5e7eb]">
              {visibleAttentionItems.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-4 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 size={18} />
                  No workflow items need attention.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {visibleAttentionItems.map((item) => {
                    const isQuoteItem = item.kind === "quote_follow_up";
                    const badgeClassName =
                      item.badgeTone === "rose"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700";

                    return (
                      <div key={item.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {isQuoteItem ? (
                                <FileText className="text-amber-600" size={16} />
                              ) : (
                                <Receipt className="text-rose-600" size={16} />
                              )}
                              <p className="truncate font-semibold text-slate-900">
                                {item.customerName}
                              </p>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              {item.title}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassName}`}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                isQuoteItem
                                ? onOpenQuote?.(item.documentId)
                                : onOpenInvoice?.(item.documentId)
                              }
                            className="inline-flex items-center gap-2 rounded-xl bg-[#003c35] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#022f2a]"
                            >
                              {item.primaryActionLabel}
                              <ArrowRight size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              isQuoteItem
                                ? onSendQuoteFollowUp?.(item.documentId)
                                : onSendInvoiceReminder?.(item.documentId)
                            }
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            {item.secondaryActionLabel}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {showRevenueWidget && (
        <section className={`${panelClassName} p-5`}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
                Profit Per Customer
              </p>
              <h3 className="mt-1 text-2xl font-black text-[#071426]">
                Customer Profitability
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-[#667085]">
                Current season figures before expenses. Paid monthly plans and
                paid completed visits count as profit, with unpaid work shown
                separately.
              </p>
              {onGoToCustomerProfit ? (
                <button
                  type="button"
                  onClick={onGoToCustomerProfit}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#003c35] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#022f2a]"
                >
                  View full report
                  <ArrowRight size={14} />
                </button>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[520px]">
              <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-emerald-700">
                  Paid in
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {formatMoney(totalCustomerProfitBeforeExpenses)}
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-amber-700">
                  Still owed
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {formatMoney(totalCustomerProfitOutstanding)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Best customer
                </p>
                <p className="mt-1 truncate text-base font-black text-slate-900">
                  {bestCustomerProfitRow?.customerName ?? "No data"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              {visibleCustomerProfitRows.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                  No service customers to analyse yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  <div className="hidden grid-cols-[minmax(0,1.4fr)_0.75fr_0.75fr_0.8fr_0.9fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 md:grid">
                    <span>Customer</span>
                    <span>Paid in</span>
                    <span>Owed</span>
                    <span>Visits</span>
                    <span>Status</span>
                  </div>

                  {visibleCustomerProfitRows.map((row) => (
                    <button
                      key={row.customerId}
                      type="button"
                      onClick={() => onOpenCustomer?.(row.customerId)}
                      className="grid w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 md:grid-cols-[minmax(0,1.4fr)_0.75fr_0.75fr_0.8fr_0.9fr] md:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {row.customerName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {row.routeLabel} {"\u00b7"} {row.paymentMethod}{" "}
                          {"\u00b7"} Last{" "}
                          {formatCustomerProfitDate(row.lastVisitDate)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400 md:hidden">
                          Paid in
                        </p>
                        <p className="font-black text-emerald-700">
                          {formatMoney(row.paidRevenue)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400 md:hidden">
                          Owed
                        </p>
                        <p
                          className={
                            row.outstanding > 0
                              ? "font-black text-amber-700"
                              : "font-black text-slate-400"
                          }
                        >
                          {formatMoney(row.outstanding)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400 md:hidden">
                          Visits
                        </p>
                        <p className="font-semibold text-slate-700">
                          {row.completedVisitCount} completed
                          {row.notCutCount > 0 ? `, ${row.notCutCount} missed` : ""}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${row.statusClassName}`}
                      >
                        {row.statusLabel}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Needs Review
                  </p>
                  <h4 className="mt-1 text-lg font-black text-slate-900">
                    Profit leaks
                  </h4>
                </div>
                <CircleAlert className="text-amber-500" size={20} />
              </div>

              <div className="mt-4 space-y-3">
                {customerProfitReviewRows.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                    No payment or missed-visit issues showing in this season.
                  </div>
                ) : (
                  customerProfitReviewRows.map((row) => (
                    <button
                      key={row.customerId}
                      type="button"
                      onClick={() => onOpenCustomer?.(row.customerId)}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-amber-200 hover:bg-amber-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {row.customerName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {row.routeLabel} {"\u00b7"} {row.paymentMethod}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${row.statusClassName}`}
                        >
                          {row.statusLabel}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-xs font-semibold text-slate-400">
                            Owed
                          </p>
                          <p className="font-black text-amber-700">
                            {formatMoney(row.outstanding)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-xs font-semibold text-slate-400">
                            Missed
                          </p>
                          <p className="font-black text-slate-900">
                            {row.notCutCount}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {showInsightsSection && (
        <div className={insightsGridClassName}>
          {showRecentActivityWidget && (
            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Recent Activity
                  </p>
                  <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                    Visit Log
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onGoToRounds}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isLocked
                      ? "bg-rose-100 text-rose-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {isLocked ? "Round locked" : "Round active"}
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                {recentVisits.length === 0 ? (
                  <div className="px-4 py-6 text-sm font-semibold text-slate-500">
                    No recent visit activity yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentVisits.map((visit) => {
                      const customer = customers.find(
                        (entry) => entry.id === visit.customerId
                      );
                      const badgeClass =
                        visit.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700";

                      return (
                        <div
                          key={visit.id}
                          className="flex items-center justify-between gap-4 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {customer?.name ?? "Unknown Customer"}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {new Date(visit.visitDate).toLocaleDateString()}{" "}
                              {"\u00b7"}{" "}
                              {getRotationCycleLabel(
                                visit.week ?? selectedWeek,
                                roundRotationWeeks
                              )}{" "}
                              {"\u00b7"}{" "}
                              {visit.day ?? selectedDay}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                          >
                            {visit.status === "completed" ? "Completed" : "Not Completed"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {showWeatherWidget && (
            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Weather
                  </p>
                  <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                    Route Conditions
                  </h3>
                </div>
                <CloudSun className="text-sky-500" size={22} />
              </div>

              <div
                className={`mt-4 rounded-2xl border p-4 ${
                  weatherLoading
                    ? "border-slate-200 bg-slate-50"
                    : weatherError || !weatherNarrative
                    ? "border-amber-200 bg-amber-50"
                    : weatherNarrative.tone
                }`}
              >
                <p
                  className={`font-semibold ${
                    weatherLoading
                      ? "text-slate-700"
                      : weatherError || !weatherNarrative
                      ? "text-amber-700"
                      : ""
                  }`}
                >
                  {weatherLoading
                    ? "Loading live weather"
                    : weatherError || !weatherNarrative
                    ? "Weather unavailable"
                    : weatherNarrative.title}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    weatherLoading
                      ? "text-slate-500"
                      : weatherError || !weatherNarrative
                      ? "text-amber-600"
                      : weatherNarrative.bodyTone
                  }`}
                >
                  {weatherLoading
                    ? "Fetching the latest forecast for this route area."
                    : weatherError
                    ? weatherError
                    : weatherNarrative?.body}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Conditions
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {weather?.label ?? "Loading..."}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Temp
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {weather?.temperature != null
                      ? `${Math.round(weather.temperature)}C`
                      : "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Rain
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {weather?.rainChance != null
                      ? `${Math.round(weather.rainChance)}%`
                      : "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Wind
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {weather?.windSpeed != null
                      ? `${Math.round(weather.windSpeed)} km/h`
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onGoToMap}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Route size={16} />
                  Route Map
                </button>
                <button
                  type="button"
                  onClick={onGoToActions}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ClipboardList size={16} />
                  Actions
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
