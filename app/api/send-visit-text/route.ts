import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SendVisitTextPayload = {
  to: string;
  message: string;
};

function isSendVisitTextPayload(value: unknown): value is SendVisitTextPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SendVisitTextPayload>;

  return typeof candidate.to === "string" && typeof candidate.message === "string";
}

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  const compact = trimmed.replace(/[\s().-]+/g, "");

  if (!compact) {
    return "";
  }

  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/\D/g, "")}`;
  }

  const digits = compact.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("00")) {
    return `+${digits.slice(2)}`;
  }

  if (digits.startsWith("44")) {
    return `+${digits}`;
  }

  const defaultCountryCode = (
    process.env.SMS_DEFAULT_COUNTRY_CODE || "+44"
  ).replace(/[^\d+]/g, "");

  if (digits.startsWith("0") && defaultCountryCode) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }

  return defaultCountryCode ? `${defaultCountryCode}${digits}` : digits;
}

function getTwilioConfig() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID?.trim() ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN?.trim() ?? "",
    fromNumber: process.env.TWILIO_FROM_NUMBER?.trim() ?? "",
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() ?? "",
    defaultCountryCode: process.env.SMS_DEFAULT_COUNTRY_CODE?.trim() || "+44",
  };
}

function maskValue(value: string) {
  if (!value) return "";
  if (value.length <= 8) return "configured";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function GET() {
  const {
    accountSid,
    authToken,
    fromNumber,
    messagingServiceSid,
    defaultCountryCode,
  } = getTwilioConfig();

  return NextResponse.json({
    configured: Boolean(accountSid && authToken && (fromNumber || messagingServiceSid)),
    accountSidConfigured: Boolean(accountSid),
    authTokenConfigured: Boolean(authToken),
    fromNumber: maskValue(fromNumber),
    messagingServiceSid: maskValue(messagingServiceSid),
    defaultCountryCode,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    if (!isSendVisitTextPayload(body)) {
      return NextResponse.json(
        { error: "The text message request was incomplete." },
        { status: 400 }
      );
    }

    const message = body.message.trim();
    const to = normalizePhoneNumber(body.to);

    if (!to || !message) {
      return NextResponse.json(
        { error: "Add a mobile number and message before sending a text." },
        { status: 400 }
      );
    }

    const { accountSid, authToken, fromNumber, messagingServiceSid } =
      getTwilioConfig();

    if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
      return NextResponse.json(
        {
          error:
            "SMS is not configured yet. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID in Vercel.",
        },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      To: to,
      Body: message,
    });

    if (messagingServiceSid) {
      params.set("MessagingServiceSid", messagingServiceSid);
    } else {
      params.set("From", fromNumber);
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
        accountSid
      )}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${accountSid}:${authToken}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const responseBody = (await response.json().catch(() => null)) as
      | { sid?: string; message?: string }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            responseBody?.message?.trim() ||
            "Twilio could not send the text message.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, sid: responseBody?.sid ?? null, to });
  } catch {
    return NextResponse.json(
      { error: "Unable to send the text message." },
      { status: 500 }
    );
  }
}
