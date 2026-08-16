import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scheduleId = id.trim();

  if (!scheduleId || scheduleId.length > 200) {
    return NextResponse.json({ error: "Invalid recurring invoice schedule." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const organizationId = await ensureWorkspace(supabase, user);
  const { data: existing, error: readError } = await supabase
    .from("recurring_invoice_templates")
    .select("id,deleted_at,is_active")
    .eq("organization_id", organizationId)
    .eq("id", scheduleId)
    .maybeSingle();

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ deleted: true, alreadyDeleted: true });
  if (existing.deleted_at) return NextResponse.json({ deleted: true, alreadyDeleted: true });

  const deletedAt = new Date().toISOString();
  const { data: deactivated, error } = await supabase
    .from("recurring_invoice_templates")
    .update({ is_active: false, deleted_at: deletedAt, deleted_by: user.id, updated_at: deletedAt })
    .eq("organization_id", organizationId)
    .eq("id", scheduleId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!deactivated) {
    return NextResponse.json({ deleted: true, alreadyDeleted: true });
  }

  const { error: auditError } = await supabase.from("recurring_invoice_events").insert({
    organization_id: organizationId,
    schedule_id: scheduleId,
    event_type: "deleted",
    actor_user_id: user.id,
    metadata: {},
  });
  if (auditError) {
    console.error("recurring_invoice_deactivation_audit_failed", {
      organizationId,
      scheduleId,
      errorCode: auditError.code,
    });
  }
  return NextResponse.json({ deleted: true, alreadyDeleted: false });
}
