"use client";

import { useState } from "react";
import { CreditCard, RefreshCw, Settings } from "lucide-react";

type BillingActionsProps = {
  stripeConfigured: boolean;
  showCheckout?: boolean;
  showPortal?: boolean;
  checkoutLabel?: string;
  portalLabel?: string;
  className?: string;
};

async function openBillingUrl(endpoint: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = (await response.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;

  if (!response.ok || !data?.url) {
    throw new Error(data?.error || "Unable to open billing.");
  }

  window.location.href = data.url;
}

export default function BillingActions({
  stripeConfigured,
  showCheckout = true,
  showPortal = false,
  checkoutLabel = "Start subscription",
  portalLabel = "Manage billing",
  className = "",
}: BillingActionsProps) {
  const [loadingAction, setLoadingAction] = useState<"checkout" | "portal" | "refresh" | "">("");
  const [error, setError] = useState("");

  const handleAction = async (
    action: "checkout" | "portal",
    endpoint: string
  ) => {
    setLoadingAction(action);
    setError("");

    try {
      await openBillingUrl(endpoint);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open billing.");
      setLoadingAction("");
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-3">
        {showCheckout && (
          <button
            type="button"
            onClick={() => handleAction("checkout", "/api/billing/checkout")}
            disabled={!stripeConfigured || loadingAction !== ""}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#173f35] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#215648] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CreditCard aria-hidden="true" className="size-4" />
            {loadingAction === "checkout" ? "Opening checkout..." : checkoutLabel}
          </button>
        )}

        {showPortal && (
          <button
            type="button"
            onClick={() => handleAction("portal", "/api/billing/portal")}
            disabled={!stripeConfigured || loadingAction !== ""}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Settings aria-hidden="true" className="size-4" />
            {loadingAction === "portal" ? "Opening portal..." : portalLabel}
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setLoadingAction("refresh");
            window.location.reload();
          }}
          disabled={loadingAction !== ""}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Refresh status
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

