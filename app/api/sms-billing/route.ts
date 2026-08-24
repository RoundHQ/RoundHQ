import { NextResponse } from "next/server";
import { getCustomerAccountSettings } from "@/lib/customer-account";
import { getSmsEntitlement } from "@/lib/messaging/sms-billing-server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import { getWorkspaceAdminAccess } from "@/lib/workspace-admin";

export const runtime = "nodejs";

async function getCurrentContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const organizationId = await ensureWorkspace(supabase, user);
  return { supabase, user, organizationId };
}

export async function GET() {
  const context = await getCurrentContext();
  if (!context) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const [account, subscriptionResult] = await Promise.all([
    getCustomerAccountSettings(context.supabase, context.organizationId),
    context.supabase
      .from("subscriptions")
      .select("current_period_end")
      .eq("organization_id", context.organizationId)
      .maybeSingle(),
  ]);
  const entitlement = await getSmsEntitlement(
    context.supabase,
    context.organizationId,
    account,
    subscriptionResult.data?.current_period_end ?? null
  );

  return NextResponse.json({ entitlement });
}

export async function POST(request: Request) {
  const context = await getCurrentContext();
  if (!context) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { action?: unknown } | null;
  if (body?.action !== "accept_terms") {
    return NextResponse.json({ error: "Unknown SMS billing action." }, { status: 400 });
  }

  const canManage = await getWorkspaceAdminAccess(
    context.supabase,
    context.organizationId,
    context.user
  );
  if (!canManage) {
    return NextResponse.json(
      { error: "Only a workspace administrator can activate text messaging." },
      { status: 403 }
    );
  }

  const service = createServiceRoleClient();
  const account = await getCustomerAccountSettings(service, context.organizationId);
  if (!account.smsBillingEnabled) {
    return NextResponse.json(
      { error: "Text messaging is not available for this RoundHQ account." },
      { status: 403 }
    );
  }

  const acceptedAt = account.smsTermsAcceptedAt ?? new Date().toISOString();
  const acceptedBy = account.smsTermsAcceptedBy ?? context.user.id;
  const { error: updateError } = await service
    .from("customer_account_settings")
    .update({
      sms_terms_accepted: true,
      sms_terms_accepted_at: acceptedAt,
      sms_terms_accepted_by: acceptedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", context.organizationId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  if (!account.smsTermsAccepted) {
    const { error: eventError } = await service.from("sms_billing_events").insert({
      organization_id: context.organizationId,
      actor_user_id: context.user.id,
      event_type: "terms_accepted",
      price_per_message_pence: account.smsPricePerMessagePence,
    });
    if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  const refreshed = await getCustomerAccountSettings(service, context.organizationId);
  const { data: subscription } = await service
    .from("subscriptions")
    .select("current_period_end")
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  const entitlement = await getSmsEntitlement(
    service,
    context.organizationId,
    refreshed,
    subscription?.current_period_end ?? null
  );

  return NextResponse.json({ entitlement });
}
