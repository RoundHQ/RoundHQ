import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const publicSource = await readFile(new URL("../lib/analytics/public.ts", import.meta.url), "utf8");
const serverSource = await readFile(new URL("../lib/analytics/server.ts", import.meta.url), "utf8");
const routeSource = await readFile(new URL("../app/api/analytics/track/route.ts", import.meta.url), "utf8");
const schema = await readFile(new URL("../supabase/20260824_platform_analytics.sql", import.meta.url), "utf8");

for (const event of ["page_view", "signup_page_view", "signup_started", "signup_completed", "pricing_viewed", "login_started", "trial_started"]) {
  assert.match(publicSource, new RegExp(`"${event}"`));
}

assert.match(publicSource, /utm_source/);
assert.match(publicSource, /facebook\.com|facebook\./);
assert.match(publicSource, /Direct/);
assert.match(publicSource, /!pathname\.startsWith\("\/admin"\)/);
assert.match(serverSource, /ANALYTICS_SESSION_TIMEOUT_MS/);
assert.match(serverSource, /first_source/);
assert.match(serverSource, /last_source/);
assert.match(serverSource, /signup_completed_at/);
assert.match(serverSource, /BOT_RE/);
assert.match(routeSource, /trackAnalyticsEvent/);
assert.match(schema, /analytics_visitors/);
assert.match(schema, /analytics_sessions/);
assert.match(schema, /analytics_page_views/);
assert.match(schema, /analytics_events/);
assert.match(schema, /analytics_signup_attribution/);
assert.match(schema, /enable row level security/);
assert.match(schema, /revoke all/);

console.log("Analytics feature checks passed.");
