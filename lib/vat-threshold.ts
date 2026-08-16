export const DEFAULT_VAT_REGISTRATION_THRESHOLD = 90_000;
export const DEFAULT_VAT_WARNING_PERCENTAGE = 80;

export type VatTurnoverInvoice = {
  id: string;
  date: string;
  status: string;
  total: number | null | undefined;
  voidedAt?: string | null;
  refundedAmount?: number | null;
};

export type VatThresholdStatus = "OK" | "Getting close" | "VAT limit reached";

function isoDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";
}

export function getRollingVatWindow(asOfIsoDate: string) {
  const [year, month, day] = isoDay(asOfIsoDate).split("-").map(Number);
  const end = new Date(Date.UTC(year, month - 1, day, 12));
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  start.setUTCDate(start.getUTCDate() + 1);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function calculateRollingTaxableTurnover(
  invoices: VatTurnoverInvoice[],
  asOfIsoDate: string
) {
  const window = getRollingVatWindow(asOfIsoDate);
  const includedStatuses = new Set(["Approved", "Sent", "Accepted", "Unpaid", "Paid"]);

  return invoices.reduce((total, invoice) => {
    const date = isoDay(invoice.date);

    if (
      !date ||
      date < window.start ||
      date > window.end ||
      !includedStatuses.has(invoice.status) ||
      Boolean(invoice.voidedAt)
    ) {
      return total;
    }

    const gross = Math.max(0, Number(invoice.total ?? 0));
    const refunded = Math.max(0, Number(invoice.refundedAmount ?? 0));
    return total + Math.max(0, gross - refunded);
  }, 0);
}

export function getVatThresholdSnapshot(options: {
  invoices: VatTurnoverInvoice[];
  asOfIsoDate: string;
  threshold?: number;
  warningPercentage?: number;
}) {
  const threshold = Math.max(1, options.threshold ?? DEFAULT_VAT_REGISTRATION_THRESHOLD);
  const warningPercentage = Math.min(
    99,
    Math.max(1, options.warningPercentage ?? DEFAULT_VAT_WARNING_PERCENTAGE)
  );
  const turnover = calculateRollingTaxableTurnover(
    options.invoices,
    options.asOfIsoDate
  );
  const percentage = (turnover / threshold) * 100;
  const status: VatThresholdStatus =
    percentage >= 100
      ? "VAT limit reached"
      : percentage >= warningPercentage
        ? "Getting close"
        : "OK";

  return {
    turnover,
    threshold,
    percentage,
    progressPercentage: Math.min(100, Math.max(0, percentage)),
    warningPercentage,
    status,
    window: getRollingVatWindow(options.asOfIsoDate),
  };
}
