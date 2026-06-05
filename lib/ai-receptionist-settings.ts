import type { SupabaseClient } from "@supabase/supabase-js";

export const AI_RECEPTIONIST_SETTINGS_SELECT = [
  "organization_id",
  "enabled",
  "business_name",
  "greeting_message",
  "fallback_phone_number",
  "notification_email",
  "telephony_provider",
  "telnyx_api_key",
  "telnyx_connection_id",
  "telnyx_messaging_profile_id",
  "telnyx_public_key",
  "telnyx_phone_number",
  "twilio_account_sid",
  "twilio_auth_token",
  "twilio_phone_number",
  "realtime_enabled",
  "transfer_to_number",
  "new_lead_sms_enabled",
  "new_lead_sms_phone_number",
  "business_hours_enabled",
  "business_hours",
  "questions_to_ask",
  "emergency_keywords",
  "consent_message",
  "lead_source_label",
  "created_at",
  "updated_at",
].join(",");

export const DEFAULT_AI_RECEPTIONIST_GREETING =
  "Hello, thanks for calling {{business_name}}. I can take your details and ask someone to get back to you.";
export const DEFAULT_AI_RECEPTIONIST_CONSENT =
  "This call may be recorded and transcribed to help us handle your enquiry.";
export const DEFAULT_AI_RECEPTIONIST_QUESTIONS = [
  "Can I take your name?",
  "What is the best phone number to reach you on?",
  "What service do you need?",
  "What is the property address?",
  "Can you briefly describe the job?",
];
export const DEFAULT_AI_RECEPTIONIST_EMERGENCY_KEYWORDS = [
  "urgent",
  "emergency",
  "today",
  "as soon as possible",
];

export const AI_RECEPTIONIST_DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type AiReceptionistDayKey = (typeof AI_RECEPTIONIST_DAY_KEYS)[number];

export type AiReceptionistBusinessHour = {
  enabled: boolean;
  start: string;
  end: string;
};

export type AiReceptionistBusinessHours = Record<
  AiReceptionistDayKey,
  AiReceptionistBusinessHour
>;

export type AiReceptionistTelephonyProvider = "telnyx" | "twilio";

export type AiReceptionistSettings = {
  enabled: boolean;
  businessName: string;
  greetingMessage: string;
  fallbackPhoneNumber: string;
  notificationEmail: string;
  telephonyProvider: AiReceptionistTelephonyProvider;
  telnyxPhoneNumber: string;
  telnyxConnectionId: string;
  telnyxMessagingProfileId: string;
  telnyxPublicKey: string;
  telnyxApiKeyConfigured: boolean;
  twilioAccountSid: string;
  twilioPhoneNumber: string;
  twilioAuthTokenConfigured: boolean;
  realtimeEnabled: boolean;
  transferToNumber: string;
  newLeadSmsEnabled: boolean;
  newLeadSmsPhoneNumber: string;
  businessHoursEnabled: boolean;
  businessHours: AiReceptionistBusinessHours;
  questionsToAsk: string[];
  emergencyKeywords: string[];
  consentMessage: string;
  leadSourceLabel: string;
  createdAt: string | null;
  updatedAt: string | null;
  exists: boolean;
  schemaReady: boolean;
  schemaError?: string;
};

export type AiReceptionistSettingsValidationResult = {
  ok: boolean;
  errors: string[];
};

