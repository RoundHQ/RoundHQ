import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import BillingActions from "@/components/billing/billing-actions";
import StaffAddOnActions from "@/components/billing/staff-add-on-actions";
import {
  getPlanUsagePercent,
  getSubscriptionStaffLimit,
  getSubscriptionPlan,
  STAFF_ADDON_PRICE_MONTHLY,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from "@/lib/billing/plans";
import {
  ensureSubscriptionRow,
  getSubscriptionStatusLabel,
  hasDashboardAccess,
} from "@/lib/billing/subscriptions";
import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/stripe/server";
import { canAccessBilling, normalizeStaffRole } from "@/lib/team-permissions";
import { ensureWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

function RoundHQLogo() {
  return (
    <Link href="/" className="block shrink-0" aria-label="RoundHQ home">
      <Image
        src="/roundhq-logo-long-white.png"
        alt="RoundHQ"
        width={1200}
        height={300}
        priority
        className="h-auto w-[210px] sm:w-[235px]"
      />
    </Link>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const percent = getPlanUsagePercent(used, limit);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="font-extrabold text-slate-950">
          {used.toLocaleString("en-GB")} / {limit.toLocaleString("en-GB")}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#19c653]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  activePlan,
  hasAccess,
  canManageBilling,
  stripeConfigured,
}: {
  plan: SubscriptionPlan;
  activePlan: SubscriptionPlan;
  hasAccess: boolean;
  canManageBilling: boolean;
  stripeConfigured: boolean;
}) {
  const isCurrentPlan = activePlan.key === plan.key;

  return (
    <article
      className={`relative flex h-full flex-col rounded-lg border bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] ${
        plan.key === "growth" ? "border-[#19c653] ring-1 ring-[#19c653]/20" : "border-slate-200"
      }`}
    >
      {plan.badge && (
        <span className="absolute right-4 top-4 rounded-full bg-[#19c653] px-3 py-1 text-xs font-extrabold text-white">
          {plan.badge}
        </span>
      )}
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
        {plan.name}
      </p>
      <h3 className="mt-3 text-xl font-extrabold text-slate-950">
        {plan.description}
      </h3>
      <div className="mt-5 flex items-end gap-2">
        <p className="text-5xl font-extrabold tracking-normal text-slate-950">
          {plan.priceLabel}
        </p>
        <p className="pb-2 text-sm font-bold text-[#168b43]">
          {plan.billingLabel}
        </p>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.includedFeatures.map((item) => (
          <li key={item} className="flex items-center gap-3 text-sm text-slate-700">
            <BadgeCheck
              aria-hidden="true"
              className="size-4 shrink-0 text-[#18b74f]"
            />
            {item}
          </li>
        ))}
      </ul>
      <BillingActions
        stripeConfigured={stripeConfigured}
        checkoutPlan={plan.key}
        showCheckout={!hasAccess}
        showPortal={hasAccess && canManageBilling}
        showRefresh={false}
        checkoutLabel={`Choose ${plan.name}`}
        portalLabel={
          isCurrentPlan
            ? "Manage billing"
            : plan.key === "growth"
              ? "Upgrade to Growth"
              : "Manage plan"
        }
        className="mt-auto pt-7"
      />
      {isCurrentPlan && hasAccess ? (
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-[#168b43]">
          Current plan
        </p>
      ) : null}
    </article>
  );
}

function StatusTile({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </p>
      <p className="mt-3 text-2xl font-extrabold capitalize tracking-normal text-slate-950">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

export default async function BillingPage() {
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
  const [membershipResult, staffResult] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("staff_members")
      .select("role,is_system_admin,is_active")
      .eq("organization_id", organizationId)
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
      .limit(1)
      .maybeSingle(),
  ]);
  const membershipRole = membershipResult.data?.role;
  const staffRecord = staffResult.data;
  const canViewBilling =
    membershipRole === "owner" ||
    membershipRole === "admin" ||
    Boolean(staffRecord?.is_system_admin) ||
    (staffRecord?.is_active === true &&
      canAccessBilling(normalizeStaffRole(staffRecord.role)));

  if (!canViewBilling) {
    redirect("/dashboard");
  }

  const subscription = await ensureSubscriptionRow(supabase, organizationId);
  const { data: organizations } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .limit(1);
  const organizationName =
    typeof organizations?.[0]?.name === "string" && organizations[0].name.trim()
      ? organizations[0].name.trim()
      : "RoundHQ Workspace";
  const hasAccess = hasDashboardAccess(subscription);
  const [stripeConfigured, starterStripeConfigured, growthStripeConfigured] =
    await Promise.all([
      isStripeConfigured(),
      isStripeConfigured("starter"),
      isStripeConfigured("growth"),
    ]);
  const stripeConfiguredByPlan: Record<SubscriptionPlan["key"], boolean> = {
    starter: starterStripeConfigured,
    growth: growthStripeConfigured,
  };
  const statusLabel = getSubscriptionStatusLabel(subscription);
  const activePlan = getSubscriptionPlan(subscription.plan);
  const staffLimit = getSubscriptionStaffLimit(
    subscription.plan,
    subscription.staff_addon_quantity
  );
  const renewalLabel = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-GB")
    : "Not set";
  const [customersUsageResult, staffUsageResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("staff_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("is_active", true),
  ]);
  const customerCount = customersUsageResult.count ?? 0;
  const staffCount = staffUsageResult.count ?? 0;

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-[#001d1f] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_52%,#001112_100%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="absolute -right-24 top-20 hidden h-[420px] w-[420px] rounded-full border border-[#20d85a]/12 lg:block" />
        <div className="absolute -right-8 top-36 hidden h-[300px] w-[300px] rounded-full border border-[#20d85a]/12 lg:block" />

        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-6 sm:px-8">
            <RoundHQLogo />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md border border-white/12 px-4 py-2 text-sm font-bold text-white/88 transition hover:bg-white/10 hover:text-white"
            >
              <LayoutDashboard aria-hidden="true" className="size-4" />
              Dashboard
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8 lg:pb-16 lg:pt-14">
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-end">
            <section>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#20d85a]">
                Billing
              </p>
              <h1 className="mt-5 max-w-3xl text-5xl font-extrabold leading-[1.08] tracking-normal text-white sm:text-6xl">
                Manage your RoundHQ subscription.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
                Review access, renewal dates, and Stripe billing for{" "}
                <span className="font-bold text-white">{organizationName}</span>.
              </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <StatusTile
                title="Subscription"
                value={statusLabel}
                detail="Current Stripe status"
              />
              <StatusTile
                title="Access"
                value={hasAccess ? "Active" : "Waiting"}
                detail={hasAccess ? "Dashboard is open" : "Payment required"}
              />
              <StatusTile
                title="Plan"
                value={activePlan.name}
                detail={`${activePlan.priceLabel} ${activePlan.billingLabel}`}
              />
            </section>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-5 flex size-12 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                  <CreditCard aria-hidden="true" className="size-6" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
                  Workspace account
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-normal text-slate-950 sm:text-4xl">
                  {organizationName}
                </h2>
              </div>
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold capitalize ring-1 ${
                  hasAccess
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-amber-50 text-amber-800 ring-amber-200"
                }`}
              >
                {hasAccess ? "Access active" : "Payment needed"}
              </span>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">
                  Subscription
                </p>
                <p className="mt-2 font-extrabold capitalize text-slate-950">
                  {statusLabel}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">
                  Dashboard access
                </p>
                <p className="mt-2 font-extrabold text-slate-950">
                  {hasAccess ? "Active" : "Waiting for payment"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">
                  Next renewal
                </p>
                <p className="mt-2 font-extrabold text-slate-950">
                  {renewalLabel}
                </p>
              </div>
            </div>

            {!stripeConfigured && (
              <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Stripe is not configured yet. Add the secret key, webhook
                signing secret, and both Starter and Growth price IDs in admin
                settings before launch.
              </div>
            )}

            <BillingActions
              stripeConfigured={stripeConfigured}
              showCheckout={false}
              showPortal={Boolean(subscription.stripe_customer_id)}
              portalLabel="Manage billing"
              className="mt-7"
            />

            <div className="mt-7 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <ShieldCheck aria-hidden="true" className="size-4 text-[#168b43]" />
              Stripe handles card details and subscription management.
            </div>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                <CalendarDays aria-hidden="true" className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
                  Current plan
                </p>
                <h2 className="mt-3 text-3xl font-extrabold text-slate-950">
                  {activePlan.name}
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {activePlan.priceLabel} {activePlan.billingLabel}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <UsageBar
                label="Customers"
                used={customerCount}
                limit={activePlan.customerLimit}
              />
              <UsageBar
                label="Staff accounts"
                used={staffCount}
                limit={staffLimit}
              />
            </div>

            <div className="mt-7 rounded-md border border-[#19c653]/20 bg-[#f1fff6] p-4">
              <p className="text-sm font-extrabold text-slate-950">
                {activePlan.dashboardLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {activePlan.key === "starter"
                  ? "Upgrade to Growth when you need RAMS, staff permissions, advanced insights, and customer profitability."
                  : "Growth includes RAMS, staff permissions, advanced insights, and customer profitability for growing teams."}
              </p>
            </div>

            <StaffAddOnActions
              stripeConfigured={stripeConfigured}
              canManageBilling={Boolean(
                hasAccess && subscription.stripe_subscription_id
              )}
              currentAddOnQuantity={subscription.staff_addon_quantity}
              priceMonthly={STAFF_ADDON_PRICE_MONTHLY}
            />
          </aside>
        </div>

        <section className="mx-auto mt-6 grid max-w-7xl items-stretch gap-6 lg:grid-cols-2">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              activePlan={activePlan}
              hasAccess={hasAccess}
              canManageBilling={Boolean(subscription.stripe_customer_id)}
              stripeConfigured={stripeConfiguredByPlan[plan.key]}
            />
          ))}
        </section>
      </section>
    </main>
  );
}
