"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ANALYTICS_SESSION_ACTIVITY_COOKIE,
  ANALYTICS_SESSION_COOKIE,
  ANALYTICS_SESSION_TIMEOUT_MS,
  ANALYTICS_VISITOR_COOKIE,
  getAttributionFromUrl,
  isPublicMarketingPath,
  type AnalyticsEventName,
} from "@/lib/analytics/public";

function getCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1] ?? "";
}

function setCookie(name: string, value: string, maxAge: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function getOrCreateIds() {
  const now = Date.now();
  let visitorId = decodeURIComponent(getCookie(ANALYTICS_VISITOR_COOKIE));
  let sessionId = decodeURIComponent(getCookie(ANALYTICS_SESSION_COOKIE));
  const previousActivity = Number(getCookie(ANALYTICS_SESSION_ACTIVITY_COOKIE));

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    setCookie(ANALYTICS_VISITOR_COOKIE, visitorId, 60 * 60 * 24 * 365);
  }

  if (!sessionId || !previousActivity || now - previousActivity > ANALYTICS_SESSION_TIMEOUT_MS) {
    sessionId = crypto.randomUUID();
    setCookie(ANALYTICS_SESSION_COOKIE, sessionId, 60 * 60 * 24);
  }

  setCookie(ANALYTICS_SESSION_ACTIVITY_COOKIE, String(now), 60 * 60 * 24);
  return { visitorId, sessionId };
}

export function trackPublicAnalyticsEvent(eventName: AnalyticsEventName, pathname = window.location.pathname) {
  if (!isPublicMarketingPath(pathname) || getCookie("rh_analytics_consent") === "denied") {
    return;
  }

  const { visitorId, sessionId } = getOrCreateIds();
  const url = new URL(window.location.href);
  const referrer = document.referrer && new URL(document.referrer).origin !== window.location.origin
    ? document.referrer
    : null;
  const attribution = getAttributionFromUrl(url, referrer);
  const payload = JSON.stringify({
    visitorId,
    sessionId,
    eventName,
    pathname,
    referrer,
    attribution,
    title: document.title.slice(0, 160),
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/track", new Blob([payload], { type: "application/json" }));
    return;
  }

  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export function PublicAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || !isPublicMarketingPath(pathname)) return;

    trackPublicAnalyticsEvent("page_view", pathname);
    if (pathname === "/signup") trackPublicAnalyticsEvent("signup_page_view", pathname);
    if (pathname === "/pricing") trackPublicAnalyticsEvent("pricing_viewed", pathname);
    previousPathname.current = pathname;
  }, [pathname, searchParams]);

  return null;
}
