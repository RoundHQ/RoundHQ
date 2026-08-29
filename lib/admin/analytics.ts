import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";

export type AnalyticsRangeKey = "today" | "yesterday" | "7d" | "30d" | "month" | "last_month" | "90d" | "all" | "custom";
export type AnalyticsDateRange = { key: AnalyticsRangeKey; start: Date | null; end: Date; label: string };

type Session = { id: string; visitor_id: string; started_at: string; landing_path: string; exit_path: string; source: string; campaign: string | null; medium: string | null; referrer_domain: string | null };
type PageView = { session_id: string; visitor_id: string; pathname: string; occurred_at: string };
type Event = { visitor_id: string; session_id: string | null; event_name: string; occurred_at: string };
type Signup = { organization_id: string; first_source: string; first_landing_path: string | null; first_utm_medium: string | null; first_utm_campaign: string | null; signup_completed_at: string };

export type AnalyticsRow = { label: string; visitors: number; sessions: number; pageViews: number; signups: number; conversion: number };
export type AnalyticsReport = {
  range: AnalyticsDateRange;
  summary: { visitors: number; sessions: number; pageViews: number; signups: number; conversion: number; topSource: string; topLandingPage: string; topSignupSource: string };
  previous: { visitors: number; sessions: number; pageViews: number; signups: number } | null;
  trafficSources: AnalyticsRow[];
  signupSources: AnalyticsRow[];
  topPages: Array<{ label: string; views: number; visitors: number }>;
  landingPages: AnalyticsRow[];
  exitPages: Array<{ label: string; exits: number; rate: number }>;
  campaigns: Array<AnalyticsRow & { source: string; medium: string }>;
  referrals: Array<{ domain: string; sessions: number; visitors: number }>;
  journeys: AnalyticsRow[];
  trends: Array<{ label: string; visitors: number; sessions: number; pageViews: number; signups: number }>;
  funnel: Array<{ label: string; count: number; percent: number }>;
  recentSignups: Array<{ organizationId: string; source: string; medium: string | null; campaign: string | null; landingPage: string | null; completedAt: string; organizationName: string }>;
};

function startOfDay(date: Date) { const copy = new Date(date); copy.setHours(0, 0, 0, 0); return copy; }
function addDays(date: Date, amount: number) { const copy = new Date(date); copy.setDate(copy.getDate() + amount); return copy; }
function iso(value: Date | null) { return value?.toISOString() ?? "1970-01-01T00:00:00.000Z"; }
function compareNumber(current: number, previous: number) { return previous > 0 ? ((current - previous) / previous) * 100 : null; }
function percent(numerator: number, denominator: number) { return denominator > 0 ? (numerator / denominator) * 100 : 0; }
function inc(map: Map<string, number>, key: string, amount = 1) { map.set(key, (map.get(key) ?? 0) + amount); }
function sortedEntries(map: Map<string, number>) { return [...map.entries()].sort((a, b) => b[1] - a[1]); }

export function getAnalyticsDateRange(key?: string, from?: string, to?: string): AnalyticsDateRange {
  const now = new Date(); const today = startOfDay(now); const requested = key as AnalyticsRangeKey;
  if (requested === "today") return { key: "today", start: today, end: addDays(today, 1), label: "Today" };
  if (requested === "yesterday") return { key: "yesterday", start: addDays(today, -1), end: today, label: "Yesterday" };
  if (requested === "7d") return { key: "7d", start: addDays(today, -6), end: addDays(today, 1), label: "Last 7 days" };
  if (requested === "month") return { key: "month", start: new Date(now.getFullYear(), now.getMonth(), 1), end: addDays(today, 1), label: "This month" };
  if (requested === "last_month") return { key: "last_month", start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1), label: "Last month" };
  if (requested === "90d") return { key: "90d", start: addDays(today, -89), end: addDays(today, 1), label: "Last 90 days" };
  if (requested === "all") return { key: "all", start: null, end: addDays(today, 1), label: "All time" };
  if (requested === "custom" && from && to) {
    const start = startOfDay(new Date(`${from}T00:00:00`)); const end = addDays(startOfDay(new Date(`${to}T00:00:00`)), 1);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end) return { key: "custom", start, end, label: "Custom range" };
  }
  return { key: "30d", start: addDays(today, -29), end: addDays(today, 1), label: "Last 30 days" };
}

