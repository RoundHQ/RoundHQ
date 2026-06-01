import {
  getDocumentEmailFromValue,
  hasConfiguredDocumentEmailSettings,
  normalizeDocumentEmailSettings,
  type DocumentEmailSettings,
} from "@/lib/email/document-email";
import { buildEmailHtmlBody, sendEmailWithFallback } from "@/lib/email/smtp-delivery";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";

export type PlatformEmailSettings = DocumentEmailSettings & {
  invoiceAutomationEnabled: boolean;
  invoiceDaysBeforeDue: number;
  invoiceSubjectTemplate: string;
  invoiceMessageTemplate: string;
  verificationSubjectTemplate: string;
  verificationMessageTemplate: string;
  updatedAt: string | null;
  passwordConfigured: boolean;
  schemaReady: boolean;
  schemaError?: string;
};

type PlatformEmailSettingsRow = {
  email_from_name: string | null;
  email_from_address: string | null;
  email_reply_to: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_username: string | null;
  smtp_password: string | null;
  invoice_automation_enabled: boolean | null;
  invoice_days_before_due: number | null;
  invoice_subject_template: string | null;
  invoice_message_template: string | null;
  verification_subject_template: string | null;
  verification_message_template: string | null;
  updated_at: string | null;
};

export const DEFAULT_INVOICE_SUBJECT_TEMPLATE =
  "Invoice {{invoiceNumber}} from {{businessName}}";

export const DEFAULT_INVOICE_MESSAGE_TEMPLATE = [
  "Hi {{customerName}},",
  "",
  "Please find invoice {{invoiceNumber}} attached.",
  "",
  "Total: {{invoiceTotal}}",
  "Due date: {{dueDate}}",
  "",
  "Kind regards,",
  "{{businessName}}",
].join("\n");

export const DEFAULT_VERIFICATION_SUBJECT_TEMPLATE =
  "Confirm your RoundHQ account";

export const DEFAULT_VERIFICATION_MESSAGE_TEMPLATE = [
  "Hi {{customerName}},",
  "",
  "Thanks for signing up to RoundHQ.",
  "Your 30-day free trial starts when you open your workspace.",
  "",
  "Confirm your account here:",
  "{{verificationLink}}",
  "",
  "This link verifies your email address and opens your RoundHQ workspace.",
  "",
  "Kind regards,",
  "RoundHQ",
].join("\n");

const SETTINGS_SELECT = [
  "email_from_name",
  "email_from_address",
  "email_reply_to",
  "smtp_host",
  "smtp_port",
  "smtp_secure",
  "smtp_username",
  "smtp_password",
  "invoice_automation_enabled",
  "invoice_days_before_due",
  "invoice_subject_template",
  "invoice_message_template",
  "verification_subject_template",
  "verification_message_template",
  "updated_at",
].join(", ");

function asPositiveInteger(value: unknown, fallback: number) {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function getDefaultPlatformEmailSettings(
  overrides: Partial<PlatformEmailSettings> = {}
): PlatformEmailSettings {
  return {
    emailFromName: "RoundHQ",
    emailFromAddress: "",
    emailReplyTo: "",
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUsername: "",
    smtpPassword: "",
    invoiceAutomationEnabled: false,
    invoiceDaysBeforeDue: 7,
    invoiceSubjectTemplate: DEFAULT_INVOICE_SUBJECT_TEMPLATE,
    invoiceMessageTemplate: DEFAULT_INVOICE_MESSAGE_TEMPLATE,
    verificationSubjectTemplate: DEFAULT_VERIFICATION_SUBJECT_TEMPLATE,
    verificationMessageTemplate: DEFAULT_VERIFICATION_MESSAGE_TEMPLATE,
    updatedAt: null,
    passwordConfigured: false,
    schemaReady: true,
    ...overrides,
  };
}

export function mapPlatformEmailSettingsRow(
  row: PlatformEmailSettingsRow | null
): PlatformEmailSettings {
  if (!row) {
    return getDefaultPlatformEmailSettings();
  }

  const emailSettings = normalizeDocumentEmailSettings({
    emailFromName: row.email_from_name ?? undefined,
    emailFromAddress: row.email_from_address ?? undefined,
    emailReplyTo: row.email_reply_to ?? undefined,
    smtpHost: row.smtp_host ?? undefined,
    smtpPort: row.smtp_port ?? 587,
    smtpSecure: Boolean(row.smtp_secure),
    smtpUsername: row.smtp_username ?? undefined,
    smtpPassword: row.smtp_password ?? undefined,
  });

  return getDefaultPlatformEmailSettings({
    ...emailSettings,
    invoiceAutomationEnabled: Boolean(row.invoice_automation_enabled),
    invoiceDaysBeforeDue: asPositiveInteger(row.invoice_days_before_due, 7),
    invoiceSubjectTemplate:
      row.invoice_subject_template?.trim() || DEFAULT_INVOICE_SUBJECT_TEMPLATE,
    invoiceMessageTemplate:
      row.invoice_message_template?.trim() || DEFAULT_INVOICE_MESSAGE_TEMPLATE,
    verificationSubjectTemplate:
      row.verification_subject_template?.trim() ||
      DEFAULT_VERIFICATION_SUBJECT_TEMPLATE,
    verificationMessageTemplate:
      row.verification_message_template?.trim() ||
      DEFAULT_VERIFICATION_MESSAGE_TEMPLATE,
    updatedAt: row.updated_at,
    passwordConfigured: Boolean(row.smtp_password?.trim()),
  });
}

export async function getPlatformEmailSettings() {
  if (!isSupabaseServiceRoleConfigured()) {
    return getDefaultPlatformEmailSettings({
      schemaReady: false,
      schemaError: "Supabase service role credentials are not configured.",
    });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("platform_email_settings")
    .select(SETTINGS_SELECT)
    .eq("id", "primary")
    .maybeSingle();

  if (error) {
    return getDefaultPlatformEmailSettings({
      schemaReady: false,
      schemaError: error.message,
    });
  }

  return mapPlatformEmailSettingsRow(data as PlatformEmailSettingsRow | null);
}

export function isPlatformEmailConfigured(settings: PlatformEmailSettings) {
  return hasConfiguredDocumentEmailSettings(settings);
}

export function renderEmailTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>
) {
  return Object.entries(values).reduce((body, [key, value]) => {
    const normalized = value == null ? "" : String(value);
    return body.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), normalized);
  }, template);
}

export async function sendPlatformEmail(options: {
  settings: PlatformEmailSettings;
  to: string;
  subject: string;
  message: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}) {
  await sendEmailWithFallback({
    settings: normalizeDocumentEmailSettings(options.settings),
    mailOptions: {
      from: getDocumentEmailFromValue(options.settings),
      to: options.to,
      replyTo: options.settings.emailReplyTo || undefined,
      subject: options.subject,
      text: options.message,
      html: buildEmailHtmlBody(options.message),
      attachments: options.attachments,
    },
  });
}
