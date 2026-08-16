import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const projectRoot = process.cwd();
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      path.join(projectRoot, request.slice(2)),
      parent,
      isMain,
      options
    );
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypescript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      strict: true,
    },
  });

  module._compile(compiled.outputText, filename);
};
require.extensions[".tsx"] = require.extensions[".ts"];

const {
  DEFAULT_AI_RECEPTIONIST_CONSENT,
  DEFAULT_AI_RECEPTIONIST_GREETING,
  DEFAULT_AI_RECEPTIONIST_QUESTIONS,
  canManageAiReceptionistSettings,
  getDefaultAiReceptionistSettings,
  mapAiReceptionistSettingsRow,
  mapAiReceptionistSettingsToRow,
  normalizeAiReceptionistBusinessHours,
  normalizeAiReceptionistList,
  normalizeAiReceptionistSettings,
  validateAiReceptionistSettings,
} = require(path.join(projectRoot, "lib", "ai-receptionist-settings.ts"));
const { default: AiReceptionistSettingsForm } = require(
  path.join(
    projectRoot,
    "components",
    "ai-receptionist",
    "ai-receptionist-settings-form.tsx"
  )
);
const { default: SettingsPage } = require(
  path.join(projectRoot, "components", "jobs", "settings-page.tsx")
);

const defaultSettings = getDefaultAiReceptionistSettings();

assert.equal(defaultSettings.enabled, false);
assert.equal(defaultSettings.greetingMessage, DEFAULT_AI_RECEPTIONIST_GREETING);
assert.equal(defaultSettings.consentMessage, DEFAULT_AI_RECEPTIONIST_CONSENT);
assert.deepEqual(
  defaultSettings.questionsToAsk,
  DEFAULT_AI_RECEPTIONIST_QUESTIONS
);
assert.equal(defaultSettings.businessHours.monday.start, "08:00");
assert.equal(defaultSettings.businessHours.saturday.enabled, false);
assert.equal(defaultSettings.voiceAccent, "scottish");
assert.equal(defaultSettings.customConversationEnabled, false);
assert.equal(defaultSettings.conversationInstructions, "");
assert.equal(defaultSettings.leadSourceLabel, "Voicemail");
assert.equal(defaultSettings.telephonyProvider, "telnyx");
assert.equal(defaultSettings.realtimeEnabled, false);

const missingRowSettings = mapAiReceptionistSettingsRow(null);
assert.equal(
  missingRowSettings.exists,
  false,
  "missing settings row should return unsaved defaults"
);
assert.equal(
  missingRowSettings.greetingMessage,
  DEFAULT_AI_RECEPTIONIST_GREETING
);

const publicSettingsWithSecret = mapAiReceptionistSettingsRow({
  organization_id: "organization-1",
  enabled: true,
  business_name: "RoundHQ Test Co",
  greeting_message: DEFAULT_AI_RECEPTIONIST_GREETING,
  fallback_phone_number: "",
  notification_email: "",
  telephony_provider: "telnyx",
  telnyx_api_key: "super-secret-telnyx-key",
  telnyx_connection_id: "telnyx-app-1",
  telnyx_messaging_profile_id: "messaging-profile-1",
  telnyx_public_key: "public-key",
  telnyx_phone_number: "+441215551111",
  twilio_account_sid: "AC1234567890abcdef",
  twilio_auth_token: "super-secret-token",
  twilio_phone_number: "+441215551000",
  realtime_enabled: true,
  transfer_to_number: "",
  new_lead_sms_enabled: false,
  new_lead_sms_phone_number: "",
  business_hours_enabled: false,
  business_hours: {},
  questions_to_ask: DEFAULT_AI_RECEPTIONIST_QUESTIONS,
  emergency_keywords: ["urgent"],
  consent_message: DEFAULT_AI_RECEPTIONIST_CONSENT,
  lead_source_label: "AI Receptionist",
  created_at: null,
  updated_at: null,
});
assert.equal(publicSettingsWithSecret.twilioAuthTokenConfigured, true);
assert.equal(publicSettingsWithSecret.telnyxApiKeyConfigured, true);
assert.equal(publicSettingsWithSecret.realtimeEnabled, false);
assert.equal(
  Object.prototype.hasOwnProperty.call(publicSettingsWithSecret, "telnyxApiKey"),
  false,
  "public settings should not expose the Telnyx API key"
);
assert.equal(
  Object.prototype.hasOwnProperty.call(publicSettingsWithSecret, "twilioAuthToken"),
  false,
  "public settings should not expose the Twilio auth token"
);
assert.equal(
  JSON.stringify(publicSettingsWithSecret).includes("super-secret-token"),
  false,
  "public settings serialization should not leak provider credentials"
);
assert.equal(
  JSON.stringify(publicSettingsWithSecret).includes("super-secret-telnyx-key"),
  false,
  "public settings serialization should not leak Telnyx credentials"
);

