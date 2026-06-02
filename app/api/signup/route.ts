import { NextResponse, type NextRequest } from "next/server";
import { getAdminEmails } from "@/lib/admin/access";
import {
  getPlatformEmailSettings,
  isPlatformEmailConfigured,
  renderEmailTemplate,
  sendPlatformEmail,
} from "@/lib/admin/email-settings";
import { getFriendlySmtpErrorMessage } from "@/lib/email/smtp-delivery";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { getSubscriptionPlan, normalizePlanKey } from "@/lib/billing/plans";

export const runtime = "nodejs";

const PUBLIC_SIGNUP_BASE_URL = "https://roundhq.co.uk";

type SignupRequestBody = {
  companyName?: unknown;
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
  plan?: unknown;
};

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getSignupErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message.trim()
    : fallback;
}

function normalizeSignupEmail(value: unknown) {
  return getText(value).toLowerCase();
}

function isLocalBaseUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();

    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return value.includes("localhost") || value.includes("127.0.0.1");
  }
}

function getSignupBaseUrl(requestUrl: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    const normalizedUrl = configuredUrl.replace(/\/$/, "");

    if (!isLocalBaseUrl(normalizedUrl)) {
      return normalizedUrl;
    }
  }

  try {
    const origin = new URL(requestUrl).origin;

    return origin.includes("localhost") || origin.includes("127.0.0.1")
      ? PUBLIC_SIGNUP_BASE_URL
      : origin;
  } catch {
    return PUBLIC_SIGNUP_BASE_URL;
  }
}

function buildRoundHqConfirmationLink({
  baseUrl,
  actionLink,
  hashedToken,
}: {
  baseUrl: string;
  actionLink: string;
  hashedToken?: string;
}) {
  if (!actionLink) {
    return `${baseUrl}/login?confirmed=1&next=%2Fdashboard`;
  }

  const actionUrl = new URL(actionLink);
  const tokenHash = actionUrl.searchParams.get("token_hash") ?? hashedToken;
  const type = actionUrl.searchParams.get("type") ?? "signup";

  if (!tokenHash) {
    return actionLink;
  }

  const confirmationUrl = new URL("/auth/confirm", baseUrl);
  confirmationUrl.searchParams.set("token_hash", tokenHash);
  confirmationUrl.searchParams.set("type", type);
  confirmationUrl.searchParams.set("next", "/dashboard");

  return confirmationUrl.toString();
}

function buildAdminSignupMessage({
  companyName,
  fullName,
  email,
  planName,
}: {
  companyName: string;
  fullName: string;
  email: string;
  planName: string;
}) {
  return [
    "A new RoundHQ signup has been created.",
    "",
    `Business: ${companyName}`,
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Selected plan: ${planName}`,
    `Signup time: ${new Date().toLocaleString("en-GB")}`,
    "",
    "The customer has been sent their account confirmation email.",
  ].join("\n");
}

async function notifyAdmins(options: {
  recipients: string[];
  companyName: string;
  fullName: string;
  email: string;
  planName: string;
  settings: Awaited<ReturnType<typeof getPlatformEmailSettings>>;
}) {
  if (options.recipients.length === 0) {
    return false;
  }

  await sendPlatformEmail({
    settings: options.settings,
    to: options.recipients.join(","),
    subject: `New RoundHQ signup: ${options.companyName}`,
    message: buildAdminSignupMessage(options),
  });

  return true;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as SignupRequestBody | null;
  const companyName = getText(body?.companyName);
  const fullName = getText(body?.fullName);
  const email = normalizeSignupEmail(body?.email);
  const password = getText(body?.password);
  const plan = normalizePlanKey(getText(body?.plan));
  const planDetails = getSubscriptionPlan(plan);

  if (!companyName) {
    return NextResponse.json(
      { error: "Enter your company name." },
      { status: 400 }
    );
  }

  if (!fullName) {
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const emailSettings = await getPlatformEmailSettings();

  if (!isPlatformEmailConfigured(emailSettings)) {
    return NextResponse.json(
      {
        error:
          "Signup email is not configured yet. Add SMTP details in Admin Settings > Email.",
      },
      { status: 503 }
    );
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return NextResponse.json(
      {
        error:
          "Signup is not fully configured yet. Add the Supabase service role key to the server environment.",
      },
      { status: 503 }
    );
  }

  const supabase = createServiceRoleClient();
  const baseUrl = getSignupBaseUrl(request.url);
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo: `${baseUrl}/login?confirmed=1&next=%2Fdashboard`,
      data: {
        company_name: companyName,
        full_name: fullName,
        selected_plan: plan,
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const linkProperties = data.properties as {
    action_link?: string;
    hashed_token?: string;
  };
  const supabaseActionLink = linkProperties.action_link ?? "";
  const verificationLink = buildRoundHqConfirmationLink({
    baseUrl,
    actionLink: supabaseActionLink,
    hashedToken: linkProperties.hashed_token,
  });
  const userId = data.user.id;

  try {
    await sendPlatformEmail({
      settings: emailSettings,
      to: email,
      subject: renderEmailTemplate(emailSettings.verificationSubjectTemplate, {
        customerName: fullName,
        businessName: companyName,
        verificationLink,
        planName: planDetails.name,
      }),
      message: renderEmailTemplate(emailSettings.verificationMessageTemplate, {
        customerName: fullName,
        businessName: companyName,
        verificationLink,
        planName: planDetails.name,
      }),
    });
  } catch (sendError) {
    await supabase.auth.admin.deleteUser(userId).catch(() => null);

    return NextResponse.json(
      {
        error: getFriendlySmtpErrorMessage(
          sendError,
          emailSettings.smtpPort ?? 587,
          Boolean(emailSettings.smtpSecure)
        ),
      },
      { status: 500 }
    );
  }

  let adminNotified = false;

  try {
    adminNotified = await notifyAdmins({
      recipients: getAdminEmails(),
      companyName,
      fullName,
      email,
      planName: planDetails.name,
      settings: emailSettings,
    });
  } catch (adminEmailError) {
    console.error(
      "New signup was created but admin notification email failed:",
      getSignupErrorMessage(adminEmailError, "Unable to email admin.")
    );
  }

  return NextResponse.json({
    ok: true,
    adminNotified,
  });
}
