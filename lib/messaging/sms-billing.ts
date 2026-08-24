export const SMS_PRICE_PER_MESSAGE_PENCE = 10;

export type SmsUsageSummary = {
  periodStart: string;
  periodEnd: string;
  messageCount: number;
  totalPricePence: number;
};

export type SmsEntitlement = {
  billingEnabled: boolean;
  termsAccepted: boolean;
  termsAcceptedAt: string | null;
  termsAcceptedBy: string | null;
  pricePerMessagePence: number;
  isActive: boolean;
  usage: SmsUsageSummary;
};

export function formatSmsPrice(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

export function getDefaultSmsUsageSummary(): SmsUsageSummary {
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    messageCount: 0,
    totalPricePence: 0,
  };
}

export function canUseSms(account: {
  smsBillingEnabled: boolean;
  smsTermsAccepted: boolean;
}) {
  return account.smsBillingEnabled && account.smsTermsAccepted;
}
