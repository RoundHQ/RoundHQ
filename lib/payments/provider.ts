import { createHash } from "crypto";

export type PaymentProvider = "stripe" | "gocardless";
export type PaymentRequestStatus =
  | "pending"
  | "open"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded";

export function getPaymentRequestIdempotencyKey(input: {
  organizationId: string;
  invoiceId: string;
  provider: PaymentProvider;
  amount: number;
  version: string;
}) {
  return createHash("sha256")
    .update(
      [
        input.organizationId,
        input.invoiceId,
        input.provider,
        input.amount.toFixed(2),
        input.version,
      ].join("|")
    )
    .digest("hex");
}

export function mapStripePaymentRequestStatus(value: string) {
  if (value === "paid") return "paid" as const;
  if (value === "expired") return "expired" as const;
  return "open" as const;
}

export function mapGoCardlessPaymentRequestStatus(value: string) {
  if (["paid_out", "confirmed", "confirmed_for_settlement"].includes(value)) {
    return "paid" as const;
  }
  if (["failed", "charged_back"].includes(value)) return "failed" as const;
  if (value === "cancelled") return "cancelled" as const;
  return "pending" as const;
}
