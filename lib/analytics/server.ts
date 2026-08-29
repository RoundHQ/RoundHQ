import "server-only";

import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ANALYTICS_SESSION_TIMEOUT_MS,
  getReferrerDomain,
  isAnalyticsEventName,
  isPublicMarketingPath,
  sanitizeAnalyticsPath,
  type AnalyticsAttribution,
  type AnalyticsEventName,
} from "@/lib/analytics/public";
import { createServiceRoleClient, isSupabaseServiceRoleConfigured } from "@/lib/supabase/admin";

type AnalyticsVisitorRow = {
  visitor_id: string;
  first_source: string;
  first_referrer_domain: string | null;
  first_landing_path: string;
  first_utm_medium: string | null;
  first_utm_campaign: string | null;
  first_utm_term: string | null;
  first_utm_content: string | null;
  last_source: string;
  last_referrer_domain: string | null;
  last_landing_path: string;
  last_utm_medium: string | null;
  last_utm_campaign: string | null;
  last_utm_term: string | null;
  last_utm_content: string | null;
};

export type TrackAnalyticsInput = {
  visitorId: string;
  sessionId: string;
  eventName: AnalyticsEventName;
  pathname: string;
  referrer?: string | null;
  attribution: AnalyticsAttribution;
  title?: string | null;
  userAgent?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOT_RE = /bot|crawler|spider|preview|facebookexternalhit|slackbot|discordbot|uptimerobot|pingdom|headless/i;

function validId(value: string) {
  return UUID_RE.test(value);
}

function safeText(value: string | null | undefined, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) || null : null;
}

function hasIdentifiableAttribution(attribution: AnalyticsAttribution) {
  return attribution.source !== "Direct" || Boolean(attribution.campaign || attribution.medium || attribution.referrerDomain);
}

function visitorPayload(input: TrackAnalyticsInput, path: string) {
  return {
    visitor_id: input.visitorId,
    first_source: input.attribution.source,
    first_referrer_domain: input.attribution.referrerDomain,
    first_landing_path: path,
    first_utm_medium: input.attribution.medium,
    first_utm_campaign: input.attribution.campaign,
    first_utm_term: input.attribution.term,
    first_utm_content: input.attribution.content,
    last_source: input.attribution.source,
    last_referrer_domain: input.attribution.referrerDomain,
    last_landing_path: path,
    last_utm_medium: input.attribution.medium,
    last_utm_campaign: input.attribution.campaign,
    last_utm_term: input.attribution.term,
    last_utm_content: input.attribution.content,
    last_seen_at: new Date().toISOString(),
  };
}

async function upsertVisitor(supabase: SupabaseClient, input: TrackAnalyticsInput, path: string) {
  const { data: existing, error: existingError } = await supabase
    .from("analytics_visitors")
    .select("visitor_id, first_source, first_referrer_domain, first_landing_path, first_utm_medium, first_utm_campaign, first_utm_term, first_utm_content, last_source, last_referrer_domain, last_landing_path, last_utm_medium, last_utm_campaign, last_utm_term, last_utm_content")
    .eq("visitor_id", input.visitorId)
    .maybeSingle<AnalyticsVisitorRow>();

  if (existingError) throw existingError;
  if (!existing) {
    const { error } = await supabase.from("analytics_visitors").insert(visitorPayload(input, path));
    if (error) throw error;
    return;
  }

  const update = hasIdentifiableAttribution(input.attribution)
    ? {
        last_source: input.attribution.source,
        last_referrer_domain: input.attribution.referrerDomain,
        last_landing_path: path,
        last_utm_medium: input.attribution.medium,
        last_utm_campaign: input.attribution.campaign,
        last_utm_term: input.attribution.term,
        last_utm_content: input.attribution.content,
        last_seen_at: new Date().toISOString(),
      }
    : { last_seen_at: new Date().toISOString() };
  const { error } = await supabase.from("analytics_visitors").update(update).eq("visitor_id", input.visitorId);
  if (error) throw error;
}

async function upsertSession(supabase: SupabaseClient, input: TrackAnalyticsInput, path: string) {
  const { data: existing, error: existingError } = await supabase
    .from("analytics_sessions")
    .select("id, last_activity_at")
    .eq("id", input.sessionId)
    .maybeSingle<{ id: string; last_activity_at: string }>();
  if (existingError) throw existingError;

  const now = new Date();
  if (existing && now.getTime() - new Date(existing.last_activity_at).getTime() <= ANALYTICS_SESSION_TIMEOUT_MS) {
    const { error } = await supabase
      .from("analytics_sessions")
      .update({ last_activity_at: now.toISOString(), exit_path: path })
      .eq("id", input.sessionId);
    if (error) throw error;
    return input.sessionId;
  }

  const sessionId = existing ? randomUUID() : input.sessionId;
  const { error } = await supabase.from("analytics_sessions").insert({
    id: sessionId,
    visitor_id: input.visitorId,
    started_at: now.toISOString(),
    last_activity_at: now.toISOString(),
    landing_path: path,
    exit_path: path,
    referrer_domain: input.attribution.referrerDomain,
    source: input.attribution.source,
    medium: input.attribution.medium,
    campaign: input.attribution.campaign,
    term: input.attribution.term,
    content: input.attribution.content,
    device_category: /mobile/i.test(input.userAgent ?? "") ? "mobile" : /tablet|ipad/i.test(input.userAgent ?? "") ? "tablet" : "desktop",
  });
  if (error) throw error;
  return sessionId;
}

