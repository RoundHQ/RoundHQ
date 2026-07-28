import { telnyxProvider } from "@/lib/ai-receptionist/providers/telnyx";
import { twilioProvider } from "@/lib/ai-receptionist/providers/twilio";
import type {
  SendAiReceptionistSmsOptions,
  TelephonyProvider,
  TelephonyProviderName,
} from "@/lib/ai-receptionist/providers/types";

export type {
  SendAiReceptionistSmsOptions,
  SendSmsResult,
  TelephonyProvider,
  TelephonyProviderName,
} from "@/lib/ai-receptionist/providers/types";

export { telnyxProvider, twilioProvider };

export function getTelephonyProvider(
  providerName: string | null | undefined
): TelephonyProvider {
  return providerName === "twilio" ? twilioProvider : telnyxProvider;
}

export async function sendAiReceptionistSms(
  options: SendAiReceptionistSmsOptions
) {
  return telnyxProvider.sendSms(options);
}

export function getPreferredAiReceptionistProvider(): TelephonyProviderName {
  return "telnyx";
}