export type AiReceptionistSettingsRow = {
  organization_id?: string | null;
  enabled: boolean | null;
  business_name: string | null;
  greeting_message: string | null;
  fallback_phone_number: string | null;
  notification_email: string | null;
  telephony_provider?: string | null;
  telnyx_api_key?: string | null;
  telnyx_connection_id?: string | null;
  telnyx_messaging_profile_id?: string | null;
  telnyx_public_key?: string | null;
  telnyx_phone_number?: string | null;
  twilio_account_sid?: string | null;
  twilio_auth_token?: string | null;
  twilio_phone_number?: string | null;
  realtime_enabled?: boolean | null;
  transfer_to_number?: string | null;
  new_lead_sms_enabled?: boolean | null;
  new_lead_sms_phone_number?: string | null;
  business_hours_enabled: boolean | null;
  business_hours: unknown;
  questions_to_ask: unknown;
  emergency_keywords: unknown;
  consent_message: string | null;
  lead_source_label: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AiReceptionistPrivateSettings = AiReceptionistSettings & {
  organizationId: string;
  telnyxApiKey: string;
  twilioAuthToken: string;
};

export type AiReceptionistAccessCheck = {
  organizationRole?: string | null;
  staffRole?: string | null;
  staffIsActive?: boolean | null;
  staffIsSystemAdmin?: boolean | null;
};

const DEFAULT_WEEKDAY_HOURS = {
  enabled: true,
  start: "08:00",
  end: "17:00",
};
const DEFAULT_WEEKEND_HOURS = {
  enabled: false,
  start: "09:00",
  end: "13:00",
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const TWILIO_ACCOUNT_SID_PATTERN = /^AC[a-zA-Z0-9]{8,}$/;
const TELNYX_CONNECTION_ID_PATTERN = /^[a-zA-Z0-9_-]{6,}$/;

export const DEFAULT_AI_RECEPTIONIST_BUSINESS_HOURS: AiReceptionistBusinessHours = {
  monday: DEFAULT_WEEKDAY_HOURS,
  tuesday: DEFAULT_WEEKDAY_HOURS,
  wednesday: DEFAULT_WEEKDAY_HOURS,
  thursday: DEFAULT_WEEKDAY_HOURS,
  friday: DEFAULT_WEEKDAY_HOURS,
  saturday: DEFAULT_WEEKEND_HOURS,
  sunday: DEFAULT_WEEKEND_HOURS,
};

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLimitedText(value: unknown, fallback: string) {
  const text = getText(value) || fallback;
  return text;
}

function normalizeTelephonyProvider(
  value: unknown
): AiReceptionistTelephonyProvider {
  return getText(value).toLowerCase() === "twilio" ? "twilio" : "telnyx";
}

export function normalizeAiReceptionistList(
  value: unknown,
  fallback: string[]
) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n/)
      : [];
  const normalizedValues = values
    .map((entry) => getText(entry))
    .filter(Boolean);

  return normalizedValues.length > 0 ? normalizedValues : [...fallback];
}

function normalizeBusinessHour(
  value: unknown,
  fallback: AiReceptionistBusinessHour
): AiReceptionistBusinessHour {
  const candidate =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const start = getText(candidate.start);
  const end = getText(candidate.end);

  return {
    enabled:
      typeof candidate.enabled === "boolean"
        ? candidate.enabled
        : fallback.enabled,
    start: TIME_PATTERN.test(start) ? start : fallback.start,
    end: TIME_PATTERN.test(end) ? end : fallback.end,
  };
}

export function normalizeAiReceptionistBusinessHours(
  value: unknown
): AiReceptionistBusinessHours {
  const candidate =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    AI_RECEPTIONIST_DAY_KEYS.map((day) => [
      day,
      normalizeBusinessHour(candidate[day], DEFAULT_AI_RECEPTIONIST_BUSINESS_HOURS[day]),
    ])
  ) as AiReceptionistBusinessHours;
}

export function getDefaultAiReceptionistSettings(
  overrides: Partial<AiReceptionistSettings> = {}
): AiReceptionistSettings {
  return {
    enabled: false,
    businessName: "",
    greetingMessage: DEFAULT_AI_RECEPTIONIST_GREETING,
    fallbackPhoneNumber: "",
    notificationEmail: "",
    telephonyProvider: "telnyx",
    telnyxPhoneNumber: "",
    telnyxConnectionId: "",
    telnyxMessagingProfileId: "",
    telnyxPublicKey: "",
    telnyxApiKeyConfigured: false,
    twilioAccountSid: "",
    twilioPhoneNumber: "",
    twilioAuthTokenConfigured: false,
    realtimeEnabled: false,
    transferToNumber: "",
    newLeadSmsEnabled: false,
    newLeadSmsPhoneNumber: "",
    businessHoursEnabled: false,
    businessHours: normalizeAiReceptionistBusinessHours(
      overrides.businessHours ?? DEFAULT_AI_RECEPTIONIST_BUSINESS_HOURS
    ),
    questionsToAsk: [...DEFAULT_AI_RECEPTIONIST_QUESTIONS],
    emergencyKeywords: [...DEFAULT_AI_RECEPTIONIST_EMERGENCY_KEYWORDS],
    consentMessage: DEFAULT_AI_RECEPTIONIST_CONSENT,
    leadSourceLabel: "AI Receptionist",
    createdAt: null,
    updatedAt: null,
    exists: false,
    schemaReady: true,
    ...overrides,
  };
}

