export type DocumentEmailSettings = {
  emailFromName?: string;
  emailFromAddress?: string;
  emailReplyTo?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
};

export type SendDocumentEmailPayload = {
  recipient: string;
  subject: string;
  message: string;
  filename: string;
  pdfBase64: string;
  settings: DocumentEmailSettings;
};

export type SendTestEmailPayload = {
  recipient: string;
  subject: string;
  message: string;
  settings: DocumentEmailSettings;
};

export function normalizeDocumentEmailSettings(
  value?: Partial<DocumentEmailSettings> | null
): DocumentEmailSettings {
  const smtpPort =
    typeof value?.smtpPort === "number"
      ? value.smtpPort
      : Number(value?.smtpPort ?? 587);

  return {
    emailFromName: value?.emailFromName?.trim() || "",
    emailFromAddress: value?.emailFromAddress?.trim() || "",
    emailReplyTo: value?.emailReplyTo?.trim() || "",
    smtpHost: value?.smtpHost?.trim() || "",
    smtpPort: Number.isFinite(smtpPort) && smtpPort > 0 ? smtpPort : 587,
    smtpSecure: Boolean(value?.smtpSecure),
    smtpUsername: value?.smtpUsername?.trim() || "",
    smtpPassword: value?.smtpPassword?.trim() || "",
  };
}

export function hasConfiguredDocumentEmailSettings(
  value?: Partial<DocumentEmailSettings> | null
) {
  const settings = normalizeDocumentEmailSettings(value);

  return Boolean(
    settings.emailFromAddress &&
      settings.smtpHost &&
      settings.smtpUsername &&
      settings.smtpPassword &&
      settings.smtpPort
  );
}

export function getDocumentEmailFromValue(
  value?: Partial<DocumentEmailSettings> | null
) {
  const settings = normalizeDocumentEmailSettings(value);

  if (!settings.emailFromAddress) {
    return "";
  }

  if (!settings.emailFromName) {
    return settings.emailFromAddress;
  }

  const safeName = settings.emailFromName.replace(/"/g, "'");
  return `"${safeName}" <${settings.emailFromAddress}>`;
}
