import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AI_RECEPTIONIST_SETTINGS_SELECT,
  mapAiReceptionistSettingsRow,
  type AiReceptionistPrivateSettings,
  type AiReceptionistSettingsRow,
} from "@/lib/ai-receptionist-settings";

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

  const [telnyxApiKey, twilioAuthToken] = await Promise.all([
    decryptStoredProviderSecret(row.telnyx_api_key),
    decryptStoredProviderSecret(row.twilio_auth_token),
  ]);

  return {
    ...mapAiReceptionistSettingsRow(row),
    organizationId: row.organization_id,
    telnyxApiKey,
    telnyxApiKeyConfigured: Boolean(telnyxApiKey),
    twilioAuthToken,
    twilioAuthTokenConfigured: Boolean(twilioAuthToken),
  };
}

export async function getAiReceptionistPrivateSettings(
  supabase: SupabaseClient,
  organizationId: string
) {
  const { data, error } = await supabase
    .from("ai_receptionist_settings")
    .select(AI_RECEPTIONIST_SETTINGS_SELECT)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return mapAiReceptionistPrivateSettingsRow(
    data as unknown as AiReceptionistSettingsRow | null
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

    const { data, error } = await supabase
      .from("ai_receptionist_settings")
      .select(AI_RECEPTIONIST_SETTINGS_SELECT)
      .eq("twilio_account_sid", accountSid)
      .limit(10);

    if (!error && Array.isArray(data)) {
      const rows = data as unknown as AiReceptionistSettingsRow[];
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

  const { data, error } = await supabase
    .from("ai_receptionist_settings")
    .select(AI_RECEPTIONIST_SETTINGS_SELECT)
    .not("twilio_phone_number", "is", null)
    .limit(100);

  if (error || !Array.isArray(data)) {
    return null;
  }

  const matchedRow = (data as unknown as AiReceptionistSettingsRow[]).find(
    (row) =>
      normalizePhoneForLookup(row.twilio_phone_number ?? "") === calledNumber
  );

  return mapAiReceptionistPrivateSettingsRow(matchedRow ?? null);
}

export async function findAiReceptionistSettingsForTelnyxWebhook(
  supabase: SupabaseClient,
  calledNumber: string
) {
  const normalizedCalledNumber = normalizePhoneForLookup(calledNumber);

  if (!normalizedCalledNumber) {
    return null;
  }

  const { data, error } = await supabase
    .from("ai_receptionist_settings")
    .select(AI_RECEPTIONIST_SETTINGS_SELECT)
    .eq("telephony_provider", "telnyx")
    .not("telnyx_phone_number", "is", null)
    .limit(100);

  if (error || !Array.isArray(data)) {
    return null;
  }

  const matchedRow = (data as unknown as AiReceptionistSettingsRow[]).find(
    (row) =>
      normalizePhoneForLookup(row.telnyx_phone_number ?? "") ===
      normalizedCalledNumber
  );

  return mapAiReceptionistPrivateSettingsRow(matchedRow ?? null);
}