export function normalizeAiReceptionistSettings(
  value: Partial<AiReceptionistSettings> | null | undefined
): AiReceptionistSettings {
  const questionsToAsk = Array.isArray(value?.questionsToAsk)
    ? normalizeAiReceptionistList(value.questionsToAsk, [])
    : normalizeAiReceptionistList(
        value?.questionsToAsk,
        DEFAULT_AI_RECEPTIONIST_QUESTIONS
      );
  const emergencyKeywords = Array.isArray(value?.emergencyKeywords)
    ? normalizeAiReceptionistList(value.emergencyKeywords, [])
    : normalizeAiReceptionistList(
        value?.emergencyKeywords,
        DEFAULT_AI_RECEPTIONIST_EMERGENCY_KEYWORDS
      );

  return getDefaultAiReceptionistSettings({
    enabled: Boolean(value?.enabled),
    businessName: getText(value?.businessName),
    greetingMessage: normalizeLimitedText(
      value?.greetingMessage,
      DEFAULT_AI_RECEPTIONIST_GREETING
    ),
    fallbackPhoneNumber: getText(value?.fallbackPhoneNumber),
    notificationEmail: getText(value?.notificationEmail).toLowerCase(),
    telephonyProvider: normalizeTelephonyProvider(value?.telephonyProvider),
    telnyxPhoneNumber: getText(value?.telnyxPhoneNumber),
    telnyxConnectionId: getText(value?.telnyxConnectionId),
    telnyxMessagingProfileId: getText(value?.telnyxMessagingProfileId),
    telnyxPublicKey: getText(value?.telnyxPublicKey),
    telnyxApiKeyConfigured: Boolean(value?.telnyxApiKeyConfigured),
    twilioAccountSid: getText(value?.twilioAccountSid),
    twilioPhoneNumber: getText(value?.twilioPhoneNumber),
    twilioAuthTokenConfigured: Boolean(value?.twilioAuthTokenConfigured),
    realtimeEnabled: false,
    transferToNumber: getText(value?.transferToNumber),
    newLeadSmsEnabled: Boolean(value?.newLeadSmsEnabled),
    newLeadSmsPhoneNumber: getText(value?.newLeadSmsPhoneNumber),
    businessHoursEnabled: Boolean(value?.businessHoursEnabled),
    businessHours: normalizeAiReceptionistBusinessHours(value?.businessHours),
    questionsToAsk,
    emergencyKeywords,
    consentMessage: normalizeLimitedText(
      value?.consentMessage,
      DEFAULT_AI_RECEPTIONIST_CONSENT
    ),
    leadSourceLabel: getText(value?.leadSourceLabel) || "AI Receptionist",
    createdAt: value?.createdAt ?? null,
    updatedAt: value?.updatedAt ?? null,
    exists: Boolean(value?.exists),
    schemaReady: value?.schemaReady ?? true,
    schemaError: value?.schemaError,
  });
}

export function mapAiReceptionistSettingsRow(
  row: AiReceptionistSettingsRow | null
): AiReceptionistSettings {
  if (!row) {
    return getDefaultAiReceptionistSettings();
  }

  return normalizeAiReceptionistSettings({
    enabled: Boolean(row.enabled),
    businessName: row.business_name ?? "",
    greetingMessage: row.greeting_message ?? DEFAULT_AI_RECEPTIONIST_GREETING,
    fallbackPhoneNumber: row.fallback_phone_number ?? "",
    notificationEmail: row.notification_email ?? "",
    telephonyProvider: normalizeTelephonyProvider(row.telephony_provider),
    telnyxPhoneNumber: row.telnyx_phone_number ?? "",
    telnyxConnectionId: row.telnyx_connection_id ?? "",
    telnyxMessagingProfileId: row.telnyx_messaging_profile_id ?? "",
    telnyxPublicKey: row.telnyx_public_key ?? "",
    telnyxApiKeyConfigured: Boolean(row.telnyx_api_key?.trim()),
    twilioAccountSid: row.twilio_account_sid ?? "",
    twilioPhoneNumber: row.twilio_phone_number ?? "",
    twilioAuthTokenConfigured: Boolean(row.twilio_auth_token?.trim()),
    realtimeEnabled: false,
    transferToNumber: row.transfer_to_number ?? "",
    newLeadSmsEnabled: Boolean(row.new_lead_sms_enabled),
    newLeadSmsPhoneNumber: row.new_lead_sms_phone_number ?? "",
    businessHoursEnabled: Boolean(row.business_hours_enabled),
    businessHours: normalizeAiReceptionistBusinessHours(row.business_hours),
    questionsToAsk: normalizeAiReceptionistList(
      row.questions_to_ask,
      DEFAULT_AI_RECEPTIONIST_QUESTIONS
    ),
    emergencyKeywords: normalizeAiReceptionistList(
      row.emergency_keywords,
      DEFAULT_AI_RECEPTIONIST_EMERGENCY_KEYWORDS
    ),
    consentMessage: row.consent_message ?? DEFAULT_AI_RECEPTIONIST_CONSENT,
    leadSourceLabel: row.lead_source_label ?? "AI Receptionist",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    exists: true,
    schemaReady: true,
  });
}

