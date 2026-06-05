import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { canManageAiReceptionistSettings } from "@/lib/ai-receptionist-settings";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";

type WorkspaceAdminContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  organizationId: string;
  workspaceName: string;
};

type MembershipRow = {
  role: string | null;
};

type StaffAccessRow = {
  role: string | null;
  is_active: boolean | null;
  is_system_admin: boolean | null;
};

function getUserEmail(user: User) {
  return user.email?.trim().toLowerCase() ?? "";
}

async function getWorkspaceName(
  supabase: WorkspaceAdminContext["supabase"],
  organizationId: string
) {
  const { data } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();

  return typeof data?.name === "string" && data.name.trim()
    ? data.name.trim()
    : "RoundHQ Workspace";
}

async function getMembershipRole(
  supabase: WorkspaceAdminContext["supabase"],
  organizationId: string,
  userId: string
) {
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return ((data as MembershipRow | null)?.role ?? null) as string | null;
}

async function getStaffAccess(
  supabase: WorkspaceAdminContext["supabase"],
  organizationId: string,
  user: User
) {
  const byUser = await supabase
    .from("staff_members")
    .select("role,is_active,is_system_admin")
    .eq("organization_id", organizationId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byUser.data) {
    return byUser.data as StaffAccessRow;
  }

  const email = getUserEmail(user);

  if (!email) {
    return null;
  }

  const byEmail = await supabase
    .from("staff_members")
    .select("role,is_active,is_system_admin")
    .eq("organization_id", organizationId)
    .eq("email", email)
    .maybeSingle();

  return (byEmail.data as StaffAccessRow | null) ?? null;
}

export async function requireWorkspaceAdmin(
  nextPath = "/dashboard?page=settings&tab=ai-receptionist"
) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    redirect("/login?setup=supabase");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const organizationId = await ensureWorkspace(supabase, user);
  const [workspaceName, organizationRole, staffAccess] = await Promise.all([
    getWorkspaceName(supabase, organizationId),
    getMembershipRole(supabase, organizationId, user.id),
    getStaffAccess(supabase, organizationId, user),
  ]);
  const canManage = canManageAiReceptionistSettings({
    organizationRole,
    staffRole: staffAccess?.role,
    staffIsActive: staffAccess?.is_active,
    staffIsSystemAdmin: staffAccess?.is_system_admin,
  });

  if (!canManage) {
    redirect("/dashboard?page=settings&permission=admin");
  }

  return {
    supabase,
    user,
    organizationId,
    workspaceName,
  } satisfies WorkspaceAdminContext;
}

export async function getWorkspaceAdminAccess(
  supabase: WorkspaceAdminContext["supabase"],
  organizationId: string,
  user: User
) {
  const [organizationRole, staffAccess] = await Promise.all([
    getMembershipRole(supabase, organizationId, user.id),
    getStaffAccess(supabase, organizationId, user),
  ]);

  return canManageAiReceptionistSettings({
    organizationRole,
    staffRole: staffAccess?.role,
    staffIsActive: staffAccess?.is_active,
    staffIsSystemAdmin: staffAccess?.is_system_admin,
  });
}
