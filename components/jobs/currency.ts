export const DEFAULT_CURRENCY_CODE = "GBP";

export const CURRENCY_OPTIONS = [
  { code: "GBP", label: "British pound", symbol: "\u00a3" },
  { code: "EUR", label: "Euro", symbol: "\u20ac" },
  { code: "USD", label: "US dollar", symbol: "$" },
  { code: "CAD", label: "Canadian dollar", symbol: "$" },
  { code: "AUD", label: "Australian dollar", symbol: "$" },
  { code: "NZD", label: "New Zealand dollar", symbol: "$" },
  { code: "ZAR", label: "South African rand", symbol: "R" },
  { code: "INR", label: "Indian rupee", symbol: "\u20b9" },
] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["code"];

type CurrencyFormatOptions = Pick<
  Intl.NumberFormatOptions,
  "minimumFractionDigits" | "maximumFractionDigits"
>;

const currencyCodeSet = new Set<string>(
  CURRENCY_OPTIONS.map((currency) => currency.code)
);

export function normalizeCurrencyCode(value: unknown): CurrencyCode {
  const candidate = String(value ?? "")
    .trim()
    .toUpperCase();

  return currencyCodeSet.has(candidate)
    ? (candidate as CurrencyCode)
    : DEFAULT_CURRENCY_CODE;
}

export function getCurrencyOption(value: unknown) {
  const code = normalizeCurrencyCode(value);
  return CURRENCY_OPTIONS.find((currency) => currency.code === code) ?? CURRENCY_OPTIONS[0];
}

export function formatCurrencyAmount(
  value: number | null | undefined,
  currencyCode: unknown = DEFAULT_CURRENCY_CODE,
  options: CurrencyFormatOptions = {}
) {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const numericValue = Number(value ?? 0);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrencyCode,
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits,
    }).format(safeValue);
  } catch {
    const currency = getCurrencyOption(normalizedCurrencyCode);
    const minimumFractionDigits = options.minimumFractionDigits ?? 2;
    const maximumFractionDigits = options.maximumFractionDigits ?? minimumFractionDigits;

    return `${currency.symbol}${safeValue.toFixed(maximumFractionDigits)}`;
  }
}
