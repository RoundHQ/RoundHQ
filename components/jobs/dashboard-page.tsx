"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Banknote,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock,
  CloudSun,
  CreditCard,
  Droplets,
  FilePlus2,
  FileText,
  Gauge,
  Leaf,
  MapPin,
  Megaphone,
  MessageSquare,
  Navigation,
  PoundSterling,
  Receipt,
  ReceiptText,
  Route,
  Thermometer,
  TimerReset,
  UserPlus,
  Wind,
} from "lucide-react";
import {
  buildPaymentYearMonths,
  getConfiguredSeasonStartYear,
  getCustomerDisplayAddress,
  getInputDateValue,
  getMonthlyPlanCharge,
  getWorkdayFromDate,
  isDateInSeasonRange,
} from "./helpers";
import {
  DEFAULT_ROTATION_WEEKS,
  getCycleWeek,
  getSelectedCycleDate,
  getRotationCycleLabel,
  isCustomerDueOnDate,
  normalizeRotationWeeks,
} from "./rotation";
import {
  DEFAULT_CURRENCY_CODE,
  formatCurrencyAmount,
  normalizeCurrencyCode,
  type CurrencyCode,
} from "./currency";
import type {
  Customer,
  DashboardAttentionItem,
  MonthlyPayment,
  RotationWeeks,
  VisitLog,
  WeatherState,
} from "./types";
import type { PlatformAnnouncement } from "@/lib/platform-announcements";
import type { AiReceptionistDashboardStats } from "@/lib/ai-receptionist/call-logs";

type ScheduledJob = {
  id: string;
  title: string;
  date: string;
  notes?: string;
  startTime?: string;
  finishTime?: string;
  customerName?: string;
  customerId?: number | null;
  type: "One Off" | "Quote Accepted" | "Grass Cut" | "Commercial";
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
  quoteIds?: string[];
  invoiceIds?: string[];
  createdAt: string;
};

type FinancialDocument = {
  id: string;
  total?: number | null;
};

