export const ANALYTICS_VISITOR_COOKIE = "rh_analytics_visitor";
export const ANALYTICS_SESSION_COOKIE = "rh_analytics_session";
export const ANALYTICS_SESSION_ACTIVITY_COOKIE = "rh_analytics_session_activity";
export const ANALYTICS_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "signup_page_view",
  "signup_started",
  "signup_completed",
  "pricing_viewed",
  "login_started",
  "trial_started",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export type AnalyticsAttribution = {
  source: string;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  referrerDomain: string | null;
};

const KNOWN_SOURCES: Array<[string, string]> = [
  ["google.", "Google"],
  ["bing.", "Bing"],
  ["facebook.", "Facebook"],
  ["instagram.", "Instagram"],
  ["linkedin.", "LinkedIn"],
  ["tiktok.", "TikTok"],
  ["youtube.", "YouTube"],
  ["mail.", "Email"],
];

function limit(value: string | null | undefined, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) || null : null;
}

export function isPublicMarketingPath(pathname: string) {
  return (
    pathname.startsWith("/") &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/settings") &&
    !pathname.startsWith("/billing") &&
    !pathname.startsWith("/support") &&
    !pathname.startsWith("/staff-setup") &&
    !pathname.startsWith("/share") &&
    !pathname.startsWith("/invoice-payment")
  );
}

export function sanitizeAnalyticsPath(pathname: string) {
  if (!isPublicMarketingPath(pathname)) {
    return "/";
  }

  return pathname.slice(0, 500);
}

export function getReferrerDomain(value: string | null | undefined) {
  if (!value) return null;
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return hostname || null;
  } catch {
    return null;
  }
}

export function normalizeTrafficSource({
  utmSource,
  utmMedium,
  utmCampaign,
  utmTerm,
  utmContent,
  referrer,
}: {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
}): AnalyticsAttribution {
  const sourceInput = limit(utmSource)?.toLowerCase();
  const referrerDomain = getReferrerDomain(referrer);
  const inferred = KNOWN_SOURCES.find(([match]) => referrerDomain?.includes(match))?.[1];
  const source = sourceInput
    ? KNOWN_SOURCES.find(([match]) => sourceInput.includes(match.replace(".", "")))?.[1] ?? sourceInput.replace(/(^|[-_ ])\w/g, (letter) => letter.toUpperCase())
    : inferred ?? (referrerDomain ? "Referral" : "Direct");

  return {
    source: source === "Referral" && referrerDomain ? referrerDomain : source,
    medium: limit(utmMedium),
    campaign: limit(utmCampaign),
    term: limit(utmTerm),
    content: limit(utmContent),
    referrerDomain,
  };
}

export function getAttributionFromUrl(url: URL, referrer?: string | null) {
  return normalizeTrafficSource({
    utmSource: url.searchParams.get("utm_source"),
    utmMedium: url.searchParams.get("utm_medium"),
    utmCampaign: url.searchParams.get("utm_campaign"),
    utmTerm: url.searchParams.get("utm_term"),
    utmContent: url.searchParams.get("utm_content"),
    referrer,
  });
}

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value);
}
