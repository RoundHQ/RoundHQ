import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(...segments) {
  return fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");
}

const settings = read("lib", "ai-receptionist-settings.ts");
assert.match(settings, /realtimeEnabled: false/);
assert.match(settings, /realtime_enabled: false/);
assert.match(settings, /leadSourceLabel: "Voicemail"/);

const telnyx = read("lib", "ai-receptionist", "providers", "telnyx.ts");
assert.match(telnyx, /const liveAiConfigured = false/);
assert.match(telnyx, /source: "Voicemail"/);

for (const route of [
  ["app", "api", "ai-receptionist", "openai", "webhook", "route.ts"],
  ["app", "api", "ai-receptionist", "realtime", "session", "route.ts"],
  ["app", "api", "ai-receptionist", "realtime", "session-complete", "route.ts"],
  ["app", "api", "ai-receptionist", "twilio", "realtime-media", "route.ts"],
]) {
  const source = read(...route);
  assert.match(source, /status: 410/);
  assert.match(source, /voicemail/i);
}

const settingsForm = read(
  "components",
  "ai-receptionist",
  "ai-receptionist-settings-form.tsx"
);
assert.match(settingsForm, /name="realtime_enabled" value="false"/);
assert.match(settingsForm, /name="custom_conversation_enabled" value="false"/);
assert.match(settingsForm, /voicemail-to-lead/i);

console.log("AI Receptionist retirement tests passed.");
