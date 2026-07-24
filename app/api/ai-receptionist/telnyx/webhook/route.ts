import { type NextRequest } from "next/server";
import {
  buildTelnyxWebhookContext,
  toTelnyxNextResponse,
} from "@/app/api/ai-receptionist/telnyx/route-utils";
import { handleTelnyxWebhook } from "@/lib/ai-receptionist/providers/telnyx";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const context = await buildTelnyxWebhookContext(request);

    if (!context.ok) {
      return context.response;
    }

    return toTelnyxNextResponse(await handleTelnyxWebhook(context.context));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to handle the Telnyx webhook.",
      },
      { status: 500 }
    );
  }
}