import { NextResponse } from "next/server";
import { validateTelnyxWebhookSignature } from "@/lib/ai-receptionist/providers/telnyx";
import { readRequestTextWithLimit } from "@/lib/ai-receptionist/request-limits";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type TelnyxMessageEvent = {
  data?: {
    id?: unknown;
    event_type?: unknown;
    payload?: {
      id?: unknown;
      to?: Array<{ status?: unknown }>;
      errors?: Array<{ detail?: unknown; title?: unknown }>;
    };
  };
};

function text(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function mapStatus(eventType: string, providerStatus: string) {
  if (providerStatus === "delivered") return "delivered";
  if (["delivery_failed", "failed", "expired", "undeliverable"].includes(providerStatus)) {
    return "failed";
  }
  if (eventType === "message.finalized") return "sent";
  return null;
}

export async function POST(request: Request) {
  const publicKey =
    process.env.CUSTOMER_SMS_TELNYX_PUBLIC_KEY?.trim() ||
    process.env.AI_RECEPTIONIST_TELNYX_PUBLIC_KEY?.trim() ||
    "";
  if (!publicKey) {
    return NextResponse.json({ error: "SMS delivery webhooks are not configured." }, { status: 503 });
  }

  const body = await readRequestTextWithLimit(request, 256 * 1024);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });

  const signature = validateTelnyxWebhookSignature({
    rawBody: body.text,
    headers: request.headers,
    verificationKey: publicKey,
  });
  if (!signature.ok) {
    return NextResponse.json({ error: signature.error }, { status: 401 });
  }

  let event: TelnyxMessageEvent;
  try {
    event = JSON.parse(body.text) as TelnyxMessageEvent;
  } catch {
    return NextResponse.json({ error: "Invalid Telnyx message event." }, { status: 400 });
  }
  const eventId = text(event.data?.id);
  const eventType = text(event.data?.event_type);
  const providerMessageId = text(event.data?.payload?.id);
  const providerStatus = text(event.data?.payload?.to?.[0]?.status).toLowerCase();
  if (!eventId || !eventType || !providerMessageId) {
    return NextResponse.json({ error: "Invalid Telnyx message event." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: message, error: messageError } = await supabase
    .from("customer_messages")
    .select("id,organization_id,status")
    .eq("provider", "telnyx")
    .eq("provider_message_id", providerMessageId)
    .maybeSingle();
  if (messageError) return NextResponse.json({ error: "Unable to match the message." }, { status: 500 });
  if (!message) return NextResponse.json({ received: true, matched: false });

  const failureReason = text(
    event.data?.payload?.errors?.[0]?.detail || event.data?.payload?.errors?.[0]?.title,
    500
  );
  const { data: storedEvent, error: eventError } = await supabase.from("customer_message_events").insert({
    organization_id: message.organization_id,
    customer_message_id: message.id,
    provider_event_id: eventId,
    event_type: eventType,
    provider_status: providerStatus || null,
    metadata: failureReason ? { failureCategory: "provider_delivery" } : {},
  })
    .select("id")
    .single();
  if (eventError?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (eventError) return NextResponse.json({ error: "Unable to store the delivery event." }, { status: 500 });

  const status = mapStatus(eventType, providerStatus);
  if (status) {
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("customer_messages")
      .update({
        status,
        delivered_at: status === "delivered" ? now : undefined,
        failed_at: status === "failed" ? now : undefined,
        failure_reason: status === "failed" ? failureReason || "SMS delivery failed." : null,
        updated_at: now,
      })
      .eq("id", message.id);
    if (updateError) {
      if (storedEvent?.id) {
        await supabase
          .from("customer_message_events")
          .delete()
          .eq("id", storedEvent.id);
      }
      return NextResponse.json({ error: "Unable to update delivery status." }, { status: 500 });
    }
  }

  console.info("customer_sms_delivery_event", {
    eventType,
    status: status ?? "unchanged",
  });

  return NextResponse.json({ received: true, matched: true });
}

