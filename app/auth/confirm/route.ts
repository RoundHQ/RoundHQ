import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/stripe/server";

export const runtime = "nodejs";

const SUPPORTED_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function getSafeNextPath(value: string | null) {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/dashboard";
}

function normalizeOtpType(value: string | null): EmailOtpType {
  return SUPPORTED_OTP_TYPES.has(value as EmailOtpType)
    ? (value as EmailOtpType)
    : "signup";
}

function buildLoginRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/login", getBaseUrl(request.url));

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = normalizeOtpType(requestUrl.searchParams.get("type"));
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));

  if (!tokenHash) {
    return NextResponse.redirect(
      buildLoginRedirect(request, {
        confirmation_error: "missing-token",
        next: nextPath,
      })
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      return NextResponse.redirect(
        buildLoginRedirect(request, {
          confirmation_error: "invalid-token",
          next: nextPath,
        })
      );
    }

    return NextResponse.redirect(
      buildLoginRedirect(request, {
        confirmed: "1",
        next: nextPath,
      })
    );
  } catch {
    return NextResponse.redirect(
      buildLoginRedirect(request, {
        confirmation_error: "setup",
        next: nextPath,
      })
    );
  }
}
