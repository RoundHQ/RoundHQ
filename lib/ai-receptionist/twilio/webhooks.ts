import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getPlatformEmailSettings,
  isPlatformEmailConfigured,
  sendPlatformEmail,
} from "@/lib/admin/email-settings";
import {
  createAiReceptionistLeadFromPayload,
  formatAiReceptionistCallDuration,
} from "@/lib/ai-receptionist-leads";
import {
  getAiReceptionistCallLog,
  updateAiReceptionistCallLog,
  upsertAiReceptionistCallLog,
} from "@/lib/ai-receptionist/call-logs";
import {
  findAiReceptionistSettingsForTwilioWebhook,
} from "@/lib/ai-receptionist-private-settings";
import type {
  AiReceptionistPrivateSettings,
} from "@/lib/ai-receptionist-settings";
import {
  buildIncomingCallTwiML,
  buildRealtimeIncomingCallTwiML,
  buildVoicemailLeadPayload,
  normalizeTwilioCallStatusCallback,
  normalizeTwilioRecordingCallback,
  parseTwilioFormBody,
  validateTwilioSignature,
  type TwilioRecordingCallback,
} from "@/lib/ai-receptionist/twilio";

export type TwilioWebhookResponse = {
  status: number;
  body: string;
  contentType: "application/json" | "text/xml";
};

type TwilioWebhookContext = {
  supabase: SupabaseClient;
  url: string;
  rawBody: string;
  signature: string;
  baseUrl: string;
  websocketBaseUrl?: string;
  organizationId?: string | null;
};

function jsonResponse(body: unknown, status = 200): TwilioWebhookResponse {
  return {
    status,
    body: JSON.stringify(body),
    contentType: "application/json",
  };
}

function xmlResponse(body: string, status = 200): TwilioWebhookResponse {
  return {
    status,
    body,
    contentType: "text/xml",
  };
}