export function mapAiReceptionistSettingsToRow(
  settings: AiReceptionistSettings,
  organizationId: string,
  options: {
    telnyxApiKey?: string;
    twilioAuthToken?: string;
  } = {}
) {
  const row = {
    organization_id: organizationId,
    enabled: settings.enabled,
    business_name: settings.businessName,
    greeting_message: settings.greetingMessage,
    fallback_phone_number: settings.fallbackPhoneNumber,
    notification_email: settings.notificationEmail,
    telephony_provider: settings.telephonyProvider,
    telnyx_phone_number: settings.telnyxPhoneNumber,
    telnyx_connection_id: settings.telnyxConnectionId,
    telnyx_messaging_profile_id: settings.telnyxMessagingProfileId,
    telnyx_public_key: settings.telnyxPublicKey,
    twilio_account_sid: settings.twilioAccountSid,
    twilio_phone_number: settings.twilioPhoneNumber,
    realtime_enabled: false,
    transfer_to_number: settings.transferToNumber,
    new_lead_sms_enabled: settings.newLeadSmsEnabled,
    new_lead_sms_phone_number: settings.newLeadSmsPhoneNumber,
    business_hours_enabled: settings.businessHoursEnabled,
    business_hours: settings.businessHours,
    questions_to_ask: settings.questionsToAsk,
    emergency_keywords: settings.emergencyKeywords,
    consent_message: settings.consentMessage,
    lead_source_label: settings.leadSourceLabel,
    updated_at: new Date().toISOString(),
  };

  return {
    ...row,
    ...(options.telnyxApiKey !== undefined
      ? { telnyx_api_key: options.telnyxApiKey }
      : {}),
    ...(options.twilioAuthToken !== undefined
      ? { twilio_auth_token: options.twilioAuthToken }
      : {}),
  };
}

export function isValidAiReceptionistPhoneNumber(value: string) {
  if (!value) {
    return true;
  }

  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 16 && /^[+\d\s().-]+$/.test(value);
}

