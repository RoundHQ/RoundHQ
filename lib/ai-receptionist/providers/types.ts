import type { SupabaseClient } from "@supabase/supabase-js";

export type TelephonyProviderName = "telnyx" | "twilio";

export type ProviderWebhookValidation = {
  ok: boolean;
  error?: string;
};

export type IncomingCallResult = {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
};

export type RecordingCompleteResult = IncomingCallResult;

export type SendSmsResult =
  | {
      ok: true;
      providerMessageId?: string;
    }
  | {
      ok: false;
      error: string;
    };

export type SendAiReceptionistSmsOptions = {
  organisationId: string;
  to: string;
  message: string;
  relatedLeadId?: string;
  supabase?: SupabaseClient;
  fetchImpl?: typeof fetch;
};

export type TelephonyProvider = {
  getProviderName(): TelephonyProviderName;
  normalisePhoneNumber(value: string): string;
  validateWebhookSignature(options: {
    rawBody: string;
    headers: Headers;
    verificationKey: string;
    now?: Date;
  }): ProviderWebhookValidation;
  handleIncomingCall(options: unknown): Promise<IncomingCallResult>;
  handleRecordingComplete(options: unknown): Promise<RecordingCompleteResult>;
  sendSms(options: SendAiReceptionistSmsOptions): Promise<SendSmsResult>;
};
