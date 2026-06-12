import { NextResponse } from "next/server";
import {
  getPlatformEmailSettings,
  isPlatformEmailConfigured,
} from "@/lib/admin/email-settings";
import {
  getDocumentEmailAttachmentTooLargeMessage,
  getDocumentEmailFromValue,
  hasConfiguredDocumentEmailSettings,
  MAX_DOCUMENT_EMAIL_ATTACHMENT_BYTES,
  normalizeDocumentEmailSettings,
  type DocumentEmailSettings,
  type SendDocumentEmailPayload,
} from "@/lib/email/document-email";
import {
  buildEmailHtmlBody,
  getFriendlySmtpErrorMessage,
  sendEmailWithFallback,
} from "@/lib/email/smtp-delivery";

export const runtime = "nodejs";

const MAX_DOCUMENT_EMAIL_REQUEST_BYTES =
  MAX_DOCUMENT_EMAIL_ATTACHMENT_BYTES + 512 * 1024;

type ParsedDocumentEmailRequest = {
  recipients: string[];
  subject: string;
  message: string;
  filename: string;
  settings: DocumentEmailSettings;
  pdfBuffer: Buffer;
};

function isSendDocumentEmailPayload(value: unknown): value is SendDocumentEmailPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SendDocumentEmailPayload>;

  return (
    typeof candidate.recipient === "string" &&
    (candidate.recipients === undefined ||
      (Array.isArray(candidate.recipients) &&
        candidate.recipients.every((recipient) => typeof recipient === "string"))) &&
    typeof candidate.subject === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.filename === "string" &&
    typeof candidate.pdfBase64 === "string" &&
    Boolean(candidate.settings)
  );
}

function getRequestContentLength(request: Request) {
  const rawValue = request.headers.get("content-length");
  const contentLength = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;

  return Number.isFinite(contentLength) && contentLength > 0
    ? contentLength
    : null;
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.arrayBuffer === "function" &&
    typeof value.size === "number"
  );
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function normalizeDocumentRecipients(values: Array<string | null | undefined>) {
  const recipientMap = new Map<string, string>();

  for (const value of values) {
    const trimmedValue = value?.trim();

    if (!trimmedValue) {
      continue;
    }

    recipientMap.set(trimmedValue.toLowerCase(), trimmedValue);
  }

  return Array.from(recipientMap.values());
}

function parseDocumentRecipientList(value: string) {
  if (!value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (recipient): recipient is string => typeof recipient === "string"
    );
  } catch {
    return [];
  }
}

function parseDocumentEmailSettings(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object"
      ? normalizeDocumentEmailSettings(parsed as Partial<DocumentEmailSettings>)
      : null;
  } catch {
    return null;
  }
}

async function parseDocumentEmailFormData(
  request: Request
): Promise<ParsedDocumentEmailRequest | null> {
  const formData = await request.formData();
  const pdfFile = formData.get("pdf");
  const settings = parseDocumentEmailSettings(getFormString(formData, "settings"));

  if (!isUploadFile(pdfFile) || !settings) {
    return null;
  }

  const filename =
    getFormString(formData, "filename") || pdfFile.name || "document.pdf";

  return {
    recipients: normalizeDocumentRecipients([
      ...parseDocumentRecipientList(getFormString(formData, "recipients")),
      getFormString(formData, "recipient"),
    ]),
    subject: getFormString(formData, "subject"),
    message: getFormString(formData, "message"),
    filename,
    settings,
    pdfBuffer: Buffer.from(await pdfFile.arrayBuffer()),
  };
}

async function parseDocumentEmailJson(
  request: Request
): Promise<ParsedDocumentEmailRequest | null> {
  const body = (await request.json()) as unknown;

  if (!isSendDocumentEmailPayload(body)) {
    return null;
  }

  return {
    recipients: normalizeDocumentRecipients([
      ...(body.recipients ?? []),
      body.recipient,
    ]),
    subject: body.subject,
    message: body.message,
    filename: body.filename,
    settings: normalizeDocumentEmailSettings(body.settings),
    pdfBuffer: Buffer.from(body.pdfBase64, "base64"),
  };
}

async function parseDocumentEmailRequest(
  request: Request
): Promise<ParsedDocumentEmailRequest | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";

  if (contentType.includes("multipart/form-data")) {
    return parseDocumentEmailFormData(request);
  }

  return parseDocumentEmailJson(request);
}

export async function POST(request: Request) {
  let requestSettings = normalizeDocumentEmailSettings();

  try {
    const contentLength = getRequestContentLength(request);

    if (
      contentLength !== null &&
      contentLength > MAX_DOCUMENT_EMAIL_REQUEST_BYTES
    ) {
      return NextResponse.json(
        { error: getDocumentEmailAttachmentTooLargeMessage() },
        { status: 413 }
      );
    }

    const body = await parseDocumentEmailRequest(request).catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "The email request was incomplete." },
        { status: 400 }
      );
    }

    const platformSettings = await getPlatformEmailSettings();
    const settings = isPlatformEmailConfigured(platformSettings)
      ? platformSettings
      : normalizeDocumentEmailSettings(body.settings);
    requestSettings = settings;

    if (body.pdfBuffer.byteLength > MAX_DOCUMENT_EMAIL_ATTACHMENT_BYTES) {
      return NextResponse.json(
        { error: getDocumentEmailAttachmentTooLargeMessage() },
        { status: 413 }
      );
    }

    if (!hasConfiguredDocumentEmailSettings(settings)) {
      return NextResponse.json(
        {
          error:
            "Email sending is not configured yet. Add your SMTP details in Settings > Email first.",
        },
        { status: 400 }
      );
    }

    if (body.recipients.length === 0) {
      return NextResponse.json(
        { error: "Choose at least one email address." },
        { status: 400 }
      );
    }

    await sendEmailWithFallback({
      settings,
      mailOptions: {
        from: getDocumentEmailFromValue(settings),
        to: body.recipients,
        replyTo: settings.emailReplyTo || undefined,
        subject: body.subject.trim(),
        text: body.message,
        html: buildEmailHtmlBody(body.message),
        attachments: [
          {
            filename: body.filename.trim() || "document.pdf",
            content: body.pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = getFriendlySmtpErrorMessage(
      error,
      requestSettings.smtpPort ?? 587,
      Boolean(requestSettings.smtpSecure)
    );

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