export async function trackAnalyticsEvent(input: TrackAnalyticsInput) {
  if (!isSupabaseServiceRoleConfigured() || !validId(input.visitorId) || !validId(input.sessionId)) return null;
  if (!isAnalyticsEventName(input.eventName) || !isPublicMarketingPath(input.pathname) || BOT_RE.test(input.userAgent ?? "")) return null;

  const supabase = createServiceRoleClient();
  const path = sanitizeAnalyticsPath(input.pathname);
  await upsertVisitor(supabase, input, path);
  const sessionId = await upsertSession(supabase, input, path);
  const occurredAt = new Date().toISOString();

  if (input.eventName === "page_view") {
    const { error } = await supabase.from("analytics_page_views").insert({
      visitor_id: input.visitorId,
      session_id: sessionId,
      pathname: path,
      previous_path: safeText(getReferrerDomain(input.referrer), 255) ? null : null,
      page_title: safeText(input.title),
      occurred_at: occurredAt,
    });
    if (error) throw error;
  }

  const { error } = await supabase.from("analytics_events").insert({
    visitor_id: input.visitorId,
    session_id: sessionId,
    event_name: input.eventName,
    pathname: path,
    occurred_at: occurredAt,
  });
  if (error) throw error;
  return { sessionId };
}

export async function recordPendingSignupAttribution({ userId, visitorId, sessionId }: { userId: string; visitorId?: string | null; sessionId?: string | null }) {
  if (!isSupabaseServiceRoleConfigured() || !visitorId || !validId(visitorId)) return;
  const supabase = createServiceRoleClient();
  const { data: visitor } = await supabase
    .from("analytics_visitors")
    .select("visitor_id, first_source, first_referrer_domain, first_landing_path, first_utm_medium, first_utm_campaign, first_utm_term, first_utm_content, last_source, last_referrer_domain, last_landing_path, last_utm_medium, last_utm_campaign, last_utm_term, last_utm_content, first_seen_at")
    .eq("visitor_id", visitorId)
    .maybeSingle();
  if (!visitor) return;

  await supabase.from("analytics_signup_attribution").upsert({
    user_id: userId,
    visitor_id: visitorId,
    session_id: sessionId && validId(sessionId) ? sessionId : null,
    first_source: visitor.first_source,
    first_referrer_domain: visitor.first_referrer_domain,
    first_landing_path: visitor.first_landing_path,
    first_utm_medium: visitor.first_utm_medium,
    first_utm_campaign: visitor.first_utm_campaign,
    first_utm_term: visitor.first_utm_term,
    first_utm_content: visitor.first_utm_content,
    first_seen_at: visitor.first_seen_at,
    last_source: visitor.last_source,
    last_referrer_domain: visitor.last_referrer_domain,
    last_landing_path: visitor.last_landing_path,
    last_utm_medium: visitor.last_utm_medium,
    last_utm_campaign: visitor.last_utm_campaign,
    last_utm_term: visitor.last_utm_term,
    last_utm_content: visitor.last_utm_content,
  }, { onConflict: "user_id" });
}

export async function completeSignupAnalytics({ userId, organizationId }: { userId: string; organizationId: string }) {
  if (!isSupabaseServiceRoleConfigured()) return;
  const supabase = createServiceRoleClient();
  const { data: attribution } = await supabase
    .from("analytics_signup_attribution")
    .select("visitor_id, session_id, signup_completed_at")
    .eq("user_id", userId)
    .maybeSingle<{ visitor_id: string; session_id: string | null; signup_completed_at: string | null }>();
  if (!attribution || attribution.signup_completed_at) return;

  const completedAt = new Date().toISOString();
  const { data: completedRows, error } = await supabase
    .from("analytics_signup_attribution")
    .update({ organization_id: organizationId, signup_completed_at: completedAt })
    .eq("user_id", userId)
    .is("signup_completed_at", null)
    .select("user_id");
  if (error) throw error;
  if (!completedRows?.length) return;
  await Promise.all([
    supabase.from("analytics_sessions").update({ organization_id: organizationId, converted_user_id: userId, converted_at: completedAt }).eq("visitor_id", attribution.visitor_id),
    supabase.from("analytics_events").insert({ visitor_id: attribution.visitor_id, session_id: attribution.session_id, user_id: userId, organization_id: organizationId, event_name: "signup_completed", pathname: "/signup", occurred_at: completedAt }),
  ]);
}
