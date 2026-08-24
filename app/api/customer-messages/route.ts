import { NextResponse } from "next/server";
import { getMessageIdempotencyKey, type CustomerMessageChannel, type CustomerMessageKind } from "@/lib/messaging/core";
import { processCustomerMessageById, queueCustomerMessage } from "@/lib/messaging/server";
import { SmsEntitlementError } from "@/lib/messaging/sms-billing-server";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

const CHANNELS = new Set<CustomerMessageChannel>(["email", "sms"]);
const KINDS = new Set<CustomerMessageKind>([
  "quote",
  "invoice",
  "quote_follow_up",
  "invoice_follow_up",
  "service_reminder",
  "job_completion",
]);

type CustomerMessageRequest = {
  customerId?: unknown;
  channel?: unknown;
  kind?: unknown;
  recipient?: unknown;
  subject?: unknown;
  body?: unknown;
  relatedType?: unknown;
  relatedId?: unknown;
  occurrence?: unknown;
  includeDocumentLink?: unknown;
  sendNow?: unknown;
  retryFailed?: unknown;
};

function textValue(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const organizationId = await ensureWorkspace(supabase, user);
  const { data, error } = await supabase
    .from("customer_messages")
    .select(
      "id,customer_id,channel,message_kind,related_type,related_id,status,provider,sent_at,delivered_at,failure_reason,scheduled_for,created_at"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as CustomerMessageRequest | null;
    const channel = textValue(body?.channel, 20) as CustomerMessageChannel;
    const kind = textValue(body?.kind, 50) as CustomerMessageKind;
    const recipient = textValue(body?.recipient, 320);
    const messageBody = textValue(body?.body, 5_000);
    const subject = textValue(body?.subject, 300);
    const relatedType = textValue(body?.relatedType, 20);
    const relatedId = textValue(body?.relatedId, 200);
    const occurrence = textValue(body?.occurrence, 200);
    const customerId = Number(body?.customerId);

    if (!CHANNELS.has(channel) || !KINDS.has(kind) || !recipient || !messageBody) {
      return NextResponse.json({ error: "The customer message request was incomplete." }, { status: 400 });
    }
    if (channel === "email" && !subject) {
      return NextResponse.json({ error: "Add an email subject before sending." }, { status: 400 });
    }
    if (relatedType && !["quote", "invoice", "job"].includes(relatedType)) {
      return NextResponse.json({ error: "The related record type is invalid." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const organizationId = await ensureWorkspace(supabase, user);
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from("customer_messages")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("initiated_by", user.id)
      .gte("created_at", oneMinuteAgo);

    if ((count ?? 0) >= 12) {
      return NextResponse.json({ error: "Too many messages were requested. Wait a minute and try again." }, { status: 429 });
    }

    const deduplicationWindow = occurrence || new Date(Math.floor(Date.now() / 600_000) * 600_000).toISOString();
    const queued = await queueCustomerMessage(supabase, {
      organizationId,
      customerId: Number.isInteger(customerId) && customerId > 0 ? customerId : null,
      channel,
      kind,
      recipient,
      subject,
      body: messageBody,
      relatedType: (relatedType || null) as "quote" | "invoice" | "job" | null,
      relatedId: relatedId || null,
      occurrence: occurrence || deduplicationWindow,
      idempotencyKey: getMessageIdempotencyKey({
        organizationId,
        customerId: Number.isInteger(customerId) && customerId > 0 ? customerId : null,
        channel,
        kind,
        relatedType,
        relatedId,
        occurrence: deduplicationWindow,
      }),
      initiatedBy: user.id,
      requestUrl: request.url,
      includeDocumentLink: body?.includeDocumentLink === true,
    });

    let processed = queued.message;
    let shouldProcess = !queued.duplicate;
    let processingError = "";

    if (
      queued.duplicate &&
      body?.retryFailed === true &&
      queued.message.status === "failed"
    ) {
      const retryAt = new Date().toISOString();
      const { data: retried, error: retryError } = await supabase
        .from("customer_messages")
        .update({
          status: "queued",
          attempt_count: 0,
          next_attempt_at: retryAt,
          failed_at: null,
          failure_reason: null,
          updated_at: retryAt,
        })
        .eq("organization_id", organizationId)
        .eq("id", queued.message.id)
        .eq("status", "failed")
        .select("id,status,scheduled_for,channel,related_type,related_id")
        .maybeSingle();
      if (retryError) throw retryError;
      if (retried) {
        processed = retried;
        shouldProcess = true;
      }
    }

    if (body?.sendNow !== false && shouldProcess) {
      try {
        processed = await processCustomerMessageById(queued.message.id);
      } catch (error) {
        processingError = error instanceof Error ? error.message : "The provider rejected the message.";
      }
    }

    return NextResponse.json(
      { message: processed, duplicate: queued.duplicate, processingError: processingError || undefined },
      { status: queued.duplicate ? 200 : 201 }
    );
  } catch (error) {
    if (error instanceof SmsEntitlementError) {
      return NextResponse.json({
        error: error.message,
        code: error.code,
      }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error && error.message.trim() ? error.message : "Unable to queue the customer message." },
      { status: 500 }
    );
  }
}
