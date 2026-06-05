import { NextResponse, type NextRequest } from "next/server";
import {
  getRealtimeRouteContext,
  parseRealtimeJsonRequest,
} from "@/app/api/ai-receptionist/realtime/route-utils";
import { handleRealtimeSessionComplete } from "@/lib/ai-receptionist/realtime/handlers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseRealtimeJsonRequest(request);

    if (!parsed.ok) {
      return parsed.response;
    }

    const context = await getRealtimeRouteContext(request, parsed.payload);

    if (!context.ok) {
      return context.response;
    }

    const result = await handleRealtimeSessionComplete({
      supabase: context.supabase,
      settings: context.settings,
      payload: parsed.payload,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to complete AI Receptionist realtime session.",
      },
      { status: 500 }
    );
  }
}