function getUnavailableTwiML(message: string) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Say>${message}</Say>`,
    "</Response>",
  ].join("\n");
}

async function getValidatedSettings(context: TwilioWebhookContext) {
  const params = parseTwilioFormBody(context.rawBody);
  const settings = await findAiReceptionistSettingsForTwilioWebhook(
    context.supabase,
    params,
    context.organizationId
  );

  if (!settings?.twilioAuthToken) {
    return {
      ok: false as const,
      params,
      response: jsonResponse({ error: "Twilio connection is not configured." }, 403),
    };
  }

  if (
    !validateTwilioSignature({
      url: context.url,
      params,
      authToken: settings.twilioAuthToken,
      signature: context.signature,
    })
  ) {
    return {
      ok: false as const,
      params,
      response: jsonResponse({ error: "Invalid Twilio signature." }, 403),
    };
  }

  return {
    ok: true as const,
    params,
    settings,
  };
}

function buildCallbackUrl(baseUrl: string, path: string, organizationId: string) {
  const url = new URL(path, baseUrl);
  url.searchParams.set("organization_id", organizationId);
  return url.toString();
}

function buildRealtimeMediaStreamUrl(
  websocketBaseUrl: string | undefined,
  organizationId: string
) {
  const url = new URL(
    "/api/ai-receptionist/twilio/realtime-media",
    websocketBaseUrl || "wss://roundhq.local"
  );
  url.searchParams.set("organization_id", organizationId);
  return url.toString();
}

export async function handleIncomingCallWebhook(
  context: TwilioWebhookContext
): Promise<TwilioWebhookResponse> {
  const validated = await getValidatedSettings(context);

  if (!validated.ok) {
    return validated.response;
  }

  const callStatus = normalizeTwilioCallStatusCallback(validated.params);

  if (!validated.settings.enabled) {
    return xmlResponse(
      getUnavailableTwiML("AI Receptionist is not enabled for this business."),
      200
    );
  }

  if (callStatus.callSid) {
    await upsertAiReceptionistCallLog(
      context.supabase,
      validated.settings.organizationId,
      {
        callSid: callStatus.callSid,
        accountSid: callStatus.accountSid,
        callerNumber: callStatus.callerNumber,
        twilioPhoneNumber: callStatus.twilioPhoneNumber,
        callType: validated.settings.realtimeEnabled ? "realtime" : "voicemail",
        callStatus: callStatus.callStatus || "incoming",
        rawPayload: callStatus.rawPayload,
      }
    );
  }

  if (validated.settings.realtimeEnabled) {
    return xmlResponse(
      buildRealtimeIncomingCallTwiML({
        settings: validated.settings,
        mediaStreamUrl: buildRealtimeMediaStreamUrl(
          context.websocketBaseUrl,
          validated.settings.organizationId
        ),
        callStatusCallbackUrl: buildCallbackUrl(
          context.baseUrl,
          "/api/ai-receptionist/twilio/call-status",
          validated.settings.organizationId
        ),
      })
    );
  }

  return xmlResponse(
    buildIncomingCallTwiML({
      settings: validated.settings,
      recordingCallbackUrl: buildCallbackUrl(
        context.baseUrl,
        "/api/ai-receptionist/twilio/recording-complete",
        validated.settings.organizationId
      ),
      callStatusCallbackUrl: buildCallbackUrl(
        context.baseUrl,
        "/api/ai-receptionist/twilio/call-status",
        validated.settings.organizationId
      ),
    })
  );
}

function getNotificationMessage(options: {
  settings: AiReceptionistPrivateSettings;
  recording: TwilioRecordingCallback;
  leadId: string;
  summary: string;
}) {
  return [
    "New AI Receptionist Lead",
    "",
    `Caller: ${options.recording.callerNumber || "Unknown"}`,
    "",
    `Summary: ${options.summary}`,
    "",
    `Lead Created: ${options.leadId}`,
    options.recording.durationSeconds != null
      ? `Call Duration: ${formatAiReceptionistCallDuration(
          options.recording.durationSeconds
        )}`
      : "",
    options.recording.recordingUrl
      ? `Recording: ${options.recording.recordingUrl}`
      : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

async function sendLeadNotification(options: {
  settings: AiReceptionistPrivateSettings;
  recording: TwilioRecordingCallback;
  leadId: string;
  summary: string;
}) {
  const recipient = options.settings.notificationEmail.trim();

  if (!recipient) {
    return {
      status: "skipped",
      error: "No notification email configured.",
    };
  }

  const platformEmailSettings = await getPlatformEmailSettings();

  if (!isPlatformEmailConfigured(platformEmailSettings)) {
    return {
      status: "skipped",
      error: "Platform email is not configured.",
    };
  }

  await sendPlatformEmail({
    settings: platformEmailSettings,
    to: recipient,
    subject: "New AI Receptionist Lead",
    message: getNotificationMessage(options),
  });

  return {
    status: "sent",
    error: null,
  };
}

async function updateExistingLeadTranscript(options: {
  supabase: SupabaseClient;
  organizationId: string;
  leadId: string;
  transcript: string;
  recording: TwilioRecordingCallback;
}) {
  if (!options.transcript.trim()) {
    return;
  }

  const { data } = await options.supabase
    .from("customer_leads")
    .select("activity_history,raw_payload,message,notes,extracted_data")
    .eq("organization_id", options.organizationId)
    .eq("id", options.leadId)
    .maybeSingle();

  if (!data || typeof data !== "object") {
    return;
  }

  const row = data as {
    activity_history?: Array<Record<string, unknown>> | null;
    raw_payload?: Record<string, unknown> | null;
    message?: string | null;
    notes?: string | null;
    extracted_data?: Record<string, unknown> | null;
  };
  const activityHistory = Array.isArray(row.activity_history)
    ? row.activity_history.map((entry) => {
        if (entry.type !== "ai_receptionist_call") {
          return entry;
        }

        return {
          ...entry,
          detail: [
            typeof entry.detail === "string" ? entry.detail : "",
            "Transcript captured.",
          ]
            .filter(Boolean)
            .join("\n\n"),
          metadata: {
            ...(typeof entry.metadata === "object" && entry.metadata
              ? (entry.metadata as Record<string, unknown>)
              : {}),
            transcript: options.transcript,
          },
        };
      })
    : [];

  await options.supabase
    .from("customer_leads")
    .update({
      activity_history: activityHistory,
      raw_payload: {
        ...(row.raw_payload ?? {}),
        transcript: options.transcript,
      },
      message: row.message?.trim() ? row.message : options.transcript,
      notes: row.notes?.trim() ? row.notes : options.transcript,
      extracted_data: {
        ...(row.extracted_data ?? {}),
        notes:
          typeof row.extracted_data?.notes === "string" &&
          row.extracted_data.notes.trim()
            ? row.extracted_data.notes
            : options.transcript,
      },
    })
    .eq("organization_id", options.organizationId)
    .eq("id", options.leadId);
}

export async function handleRecordingCompleteWebhook(
  context: TwilioWebhookContext
): Promise<TwilioWebhookResponse> {
  const validated = await getValidatedSettings(context);

  if (!validated.ok) {
    return validated.response;
  }

  const recording = normalizeTwilioRecordingCallback(validated.params);

  if (!recording.callSid) {
    return jsonResponse({ error: "CallSid is required." }, 400);
  }

  if (!recording.recordingUrl && !recording.transcript) {
    await upsertAiReceptionistCallLog(
      context.supabase,
      validated.settings.organizationId,
      {
        callSid: recording.callSid,
        accountSid: recording.accountSid,
        callerNumber: recording.callerNumber,
        twilioPhoneNumber: recording.twilioPhoneNumber,
        callType: "voicemail",
        callStatus: recording.callStatus || "recording-missing",
        rawPayload: recording.rawPayload,
      }
    );

    return jsonResponse({ error: "RecordingUrl is required." }, 400);
  }

  const existingCallLog = await getAiReceptionistCallLog(
    context.supabase,
    validated.settings.organizationId,
    recording.callSid
  );
  const existingLeadId = existingCallLog?.lead_id ?? null;

  await upsertAiReceptionistCallLog(
    context.supabase,
    validated.settings.organizationId,
    {
      callSid: recording.callSid,
      accountSid: recording.accountSid,
      callerNumber: recording.callerNumber,
      twilioPhoneNumber: recording.twilioPhoneNumber,
      callType: "voicemail",
      recordingUrl: recording.recordingUrl || existingCallLog?.recording_url || undefined,
      durationSeconds: recording.durationSeconds ?? existingCallLog?.duration_seconds,
      transcript: recording.transcript,
      leadId: existingLeadId,
      callStatus: recording.callStatus || "recording-complete",
      rawPayload: recording.rawPayload,
    }
  );

  if (existingLeadId) {
    await updateExistingLeadTranscript({
      supabase: context.supabase,
      organizationId: validated.settings.organizationId,
      leadId: existingLeadId,
      transcript: recording.transcript,
      recording,
    });
    await updateAiReceptionistCallLog(
      context.supabase,
      validated.settings.organizationId,
      recording.callSid,
      {
        transcript: recording.transcript,
        recordingUrl: recording.recordingUrl,
      }
    );

    return jsonResponse({
      ok: true,
      leadId: existingLeadId,
      duplicate: true,
    });
  }

  const leadPayload = buildVoicemailLeadPayload({
    recording,
    settings: validated.settings,
  });
  const leadResult = await createAiReceptionistLeadFromPayload({
    supabase: context.supabase,
    organizationId: validated.settings.organizationId,
    payload: leadPayload,
  });

  if (!leadResult.ok) {
    await updateAiReceptionistCallLog(
      context.supabase,
      validated.settings.organizationId,
      recording.callSid,
      {
        notificationStatus: "failed",
        notificationError: leadResult.error,
      }
    );

    return jsonResponse({ error: leadResult.error }, leadResult.status);
  }

  let notificationStatus = "skipped";
  let notificationError: string | null = null;

  try {
    const notification = await sendLeadNotification({
      settings: validated.settings,
      recording,
      leadId: leadResult.lead.id,
      summary: String(leadPayload.ai_summary ?? ""),
    });
    notificationStatus = notification.status;
    notificationError = notification.error;
  } catch (error) {
    notificationStatus = "failed";
    notificationError =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Unable to send notification.";
  }

  await updateAiReceptionistCallLog(
    context.supabase,
    validated.settings.organizationId,
    recording.callSid,
    {
      leadId: leadResult.lead.id,
      notificationStatus,
      notificationError,
    }
  );

  return jsonResponse({
    ok: true,
    leadId: leadResult.lead.id,
    notificationStatus,
  });
}

export async function handleCallStatusWebhook(
  context: TwilioWebhookContext
): Promise<TwilioWebhookResponse> {
  const validated = await getValidatedSettings(context);

  if (!validated.ok) {
    return validated.response;
  }

  const status = normalizeTwilioCallStatusCallback(validated.params);

  if (!status.callSid) {
    return jsonResponse({ error: "CallSid is required." }, 400);
  }

  await upsertAiReceptionistCallLog(
    context.supabase,
    validated.settings.organizationId,
    {
      callSid: status.callSid,
      accountSid: status.accountSid,
      callerNumber: status.callerNumber,
      twilioPhoneNumber: status.twilioPhoneNumber,
      callType: validated.settings.realtimeEnabled ? "realtime" : "voicemail",
      callStatus: status.callStatus || "status-callback",
      rawPayload: status.rawPayload,
    }
  );

  return jsonResponse({ ok: true });
}