const updatedSettings = normalizeAiReceptionistSettings({
  enabled: true,
  businessName: "RoundHQ Test Co",
  notificationEmail: "OWNER@EXAMPLE.COM",
  fallbackPhoneNumber: "+44 121 555 1000",
  telephonyProvider: "telnyx",
  telnyxPhoneNumber: "+44 121 555 1001",
  telnyxApiKeyConfigured: true,
  telnyxPublicKey: "public-key",
  telnyxConnectionId: "telnyx-app-1",
  telnyxMessagingProfileId: "messaging-profile-1",
  greetingMessage: "Thanks for calling RoundHQ Test Co.",
  voiceAccent: "british",
  customConversationEnabled: true,
  conversationInstructions:
    'Start with "Hello from {{business_name}}." Then ask what work is required.',
  realtimeEnabled: true,
  consentMessage: "This call may be recorded.",
  businessHoursEnabled: true,
  questionsToAsk: ["Name?", "Service required?"],
  emergencyKeywords: ["urgent", "same day"],
  businessHours: {
    monday: { enabled: true, start: "09:30", end: "16:45" },
  },
});

const updatedValidation = validateAiReceptionistSettings(updatedSettings);
assert.equal(
  updatedValidation.ok,
  true,
  "valid settings should pass validation"
);

const writeRow = mapAiReceptionistSettingsToRow(
  updatedSettings,
  "organization-1"
);
assert.equal(writeRow.organization_id, "organization-1");
assert.equal(writeRow.enabled, true);
assert.equal(writeRow.business_name, "RoundHQ Test Co");
assert.equal(writeRow.notification_email, "owner@example.com");
assert.equal(writeRow.telephony_provider, "telnyx");
assert.equal(writeRow.telnyx_phone_number, "+44 121 555 1001");
assert.equal(writeRow.telnyx_connection_id, "telnyx-app-1");
assert.equal(writeRow.telnyx_messaging_profile_id, "messaging-profile-1");
assert.equal(writeRow.telnyx_public_key, "public-key");
assert.equal(writeRow.voice_accent, "british");
assert.equal(writeRow.custom_conversation_enabled, false);
assert.match(writeRow.conversation_instructions, /Hello from/);
assert.equal(writeRow.realtime_enabled, false);
assert.equal(writeRow.lead_source_label, "Voicemail");
assert.deepEqual(writeRow.questions_to_ask, ["Name?", "Service required?"]);
assert.deepEqual(writeRow.emergency_keywords, ["urgent", "same day"]);
assert.equal(writeRow.business_hours_enabled, true);
assert.equal(writeRow.business_hours.monday.start, "09:30");
assert.equal(writeRow.business_hours.monday.end, "16:45");
assert.equal(writeRow.business_hours.sunday.start, "09:00");

const invalidEmailValidation = validateAiReceptionistSettings(
  normalizeAiReceptionistSettings({
    ...defaultSettings,
    notificationEmail: "not-an-email",
  })
);
assert.equal(invalidEmailValidation.ok, false);
assert.match(invalidEmailValidation.errors.join(" "), /valid notification email/i);

