import { NextResponse } from "next/server";
import {
  getDocumentEmailFromValue,
  hasConfiguredDocumentEmailSettings,
  normalizeDocumentEmailSettings,
  type SendTestEmailPayload,
} from "@/lib/email/document-email";
import {
  buildEmailHtmlBody,
  getFriendlySmtpErrorMessage,
  sendEmailWithFallback,
} from "@/lib/email/smtp-delivery";

export const runtime = "nodejs";

function isSendCustomerMessagePayload(value: unknown): value is SendTestEmailPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SendTestEmailPayload>;

  return (
    typeof candidate.recipient === "string" &&
    typeof candidate.subject === "string" &&
    typeof candidate.message === "string" &&
    Boolean(candidate.settings)
  );
}

export async function POST(request: Request) {
  let requestSettings = normalizeDocumentEmailSettings();

  try {
    const body = (await request.json()) as unknown;

    if (!isSendCustomerMessagePayload(body)) {
      return NextResponse.json(
        { error: "The customer message request was incomplete." },
        { status: 400 }
      );
    }

    const settings = normalizeDocumentEmailSettings(body.settings);
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
