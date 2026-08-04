"use server";

import { revalidatePath } from "next/cache";
import {
  getDefaultAiReceptionistSettings,
  getOrCreateAiReceptionistSettings,
  mapAiReceptionistSettingsToRow,
  normalizeAiReceptionistVoiceAccent,
  normalizeAiReceptionistBusinessHours,
  normalizeAiReceptionistList,
  normalizeAiReceptionistSettings,
  validateAiReceptionistSettings,
  type AiReceptionistSettings,
} from "@/lib/ai-receptionist-settings";
import { isCustomerFeatureEnabled } from "@/lib/customer-account";
import { requireWorkspaceAdmin } from "@/lib/workspace-admin";

export type AiReceptionistSettingsActionState = {
  ok: boolean;
  message: string;
  errors: string[];
  settings: AiReceptionistSettings;
};

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function parseJsonField(formData: FormData, key: string, fallback: unknown) {
  const value = getText(formData, key);

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

function buildAiReceptionistSettingsFromFormData(
  formData: FormData,
  currentSettings: AiReceptionistSettings
) {
  return normalizeAiReceptionistSettings({
    ...currentSettings,
    enabled: formData.get("enabled") === "on",
    businessName: getText(formData, "business_name"),
    greetingMessage: getText(formData, "greeting_message"),
    fallbackPhoneNumber: getText(formData, "fallback_phone_number"),
    notificationEmail: getText(formData, "notification_email"),
    telephonyProvider: "telnyx",
    realtimeEnabled:
      ["true", "on"].includes(getText(formData, "realtime_enabled")),
    voiceAccent: normalizeAiReceptionistVoiceAccent(
      getText(formData, "voice_accent")
    ),
    customConversationEnabled: ["true", "on"].includes(
      getText(formData, "custom_conversation_enabled")
    ),
    conversationInstructions: getText(
      formData,
      "conversation_instructions"
    ),
    transferToNumber: getText(formData, "transfer_to_number"),
    newLeadSmsEnabled: formData.get("new_lead_sms_enabled") === "on",
    newLeadSmsPhoneNumber: getText(formData, "new_lead_sms_phone_number"),
    businessHoursEnabled: formData.get("business_hours_enabled") === "on",
    businessHours: normalizeAiReceptionistBusinessHours(
      parseJsonField(
        formData,
        "business_hours_json",
        currentSettings.businessHours
      )
    ),
    questionsToAsk: normalizeAiReceptionistList(
      parseJsonField(
        formData,
        "questions_to_ask_json",
        currentSettings.questionsToAsk
      ),
      []
    ),
    emergencyKeywords: normalizeAiReceptionistList(
      parseJsonField(
        formData,
        "emergency_keywords_json",
        currentSettings.emergencyKeywords
      ),
      []
    ),
    consentMessage: getText(formData, "consent_message"),
    leadSourceLabel: getText(formData, "lead_source_label") || "AI Receptionist",
  });
}

export async function updateAiReceptionistSettingsAction(
  _previousState: AiReceptionistSettingsActionState,
  formData: FormData
): Promise<AiReceptionistSettingsActionState> {
  const { supabase, organizationId } = await requireWorkspaceAdmin(
    "/dashboard?page=settings&tab=ai-receptionist"
  );
  const featureEnabled = await isCustomerFeatureEnabled(
    supabase,
    organizationId,
    "aiReceptionist"
  );

  if (!featureEnabled) {
    const settings = getDefaultAiReceptionistSettings();

    return {
      ok: false,
      message: "AI Receptionist is not enabled for this workspace.",
      errors: ["Ask the RoundHQ platform owner to enable the AI Receptionist pilot."],
      settings,
    };
  }

  const currentSettings = await getOrCreateAiReceptionistSettings(
    supabase,
    organizationId
  );

  if (!currentSettings.schemaReady) {
    const message =
      currentSettings.schemaError ||
      "AI Receptionist settings are not ready in this workspace.";

    return {
      ok: false,
      message,
      errors: [message],
      settings: currentSettings,
    };
  }

  const settings = buildAiReceptionistSettingsFromFormData(
    formData,
    currentSettings
  );
  const actionIntent = getText(formData, "action_intent");

  if (actionIntent === "send_test_sms") {
    const to =
      getText(formData, "test_sms_number") || settings.newLeadSmsPhoneNumber;

    if (!to) {
      return {
        ok: false,
        message: "Add a test SMS phone number first.",
        errors: ["Add a test SMS phone number first."],
        settings,
      };
    }

    const { sendAiReceptionistSms } = await import(
      "@/lib/ai-receptionist/providers"
    );
    const sms = await sendAiReceptionistSms({
      organisationId: organizationId,
      to,
      message: "RoundHQ AI Receptionist test SMS.",
      supabase,
    });

    return {
      ok: sms.ok,
      message: sms.ok ? "Test SMS sent." : sms.error,
      errors: sms.ok ? [] : [sms.error],
      settings,
    };
  }

  const validation = validateAiReceptionistSettings(settings);

  if (!validation.ok) {
    return {
      ok: false,
      message: validation.errors[0] ?? "Check the AI Receptionist settings.",
      errors: validation.errors,
      settings,
    };
  }

  const { error } = await supabase
    .from("ai_receptionist_settings")
    .update(mapAiReceptionistSettingsToRow(settings, organizationId))
    .eq("organization_id", organizationId);

  if (error) {
    return {
      ok: false,
      message: error.message,
      errors: [error.message],
      settings,
    };
  }

  revalidatePath("/dashboard");

  return {
    ok: true,
    message: "AI Receptionist settings saved.",
    errors: [],
    settings: {
      ...settings,
      exists: true,
      updatedAt: new Date().toISOString(),
    },
  };
}