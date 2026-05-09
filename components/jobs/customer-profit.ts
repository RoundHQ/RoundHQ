import {
  buildPaymentYearMonths,
  getConfiguredSeasonStartYear,
  getCustomerDisplayAddress,
  getInputDateValue,
  getMonthlyPlanCharge,
  isDateInSeasonRange,
} from "./helpers";
import {
  DEFAULT_ROTATION_WEEKS,
  getEffectiveRotationWeeks,
  getRotationCycleLabel,
} from "./rotation";
import type { Customer, MonthlyPayment, RotationWeeks, VisitLog } from "./types";

export type CustomerProfitRow = {
  customerId: number;
  customerName: string;
  customerType: Customer["customerType"];
  address: string;
  routeLabel: string;
  paymentMethod: string;
  isGrassCuttingCustomer: boolean;
  cutPrice: number;
  paidRevenue: number;
  outstanding: number;
  bookedRevenue: number;
  completedVisitCount: number;
  notCutCount: number;
  paidVisitCount: number;
  unpaidVisitCount: number;
  paidMonthCount: number;
  outstandingMonthCount: number;
  lastVisitDate: string | null;
  statusLabel: string;
  statusClassName: string;
};

type BuildCustomerProfitRowsOptions = {
  customers: Customer[];
  visits: VisitLog[];
  monthlyPayments: MonthlyPayment[];
  grassCutSeasonStart: string;
  grassCutSeasonEnd: string;
  defaultRotationWeeks?: RotationWeeks;
  referenceDate?: Date;
  includeNonGrassCustomers?: boolean;
};

function formatDateForInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
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

  return formatDateForInput(new Date(year, month + 1, 1));
}

function getFiniteNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function formatCustomerProfitDate(value: string | null | undefined) {
  const normalized = getInputDateValue(value);

  if (!normalized) {
    return "No visits";
  }

  return new Date(`${normalized}T12:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function isVisitPaid(visit: VisitLog) {
  return (
    visit.paid === true ||
    visit.paymentStatus === "Paid" ||
    Boolean(getInputDateValue(visit.paidAt))
  );
}

export function getCustomerProfitStatus(row: {
  isGrassCuttingCustomer?: boolean;
  outstanding: number;
  notCutCount: number;
  completedVisitCount: number;
}) {
  if (row.isGrassCuttingCustomer === false) {
    return {
      label: "Non-routine",
      className: "bg-slate-100 text-slate-600",
    };
  }

  if (row.outstanding > 0 && row.notCutCount > 0) {
    return {
      label: "Payment + missed",
      className: "bg-rose-100 text-rose-700",
    };
  }

  if (row.outstanding > 0) {
    return {
      label: "Payment due",
      className: "bg-amber-100 text-amber-700",
    };
  }

  if (row.notCutCount > 0) {
    return {
      label: "Missed visits",
      className: "bg-sky-100 text-sky-700",
    };
  }

  if (row.completedVisitCount === 0) {
    return {
      label: "No visits logged",
      className: "bg-slate-100 text-slate-600",
    };
  }

  return {
    label: "Healthy",
    className: "bg-emerald-100 text-emerald-700",
  };
}

export function buildCustomerProfitRows({
  customers,
  visits,
  monthlyPayments,
  grassCutSeasonStart,
  grassCutSeasonEnd,
  defaultRotationWeeks = DEFAULT_ROTATION_WEEKS,
  referenceDate = new Date(),
  includeNonGrassCustomers = false,
}: BuildCustomerProfitRowsOptions) {
  const todayValue = formatDateForInput(referenceDate);
  const seasonStartYear = getConfiguredSeasonStartYear(
    referenceDate,
    grassCutSeasonStart
  );
  const paymentYearMonths = buildPaymentYearMonths(
    seasonStartYear,
    grassCutSeasonStart
  );
  const monthlyPaymentLookup = new Map<string, MonthlyPayment>();
  const seasonVisitsByCustomer = new Map<number, VisitLog[]>();

  monthlyPayments.forEach((payment) => {
    monthlyPaymentLookup.set(
      `${payment.customerId}:${getInputDateValue(payment.paymentMonth)}`,
      payment
    );
  });

  visits
    .filter((visit) =>
      isDateInSeasonRange(
        visit.visitDate,
        seasonStartYear,
        grassCutSeasonStart,
        grassCutSeasonEnd
      )
    )
    .forEach((visit) => {
      const customerVisits = seasonVisitsByCustomer.get(visit.customerId) ?? [];
      customerVisits.push(visit);
      seasonVisitsByCustomer.set(visit.customerId, customerVisits);
    });

  return customers
    .filter(
      (customer) => includeNonGrassCustomers || customer.isGrassCuttingCustomer
    )
    .map<CustomerProfitRow>((customer) => {
      const isGrassCuttingCustomer = Boolean(customer.isGrassCuttingCustomer);
      const paymentMethod = isGrassCuttingCustomer
        ? customer.paymentMethod ?? "Monthly"
        : "Non-routine";
      const customerVisits = seasonVisitsByCustomer.get(customer.id) ?? [];
      const completedVisitsForCustomer = customerVisits.filter(
        (visit) => visit.status === "completed"
      );
      const notCutCount = customerVisits.filter(
        (visit) => visit.status === "not_cut"
      ).length;
      const lastVisitDate =
        [...customerVisits].sort(
          (left, right) =>
            new Date(right.visitDate).getTime() -
            new Date(left.visitDate).getTime()
        )[0]?.visitDate ?? null;

      let paidRevenue = 0;
      let outstanding = 0;
      let paidVisitCount = 0;
      let unpaidVisitCount = 0;
      let paidMonthCount = 0;
      let outstandingMonthCount = 0;

      if (isGrassCuttingCustomer && paymentMethod === "Monthly") {
        const monthlyCharge = getMonthlyPlanCharge(customer);

        paidMonthCount = paymentYearMonths.filter((month) => {
          const payment = monthlyPaymentLookup.get(`${customer.id}:${month.key}`);
          return Boolean(getInputDateValue(payment?.paymentDate));
        }).length;
        outstandingMonthCount = paymentYearMonths.filter((month) => {
          const outstandingStartDate = getMonthlyOutstandingStartDate(month.key);
          const payment = monthlyPaymentLookup.get(`${customer.id}:${month.key}`);

          return (
            Boolean(outstandingStartDate) &&
            outstandingStartDate <= todayValue &&
            !getInputDateValue(payment?.paymentDate)
          );
        }).length;

        paidRevenue = paidMonthCount * monthlyCharge;
        outstanding = outstandingMonthCount * monthlyCharge;
      } else if (isGrassCuttingCustomer) {
        completedVisitsForCustomer.forEach((visit) => {
          const visitValue = getFiniteNumber(
            visit.priceAtVisit ?? customer.grassCutAmount
          );

          if (isVisitPaid(visit)) {
            paidRevenue += visitValue;
            paidVisitCount += 1;
          } else {
            outstanding += visitValue;
            unpaidVisitCount += 1;
          }
        });
      }

      const status = getCustomerProfitStatus({
        isGrassCuttingCustomer,
        outstanding,
        notCutCount,
        completedVisitCount: completedVisitsForCustomer.length,
      });

      return {
        customerId: customer.id,
        customerName: customer.name,
        customerType: customer.customerType,
        address: getCustomerDisplayAddress(customer),
        routeLabel: isGrassCuttingCustomer
          ? `${getRotationCycleLabel(
              customer.week,
              getEffectiveRotationWeeks(customer, defaultRotationWeeks)
            )} ${customer.day}`
          : customer.customerType,
        paymentMethod,
        isGrassCuttingCustomer,
        cutPrice: getFiniteNumber(customer.grassCutAmount),
        paidRevenue,
        outstanding,
        bookedRevenue: paidRevenue + outstanding,
        completedVisitCount: completedVisitsForCustomer.length,
        notCutCount,
        paidVisitCount,
        unpaidVisitCount,
        paidMonthCount,
        outstandingMonthCount,
        lastVisitDate,
        statusLabel: status.label,
        statusClassName: status.className,
      };
    })
    .sort((left, right) => {
      if (right.paidRevenue !== left.paidRevenue) {
        return right.paidRevenue - left.paidRevenue;
      }

      if (right.outstanding !== left.outstanding) {
        return right.outstanding - left.outstanding;
      }

      return left.customerName.localeCompare(right.customerName);
    });
}