const enabledWithoutBusinessNameValidation = validateAiReceptionistSettings(
  normalizeAiReceptionistSettings({
    ...defaultSettings,
    enabled: true,
    businessName: "",
  })
);
assert.equal(enabledWithoutBusinessNameValidation.ok, false);
assert.match(
  enabledWithoutBusinessNameValidation.errors.join(" "),
  /business name is required/i
);

const enabledWithoutQuestionsValidation = validateAiReceptionistSettings({
  ...defaultSettings,
  enabled: true,
  businessName: "RoundHQ Test Co",
  questionsToAsk: [],
  telnyxPhoneNumber: "+441215551001",
  phoneProvisioningStatus: "active",
});
assert.equal(enabledWithoutQuestionsValidation.ok, true);

const legacyTwilioFieldsValidation = validateAiReceptionistSettings(
  normalizeAiReceptionistSettings({
    ...defaultSettings,
    twilioAccountSid: "AC1234567890abcdef",
  })
);
assert.equal(
  legacyTwilioFieldsValidation.ok,
  true,
  "hidden legacy provider fields should not block managed Telnyx setup"
);

const telnyxOnlyValidation = validateAiReceptionistSettings(
  normalizeAiReceptionistSettings({
    ...defaultSettings,
    enabled: true,
    businessName: "RoundHQ Test Co",
    telephonyProvider: "telnyx",
    telnyxPhoneNumber: "+441215551111",
    telnyxPublicKey: "public-key",
    telnyxApiKeyConfigured: true,
    twilioAccountSid: "",
    twilioPhoneNumber: "",
    twilioAuthTokenConfigured: false,
  })
);
assert.equal(
  telnyxOnlyValidation.ok,
  true,
  "Twilio should not be required for production voicemail-to-lead mode"
);

const enabledWithoutManagedNumberValidation = validateAiReceptionistSettings(
  normalizeAiReceptionistSettings({
    ...defaultSettings,
    enabled: true,
    businessName: "RoundHQ Test Co",
  })
);
assert.equal(enabledWithoutManagedNumberValidation.ok, false);
assert.match(
  enabledWithoutManagedNumberValidation.errors.join(" "),
  /finish setting up the receptionist phone number/i
);

const normalizedQuestions = normalizeAiReceptionistList(
  ["Can I take your name?", "", "What service do you need?"],
  []
);
assert.deepEqual(normalizedQuestions, [
  "Can I take your name?",
  "What service do you need?",
]);
assert.deepEqual(
  normalizeAiReceptionistList(["Only question"], []),
  ["Only question"],
  "question list should support adding a single custom question"
);

const normalizedHours = normalizeAiReceptionistBusinessHours({
  tuesday: { enabled: false, start: "10:15", end: "14:30" },
  wednesday: { enabled: true, start: "invalid", end: "18:00" },
});
assert.equal(normalizedHours.tuesday.enabled, false);
assert.equal(normalizedHours.tuesday.start, "10:15");
assert.equal(normalizedHours.tuesday.end, "14:30");
assert.equal(
  normalizedHours.wednesday.start,
  "08:00",
  "invalid business hour times should fall back to defaults"
);
assert.equal(normalizedHours.wednesday.end, "18:00");

assert.equal(
  canManageAiReceptionistSettings({ organizationRole: "owner" }),
  true
);
assert.equal(
  canManageAiReceptionistSettings({
    staffRole: "Admin",
    staffIsActive: true,
  }),
  true
);
assert.equal(
  canManageAiReceptionistSettings({
    staffRole: "Staff",
    staffIsActive: true,
  }),
  false,
  "non-admin staff should not be able to edit AI Receptionist settings"
);
assert.equal(
  canManageAiReceptionistSettings({
    staffRole: "Admin",
    staffIsActive: false,
  }),
  false,
  "inactive admins should not be able to edit AI Receptionist settings"
);

