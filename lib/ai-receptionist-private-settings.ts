import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AI_RECEPTIONIST_PRIVATE_LEGACY_SETTINGS_SELECT,
  AI_RECEPTIONIST_PRIVATE_SETTINGS_SELECT,
  mapAiReceptionistSettingsRow,
  type AiReceptionistPrivateSettings,
  type AiReceptionistSettingsRow,
} from "@/lib/ai-receptionist-settings";
import { getTelnyxPlatformConfig } from "@/lib/ai-receptionist/telnyx-platform";

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhoneForLookup(value: string) {
  return value.replace(/[^\d+]/g, "");
}

async function decryptStoredProviderSecret(value: string | null | undefined) {
  if (!value?.trim()) {
    return "";
  }

  const { decryptAiReceptionistSecretFromStorage } = await import(
    "@/lib/ai-receptionist/secret-encryption"
  );

  return decryptAiReceptionistSecretFromStorage(value);
}

async function mapAiReceptionistPrivateSettingsRow(
  row: AiReceptionistSettingsRow | null
): Promise<AiReceptionistPrivateSettings | null> {
  if (!row?.organization_id) {
    return null;
  }

  const platform = getTelnyxPlatformConfig();
  const [telnyxApiKey, twilioAuthToken] = await Promise.all([
    platform.apiKey
      ? Promise.resolve(platform.apiKey)
      : decryptStoredProviderSecret(row.telnyx_api_key),
    decryptStoredProviderSecret(row.twilio_auth_token),
  ]);
  const publicSettings = mapAiReceptionistSettingsRow(row);

  return {
    ...publicSettings,
    organizationId: row.organization_id,
    telnyxApiKey,
    telnyxConnectionId:
      platform.connectionId || publicSettings.telnyxConnectionId,
    telnyxMessagingProfileId:
      platform.messagingProfileId || publicSettings.telnyxMessagingProfileId,
    telnyxPublicKey: platform.publicKey || publicSettings.telnyxPublicKey,
    telnyxApiKeyConfigured: Boolean(telnyxApiKey),
    twilioAuthToken,
    twilioAuthTokenConfigured: Boolean(twilioAuthToken),
  };
}

export async function getAiReceptionistPrivateSettings(
  supabase: SupabaseClient,
  organizationId: string
) {
  let result = await supabase
    .from("ai_receptionist_settings")
    .select(AI_RECEPTIONIST_PRIVATE_SETTINGS_SELECT)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (result.error) {
    result = await supabase
      .from("ai_receptionist_settings")
      .select(AI_RECEPTIONIST_PRIVATE_LEGACY_SETTINGS_SELECT)
      .eq("organization_id", organizationId)
      .maybeSingle();
  }

  if (result.error) {
    return null;
  }

  return mapAiReceptionistPrivateSettingsRow(
    result.data as unknown as AiReceptionistSettingsRow | null
  );
}

export async function findAiReceptionistSettingsForTwilioWebhook(
  supabase: SupabaseClient,
  params: URLSearchParams,
  organizationId?: string | null
) {
  if (organizationId?.trim()) {
    return getAiReceptionistPrivateSettings(supabase, organizationId.trim());
  }

  const accountSid = getText(params.get("AccountSid"));
  const calledNumber = normalizePhoneForLookup(
    getText(params.get("To")) || getText(params.get("Called"))
  );

  if (accountSid) {
    if (!calledNumber) {
      return null;
    }

    let result = await supabase
      .from("ai_receptionist_settings")
      .select(AI_RECEPTIONIST_PRIVATE_SETTINGS_SELECT)
      .eq("twilio_account_sid", accountSid)
      .limit(10);

    if (result.error) {
      result = await supabase
        .from("ai_receptionist_settings")
        .select(AI_RECEPTIONIST_PRIVATE_LEGACY_SETTINGS_SELECT)
        .eq("twilio_account_sid", accountSid)
        .limit(10);
    }

    if (!result.error && Array.isArray(result.data)) {
      const rows = result.data as unknown as AiReceptionistSettingsRow[];
      const matchedRow = rows.find(
        (row) =>
          normalizePhoneForLookup(row.twilio_phone_number ?? "") ===
          calledNumber
      );
      const matchedSettings = await mapAiReceptionistPrivateSettingsRow(
        matchedRow ?? null
      );

      if (matchedSettings) {
        return matchedSettings;
      }
    }

    return null;
  }

  if (!calledNumber) {
    return null;
  }

  let result = await supabase
    .from("ai_receptionist_settings")
    .select(AI_RECEPTIONIST_PRIVATE_SETTINGS_SELECT)
    .not("twilio_phone_number", "is", null)
    .limit(100);

  if (result.error) {
    result = await supabase
      .from("ai_receptionist_settings")
      .select(AI_RECEPTIONIST_PRIVATE_LEGACY_SETTINGS_SELECT)
      .not("twilio_phone_number", "is", null)
      .limit(100);
  }

  if (result.error || !Array.isArray(result.data)) {
    return null;
  }

  const matchedRow = (result.data as unknown as AiReceptionistSettingsRow[]).find(
    (row) =>
      normalizePhoneForLookup(row.twilio_phone_number ?? "") === calledNumber
  );

  return mapAiReceptionistPrivateSettingsRow(matchedRow ?? null);
}

export async function findAiReceptionistSettingsForTelnyxWebhook(
  supabase: SupabaseClient,
  calledNumber: string,
  callControlId = ""
) {
  const normalizedCalledNumber = normalizePhoneForLookup(calledNumber);

  if (normalizedCalledNumber) {
    let result = await supabase
      .from("ai_receptionist_settings")
      .select(AI_RECEPTIONIST_PRIVATE_SETTINGS_SELECT)
      .eq("telephony_provider", "telnyx")
      .not("telnyx_phone_number", "is", null)
      .limit(100);

    if (result.error) {
      result = await supabase
        .from("ai_receptionist_settings")
        .select(AI_RECEPTIONIST_PRIVATE_LEGACY_SETTINGS_SELECT)
        .eq("telephony_provider", "telnyx")
        .not("telnyx_phone_number", "is", null)
        .limit(100);
    }

    if (result.error || !Array.isArray(result.data)) {
      return null;
    }

    const matchedRow = (result.data as unknown as AiReceptionistSettingsRow[]).find(
      (row) =>
        normalizePhoneForLookup(row.telnyx_phone_number ?? "") ===
        normalizedCalledNumber
    );

    return mapAiReceptionistPrivateSettingsRow(matchedRow ?? null);
  }

  const normalizedCallControlId = getText(callControlId);

  if (!normalizedCallControlId) {
    return null;
  }

  const { data: callLogs, error: callLogError } = await supabase
    .from("ai_receptionist_call_logs")
    .select("organization_id")
    .eq("provider", "telnyx")
    .eq("call_sid", normalizedCallControlId)
    .limit(2);

  if (
    callLogError ||
    !Array.isArray(callLogs) ||
    callLogs.length !== 1 ||
    typeof callLogs[0]?.organization_id !== "string"
  ) {
    return null;
  }

  return getAiReceptionistPrivateSettings(
    supabase,
    callLogs[0].organization_id
  );
}
