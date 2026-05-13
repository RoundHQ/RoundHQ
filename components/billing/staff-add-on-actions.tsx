"use client";

import { type FormEvent, useMemo, useState } from "react";
import { CreditCard, UserPlus } from "lucide-react";

type StaffAddOnActionsProps = {
  stripeConfigured: boolean;
  canManageBilling: boolean;
  currentAddOnQuantity: number;
  priceMonthly: number;
};

const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

async function addStaffAccounts(quantity: number) {
  const response = await fetch("/api/billing/staff-addons", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ quantity }),
  });
  const data = (await response.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;

  if (!response.ok || !data?.url) {
    throw new Error(data?.error || "Unable to add staff accounts.");
  }

  window.location.href = data.url;
}

export default function StaffAddOnActions({
  stripeConfigured,
  canManageBilling,
  currentAddOnQuantity,
  priceMonthly,
}: StaffAddOnActionsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const totalMonthly = useMemo(
    () => gbpFormatter.format(quantity * priceMonthly),
    [priceMonthly, quantity]
  );
  const disabled = !stripeConfigured || !canManageBilling || isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await addStaffAccounts(quantity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add staff accounts.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-slate-950">
            Additional staff accounts
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {gbpFormatter.format(priceMonthly)} per staff member / month, added
            to your RoundHQ subscription invoice.
          </p>
          {currentAddOnQuantity > 0 ? (
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-[#168b43]">
              {currentAddOnQuantity} paid add-on
              {currentAddOnQuantity === 1 ? "" : "s"} active
            </p>
          ) : null}
        </div>

        {!isFormOpen ? (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            disabled={disabled}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#19c653] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.18)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus aria-hidden="true" className="size-4" />
            Add staff
          </button>
        ) : null}
      </div>

      {isFormOpen ? (
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">
              How many additional staff members?
            </span>
            <input
              type="number"
              min={1}
              max={50}
              step={1}
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.max(1, Math.min(50, Number(event.target.value) || 1)))
              }
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#19c653]"
              disabled={disabled}
            />
          </label>

          <div className="rounded-md border border-[#19c653]/20 bg-[#f1fff6] px-4 py-3 text-sm text-slate-700">
            <span className="font-extrabold text-slate-950">{totalMonthly}</span>{" "}
            will be added to your monthly subscription.
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={disabled}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#19c653] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.18)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CreditCard aria-hidden="true" className="size-4" />
              {isSubmitting ? "Charging..." : "Confirm add-on"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setError("");
              }}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[#19c653]/45 hover:bg-[#f1fff6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {!stripeConfigured ? (
        <p className="mt-3 text-xs font-semibold text-amber-700">
          Stripe must be configured before staff add-ons can be charged.
        </p>
      ) : null}

      {stripeConfigured && !canManageBilling ? (
        <p className="mt-3 text-xs font-semibold text-amber-700">
          Start your subscription before adding paid staff accounts.
        </p>
      ) : null}
    </div>
  );
}