const enabledSettings = normalizeAiReceptionistSettings({
  ...updatedSettings,
  enabled: true,
  customConversationEnabled: false,
});
const renderedFormHtml = renderToStaticMarkup(
  React.createElement(AiReceptionistSettingsForm, {
    initialSettings: enabledSettings,
    workspaceName: "RoundHQ Test Co",
  })
);
assert.match(renderedFormHtml, /Status/);
assert.match(renderedFormHtml, /Business Details/);
assert.match(renderedFormHtml, /Greeting &amp; Consent/);
assert.doesNotMatch(renderedFormHtml, /<h2[^>]*>Questions<\/h2>/);
assert.doesNotMatch(renderedFormHtml, /Business Hours/);
assert.doesNotMatch(renderedFormHtml, /Emergency Keywords/);
assert.match(renderedFormHtml, /Voicemail number/);
assert.match(renderedFormHtml, /Your receptionist number/);
assert.match(renderedFormHtml, /RoundHQ manages the secure phone connection/);
assert.doesNotMatch(renderedFormHtml, /Telnyx API Key/);
assert.doesNotMatch(renderedFormHtml, /Telnyx Public Key/);
assert.doesNotMatch(renderedFormHtml, /Connection \/ App ID/);
assert.doesNotMatch(renderedFormHtml, /Answering mode/);
assert.match(renderedFormHtml, /Voicemail-to-lead/);
assert.doesNotMatch(renderedFormHtml, /Live AI conversation/);
assert.doesNotMatch(renderedFormHtml, /Voice accent/);
assert.doesNotMatch(renderedFormHtml, /Scottish/);
assert.doesNotMatch(renderedFormHtml, /Fully custom conversation/);
assert.match(
  renderedFormHtml,
  /Voicemail-to-lead is enabled on \+44 121 555 1001/
);

const renderedCustomConversationFormHtml = renderToStaticMarkup(
  React.createElement(AiReceptionistSettingsForm, {
    initialSettings: normalizeAiReceptionistSettings({
      ...enabledSettings,
      customConversationEnabled: true,
      conversationInstructions:
        'Start by saying "Hello from {{business_name}}." Then ask what help is needed.',
    }),
    workspaceName: "RoundHQ Test Co",
  })
);
assert.doesNotMatch(renderedCustomConversationFormHtml, /Conversation instructions/);
assert.doesNotMatch(
  renderedCustomConversationFormHtml,
  /<h2[^>]*>Questions<\/h2>/
);

const unconfiguredFormHtml = renderToStaticMarkup(
  React.createElement(AiReceptionistSettingsForm, {
    initialSettings: normalizeAiReceptionistSettings({
      ...defaultSettings,
      businessName: "RoundHQ Test Co",
      phoneSetupMode: "call_forwarding",
    }),
    workspaceName: "RoundHQ Test Co",
  })
);
assert.match(unconfiguredFormHtml, /Keep my existing number/);
assert.match(unconfiguredFormHtml, /Choose a new number/);
assert.match(unconfiguredFormHtml, /Set up call forwarding/);

const renderedSettingsPageHtml = renderToStaticMarkup(
  React.createElement(SettingsPage, {
    initialSettings: { businessName: "RoundHQ Test Co" },
    accountEmail: "owner@example.com",
    aiReceptionistSettings: enabledSettings,
    workspaceName: "RoundHQ Test Co",
    canManageAiReceptionistSettings: true,
  })
);
assert.match(
  renderedSettingsPageHtml,
  /Voicemail/,
  "Voicemail should render as a Settings tab"
);
assert.doesNotMatch(
  renderedSettingsPageHtml,
  /href="\/settings\/ai-receptionist"/,
  "AI Receptionist settings should not be a separate-page link"
);

const renderedNonAdminSettingsPageHtml = renderToStaticMarkup(
  React.createElement(SettingsPage, {
    initialSettings: { businessName: "RoundHQ Test Co" },
    accountEmail: "member@example.com",
    aiReceptionistSettings: enabledSettings,
    workspaceName: "RoundHQ Test Co",
    canManageAiReceptionistSettings: false,
  })
);
assert.doesNotMatch(
  renderedNonAdminSettingsPageHtml,
  /Voicemail/,
  "non-admin users should not see the voicemail settings tab"
);

console.log("AI Receptionist settings tests passed.");
