export type FollowUpQuote = {
  id: string;
  date: string;
  sentAt?: string;
  status: string;
  total: number;
  customerName: string;
};

export type FollowUpInvoice = FollowUpQuote & {
  dueDate?: string;
};

function isoDayNumber(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match
    ? Math.floor(
        Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) /
          86_400_000
      )
    : Number.NaN;
}

export function differenceInCalendarDays(start: string, end: string) {
  const startDay = isoDayNumber(start);
  const endDay = isoDayNumber(end);
  return Number.isFinite(startDay) && Number.isFinite(endDay)
    ? endDay - startDay
    : 0;
}

export function isQuoteEligibleForFollowUp(
  quote: FollowUpQuote,
  today: string,
  delayDays: number,
  hasLinkedInvoice = false
) {
  const sentDate =
    quote.sentAt?.slice(0, 10) ||
    (quote.status === "Sent" ? quote.date : "");
  return (
    !hasLinkedInvoice &&
    ["Approved", "Sent"].includes(quote.status) &&
    Boolean(sentDate) &&
    differenceInCalendarDays(sentDate, today) >= Math.max(0, delayDays)
  );
}

export function isInvoiceEligibleForFollowUp(
  invoice: FollowUpInvoice,
  today: string,
  delayDays: number,
  fallbackPaymentTermsDays = 7
) {
  if (["Paid", "Declined", "Void", "Voided"].includes(invoice.status)) {
    return false;
  }

  const dueDate = invoice.dueDate || addIsoDays(invoice.date, fallbackPaymentTermsDays);
  return differenceInCalendarDays(dueDate, today) >= Math.max(0, delayDays);
}

function addIsoDays(value: string, days: number) {
  const day = isoDayNumber(value);
  return Number.isFinite(day)
    ? new Date((day + days) * 86_400_000).toISOString().slice(0, 10)
    : value;
}
