import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "This endpoint is reserved for the AI Receptionist WebSocket media bridge.",
      expectedProtocol: "websocket",
    },
    {
      status: 426,
      headers: {
        upgrade: "websocket",
      },
    }
  );
}
