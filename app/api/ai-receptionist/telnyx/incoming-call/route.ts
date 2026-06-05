import { type NextRequest } from "next/server";
import {
  buildTelnyxWebhookContext,
  toTelnyxNextResponse,
} from "@/app/api/ai-receptionist/telnyx/route-utils";
import { handleTelnyxIncomingCall } from "@/lib/ai-receptionist/providers/telnyx";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const context = await buildTelnyxWebhookContext(request);

    if (!context.ok) {
      return context.response;
    }

    return toTelnyxNextResponse(await handleTelnyxIncomingCall(context.context));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to handle the Telnyx incoming call webhook.",
      },
      { status: 500 }
    );
  }
}