export function validateAiReceptionistSettings(
  value: AiReceptionistSettings
): AiReceptionistSettingsValidationResult {
  const settings = normalizeAiReceptionistSettings(value);
  const errors: string[] = [];

  if (settings.notificationEmail && !EMAIL_PATTERN.test(settings.notificationEmail)) {
    errors.push("Enter a valid notification email address.");
  }

  if (
    settings.fallbackPhoneNumber &&
    !isValidAiReceptionistPhoneNumber(settings.fallbackPhoneNumber)
  ) {
    errors.push("Enter a valid fallback phone number.");
  }

  if (
    settings.twilioPhoneNumber &&
    !isValidAiReceptionistPhoneNumber(settings.twilioPhoneNumber)
  ) {
    errors.push("Enter a valid Twilio phone number.");
  }

  if (
    settings.telnyxPhoneNumber &&
    !isValidAiReceptionistPhoneNumber(settings.telnyxPhoneNumber)
  ) {
    errors.push("Enter a valid Telnyx phone number.");
  }

  if (
    settings.newLeadSmsPhoneNumber &&
    !isValidAiReceptionistPhoneNumber(settings.newLeadSmsPhoneNumber)
  ) {
    errors.push("Enter a valid new lead SMS phone number.");
  }

  if (
    settings.transferToNumber &&
    !isValidAiReceptionistPhoneNumber(settings.transferToNumber)
  ) {
    errors.push("Enter a valid transfer phone number.");
  }

  if (
    settings.twilioAccountSid &&
    !TWILIO_ACCOUNT_SID_PATTERN.test(settings.twilioAccountSid)
  ) {
    errors.push("Enter a valid Twilio Account SID.");
  }

  if (
    settings.telnyxConnectionId &&
    !TELNYX_CONNECTION_ID_PATTERN.test(settings.telnyxConnectionId)
  ) {
    errors.push("Enter a valid Telnyx connection or call control app ID.");
  }

  const hasAnyTelnyxConnectionValue = Boolean(
    settings.telnyxPhoneNumber ||
      settings.telnyxConnectionId ||
      settings.telnyxMessagingProfileId ||
      settings.telnyxPublicKey ||
      settings.telnyxApiKeyConfigured
  );

  if (
    (settings.telephonyProvider === "telnyx" || hasAnyTelnyxConnectionValue) &&
    hasAnyTelnyxConnectionValue &&
    (!settings.telnyxPhoneNumber ||
      !settings.telnyxPublicKey ||
      !settings.telnyxApiKeyConfigured)
  ) {
    errors.push(
      "Add the Telnyx phone number, API key, and public key to connect Telnyx."
    );
  }

  if (
    settings.enabled &&
    settings.telephonyProvider === "telnyx" &&
    (!settings.telnyxPhoneNumber ||
      !settings.telnyxPublicKey ||
      !settings.telnyxApiKeyConfigured)
  ) {
    errors.push(
      "Connect Telnyx before enabling AI Receptionist voicemail-to-lead."
    );
  }

  if (
    settings.newLeadSmsEnabled &&
    (!settings.telnyxMessagingProfileId ||
      !settings.newLeadSmsPhoneNumber ||
      !settings.telnyxApiKeyConfigured)
  ) {
    errors.push(
      "Add a Telnyx messaging profile, SMS destination number, and API key before enabling SMS notifications."
    );
  }

  const hasAnyTwilioConnectionValue = Boolean(
    settings.twilioAccountSid ||
      settings.twilioPhoneNumber ||
      settings.twilioAuthTokenConfigured
  );

  if (
    (settings.telephonyProvider === "twilio" || hasAnyTwilioConnectionValue) &&
    hasAnyTwilioConnectionValue &&
    (!settings.twilioAccountSid ||
      !settings.twilioPhoneNumber ||
      !settings.twilioAuthTokenConfigured)
  ) {
    errors.push(
      "Add the Twilio Account SID, Auth Token, and phone number to connect Twilio."
    );
  }

  if (settings.greetingMessage.length > 1000) {
    errors.push("Greeting message must be 1,000 characters or fewer.");
  }

  if (settings.consentMessage.length > 1000) {
    errors.push("Consent message must be 1,000 characters or fewer.");
  }

  if (settings.enabled && !settings.businessName) {
    errors.push("Business name is required when AI Receptionist is enabled.");
  }

  if (settings.enabled && settings.questionsToAsk.length === 0) {
    errors.push("Add at least one question before enabling AI Receptionist.");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function canManageAiReceptionistSettings(access: AiReceptionistAccessCheck) {
  if (access.organizationRole === "owner" || access.organizationRole === "admin") {
    return true;
  }

  if (!access.staffIsActive) {
    return false;
  }

  return Boolean(access.staffIsSystemAdmin) || access.staffRole === "Admin";
}

export async function getOrCreateAiReceptionistSettings(
  supabase: SupabaseClient,
  organizationId: string
) {
  const { data, error } = await supabase
    .from("ai_receptionist_settings")
    .select(AI_RECEPTIONIST_SETTINGS_SELECT)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    return getDefaultAiReceptionistSettings({
      schemaReady: false,
      schemaError: error.message,
    });
  }

  if (data) {
    return mapAiReceptionistSettingsRow(data as unknown as AiReceptionistSettingsRow);
  }

  const defaults = getDefaultAiReceptionistSettings();
  const { data: insertedData, error: insertError } = await supabase
    .from("ai_receptionist_settings")
    .insert(mapAiReceptionistSettingsToRow(defaults, organizationId))
    .select(AI_RECEPTIONIST_SETTINGS_SELECT)
    .maybeSingle();

  if (insertError) {
    return getDefaultAiReceptionistSettings({
      schemaReady: false,
      schemaError: insertError.message,
    });
  }

  return mapAiReceptionistSettingsRow(
    insertedData as unknown as AiReceptionistSettingsRow | null
  );
}
