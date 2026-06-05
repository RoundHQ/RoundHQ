import { type NextRequest } from "next/server";
import {
  buildTwilioWebhookContext,
  toNextResponse,
} from "@/app/api/ai-receptionist/twilio/route-utils";
import { handleRecordingCompleteWebhook } from "@/lib/ai-receptionist/twilio/webhooks";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const context = await buildTwilioWebhookContext(request);

    if (!context.ok) {
      return context.response;
    }

    return toNextResponse(await handleRecordingCompleteWebhook(context.context));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to handle the Twilio recording callback.",
      },
      { status: 500 }
    );
  }
}
