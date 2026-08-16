"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Loader2,
  Phone,
  PhoneForwarded,
  RefreshCw,
  Search,
} from "lucide-react";
import type {
  AiReceptionistPhoneProvisioningStatus,
  AiReceptionistPhoneSetupMode,
} from "@/lib/ai-receptionist-settings";

export type AiReceptionistPhoneSetupState = {
  phoneNumber: string;
  setupMode: AiReceptionistPhoneSetupMode;
  existingBusinessPhoneNumber: string;
  provisioningStatus: AiReceptionistPhoneProvisioningStatus;
  provisioningError: string;
};

type AvailablePhoneNumber = {
  phoneNumber: string;
  locality: string;
};

type Props = {
  value: AiReceptionistPhoneSetupState;
  onChange: (value: AiReceptionistPhoneSetupState) => void;
};

function getErrorMessage(value: unknown, fallback: string) {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as { error?: unknown }).error === "string"
  ) {
    return (value as { error: string }).error;
  }

  return fallback;
}

function isPhoneSetupState(value: unknown): value is AiReceptionistPhoneSetupState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.phoneNumber === "string" &&
    typeof candidate.setupMode === "string" &&
    typeof candidate.existingBusinessPhoneNumber === "string" &&
    typeof candidate.provisioningStatus === "string" &&
    typeof candidate.provisioningError === "string"
  );
}

function getStatusLabel(status: AiReceptionistPhoneProvisioningStatus) {
  switch (status) {
    case "active":
      return "Ready";
    case "ordering":
    case "pending":
      return "Setting up";
    case "action_required":
      return "Needs review";
    case "failed":
      return "Try again";
    default:
      return "Not configured";
  }
}