type Props = {
  visits: VisitLog[];
  customers: Customer[];
  scheduledJobs: ScheduledJob[];
  quotes?: FinancialDocument[];
  invoices?: FinancialDocument[];
  monthlyPayments: MonthlyPayment[];
  grassCutSeasonStart: string;
  grassCutSeasonEnd: string;
  roundCycle: number;
  selectedWeek: string;
  selectedDay: string;
  defaultRotationWeeks?: RotationWeeks;
  activeRotationWeeks?: RotationWeeks;
  currencyCode?: CurrencyCode | string;
  isLocked: boolean;
  showWeatherWidget: boolean;
  showRevenueWidget: boolean;
  showJobsWidget: boolean;
  showUnpaidWidget: boolean;
  showRecentActivityWidget: boolean;
  aiReceptionistStats?: AiReceptionistDashboardStats | null;
  showAdvancedInsights?: boolean;
  announcement?: PlatformAnnouncement | null;
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

function formatDashboardMoney(
  value: number,
  currencyCode: CurrencyCode | string = DEFAULT_CURRENCY_CODE,
  options: Pick<
    Intl.NumberFormatOptions,
    "minimumFractionDigits" | "maximumFractionDigits"
  > = {}
) {
  return formatCurrencyAmount(value, currencyCode, options);
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

function hasCoordinates(customer: Customer) {
  return (
    typeof customer.latitude === "number" &&
    !Number.isNaN(customer.latitude) &&
    typeof customer.longitude === "number" &&
    !Number.isNaN(customer.longitude)
  );
}

function getSelectedWorkDate(
  selectedWeek: string,
  selectedDay: string,
  rotationWeeks: RotationWeeks
) {
  return getSelectedCycleDate(selectedWeek, selectedDay, rotationWeeks);
}

function getScheduledJobValue(
  job: ScheduledJob,
  invoiceValueById: Map<string, number>,
  quoteValueById: Map<string, number>,
  customerValueById: Map<number, number>
) {
  const invoiceTotal = (job.invoiceIds ?? []).reduce(
    (sum, invoiceId) => sum + Number(invoiceValueById.get(invoiceId) ?? 0),
    0
  );

  if (invoiceTotal > 0) {
    return invoiceTotal;
  }

  const quoteTotal = (job.quoteIds ?? []).reduce(
    (sum, quoteId) => sum + Number(quoteValueById.get(quoteId) ?? 0),
    0
  );

  if (quoteTotal > 0) {
    return quoteTotal;
  }

  return Number(customerValueById.get(job.customerId ?? -1) ?? 0);
}

declare global {
  interface Window {
    // Matches the existing RoundHQ Google Maps global declaration.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
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

type DashboardStatCardProps = {
  icon: ReactNode;
  value: string;
  label: string;
  detail: string;
  detailClassName?: string;
  iconClassName?: string;
  onClick?: () => void;
};

function DashboardStatCard({
  icon,
  value,
  label,
  detail,
  detailClassName = "text-slate-500",
  iconClassName = "bg-emerald-50 text-emerald-600",
  onClick,
}: DashboardStatCardProps) {
  const body = (
    <>
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-black leading-none text-slate-950">
          {value}
        </span>
        <span className="mt-2 block text-sm font-semibold text-slate-800">
          {label}
        </span>
        <span className={`mt-3 block text-xs font-bold ${detailClassName}`}>
          {detail}
        </span>
      </span>
    </>
  );

  const className =
    "flex min-h-[112px] w-full items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 text-left shadow-[0_16px_38px_rgba(15,23,42,0.06)]";

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${className} transition hover:-translate-y-0.5 hover:shadow-[0_22px_45px_rgba(15,23,42,0.09)]`}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}

function MiniSparkline({
  tone = "emerald",
}: {
  tone?: "emerald" | "amber" | "blue";
}) {
  const stroke =
    tone === "amber" ? "#f59e0b" : tone === "blue" ? "#1d7fe8" : "#16a34a";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 96 32"
      className="h-8 w-24 shrink-0"
      fill="none"
    >
      <path
        d="M2 22 L14 12 L26 17 L38 8 L50 14 L62 9 L74 12 L94 5"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MiniBarChart({ values }: { values: number[] }) {
  const maxValue = Math.max(...values, 1);

  return (
    <div className="flex h-28 items-end gap-2 border-b border-slate-200 px-2">
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className="flex flex-1 flex-col items-center justify-end"
        >
          <div
            className="w-full max-w-7 rounded-t-md bg-[#22a953]"
            style={{ height: `${Math.max((value / maxValue) * 90, 18)}px` }}
          />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage({
  visits,
  customers,
  scheduledJobs,
  quotes = [],
  invoices = [],
  monthlyPayments,
  grassCutSeasonStart,
  grassCutSeasonEnd,
  roundCycle,
  selectedWeek,
  selectedDay,
  defaultRotationWeeks = DEFAULT_ROTATION_WEEKS,
  activeRotationWeeks,
  currencyCode = DEFAULT_CURRENCY_CODE,
  isLocked,
  showWeatherWidget,
  aiReceptionistStats,
  announcement = null,
  attentionItems,
  onGoToRounds,
  onGoToActions,
  onGoToMap,
  onGoToCustomers,
  onGoToQuoteForm,
  onGoToInvoiceForm,
  onGoToSchedule,
  onGoToPayments,
  weekOptions,
  dayOptions,
  onWeekChange,
  onDayChange,
  onOpenCustomer,
}: Props) {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(showWeatherWidget);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [googleMapReady, setGoogleMapReady] = useState(false);
  const [googleMapUnavailable, setGoogleMapUnavailable] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const mapMarkersRef = useRef<google.maps.Marker[]>([]);
  const mapPolylineRef = useRef<google.maps.Polyline | null>(null);
  const selectedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const formatWholeMoney = useCallback(
    (value: number) =>
      formatDashboardMoney(value, selectedCurrencyCode, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    [selectedCurrencyCode]
  );
  const normalizedDefaultRotationWeeks = normalizeRotationWeeks(defaultRotationWeeks);
  const roundRotationWeeks = normalizeRotationWeeks(
    activeRotationWeeks ?? normalizedDefaultRotationWeeks
  );
  const todayDate = new Date();
  const todayWeek = getCycleWeek(todayDate, roundRotationWeeks);
  const todayDayLabel = getWorkdayFromDate(todayDate).dayLabel;
  const selectedWorkDate = useMemo(
    () => getSelectedWorkDate(selectedWeek, selectedDay, roundRotationWeeks),
    [roundRotationWeeks, selectedDay, selectedWeek]
  );
  const selectedWorkDateValue = formatDateForInput(selectedWorkDate);

  const todaysCustomers = useMemo(
    () =>
      customers
        .filter(
          (customer) =>
            customer.isGrassCuttingCustomer &&
            isCustomerDueOnDate(
              customer,
              selectedWorkDate,
              selectedDay,
              normalizedDefaultRotationWeeks
            )
        )
        .sort((left, right) => {
          const leftOrder = left.routeOrder ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = right.routeOrder ?? Number.MAX_SAFE_INTEGER;

          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }

          return left.name.localeCompare(right.name);
        }),
    [customers, normalizedDefaultRotationWeeks, selectedDay, selectedWorkDate]
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

  const weekFilters = weekOptions?.length ? weekOptions : [selectedWeek];

  const recentVisits = [...visits]
    .sort(
      (a, b) =>
        new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
    )
    .slice(0, 5);

  const todaysScheduledJobs = useMemo(
    () =>
      scheduledJobs.filter(
        (job) =>
          getInputDateValue(job.date) === selectedWorkDateValue &&
          job.status !== "Cancelled"
      ),
    [scheduledJobs, selectedWorkDateValue]
  );
  const scheduledWorkCount = todaysScheduledJobs.length;
  const completedScheduledWorkCount = todaysScheduledJobs.filter(
    (job) => job.status === "Completed"
  ).length;
  const openScheduledWorkCount = Math.max(
    scheduledWorkCount - completedScheduledWorkCount,
    0
  );
  const quoteValueById = useMemo(
    () =>
      new Map(
        quotes.map((quote) => [quote.id, Number(quote.total ?? 0)] as const)
      ),
    [quotes]
  );
  const invoiceValueById = useMemo(
    () =>
      new Map(
        invoices.map((invoice) => [
          invoice.id,
          Number(invoice.total ?? 0),
        ] as const)
      ),
    [invoices]
  );
  const customerValueById = useMemo(
    () =>
      new Map(
        customers.map((customer) => [
          customer.id,
          Number(customer.grassCutAmount ?? 0),
        ] as const)
      ),
    [customers]
  );
  const scheduledDayValueTotal = todaysScheduledJobs.reduce((total, job) => {
    return (
      total +
      getScheduledJobValue(job, invoiceValueById, quoteValueById, customerValueById)
    );
  }, 0);

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
  const quoteAttentionCount = attentionItems.filter(
    (item) => item.kind === "quote_follow_up"
  ).length;
  const invoiceAttentionCount = attentionItems.filter(
    (item) => item.kind === "invoice_overdue"
  ).length;
  const visibleAttentionItems = attentionItems.slice(0, 4);
  const roundDayValueTotal =
    dayValueByPaymentMethod.monthly +
    dayValueByPaymentMethod.onDayTransfer +
    dayValueByPaymentMethod.cash;
  const dayValueTotal = roundDayValueTotal + scheduledDayValueTotal;
  const routeRemainingCount = Math.max(
    todaysCustomers.length - completedVisits.length - notCutVisits.length,
    0
  );
  const hasRoundWork = todaysCustomers.length > 0;
  const workCompletedCount = hasRoundWork
    ? completedVisits.length
    : completedScheduledWorkCount;
  const workTotalCount = hasRoundWork ? todaysCustomers.length : scheduledWorkCount;
  const workIssueCount = hasRoundWork ? notCutVisits.length : 0;
  const visibleRoundCustomers = todaysCustomers.slice(0, 8);
  const announcementClassName =
    announcement?.tone === "success"
      ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50"
      : announcement?.tone === "warning"
        ? "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-slate-50"
        : "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-slate-50";
  const announcementIconClassName =
    announcement?.tone === "warning"
      ? "text-amber-600"
      : announcement?.tone === "success"
        ? "text-emerald-600"
        : "text-sky-600";
  const panelClassName =
    "rounded-[20px] border border-[#e5e7eb] bg-white shadow-[0_18px_45px_rgba(7,20,38,0.06)]";
  const subtleButtonClassName =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-semibold text-[#071426] shadow-[0_10px_24px_rgba(7,20,38,0.05)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700";
  const topSectionClassName = "space-y-3";
  const showAiReceptionistStats = Boolean(aiReceptionistStats);
  const dashboardStatsGridClassName = showAiReceptionistStats
    ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-6"
    : "grid gap-4 sm:grid-cols-2 xl:grid-cols-5";
  const scheduledWorkCustomers = useMemo(() => {
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
    const uniqueCustomers = new Map<number, Customer>();

    todaysScheduledJobs.forEach((job) => {
      if (job.customerId == null) {
        return;
      }

      const customer = customerMap.get(job.customerId);

      if (customer) {
        uniqueCustomers.set(customer.id, customer);
      }
    });

    return Array.from(uniqueCustomers.values());
  }, [customers, todaysScheduledJobs]);
  const workMapCustomers = hasRoundWork ? todaysCustomers : scheduledWorkCustomers;
  const routeMapCustomers = workMapCustomers.filter(hasCoordinates).slice(0, 8);
  const routeMapPoints = routeMapCustomers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    latitude: customer.latitude ?? DEFAULT_WEATHER_COORDINATES.latitude,
    longitude: customer.longitude ?? DEFAULT_WEATHER_COORDINATES.longitude,
  }));
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
          isCustomerDueOnDate(
            customer,
            getSelectedCycleDate(week, customer.day, roundRotationWeeks),
            customer.day,
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
  const dayFilters = dayOptions?.length ? dayOptions : [selectedDay];
  const dashboardUpdatedAt = todayDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dashboardJobsToday = workTotalCount;
  const dashboardRemainingCount = hasRoundWork
    ? routeRemainingCount
    : openScheduledWorkCount;
  const completionPercent =
    workTotalCount > 0 ? Math.round((workCompletedCount / workTotalCount) * 100) : 0;
  const nextScheduledJob = [...todaysScheduledJobs]
    .filter((job) => job.status !== "Completed" && job.status !== "Cancelled")
    .sort((left, right) =>
      (left.startTime || "99:99").localeCompare(right.startTime || "99:99")
    )[0];
  const nextRouteCustomer =
    visibleRoundCustomers.find((customer) => {
      const visit = currentVisitsByCustomer.get(customer.id);
      return visit?.status !== "completed" && visit?.status !== "not_cut";
    }) ?? visibleRoundCustomers[0];
  const nextWorkTitle =
    nextScheduledJob?.title ?? nextRouteCustomer?.name ?? "No upcoming job";
  const nextWorkType =
    nextScheduledJob?.type ??
    (nextRouteCustomer?.customerType === "Commercial"
      ? "Commercial Grounds"
      : "Grounds Maintenance");
  const nextWorkTime =
    nextScheduledJob?.startTime ??
    (hasRoundWork && nextRouteCustomer ? "Next on route" : "Not scheduled");
  const nextWorkAddress =
    nextScheduledJob?.customerName ||
    (nextRouteCustomer ? getCustomerDisplayAddress(nextRouteCustomer) : "") ||
    "Add work to today";
  const routeSavedHours = Math.max(workTotalCount * 0.34, 0);
  const routeFuelSaved = Math.round(Math.max(workTotalCount, 1) * 8.5);
  const routeDensityScore =
    workTotalCount > 0
      ? Math.min(98, Math.round((routeMapCustomers.length / workTotalCount) * 82 + 12))
      : 0;
  const jobsCompletedChartValues = workloadBars.map((bar, index) =>
    Math.max(
      index === 0 ? workCompletedCount : Math.round(bar.value * 0.72),
      bar.value > 0 ? 1 : 0
    )
  );
  const dashboardAttentionRows = [
    {
      label: "Open Jobs",
      value: dashboardRemainingCount + workIssueCount,
      icon: <Clock size={15} />,
      tone: "bg-rose-50 text-rose-600",
    },
    {
      label: "Unpaid Work",
      value: Math.round(outstandingPaymentSnapshot.total),
      icon: <Banknote size={15} />,
      tone: "bg-amber-50 text-amber-600",
      money: true,
    },
    {
      label: "Quote Follow-ups",
      value: quoteAttentionCount,
      icon: <FileText size={15} />,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Customer Queries",
      value: 0,
      icon: <MessageSquare size={15} />,
      tone: "bg-violet-50 text-violet-600",
    },
  ];
  const recentActivityRows = [
    ...recentVisits.slice(0, 3).map((visit) => {
      const customer = customers.find((entry) => entry.id === visit.customerId);

      return {
        id: `visit-${visit.id}`,
        label:
          visit.status === "completed"
            ? `Job completed at ${customer?.name ?? "customer"}`
            : `Job marked missed at ${customer?.name ?? "customer"}`,
        meta: new Date(visit.visitDate).toLocaleDateString(),
        icon: visit.status === "completed" ? <Check size={14} /> : <CircleAlert size={14} />,
        tone:
          visit.status === "completed"
            ? "bg-emerald-50 text-emerald-600"
            : "bg-rose-50 text-rose-600",
      };
    }),
    ...visibleAttentionItems.slice(0, 2).map((item) => ({
      id: `attention-${item.id}`,
      label: item.title,
      meta: item.badge,
      icon: item.kind === "quote_follow_up" ? <FileText size={14} /> : <Receipt size={14} />,
      tone:
        item.kind === "quote_follow_up"
          ? "bg-amber-50 text-amber-600"
          : "bg-blue-50 text-blue-600",
    })),
  ].slice(0, 5);

  useEffect(() => {
    if (window.google?.maps) {
      setGoogleMapReady(true);
      setGoogleMapUnavailable(false);
      return undefined;
    }

    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;

      if (window.google?.maps) {
        setGoogleMapReady(true);
        setGoogleMapUnavailable(false);
        window.clearInterval(intervalId);
      } else if (attempts >= 40) {
        setGoogleMapUnavailable(true);
        window.clearInterval(intervalId);
      }
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!googleMapReady || !mapContainerRef.current || !window.google?.maps) {
      return undefined;
    }

    const maps = window.google.maps;
    const fallbackCenter = {
      lat: weatherCoordinates.latitude,
      lng: weatherCoordinates.longitude,
    };
    const center =
      routeMapPoints.length > 0
        ? {
            lat:
              routeMapPoints.reduce((total, point) => total + point.latitude, 0) /
              routeMapPoints.length,
            lng:
              routeMapPoints.reduce((total, point) => total + point.longitude, 0) /
              routeMapPoints.length,
          }
        : fallbackCenter;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new maps.Map(mapContainerRef.current, {
        center,
        clickableIcons: false,
        disableDefaultUI: true,
        fullscreenControl: true,
        gestureHandling: "cooperative",
        mapTypeControl: false,
        streetViewControl: false,
        styles: [
          {
            featureType: "poi",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "transit",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "road",
            elementType: "labels.icon",
            stylers: [{ visibility: "off" }],
          },
        ],
        zoom: routeMapPoints.length > 0 ? 13 : 11,
        zoomControl: true,
      });
    }

    const map = mapInstanceRef.current;
    if (!map) {
      return undefined;
    }

    mapMarkersRef.current.forEach((marker) => marker.setMap(null));
    mapMarkersRef.current = [];
    mapPolylineRef.current?.setMap(null);
    mapPolylineRef.current = null;

    if (routeMapPoints.length === 0) {
      map.setCenter(center);
      map.setZoom(11);
      return undefined;
    }

    const bounds = new maps.LatLngBounds();
    const routePath = routeMapPoints.map((point) => ({
      lat: point.latitude,
      lng: point.longitude,
    }));
    const markerColors = ["#22a953", "#1d7fe8", "#f59e0b"];

    routeMapPoints.forEach((point, index) => {
      const position = {
        lat: point.latitude,
        lng: point.longitude,
      };
      const fillColor = markerColors[index] ?? "#111827";
      const marker = new maps.Marker({
        icon: {
          fillColor,
          fillOpacity: 1,
          path: maps.SymbolPath.CIRCLE,
          scale: 13,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        map,
        position,
        title: point.name,
        label: {
          text: String(index + 1),
          color: "#ffffff",
          fontWeight: "800",
        },
      });

      marker.addListener("click", () => onOpenCustomer?.(point.id));
      mapMarkersRef.current.push(marker);
      bounds.extend(position);
    });

    mapPolylineRef.current = new maps.Polyline({
      geodesic: true,
      map,
      path: routePath,
      strokeColor: "#22a953",
      strokeOpacity: 0.9,
      strokeWeight: 4,
    });

    if (routeMapPoints.length === 1) {
      map.setCenter({
        lat: routeMapPoints[0].latitude,
        lng: routeMapPoints[0].longitude,
      });
      map.setZoom(15);
    } else {
      map.fitBounds(bounds, {
        bottom: 64,
        left: 96,
        right: 320,
        top: 64,
      });

      maps.event.addListenerOnce(map, "idle", () => {
        const currentZoom = map.getZoom();

        if (typeof currentZoom === "number" && currentZoom < 10) {
          map.setZoom(10);
        }
      });
    }

    return () => {
      mapMarkersRef.current.forEach((marker) => marker.setMap(null));
      mapMarkersRef.current = [];
      mapPolylineRef.current?.setMap(null);
      mapPolylineRef.current = null;
    };
  }, [
    googleMapReady,
    onOpenCustomer,
    routeMapPoints,
    weatherCoordinates.latitude,
    weatherCoordinates.longitude,
  ]);

  return (
    <div className="space-y-5 text-[#071426]">
      <section data-tour="dashboard-overview" className={topSectionClassName}>
        <div className={`${panelClassName} p-4`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
            Today is {todayWeek}, {todayDayLabel}. You are currently viewing
          </p>
          <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid gap-2 sm:max-w-md sm:grid-cols-2 xl:min-w-[360px]">
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

            <div className="flex flex-wrap gap-2 xl:flex-nowrap">
              <button
                type="button"
                onClick={onGoToCustomers}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#20c766] px-4 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(32,199,102,0.28)] transition hover:-translate-y-0.5 hover:bg-[#16ad55] xl:flex-none"
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
        </div>

        <div className={dashboardStatsGridClassName}>
          <DashboardStatCard
            icon={<Calendar size={24} />}
            value={String(dashboardJobsToday)}
            label="Jobs Today"
            detail={
              dashboardJobsToday === 0
                ? "No work scheduled"
                : `${dashboardRemainingCount} remaining`
            }
            detailClassName="text-emerald-600"
            iconClassName="bg-emerald-50 text-emerald-600"
            onClick={onGoToSchedule}
          />
          <DashboardStatCard
            icon={<CheckCircle2 size={24} />}
            value={String(workCompletedCount)}
            label="Completed"
            detail={
              workTotalCount > 0 ? `${completionPercent}% of today` : "Nothing due"
            }
            detailClassName="text-emerald-600"
            iconClassName="bg-emerald-50 text-emerald-600"
            onClick={hasRoundWork ? onGoToRounds : onGoToSchedule}
          />
          <DashboardStatCard
            icon={<Gauge size={24} />}
            value={String(dashboardRemainingCount)}
            label="Remaining"
            detail={nextScheduledJob?.startTime ? `Next: ${nextScheduledJob.startTime}` : nextWorkTime}
            detailClassName="text-blue-600"
            iconClassName="bg-blue-50 text-blue-600"
            onClick={hasRoundWork ? onGoToRounds : onGoToSchedule}
          />
          <DashboardStatCard
            icon={<PoundSterling size={24} />}
            value={formatWholeMoney(dayValueTotal)}
            label="Revenue Today"
            detail={`${scheduledWorkCount} scheduled`}
            detailClassName="text-emerald-600"
            iconClassName="bg-emerald-50 text-emerald-600"
            onClick={onGoToPayments}
          />
          <DashboardStatCard
            icon={<FileText size={24} />}
            value={formatWholeMoney(outstandingPaymentSnapshot.total)}
            label="Outstanding"
            detail={`${quoteAttentionCount + invoiceAttentionCount} attention items`}
            detailClassName="text-violet-600"
            iconClassName="bg-violet-50 text-violet-600"
            onClick={onGoToPayments}
          />
          {showAiReceptionistStats ? (
            <DashboardStatCard
              icon={<Bot size={24} />}
              value={String(aiReceptionistStats?.todayCalls ?? 0)}
              label="AI Receptionist"
              detail={`${aiReceptionistStats?.leadsCreated ?? 0} leads captured`}
              detailClassName="text-orange-600"
              iconClassName="bg-orange-50 text-orange-600"
            />
          ) : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex min-h-[620px] flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.06)] xl:row-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-4">
              <h3 className="text-lg font-black text-slate-950">
                Today&apos;s Round
              </h3>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                <span>Last updated: {dashboardUpdatedAt}</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-100">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>
            </div>

            <div className="relative min-h-[500px] flex-1 overflow-hidden rounded-lg bg-[#eef4f1]">
              <div ref={mapContainerRef} className="absolute inset-0" />
              {!googleMapReady && !googleMapUnavailable ? (
                <div className="absolute inset-x-4 bottom-4 z-10 rounded-lg bg-white/95 px-4 py-3 text-center text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
                  Loading route map...
                </div>
              ) : null}
              {googleMapUnavailable ? (
                <div className="absolute inset-x-4 bottom-4 z-10 rounded-lg bg-white/95 px-4 py-3 text-center text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
                  Google Maps is unavailable. Check the Google Maps API key.
                </div>
              ) : null}

              <div className="absolute left-4 top-6 z-10 overflow-hidden rounded-lg bg-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={onGoToMap}
                  className="block w-full bg-[#22a953] px-4 py-3 text-sm font-black text-white transition hover:bg-[#168943]"
                >
                  Optimise
                </button>
                <div className="grid gap-1 px-3 py-3 text-center text-xs font-bold text-slate-700">
                  <span className="flex flex-col items-center gap-1 rounded-md px-2 py-2 hover:bg-slate-50">
                    <Navigation size={17} />
                    Traffic
                  </span>
                  <span className="flex flex-col items-center gap-1 rounded-md px-2 py-2 hover:bg-slate-50">
                    <MapPin size={17} />
                    Satellite
                  </span>
                </div>
              </div>

              <div className="absolute bottom-20 left-6 z-10 overflow-hidden rounded-lg bg-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={onGoToMap}
                  className="flex h-10 w-10 items-center justify-center text-2xl font-semibold text-slate-800 hover:bg-slate-50"
                  aria-label="Zoom in"
                >
                  +
                </button>
                <div className="h-px bg-slate-200" />
                <button
                  type="button"
                  onClick={onGoToMap}
                  className="flex h-10 w-10 items-center justify-center text-2xl font-semibold text-slate-800 hover:bg-slate-50"
                  aria-label="Zoom out"
                >
                  -
                </button>
              </div>

              <div className="absolute bottom-5 left-5 z-10 flex flex-wrap gap-3 rounded-lg bg-white/95 px-4 py-3 text-xs font-semibold text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-200">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#22a953]" />
                  Completed
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1d7fe8]" />
                  In Progress
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                  Next Up
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                  Upcoming
                </span>
              </div>

              <aside className="absolute right-4 top-4 z-10 hidden w-64 rounded-lg bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.16)] ring-1 ring-slate-200 lg:block">
                <p className="text-xs font-black text-orange-500">NEXT JOB</p>
                <h4 className="mt-3 text-lg font-black leading-snug text-slate-950">
                  {nextWorkTitle}
                </h4>
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Leaf size={15} className="text-emerald-600" />
                  {nextWorkType}
                </p>
                <div className="mt-4 flex items-center gap-4 border-b border-slate-100 pb-4 text-sm font-semibold text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <Clock size={15} />
                    {nextWorkTime}
                  </span>
                  <span>45 mins</span>
                </div>
                <p className="mt-4 text-sm leading-5 text-slate-500">
                  {nextWorkAddress}
                </p>
                <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs font-bold text-slate-400">Crew</p>
                  <p className="mt-1 text-sm font-black text-slate-800">
                    Today&apos;s route team
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onGoToMap}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#22a953] px-4 py-3 text-sm font-black text-white transition hover:bg-[#168943]"
                >
                  <Navigation size={16} />
                  Navigate
                </button>
                <button
                  type="button"
                  onClick={onGoToSchedule}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-800 transition hover:bg-slate-50"
                >
                  View Job
                </button>
              </aside>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Weather Update
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Route-area forecast
                </p>
              </div>
              <CloudSun className="text-sky-500" size={24} />
            </div>

            <div
              className={`mt-4 rounded-lg border p-4 ${
                !showWeatherWidget
                  ? "border-slate-200 bg-slate-50"
                  : weatherLoading
                    ? "border-slate-200 bg-slate-50"
                    : weatherError || !weatherNarrative
                      ? "border-amber-200 bg-amber-50"
                      : weatherNarrative?.tone ?? ""
              }`}
            >
              <p className="font-black">
                {!showWeatherWidget
                  ? "Weather disabled"
                  : weatherLoading
                    ? "Loading live weather"
                    : weatherError || !weatherNarrative
                      ? "Weather unavailable"
                      : weatherNarrative?.title}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {!showWeatherWidget
                  ? "Enable the weather widget in settings to fetch live route conditions."
                  : weatherLoading
                    ? "Fetching the latest forecast for this route area."
                    : weatherError
                      ? weatherError
                      : weatherNarrative?.body}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <Thermometer size={16} className="text-rose-500" />
                <p className="mt-2 text-xs font-bold text-slate-500">Temp</p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {weather?.temperature != null
                    ? `${Math.round(weather?.temperature ?? 0)}C`
                    : "-"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <Droplets size={16} className="text-blue-500" />
                <p className="mt-2 text-xs font-bold text-slate-500">Rain</p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {weather?.rainChance != null
                    ? `${Math.round(weather?.rainChance ?? 0)}%`
                    : "-"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <Wind size={16} className="text-slate-500" />
                <p className="mt-2 text-xs font-bold text-slate-500">Wind</p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {weather?.windSpeed != null
                    ? `${Math.round(weather?.windSpeed ?? 0)}`
                    : "-"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-950">
                Jobs Requiring Attention
              </h3>
              <button
                type="button"
                onClick={onGoToActions}
                className="text-sm font-bold text-slate-800 transition hover:text-emerald-700"
              >
                View all
              </button>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {dashboardAttentionRows.map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={row.money ? onGoToPayments : onGoToActions}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${row.tone}`}>
                      {row.icon}
                    </span>
                    <span className="truncate text-sm font-bold text-slate-800">
                      {row.label}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-2 text-sm font-black text-slate-950">
                    {row.money ? formatWholeMoney(row.value) : row.value}
                    <ChevronRight size={15} className="text-slate-400" />
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-950">
                Financial Summary
              </h3>
              <span className="text-xs font-bold text-slate-500">This Month</span>
            </div>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Revenue</p>
                  <p className="mt-1 text-xl font-black text-slate-950">
                    {formatWholeMoney(dayValueTotal)}
                  </p>
                </div>
                <MiniSparkline />
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Outstanding
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-950">
                    {formatWholeMoney(outstandingPaymentSnapshot.total)}
                  </p>
                </div>
                <MiniSparkline tone="amber" />
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Paid Today
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-950">
                    {formatWholeMoney(paidTodayTotal)}
                  </p>
                </div>
                <MiniSparkline tone="blue" />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-950">
                Route Intelligence
              </h3>
              <span className="text-xs font-bold text-slate-500">This Month</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="border-r border-slate-100 pr-3">
                <TimerReset size={20} className="text-emerald-600" />
                <p className="mt-2 text-xl font-black text-slate-950">
                  {routeSavedHours.toFixed(1)} hrs
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Driving Time Saved
                </p>
              </div>
              <div>
                <Banknote size={20} className="text-emerald-600" />
                <p className="mt-2 text-xl font-black text-slate-950">
                  {formatWholeMoney(routeFuelSaved)}
                </p>
                <p className="text-xs font-semibold text-slate-500">Fuel Saved</p>
              </div>
              <div className="border-r border-slate-100 pr-3">
                <Route size={20} className="text-emerald-600" />
                <p className="mt-2 text-xl font-black text-slate-950">
                  {workTotalCount}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Avg. Jobs Per Route
                </p>
              </div>
              <div>
                <Gauge size={20} className="text-emerald-600" />
                <p className="mt-2 text-xl font-black text-slate-950">
                  {routeDensityScore}
                  <span className="text-sm text-slate-400"> /100</span>
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Route Density Score
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-950">
                Jobs Completed
              </h3>
              <span className="text-xs font-bold text-slate-500">This Month</span>
            </div>
            <div className="mt-5">
              <p className="text-3xl font-black text-slate-950">
                {workCompletedCount}
                <span className="ml-3 align-middle text-sm font-bold text-emerald-600">
                  {completionPercent}% complete
                </span>
              </p>
              <MiniBarChart values={jobsCompletedChartValues} />
              <div className="mt-2 grid grid-cols-7 text-center text-xs font-bold text-slate-400">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                  <span key={`${day}-${index}`}>{day}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-950">
                Recent Activity
              </h3>
              <button
                type="button"
                onClick={onGoToRounds}
                className="text-sm font-bold text-slate-800 transition hover:text-emerald-700"
              >
                View all
              </button>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {recentActivityRows.length === 0 ? (
                <div className="py-6 text-sm font-semibold text-slate-500">
                  No recent activity yet.
                </div>
              ) : (
                recentActivityRows.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${activity.tone}`}
                      >
                        {activity.icon}
                      </span>
                      <span className="truncate text-sm font-bold text-slate-800">
                        {activity.label}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-slate-500">
                      {activity.meta}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="flex flex-col gap-4 rounded-lg border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-slate-50 p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center border-r border-emerald-100 pr-4 text-emerald-600">
              <Leaf size={34} />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-950">
                Save time on every round
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                You&apos;ve saved {routeSavedHours.toFixed(1)} hours of driving
                time this month by using optimised routes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToMap}
            className="inline-flex items-center justify-center gap-3 rounded-md border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-50"
          >
            View Route Insights
            <ArrowRight size={16} className="text-emerald-600" />
          </button>
        </section>

        {announcement ? (
          <section
            className={`rounded-lg border p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)] ${announcementClassName}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-500">
                  RoundHQ Announcement
                </p>
                <h3 className="mt-2 text-xl font-black text-slate-950">
                  {announcement.title}
                </h3>
              </div>
              <Megaphone className={announcementIconClassName} size={24} />
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
              {announcement.message}
            </p>
            {announcement.ctaLabel && announcement.ctaHref ? (
              <a
                href={announcement.ctaHref}
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#003c35] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#022f2a]"
              >
                {announcement.ctaLabel}
                <ArrowRight size={14} />
              </a>
            ) : null}
          </section>
        ) : null}
      </section>
    </div>
  );
}
