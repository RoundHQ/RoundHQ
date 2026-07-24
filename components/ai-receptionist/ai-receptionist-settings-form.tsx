"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Phone,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import {
  AI_RECEPTIONIST_DAY_KEYS,
  type AiReceptionistBusinessHours,
  type AiReceptionistDayKey,
  type AiReceptionistSettings,
} from "@/lib/ai-receptionist-settings";
import {
  updateAiReceptionistSettingsAction,
  type AiReceptionistSettingsActionState,
} from "@/app/settings/ai-receptionist/actions";
import AiReceptionistPhoneSetup, {
  type AiReceptionistPhoneSetupState,
} from "@/components/ai-receptionist/ai-receptionist-phone-setup";

type Props = {
  initialSettings: AiReceptionistSettings;
  workspaceName: string;
};

const DAY_LABELS: Record<AiReceptionistDayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)] sm:p-6">
      <h2 className="text-lg font-extrabold tracking-normal text-slate-950">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
  maxLength,
  rows = 4,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <textarea
        name={name}
        value={value}
        rows={rows}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
      />
      <span className="mt-1 block text-right text-xs font-semibold text-slate-400">
        {value.length} / {maxLength}
      </span>
    </label>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function normalizeDraftList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function moveListItem(values: string[], index: number, direction: -1 | 1) {
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= values.length) {
    return values;
  }

  const nextValues = [...values];
  const [item] = nextValues.splice(index, 1);
  nextValues.splice(targetIndex, 0, item);
  return nextValues;
}

