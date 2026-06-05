"use server";

import { revalidatePath } from "next/cache";
import {
  getDefaultAiReceptionistSettings,
  mapAiReceptionistSettingsToRow,
  normalizeAiReceptionistBusinessHours,
  normalizeAiReceptionistList,
  normalizeAiReceptionistSettings,
  validateAiReceptionistSettings,
  type AiReceptionistSettings,
} from "@/lib/ai-receptionist-settings";
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

function buildAiReceptionistSettingsFromFormData(formData: FormData) {
  const defaults = getDefaultAiReceptionistSettings();

  return normalizeAiReceptionistSettings({
    enabled: formData.get("enabled") === "on",
    businessName: getText(formData, "business_name"),
    greetingMessage: getText(formData, "greeting_message"),
    fallbackPhoneNumber: getText(formData, "fallback_phone_number"),
    notificationEmail: getText(formData, "notification_email"),
    telephonyProvider:
      getText(formData, "telephony_provider") === "twilio" ? "twilio" : "telnyx",
    telnyxPhoneNumber: getText(formData, "telnyx_phone_number"),
    telnyxConnectionId: getText(formData, "telnyx_connection_id"),
    telnyxMessagingProfileId: getText(formData, "telnyx_messaging_profile_id"),
    telnyxPublicKey: getText(formData, "telnyx_public_key"),
    telnyxApiKeyConfigured:
      formData.get("telnyx_api_key_configured") === "true" ||
      Boolean(getText(formData, "telnyx_api_key")),
    twilioAccountSid: getText(formData, "twilio_account_sid"),
    twilioPhoneNumber: getText(formData, "twilio_phone_number"),
    twilioAuthTokenConfigured:
      formData.get("twilio_auth_token_configured") === "true" ||
      Boolean(getText(formData, "twilio_auth_token")),
    realtimeEnabled: false,
    transferToNumber: getText(formData, "transfer_to_number"),
    newLeadSmsEnabled: formData.get("new_lead_sms_enabled") === "on",
    newLeadSmsPhoneNumber: getText(formData, "new_lead_sms_phone_number"),
    businessHoursEnabled: formData.get("business_hours_enabled") === "on",
    businessHours: normalizeAiReceptionistBusinessHours(
      parseJsonField(formData, "business_hours_json", defaults.businessHours)
    ),
    questionsToAsk: normalizeAiReceptionistList(
      parseJsonField(formData, "questions_to_ask_json", defaults.questionsToAsk),
      []
    ),
    emergencyKeywords: normalizeAiReceptionistList(
      parseJsonField(
        formData,
        "emergency_keywords_json",
        defaults.emergencyKeywords
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
  const draftSettings = buildAiReceptionistSettingsFromFormData(formData);
  const actionIntent = getText(formData, "action_intent");
  const newTelnyxApiKey = getText(formData, "telnyx_api_key");
  const newTwilioAuthToken = getText(formData, "twilio_auth_token");
  const { supabase, organizationId } = await requireWorkspaceAdmin(
    "/dashboard?page=settings&tab=ai-receptionist"
  );
  const { data: storedSecrets } = await supabase
    .from("ai_receptionist_settings")
    .select("telnyx_api_key,twilio_auth_token")
    .eq("organization_id", organizationId)
    .maybeSingle();
  const storedSecretRow = (storedSecrets ?? {}) as {
    telnyx_api_key?: string | null;
    twilio_auth_token?: string | null;
  };
  let telnyxApiKey = storedSecretRow.telnyx_api_key ?? "";
  let twilioAuthToken = storedSecretRow.twilio_auth_token ?? "";

  try {
    const { encryptAiReceptionistSecretForStorage } = await import(
      "@/lib/ai-receptionist/secret-encryption"
    );

    if (newTelnyxApiKey) {
      telnyxApiKey = encryptAiReceptionistSecretForStorage(newTelnyxApiKey);
    }

    if (newTwilioAuthToken) {
      twilioAuthToken = encryptAiReceptionistSecretForStorage(newTwilioAuthToken);
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Unable to encrypt AI Receptionist provider secrets.";

    return {
      ok: false,
      message,
      errors: [message],
      settings: draftSettings,
    };
  }

  const settings = normalizeAiReceptionistSettings({
    ...draftSettings,
    telnyxApiKeyConfigured: Boolean(telnyxApiKey),
    twilioAuthTokenConfigured: Boolean(twilioAuthToken),
  });

  if (actionIntent === "send_test_sms") {
    const to = getText(formData, "test_sms_number") || settings.newLeadSmsPhoneNumber;

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

  const { error } = await supabase.from("ai_receptionist_settings").upsert(
    mapAiReceptionistSettingsToRow(settings, organizationId, {
      telnyxApiKey,
      twilioAuthToken,
    }),
    {
      onConflict: "organization_id",
    }
  );

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