async function queryRange<T>(table: string, select: string, column: string, range: AnalyticsDateRange) {
  const supabase = createServiceRoleClient();
  let query = supabase.from(table).select(select).lt(column, range.end.toISOString()).order(column, { ascending: true }).limit(50000);
  if (range.start) query = query.gte(column, range.start.toISOString());
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

async function snapshot(range: AnalyticsDateRange) {
  const [sessions, pageViews, signups] = await Promise.all([
    queryRange<Session>("analytics_sessions", "id,visitor_id,started_at,landing_path,exit_path,source,campaign,medium,referrer_domain", "started_at", range),
    queryRange<PageView>("analytics_page_views", "session_id,visitor_id,pathname,occurred_at", "occurred_at", range),
    queryRange<Signup>("analytics_signup_attribution", "organization_id,first_source,first_landing_path,first_utm_medium,first_utm_campaign,signup_completed_at", "signup_completed_at", range),
  ]);
  return { sessions, pageViews, signups };
}

export async function getPlatformAnalytics(range: AnalyticsDateRange): Promise<AnalyticsReport> {
  const [{ sessions, pageViews, signups }, events] = await Promise.all([
    snapshot(range), queryRange<Event>("analytics_events", "visitor_id,session_id,event_name,occurred_at", "occurred_at", range),
  ]);
  const visitorIds = new Set(sessions.map((row) => row.visitor_id));
  pageViews.forEach((row) => visitorIds.add(row.visitor_id));
  const sessionMap = new Map(sessions.map((row) => [row.id, row]));
  const sourceSessions = new Map<string, number>(); const sourceVisitors = new Map<string, Set<string>>(); const sourceViews = new Map<string, number>(); const sourceSignups = new Map<string, number>();
  const pageViewsBySession = new Map<string, PageView[]>(); const pageStats = new Map<string, Set<string>>(); const landingSessions = new Map<string, Session[]>(); const exitSessions = new Map<string, number>(); const campaignSessions = new Map<string, Session[]>(); const referralSessions = new Map<string, Session[]>();
  for (const session of sessions) {
    inc(sourceSessions, session.source); if (!sourceVisitors.has(session.source)) sourceVisitors.set(session.source, new Set()); sourceVisitors.get(session.source)?.add(session.visitor_id);
    if (!landingSessions.has(session.landing_path)) landingSessions.set(session.landing_path, []); landingSessions.get(session.landing_path)?.push(session);
    inc(exitSessions, session.exit_path);
    if (session.campaign) { const key = `${session.campaign}\u0000${session.source}\u0000${session.medium ?? "Unspecified"}`; if (!campaignSessions.has(key)) campaignSessions.set(key, []); campaignSessions.get(key)?.push(session); }
    if (session.referrer_domain) { if (!referralSessions.has(session.referrer_domain)) referralSessions.set(session.referrer_domain, []); referralSessions.get(session.referrer_domain)?.push(session); }
  }
  for (const view of pageViews) {
    const session = sessionMap.get(view.session_id); const source = session?.source ?? "Direct";
    inc(sourceViews, source); if (!pageViewsBySession.has(view.session_id)) pageViewsBySession.set(view.session_id, []); pageViewsBySession.get(view.session_id)?.push(view);
    if (!pageStats.has(view.pathname)) pageStats.set(view.pathname, new Set()); pageStats.get(view.pathname)?.add(view.visitor_id);
  }
  for (const signup of signups) inc(sourceSignups, signup.first_source || "Unknown");
  const makeRows = (sessionGroups: Map<string, Session[]>, signupKey = new Map<string, number>()) => sortedEntries(new Map([...sessionGroups].map(([label, rows]) => [label, rows.length]))).map(([label, count]) => {
    const rows = sessionGroups.get(label) ?? []; const visitors = new Set(rows.map((row) => row.visitor_id)).size; const views = rows.reduce((total, row) => total + (pageViewsBySession.get(row.id)?.length ?? 0), 0); const signupCount = signupKey.get(label) ?? 0;
    return { label, visitors, sessions: count, pageViews: views, signups: signupCount, conversion: percent(signupCount, visitors) };
  });
  const trafficSources = sortedEntries(sourceSessions).map(([label, count]) => ({ label, visitors: sourceVisitors.get(label)?.size ?? 0, sessions: count, pageViews: sourceViews.get(label) ?? 0, signups: sourceSignups.get(label) ?? 0, conversion: percent(sourceSignups.get(label) ?? 0, sourceVisitors.get(label)?.size ?? 0) }));
  const signupSources = sortedEntries(sourceSignups).map(([label, count]) => ({ label, visitors: sourceVisitors.get(label)?.size ?? 0, sessions: sourceSessions.get(label) ?? 0, pageViews: sourceViews.get(label) ?? 0, signups: count, conversion: percent(count, sourceVisitors.get(label)?.size ?? 0) }));
  const landingSignupMap = new Map<string, number>(); signups.forEach((signup) => inc(landingSignupMap, signup.first_landing_path ?? "/"));
  const landingPages = makeRows(landingSessions, landingSignupMap);
  const topPages = sortedEntries(new Map([...pageStats].map(([path, visitors]) => [path, visitors.size]))).map(([label, visitors]) => ({ label, visitors, views: pageViews.filter((view) => view.pathname === label).length })).sort((a, b) => b.views - a.views).slice(0, 12);
  const exitPages = sortedEntries(exitSessions).map(([label, exits]) => ({ label, exits, rate: percent(exits, sessions.length) })).slice(0, 12);
  const campaignSignup = new Map<string, number>(); signups.forEach((signup) => { if (signup.first_utm_campaign) inc(campaignSignup, `${signup.first_utm_campaign}\u0000${signup.first_source}\u0000${signup.first_utm_medium ?? "Unspecified"}`); });
  const campaigns = makeRows(campaignSessions, campaignSignup).map((row) => { const [label, source, medium] = row.label.split("\u0000"); return { ...row, label, source, medium }; });
  const referrals = [...referralSessions].map(([domain, rows]) => ({ domain, sessions: rows.length, visitors: new Set(rows.map((row) => row.visitor_id)).size })).sort((a, b) => b.sessions - a.sessions).slice(0, 12);
  const journeyMap = new Map<string, Session[]>(); for (const session of sessions) { const steps = (pageViewsBySession.get(session.id) ?? []).sort((a, b) => a.occurred_at.localeCompare(b.occurred_at)).map((view) => view.pathname).filter((path, index, paths) => index === 0 || paths[index - 1] !== path).slice(0, 6); const label = steps.join(" → "); if (label) { if (!journeyMap.has(label)) journeyMap.set(label, []); journeyMap.get(label)?.push(session); } }
  const journeys = makeRows(journeyMap).slice(0, 12);
  const spanDays = range.start ? Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000)) : 365; const bucketMonthly = spanDays > 90;
  const trend = new Map<string, { visitors: Set<string>; sessions: number; pageViews: number; signups: number }>(); const bucket = (date: string) => { const d = new Date(date); return bucketMonthly ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}` : d.toISOString().slice(0, 10); };
  for (const session of sessions) { const key = bucket(session.started_at); if (!trend.has(key)) trend.set(key, { visitors: new Set(), sessions: 0, pageViews: 0, signups: 0 }); const row = trend.get(key)!; row.visitors.add(session.visitor_id); row.sessions += 1; }
  for (const view of pageViews) { const row = trend.get(bucket(view.occurred_at)); if (row) row.pageViews += 1; }
  for (const signup of signups) { const key = bucket(signup.signup_completed_at); if (!trend.has(key)) trend.set(key, { visitors: new Set(), sessions: 0, pageViews: 0, signups: 0 }); trend.get(key)!.signups += 1; }
  const trends = [...trend].map(([label, row]) => ({ label, visitors: row.visitors.size, sessions: row.sessions, pageViews: row.pageViews, signups: row.signups }));
  const uniqueEventVisitors = (name: string) => new Set(events.filter((event) => event.event_name === name).map((event) => event.visitor_id)).size;
  const pricingVisitors = new Set(pageViews.filter((view) => view.pathname === "/pricing").map((view) => view.visitor_id)).size; const signupVisitors = new Set(pageViews.filter((view) => view.pathname === "/signup").map((view) => view.visitor_id)).size;
  const funnelCounts = [{ label: "Website visitors", count: visitorIds.size }, { label: "Pricing visitors", count: pricingVisitors }, { label: "Signup page visitors", count: signupVisitors }, { label: "Signup started", count: uniqueEventVisitors("signup_started") }, { label: "Account created", count: signups.length }]; const funnel = funnelCounts.map((row) => ({ ...row, percent: percent(row.count, visitorIds.size) }));
  let previous: AnalyticsReport["previous"] = null; if (range.start) { const duration = range.end.getTime() - range.start.getTime(); const previousRange = { ...range, start: new Date(range.start.getTime() - duration), end: range.start }; const previousSnapshot = await snapshot(previousRange); previous = { visitors: new Set(previousSnapshot.sessions.map((session) => session.visitor_id)).size, sessions: previousSnapshot.sessions.length, pageViews: previousSnapshot.pageViews.length, signups: previousSnapshot.signups.length }; }
  const orgIds = signups.slice(-20).map((signup) => signup.organization_id); const { data: organizations } = orgIds.length ? await createServiceRoleClient().from("organizations").select("id,name").in("id", orgIds) : { data: [] as Array<{ id: string; name: string }> }; const organizationNames = new Map((organizations ?? []).map((organization) => [organization.id, organization.name]));
  return { range, summary: { visitors: visitorIds.size, sessions: sessions.length, pageViews: pageViews.length, signups: signups.length, conversion: percent(signups.length, visitorIds.size), topSource: trafficSources[0]?.label ?? "—", topLandingPage: landingPages[0]?.label ?? "—", topSignupSource: signupSources[0]?.label ?? "—" }, previous, trafficSources, signupSources, topPages, landingPages, exitPages, campaigns, referrals, journeys, trends, funnel, recentSignups: signups.slice().sort((a,b) => b.signup_completed_at.localeCompare(a.signup_completed_at)).slice(0,20).map((signup) => ({ organizationId: signup.organization_id, source: signup.first_source, medium: signup.first_utm_medium, campaign: signup.first_utm_campaign, landingPage: signup.first_landing_path, completedAt: signup.signup_completed_at, organizationName: organizationNames.get(signup.organization_id) ?? "RoundHQ workspace" })) };
}

export { compareNumber };
