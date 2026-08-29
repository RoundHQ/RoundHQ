import { NextResponse } from "next/server";
import { syncServiceReminderMessages } from "@/lib/messaging/automations";
import { processDueCustomerMessages } from "@/lib/messaging/server";

export const runtime = "nodejs";

async function processCustomerMessageQueue(request: Request) {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  const suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const reminders = await syncServiceReminderMessages();
  const results = await processDueCustomerMessages(50);
  const failed = results.filter((result) => !result.ok).length;
  console.info("customer_message_queue_processed", { processed: results.length, failed });
  return NextResponse.json({ reminders, processed: results.length, failed });
}

export const GET = processCustomerMessageQueue;
export const POST = processCustomerMessageQueue;
