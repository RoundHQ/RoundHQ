import { NextResponse, type NextRequest } from "next/server";
import {
  isAnalyticsEventName,
  isPublicMarketingPath,
  normalizeTrafficSource,
  type AnalyticsAttribution,
} from "@/lib/analytics/public";
import { trackAnalyticsEvent } from "@/lib/analytics/server";

export const runtime = "nodejs";

type TrackingBody = {
  visitorId?: unknown;
  sessionId?: unknown;
  eventName?: unknown;
  pathname?: unknown;
  referrer?: unknown;
  title?: unknown;
  attribution?: Partial<AnalyticsAttribution> | null;
};

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as TrackingBody | null;
  const visitorId = text(body?.visitorId, 64);
  const sessionId = text(body?.sessionId, 64);
  const eventName = body?.eventName;
  const pathname = text(body?.pathname);

  if (!visitorId || !sessionId || !isAnalyticsEventName(eventName) || !isPublicMarketingPath(pathname)) {
    return NextResponse.json({ ok: false }, { status: 204 });
  }

  const referrer = text(body?.referrer, 500) || request.headers.get("referer");
  const attribution = normalizeTrafficSource({
    utmSource: text(body?.attribution?.source, 160) || null,
    utmMedium: text(body?.attribution?.medium, 160) || null,
    utmCampaign: text(body?.attribution?.campaign, 160) || null,
    utmTerm: text(body?.attribution?.term, 160) || null,
    utmContent: text(body?.attribution?.content, 160) || null,
    referrer,
  });

  try {
    await trackAnalyticsEvent({
      visitorId,
      sessionId,
      eventName,
      pathname,
      referrer,
      attribution,
      title: text(body?.title, 160),
      userAgent: request.headers.get("user-agent"),
    });
  } catch (error) {
    console.error("analytics_track_failed", error instanceof Error ? error.message : "Unknown analytics tracking error");
  }

  return NextResponse.json({ ok: true });
}
