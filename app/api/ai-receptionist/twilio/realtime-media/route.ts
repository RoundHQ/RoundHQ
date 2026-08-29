import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    { error: "Live AI calls have been retired. RoundHQ now uses voicemail-to-lead." },
    { status: 410 }
  );
}
