import JobsApp from "@/components/jobs-app";
import AccountDisabledGate from "@/components/admin/account-disabled-gate";
import SubscriptionGate from "@/components/billing/subscription-gate";
import { isAdminAccessConfigured, isAdminEmail } from "@/lib/admin/access";
import {
  ensureSubscriptionRow,
  getSubscriptionStatusLabel,
  hasDashboardAccess,
} from "@/lib/billing/subscriptions";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getCustomerAccountSettings } from "@/lib/customer-account";
import { getOrCreateAiReceptionistSettings } from "@/lib/ai-receptionist-settings";
import {
  getAiReceptionistCallHistory,
  getAiReceptionistDashboardStats,
} from "@/lib/ai-receptionist/call-logs";
import { SHOW_AI_RECEPTIONIST_UI } from "@/lib/ai-receptionist/ui-visibility";
import type { SubscriptionPlanKey } from "@/lib/billing/plans";
import { isStripeConfigured } from "@/lib/stripe/server";
import { ensureWorkspace } from "@/lib/workspace";
import { getWorkspaceAdminAccess } from "@/lib/workspace-admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type DashboardSearchParams = {
  support_workspace?: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getUserFullName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const fullName = user.user_metadata?.full_name;

  return typeof fullName === "string" && fullName.trim()
    ? fullName.trim()
    : user.email ?? "RoundHQ support";
}

async function prepareSupportWorkspaceAccess(options: {
  organizationId: string;
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  };
}) {
  if (
    !isAdminAccessConfigured() ||
    !isAdminEmail(options.user.email) ||
    !isUuid(options.organizationId)
  ) {
    redirect("/admin");
  }

  const serviceSupabase = createServiceRoleClient();
  const { data: organization, error: organizationError } = await serviceSupabase
    .from("organizations")
    .select("id, name")
    .eq("id", options.organizationId)
    .maybeSingle();

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  if (!organization) {
    redirect("/admin");
  }

  const email = options.user.email ?? `${options.user.id}@roundhq.local`;
  const fullName = getUserFullName(options.user);
  const now = new Date().toISOString();

  const { error: memberError } = await serviceSupabase
    .from("organization_members")
    .upsert(
      {
        organization_id: options.organizationId,
        user_id: options.user.id,
        email,
        full_name: fullName,
        role: "admin",
        status: "active",
        updated_at: now,
      },
      { onConflict: "organization_id,user_id" }
    );

  if (memberError) {
    throw new Error(memberError.message);
  }

  const { data: staffByUser, error: staffLookupError } = await serviceSupabase
    .from("staff_members")
    .select("id")
    .eq("organization_id", options.organizationId)
    .eq("auth_user_id", options.user.id)
    .maybeSingle();

  if (staffLookupError) {
    throw new Error(staffLookupError.message);
  }

  let existingStaff = staffByUser;

  if (!existingStaff) {
    const staffByEmailResult = await serviceSupabase
      .from("staff_members")
      .select("id")
      .eq("organization_id", options.organizationId)
      .eq("email", email)
      .maybeSingle();

    if (staffByEmailResult.error) {
      throw new Error(staffByEmailResult.error.message);
    }

    existingStaff = staffByEmailResult.data;
  }

  const staffPayload = {
    organization_id: options.organizationId,
    auth_user_id: options.user.id,
    email,
    full_name: fullName,
    role: "Admin",
    is_active: true,
    is_system_admin: true,
    updated_at: now,
  };

  const staffResult = existingStaff?.id
    ? await serviceSupabase
        .from("staff_members")
        .update(staffPayload)
        .eq("id", existingStaff.id)
    : await serviceSupabase.from("staff_members").insert(staffPayload);

  if (staffResult.error) {
    throw new Error(staffResult.error.message);
  }

  return {
    organizationId: options.organizationId,
    workspaceName:
      typeof organization.name === "string" && organization.name.trim()
        ? organization.name.trim()
        : "Customer workspace",
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<DashboardSearchParams>;
}) {
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
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const supportAccess = params.support_workspace
    ? await prepareSupportWorkspaceAccess({
        organizationId: params.support_workspace,
        user,
      })
    : null;
  const organizationId =
    supportAccess?.organizationId ?? (await ensureWorkspace(supabase, user));
  const subscription = await ensureSubscriptionRow(supabase, organizationId);
  const { data: organizations } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .limit(1);
  const workspaceName =
    typeof organizations?.[0]?.name === "string" && organizations[0].name.trim()
      ? organizations[0].name.trim()
      : "RoundHQ Workspace";
  const accountSettings = await getCustomerAccountSettings(supabase, organizationId);
  const canManageAiReceptionistSettings = SHOW_AI_RECEPTIONIST_UI
    ? await getWorkspaceAdminAccess(supabase, organizationId, user)
    : false;
  const aiReceptionistSettings = canManageAiReceptionistSettings
    ? await getOrCreateAiReceptionistSettings(supabase, organizationId)
    : null;
  const aiReceptionistStats = canManageAiReceptionistSettings
    ? await getAiReceptionistDashboardStats(supabase, organizationId)
    : null;
  const aiReceptionistCallHistory = canManageAiReceptionistSettings
    ? await getAiReceptionistCallHistory(supabase, organizationId)
    : null;

  if (!supportAccess && accountSettings.accountStatus === "disabled") {
    return (
      <AccountDisabledGate
        workspaceName={workspaceName}
        disabledReason={accountSettings.disabledReason}
      />
    );
  }

  if (!supportAccess && !hasDashboardAccess(subscription)) {
    const [starterStripeConfigured, growthStripeConfigured] = await Promise.all([
      isStripeConfigured("starter"),
      isStripeConfigured("growth"),
    ]);
    const stripeConfiguredByPlan: Record<SubscriptionPlanKey, boolean> = {
      starter: starterStripeConfigured,
      growth: growthStripeConfigured,
    };

    return (
      <SubscriptionGate
        workspaceName={workspaceName}
        subscriptionStatus={getSubscriptionStatusLabel(subscription)}
        stripeConfiguredByPlan={stripeConfiguredByPlan}
      />
    );
  }

  return (
    <JobsApp
      featureAccess={supportAccess ? undefined : accountSettings.featureAccess}
      supportAccess={supportAccess}
      subscriptionPlan={subscription.plan}
      subscriptionStaffAddonQuantity={subscription.staff_addon_quantity}
      subscriptionStatus={subscription.status}
      subscriptionTrialEndsAt={subscription.trial_ends_at}
      workspaceName={workspaceName}
      aiReceptionistSettings={aiReceptionistSettings}
      canManageAiReceptionistSettings={canManageAiReceptionistSettings}
      aiReceptionistStats={aiReceptionistStats}
      aiReceptionistCallHistory={aiReceptionistCallHistory}
    />
  );
}