export default function AiReceptionistPhoneSetup({ value, onChange }: Props) {
  const [setupMode, setSetupMode] = useState<AiReceptionistPhoneSetupMode>(
    value.setupMode
  );
  const [existingBusinessPhoneNumber, setExistingBusinessPhoneNumber] =
    useState(value.existingBusinessPhoneNumber);
  const [searchText, setSearchText] = useState("");
  const [numbers, setNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [message, setMessage] = useState(value.provisioningError);
  const [isSearching, setIsSearching] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasAllocatedNumber = Boolean(value.phoneNumber.trim());
  const isInProgress =
    value.provisioningStatus === "ordering" ||
    value.provisioningStatus === "pending";

  async function searchNumbers() {
    const query = searchText.trim();

    if (!query) {
      setMessage("Enter a town, area code, or preferred digits first.");
      return;
    }

    setIsSearching(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/ai-receptionist/numbers?q=${encodeURIComponent(query)}`,
        { method: "GET", credentials: "same-origin" }
      );
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(body, "Unable to search for phone numbers.")
        );
      }

      const results =
        body &&
        typeof body === "object" &&
        !Array.isArray(body) &&
        Array.isArray((body as { numbers?: unknown }).numbers)
          ? ((body as { numbers: AvailablePhoneNumber[] }).numbers ?? [])
          : [];
      setNumbers(results);

      if (results.length === 0) {
        setMessage("No matching UK numbers were found. Try a nearby town or a shorter area code.");
      }
    } catch (error) {
      setNumbers([]);
      setMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Unable to search for phone numbers."
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function provisionNumber(phoneNumber = "") {
    setIsProvisioning(true);
    setMessage("");

    try {
      const response = await fetch("/api/ai-receptionist/numbers", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          setupMode,
          phoneNumber,
          existingBusinessPhoneNumber,
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok && !isPhoneSetupState(body)) {
        throw new Error(
          getErrorMessage(body, "Unable to set up the receptionist number.")
        );
      }

      if (!isPhoneSetupState(body)) {
        throw new Error("RoundHQ did not return the phone setup status.");
      }

      onChange(body);
      setSetupMode(body.setupMode);
      setExistingBusinessPhoneNumber(body.existingBusinessPhoneNumber);
      setNumbers([]);
      setMessage(
        body.provisioningStatus === "active"
          ? "Your receptionist number is ready."
          : body.provisioningError || "Your number is being set up."
      );
    } catch (error) {
      setMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Unable to set up the receptionist number."
      );
    } finally {
      setIsProvisioning(false);
    }
  }

  async function refreshStatus() {
    setIsRefreshing(true);
    setMessage("");

    try {
      const response = await fetch("/api/ai-receptionist/numbers", {
        method: "PATCH",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok || !isPhoneSetupState(body)) {
        throw new Error(
          getErrorMessage(body, "Unable to refresh the number status.")
        );
      }

      onChange(body);
      setMessage(
        body.provisioningStatus === "active"
          ? "Your receptionist number is ready."
          : body.provisioningError || "Your number is still being set up."
      );
    } catch (error) {
      setMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Unable to refresh the number status."
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function copyPhoneNumber() {
    if (!value.phoneNumber || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(value.phoneNumber);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-5">
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
        RoundHQ manages the secure phone connection for you. You do not need a
        phone-provider account, API key, or webhook settings.
      </div>

      {hasAllocatedNumber || isInProgress || value.provisioningStatus === "action_required" ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Your receptionist number
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                {value.phoneNumber || "Allocating a UK number"}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                value.provisioningStatus === "active"
                  ? "bg-emerald-100 text-emerald-800"
                  : value.provisioningStatus === "action_required"
                    ? "bg-amber-100 text-amber-900"
                    : "bg-sky-100 text-sky-800"
              }`}
            >
              {getStatusLabel(value.provisioningStatus)}
            </span>
          </div>

          {value.setupMode === "call_forwarding" && value.phoneNumber ? (
            <div className="mt-4 rounded-md border border-sky-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <PhoneForwarded className="mt-0.5 size-5 shrink-0 text-sky-700" />
                <div>
                  <p className="text-sm font-black text-slate-900">
                    Forward {value.existingBusinessPhoneNumber || "your business number"} to {value.phoneNumber}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    Keep advertising your existing number. Ask your current phone
                    provider to forward unanswered calls to the RoundHQ number above.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            {value.phoneNumber ? (
              <button
                type="button"
                onClick={copyPhoneNumber}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                <Copy className="size-4" />
                {copied ? "Copied" : "Copy number"}
              </button>
            ) : null}
            {value.provisioningStatus !== "active" ? (
              <button
                type="button"
                onClick={refreshStatus}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Checking..." : "Refresh status"}
              </button>
            ) : null}
          </div>

          {value.provisioningStatus === "active" ? (
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-800">
              <CheckCircle2 className="size-5" />
              Ready to receive voicemail-to-lead calls.
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={setupMode === "call_forwarding"}
              onClick={() => {
                setSetupMode("call_forwarding");
                setNumbers([]);
                setMessage("");
              }}
              className={`rounded-lg border p-4 text-left transition ${
                setupMode === "call_forwarding"
                  ? "border-[#19c653] bg-emerald-50 ring-2 ring-[#19c653]/15"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <PhoneForwarded className="size-5 text-slate-700" />
              <span className="mt-3 block text-sm font-black text-slate-950">
                Keep my existing number
              </span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-slate-500">
                RoundHQ allocates the receptionist line and gives you simple call-forwarding instructions.
              </span>
            </button>
            <button
              type="button"
              aria-pressed={setupMode === "new_number"}
              onClick={() => {
                setSetupMode("new_number");
                setMessage("");
              }}
              className={`rounded-lg border p-4 text-left transition ${
                setupMode === "new_number"
                  ? "border-[#19c653] bg-emerald-50 ring-2 ring-[#19c653]/15"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <Phone className="size-5 text-slate-700" />
              <span className="mt-3 block text-sm font-black text-slate-950">
                Choose a new number
              </span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-slate-500">
                Search for a UK number by town, area code, or preferred digits.
              </span>
            </button>
          </div>

          {setupMode === "call_forwarding" ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Your existing business phone number
                </span>
                <input
                  type="tel"
                  value={existingBusinessPhoneNumber}
                  onChange={(event) =>
                    setExistingBusinessPhoneNumber(event.target.value)
                  }
                  placeholder="0121 555 1234"
                  className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:ring-4 focus:ring-[#19c653]/12"
                />
              </label>
              <button
                type="button"
                onClick={() => provisionNumber()}
                disabled={isProvisioning || !existingBusinessPhoneNumber.trim()}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProvisioning ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PhoneForwarded className="size-4" />
                )}
                {isProvisioning ? "Setting up..." : "Set up call forwarding"}
              </button>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                This allocates a UK receptionist number to your RoundHQ account.
                Your normal voicemail-to-lead add-on terms apply.
              </p>
            </div>
          ) : (
            <div className="mt-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void searchNumbers();
                    }
                  }}
                  placeholder="For example Birmingham, 0121, or 555"
                  className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                />
                <button
                  type="button"
                  onClick={searchNumbers}
                  disabled={isSearching || !searchText.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSearching ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  {isSearching ? "Searching..." : "Find numbers"}
                </button>
              </div>

              {numbers.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {numbers.map((number) => (
                    <div
                      key={number.phoneNumber}
                      className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-base font-black text-slate-950">
                          {number.phoneNumber}
                        </p>
                        {number.locality ? (
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {number.locality}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => provisionNumber(number.phoneNumber)}
                        disabled={isProvisioning}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-[#19c653] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isProvisioning ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Phone className="size-4" />
                        )}
                        Choose number
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      {message ? (
        <div
          role="status"
          className={`mt-4 flex gap-3 rounded-md border px-4 py-3 text-sm font-semibold ${
            value.provisioningStatus === "active" &&
            message === "Your receptionist number is ready."
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {value.provisioningStatus === "active" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          )}
          {message}
        </div>
      ) : null}
    </div>
  );
}