export default function AiReceptionistSettingsForm({
  initialSettings,
  workspaceName,
}: Props) {
  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [businessName, setBusinessName] = useState(initialSettings.businessName);
  const [notificationEmail, setNotificationEmail] = useState(
    initialSettings.notificationEmail
  );
  const [fallbackPhoneNumber, setFallbackPhoneNumber] = useState(
    initialSettings.fallbackPhoneNumber
  );
  const [phoneSetup, setPhoneSetup] = useState<AiReceptionistPhoneSetupState>({
    phoneNumber: initialSettings.telnyxPhoneNumber,
    setupMode: initialSettings.phoneSetupMode,
    existingBusinessPhoneNumber: initialSettings.existingBusinessPhoneNumber,
    provisioningStatus: initialSettings.phoneProvisioningStatus,
    provisioningError: initialSettings.phoneProvisioningError,
  });
  const [newLeadSmsEnabled, setNewLeadSmsEnabled] = useState(
    initialSettings.newLeadSmsEnabled
  );
  const [newLeadSmsPhoneNumber, setNewLeadSmsPhoneNumber] = useState(
    initialSettings.newLeadSmsPhoneNumber
  );
  const [testSmsNumber, setTestSmsNumber] = useState(
    initialSettings.newLeadSmsPhoneNumber ||
      initialSettings.fallbackPhoneNumber ||
      ""
  );
  const [greetingMessage, setGreetingMessage] = useState(
    initialSettings.greetingMessage
  );
  const [consentMessage, setConsentMessage] = useState(
    initialSettings.consentMessage
  );
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(
    initialSettings.businessHoursEnabled
  );
  const [businessHours, setBusinessHours] = useState<AiReceptionistBusinessHours>(
    initialSettings.businessHours
  );
  const [questions, setQuestions] = useState(initialSettings.questionsToAsk);
  const [newQuestion, setNewQuestion] = useState("");
  const [emergencyKeywords, setEmergencyKeywords] = useState(
    initialSettings.emergencyKeywords
  );
  const [newKeyword, setNewKeyword] = useState("");
  const [leadSourceLabel, setLeadSourceLabel] = useState(
    initialSettings.leadSourceLabel
  );
  const initialActionState = useMemo<AiReceptionistSettingsActionState>(
    () => ({
      ok: false,
      message: "",
      errors: [],
      settings: initialSettings,
    }),
    [initialSettings]
  );
  const [actionState, formAction, isPending] = useActionState(
    updateAiReceptionistSettingsAction,
    initialActionState
  );
  const normalizedQuestions = normalizeDraftList(questions);
  const normalizedKeywords = normalizeDraftList(emergencyKeywords);
  const statusLabel = enabled ? "Enabled" : "Disabled";
  const providerConnected = Boolean(
    phoneSetup.phoneNumber.trim() && phoneSetup.provisioningStatus === "active"
  );

  function updateBusinessHours(
    day: AiReceptionistDayKey,
    value: Partial<AiReceptionistBusinessHours[AiReceptionistDayKey]>
  ) {
    setBusinessHours((current) => ({
      ...current,
      [day]: {
        ...current[day],
        ...value,
      },
    }));
  }

  function addQuestion() {
    const question = newQuestion.trim();

    if (!question) {
      return;
    }

    setQuestions((current) => [...current, question]);
    setNewQuestion("");
  }

  function addKeyword() {
    const keyword = newKeyword.trim();

    if (!keyword) {
      return;
    }

    setEmergencyKeywords((current) => [...current, keyword]);
    setNewKeyword("");
  }

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="business_hours_json"
        value={JSON.stringify(businessHours)}
      />
      <input
        type="hidden"
        name="questions_to_ask_json"
        value={JSON.stringify(normalizedQuestions)}
      />
      <input
        type="hidden"
        name="emergency_keywords_json"
        value={JSON.stringify(normalizedKeywords)}
      />

      <input type="hidden" name="realtime_enabled" value="false" />

      {actionState.message ? (
        <div
          role="status"
          className={`rounded-md border px-4 py-3 text-sm font-semibold ${
            actionState.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {actionState.message}
        </div>
      ) : null}

      <Section title="Status">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              name="enabled"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="size-5 accent-[#19c653]"
            />
            Enable voicemail-to-lead
          </label>
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
              enabled
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mt-4 flex gap-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          This pilot answers with a fixed greeting, records the caller after the beep, and creates a lead after Telnyx transcription. It is not a live AI conversation.
        </div>

        {enabled && !providerConnected ? (
          <div className="mt-4 flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            AI Receptionist is enabled, but the receptionist phone number is not ready yet.
          </div>
        ) : null}

        {enabled && providerConnected ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Voicemail-to-lead is enabled on {phoneSetup.phoneNumber}. Place a test call before routing live business calls.
          </div>
        ) : null}
      </Section>

      <Section title="Business Details">
        <div className="grid gap-5 md:grid-cols-3">
          <TextField
            label="Business name"
            name="business_name"
            value={businessName}
            onChange={setBusinessName}
            placeholder={workspaceName}
          />
          <TextField
            label="Notification email"
            name="notification_email"
            type="email"
            value={notificationEmail}
            onChange={setNotificationEmail}
            placeholder="office@example.co.uk"
          />
          <TextField
            label="Fallback phone number (future live calls)"
            name="fallback_phone_number"
            value={fallbackPhoneNumber}
            onChange={setFallbackPhoneNumber}
            placeholder="07712 345678"
          />
        </div>
        <div className="mt-5">
          <TextField
            label="Lead source label (future live calls)"
            name="lead_source_label"
            value={leadSourceLabel}
            onChange={setLeadSourceLabel}
          />
        </div>
      </Section>

      <Section title="Greeting & Consent">
        <div className="grid gap-5 lg:grid-cols-2">
          <TextAreaField
            label="Greeting message"
            name="greeting_message"
            value={greetingMessage}
            onChange={setGreetingMessage}
            maxLength={1000}
            rows={5}
          />
          <TextAreaField
            label="Consent/recording message"
            name="consent_message"
            value={consentMessage}
            onChange={setConsentMessage}
            maxLength={1000}
            rows={5}
          />
        </div>
      </Section>

      <Section title="Questions">
        <p className="mb-4 text-sm font-semibold text-slate-500">
          Reserved for the later live-conversation phase. These questions do not
          change the voicemail prompt used by this pilot.
        </p>
        <div className="space-y-3">
          {questions.map((question, index) => (
            <div
              key={`${question}-${index}`}
              className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto]"
            >
              <input
                value={question}
                onChange={(event) =>
                  setQuestions((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index ? event.target.value : entry
                    )
                  )
                }
                className="min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#19c653] focus:ring-4 focus:ring-[#19c653]/12"
              />
              <div className="flex gap-2">
                <IconButton
                  label="Move question up"
                  onClick={() => setQuestions((current) => moveListItem(current, index, -1))}
                  disabled={index === 0}
                >
                  <ChevronUp className="size-4" />
                </IconButton>
                <IconButton
                  label="Move question down"
                  onClick={() => setQuestions((current) => moveListItem(current, index, 1))}
                  disabled={index === questions.length - 1}
                >
                  <ChevronDown className="size-4" />
                </IconButton>
                <IconButton
                  label="Remove question"
                  onClick={() =>
                    setQuestions((current) =>
                      current.filter((_, entryIndex) => entryIndex !== index)
                    )
                  }
                  disabled={questions.length <= 1}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={newQuestion}
            onChange={(event) => setNewQuestion(event.target.value)}
            placeholder="Add another question"
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
          />
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <Plus className="size-4" />
            Add question
          </button>
        </div>
      </Section>

      <Section title="Business Hours">
        <p className="mb-4 text-sm font-semibold text-slate-500">
          Reserved for the later live-conversation phase. The voicemail pilot
          currently answers at all times when enabled.
        </p>
        <label className="mb-4 flex items-center gap-3 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            name="business_hours_enabled"
            checked={businessHoursEnabled}
            onChange={(event) => setBusinessHoursEnabled(event.target.checked)}
            className="size-5 accent-[#19c653]"
          />
          Use business hours
        </label>

        <div className="grid gap-3">
          {AI_RECEPTIONIST_DAY_KEYS.map((day) => (
            <div
              key={day}
              className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[150px_1fr_1fr]"
            >
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={businessHours[day].enabled}
                  onChange={(event) =>
                    updateBusinessHours(day, { enabled: event.target.checked })
                  }
                  className="size-4 accent-[#19c653]"
                />
                {DAY_LABELS[day]}
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Clock className="size-4 text-slate-400" />
                <input
                  type="time"
                  value={businessHours[day].start}
                  onChange={(event) =>
                    updateBusinessHours(day, { start: event.target.value })
                  }
                  className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#19c653]"
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Clock className="size-4 text-slate-400" />
                <input
                  type="time"
                  value={businessHours[day].end}
                  onChange={(event) =>
                    updateBusinessHours(day, { end: event.target.value })
                  }
                  className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#19c653]"
                />
              </label>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Emergency Keywords">
        <p className="mb-4 text-sm font-semibold text-slate-500">
          Reserved for the later live-conversation phase. Voicemail leads are
          not automatically escalated from these keywords in this pilot.
        </p>
        <div className="flex flex-wrap gap-2">
          {emergencyKeywords.map((keyword, index) => (
            <span
              key={`${keyword}-${index}`}
              className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-sm font-bold text-rose-700 ring-1 ring-rose-200"
            >
              {keyword}
              <button
                type="button"
                onClick={() =>
                  setEmergencyKeywords((current) =>
                    current.filter((_, entryIndex) => entryIndex !== index)
                  )
                }
                className="inline-flex size-5 items-center justify-center rounded-full hover:bg-rose-100"
                aria-label={`Remove ${keyword}`}
                title={`Remove ${keyword}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={newKeyword}
            onChange={(event) => setNewKeyword(event.target.value)}
            placeholder="Add keyword"
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <Plus className="size-4" />
            Add keyword
          </button>
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
              <Phone className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold tracking-normal text-slate-950">
                  Phone Connection
                </h2>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                    providerConnected
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : phoneSetup.provisioningStatus === "ordering" ||
                          phoneSetup.provisioningStatus === "pending"
                        ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                        : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  {providerConnected
                    ? "Ready"
                    : phoneSetup.provisioningStatus === "ordering" ||
                        phoneSetup.provisioningStatus === "pending"
                      ? "Setting up"
                      : "Not configured"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Keep your existing business number with call forwarding, or choose a new UK number for the receptionist.
              </p>

              <AiReceptionistPhoneSetup
                value={phoneSetup}
                onChange={setPhoneSetup}
              />

              <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      name="new_lead_sms_enabled"
                      checked={newLeadSmsEnabled}
                      onChange={(event) =>
                        setNewLeadSmsEnabled(event.target.checked)
                      }
                      disabled={!providerConnected}
                      className="size-5 accent-[#19c653] disabled:opacity-50"
                    />
                    Send new lead SMS
                  </label>
                  <TextField
                    label="New lead SMS number"
                    name="new_lead_sms_phone_number"
                    value={newLeadSmsPhoneNumber}
                    onChange={setNewLeadSmsPhoneNumber}
                    placeholder="+447700900123"
                  />
                  <TextField
                    label="Test SMS number"
                    name="test_sms_number"
                    value={testSmsNumber}
                    onChange={setTestSmsNumber}
                    placeholder="+447700900123"
                  />
                  <button
                    type="submit"
                    name="action_intent"
                    value="send_test_sms"
                    disabled={
                      isPending || !providerConnected || !testSmsNumber.trim()
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="size-4" />
                    Send test SMS
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-24 items-center justify-center gap-3 rounded-lg bg-[#19c653] px-5 py-4 text-sm font-black text-white shadow-[0_18px_46px_rgba(25,198,83,0.24)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="size-5" />
          {isPending ? "Saving..." : "Save AI Receptionist settings"}
        </button>
      </div>

    </form>
  );
}
