import {
  parseTwilioFormBody,
  validateTwilioSignature,
} from "@/lib/ai-receptionist/twilio";
import type {
  SendSmsResult,
  TelephonyProvider,
} from "@/lib/ai-receptionist/providers/types";

function normalisePhoneNumber(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export const twilioProvider: TelephonyProvider = {
  getProviderName() {
    return "twilio";
  },
  normalisePhoneNumber,
  validateWebhookSignature(options) {
    const url = "";
    const params = parseTwilioFormBody(options.rawBody);

    if (!options.verificationKey) {
      return {
        ok: false,
        error: "Twilio auth token is not configured.",
      };
    }

    return validateTwilioSignature({
      url,
      params,
      authToken: options.verificationKey,
      signature: options.headers.get("x-twilio-signature") ?? "",
    })
      ? { ok: true }
      : { ok: false, error: "Invalid Twilio signature." };
  },
  async handleIncomingCall() {
    return {
      ok: false,
      status: 410,
      body: { error: "Twilio is legacy for AI Receptionist production launch." },
    };
  },
  async handleRecordingComplete() {
    return {
      ok: false,
      status: 410,
      body: { error: "Twilio is legacy for AI Receptionist production launch." },
    };
  },
  async sendSms(): Promise<SendSmsResult> {
    return {
      ok: false,
      error: "Twilio SMS is not enabled for AI Receptionist production launch.",
    };
  },
};
