import JobsApp from "@/components/jobs-app";
import AccountDisabledGate from "@/components/admin/account-disabled-gate";
import SubscriptionGate from "@/components/billing/subscription-gate";
import {
  ensureSubscriptionRow,
  getSubscriptionStatusLabel,
  hasDashboardAccess,
} from "@/lib/billing/subscriptions";
import { createClient } from "@/lib/supabase/server";
import { getCustomerAccountSettings } from "@/lib/customer-account";
import type { SubscriptionPlanKey } from "@/lib/billing/plans";
import { isStripeConfigured } from "@/lib/stripe/server";
import { ensureWorkspace } from "@/lib/workspace";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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

  const organizationId = await ensureWorkspace(supabase, user);
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

  if (accountSettings.accountStatus === "disabled") {
    return (
      <AccountDisabledGate
        workspaceName={workspaceName}
        disabledReason={accountSettings.disabledReason}
      />
    );
  }

  if (!hasDashboardAccess(subscription)) {
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
      featureAccess={accountSettings.featureAccess}
      subscriptionPlan={subscription.plan}
    />
  );
}
