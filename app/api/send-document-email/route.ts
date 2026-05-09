import { NextResponse } from "next/server";
import {
  getPlatformEmailSettings,
  isPlatformEmailConfigured,
} from "@/lib/admin/email-settings";
import {
  getDocumentEmailFromValue,
  hasConfiguredDocumentEmailSettings,
  normalizeDocumentEmailSettings,
  type SendDocumentEmailPayload,
} from "@/lib/email/document-email";
import {
  buildEmailHtmlBody,
  getFriendlySmtpErrorMessage,
  sendEmailWithFallback,
} from "@/lib/email/smtp-delivery";

export const runtime = "nodejs";

function isSendDocumentEmailPayload(value: unknown): value is SendDocumentEmailPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SendDocumentEmailPayload>;

  return (
    typeof candidate.recipient === "string" &&
    typeof candidate.subject === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.filename === "string" &&
    typeof candidate.pdfBase64 === "string" &&
    Boolean(candidate.settings)
  );
}

export async function POST(request: Request) {
  let requestSettings = normalizeDocumentEmailSettings();

  try {
    const body = (await request.json()) as unknown;

    if (!isSendDocumentEmailPayload(body)) {
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

    if (!hasConfiguredDocumentEmailSettings(settings)) {
      return NextResponse.json(
        {
          error:
            "Email sending is not configured yet. Add your SMTP details in Settings > Email first.",
        },
        { status: 400 }
      );
    }

    await sendEmailWithFallback({
      settings,
      mailOptions: {
        from: getDocumentEmailFromValue(settings),
        to: body.recipient.trim(),
        replyTo: settings.emailReplyTo || undefined,
        subject: body.subject.trim(),
        text: body.message,
        html: buildEmailHtmlBody(body.message),
        attachments: [
          {
            filename: body.filename.trim() || "document.pdf",
            content: Buffer.from(body.pdfBase64, "base64"),
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
