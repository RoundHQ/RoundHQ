import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CreditCard,
  ExternalLink,
  FileText,
  LifeBuoy,
  Search,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { createManualCustomerAction } from "./customers/actions";
import {
  getAdminCustomerWorkspaces,
  type AdminCustomerWorkspace,
} from "@/lib/admin/customers";
import {
  getPlanUsagePercent,
  getSubscriptionStaffLimit,
  getSubscriptionPlan,
  SUBSCRIPTION_PLANS,
} from "@/lib/billing/plans";
import { isAdminAccessConfigured, isAdminEmail } from "@/lib/admin/access";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  "all",
  "active",
  "trialing",
  "incomplete",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
  "missing",
] as const;

type AdminPageSearchParams = {
  q?: string;
  status?: string;
  deleted?: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ");
}

function getStatusClass(value: string) {
  if (value === "active" || value === "trialing") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (value === "past_due" || value === "unpaid") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }

  if (value === "canceled" || value === "paused") {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }

  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function matchesSearch(workspace: AdminCustomerWorkspace, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    workspace.name,
    workspace.ownerEmail,
    workspace.ownerName,
    workspace.stripeCustomerId,
    workspace.stripeSubscriptionId,
    workspace.accountStatus,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function getStripeCustomerUrl(stripeCustomerId: string | null) {
  return stripeCustomerId
    ? `https://dashboard.stripe.com/customers/${stripeCustomerId}`
    : "";
}

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

function StatTile({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-4xl font-extrabold tracking-normal text-slate-950">
            {value}
          </p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
          <Icon aria-hidden="true" className="size-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function UsageMiniBar({
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
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-bold text-slate-700">
          {used.toLocaleString("en-GB")} / {limit.toLocaleString("en-GB")}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#19c653]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function SetupNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#001d1f] px-5 py-7 text-white sm:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_52%,#001112_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="relative z-10 mx-auto max-w-4xl">
        <RoundHQLogo />
        <section className="mt-12 rounded-lg border border-white/12 bg-white p-8 text-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <div className="mb-6 flex size-12 items-center justify-center rounded-md bg-amber-100 text-amber-800">
            <AlertTriangle aria-hidden="true" className="size-6" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
            Owner console
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-normal text-slate-950">
            {title}
          </h1>
          <div className="mt-5 text-sm leading-7 text-slate-600">{children}</div>
        </section>
      </div>
    </main>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<AdminPageSearchParams>;
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
    redirect("/login?next=/admin");
  }

  if (!isAdminAccessConfigured()) {
    return (
      <SetupNotice title="Admin access is not configured">
        Add your login email to <code>ROUNDHQ_ADMIN_EMAILS</code> in local and
        Vercel environment variables, then redeploy.
      </SetupNotice>
    );
  }

  if (!isAdminEmail(user.email)) {
    return (
      <SetupNotice title="This account is not allowed into the owner console">
        You are signed in as <code>{user.email ?? "unknown email"}</code>. Add
        that exact email address to <code>ROUNDHQ_ADMIN_EMAILS</code>, restart
        the local dev server, then refresh <code>/admin</code>.
      </SetupNotice>
    );
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return (
      <SetupNotice title="Admin data access is not configured">
        Add <code>SUPABASE_SERVICE_ROLE_KEY</code> in local and Vercel
        environment variables. This key is used server-side only and is never
        sent to the browser.
      </SetupNotice>
    );
  }

  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";
  const requestedStatus = params.status ?? "all";
  const selectedStatus = STATUS_OPTIONS.some((status) => status === requestedStatus)
    ? requestedStatus
    : "all";
  const { workspaces, stats } = await getAdminCustomerWorkspaces();
  const filteredWorkspaces = workspaces.filter((workspace) => {
    const statusMatches =
      selectedStatus === "all" ||
      workspace.subscriptionStatus === selectedStatus;

    return statusMatches && matchesSearch(workspace, query);
  });

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-[#001d1f] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_52%,#001112_100%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="absolute -right-24 top-20 hidden h-[420px] w-[420px] rounded-full border border-[#20d85a]/12 lg:block" />
        <div className="absolute -right-8 top-36 hidden h-[300px] w-[300px] rounded-full border border-[#20d85a]/12 lg:block" />

        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <RoundHQLogo />
              <div className="inline-flex w-fit items-center gap-2 rounded-md border border-[#20d85a]/30 bg-[#20d85a]/10 px-3 py-2 text-sm font-bold text-[#20d85a]">
                <ShieldCheck aria-hidden="true" className="size-4" />
                Owner console
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href="/admin/pages"
                className="inline-flex items-center gap-2 rounded-md border border-white/12 px-4 py-2 font-bold text-white/88 transition hover:bg-white/10 hover:text-white"
              >
                <FileText aria-hidden="true" className="size-4" />
                Pages
              </Link>
              <Link
                href="/admin/helpdesk"
                className="inline-flex items-center gap-2 rounded-md border border-white/12 px-4 py-2 font-bold text-white/88 transition hover:bg-white/10 hover:text-white"
              >
                <LifeBuoy aria-hidden="true" className="size-4" />
                Helpdesk
              </Link>
              <Link
                href="/admin/settings"
                className="inline-flex items-center gap-2 rounded-md border border-white/12 px-4 py-2 font-bold text-white/88 transition hover:bg-white/10 hover:text-white"
              >
                <Settings aria-hidden="true" className="size-4" />
                Settings
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md border border-white/12 px-4 py-2 font-bold text-white/88 transition hover:bg-white/10 hover:text-white"
              >
                Customer App
              </Link>
              <Link
                href="/billing"
                className="inline-flex items-center gap-2 rounded-md bg-[#19c653] px-4 py-2 font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.24)] transition hover:bg-[#22d861]"
              >
                Billing
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8 lg:pb-16 lg:pt-14">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <section>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#20d85a]">
                Platform customers
              </p>
              <h1 className="mt-5 max-w-3xl text-5xl font-extrabold leading-[1.08] tracking-normal text-white sm:text-6xl">
                RoundHQ customer control.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
                See every customer workspace, subscription state, owner contact,
                and usage signal across the public SaaS app.
              </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <StatTile
                title="Workspaces"
                value={stats.totalWorkspaces}
                detail="Businesses signed up"
                icon={Building2}
              />
              <StatTile
                title="Active"
                value={stats.activeSubscriptions}
                detail="Subscriptions currently active"
                icon={CreditCard}
              />
              <StatTile
                title="Needs payment"
                value={stats.incompleteSubscriptions}
                detail="Incomplete or missing subscription rows"
                icon={AlertTriangle}
              />
              <StatTile
                title="Disabled"
                value={stats.disabledAccounts}
                detail="Accounts currently blocked by owner controls"
                icon={Users}
              />
            </section>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-8 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <section className="mb-6 grid gap-5 lg:grid-cols-2">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <article
                key={plan.key}
                className={`rounded-lg border bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)] ${
                  plan.key === "growth"
                    ? "border-[#19c653] ring-1 ring-[#19c653]/20"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-slate-950">
                        {plan.name}
                      </h2>
                      {plan.badge ? (
                        <span className="rounded-full bg-[#19c653] px-2.5 py-1 text-xs font-extrabold text-white">
                          {plan.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {plan.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-slate-950">
                      {plan.priceLabel}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#168b43]">
                      {plan.billingLabel}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {plan.summaryLimits.map((limit) => (
                    <div
                      key={limit}
                      className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      {limit}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-500">
                  {stats.planCounts[plan.key]} customer workspaces on this plan
                </p>
              </article>
            ))}
          </section>

          {params.deleted === "1" ? (
            <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Customer workspace deleted.
            </div>
          ) : null}

          <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                  <UserPlus aria-hidden="true" className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                    Add customer manually
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Create a workspace, owner login, subscription record, and
                    dashboard permissions for a new RoundHQ customer.
                  </p>
                </div>
              </div>
            </div>

            <form
              action={createManualCustomerAction}
              className="mt-5 grid gap-4 lg:grid-cols-2"
            >
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Business name
                </span>
                <input
                  type="text"
                  name="workspace_name"
                  required
                  placeholder="CleanCut Jobs"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Owner name
                </span>
                <input
                  type="text"
                  name="owner_name"
                  required
                  placeholder="Owner full name"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Owner email
                </span>
                <input
                  type="email"
                  name="owner_email"
                  required
                  placeholder="owner@example.co.uk"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Temporary password
                </span>
                <input
                  type="text"
                  name="temporary_password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Plan
                </span>
                <select
                  name="subscription_plan"
                  defaultValue="starter"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                >
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <option key={plan.key} value={plan.key}>
                      {plan.name} - {plan.priceLabel} {plan.billingLabel}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Subscription status
                </span>
                <select
                  name="subscription_status"
                  defaultValue="active"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                >
                  <option value="active">Active manual access</option>
                  <option value="incomplete">Needs payment</option>
                </select>
              </label>

              <div className="flex items-end lg:col-span-2">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861] sm:w-auto"
                >
                  <UserPlus aria-hidden="true" className="size-4" />
                  Add customer
                </button>
              </div>
            </form>
          </section>

          <div className="rounded-lg border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-200 p-4 sm:p-5">
              <form className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
                <label className="relative block">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    name="q"
                    defaultValue={query}
                    placeholder="Search workspace, owner, or Stripe ID"
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-10 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                  />
                </label>

                <select
                  name="status"
                  defaultValue={selectedStatus}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === "all" ? "All statuses" : formatStatus(status)}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861]"
                >
                  Filter
                </button>
              </form>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-4 font-bold">Customer</th>
                    <th className="px-4 py-4 font-bold">Owner</th>
                    <th className="px-4 py-4 font-bold">Subscription</th>
                    <th className="px-4 py-4 font-bold">Plan</th>
                    <th className="px-4 py-4 font-bold">Usage</th>
                    <th className="px-4 py-4 font-bold">Joined</th>
                    <th className="px-4 py-4 font-bold">Stripe</th>
                    <th className="px-4 py-4 font-bold">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWorkspaces.map((workspace) => {
                    const stripeCustomerUrl = getStripeCustomerUrl(
                      workspace.stripeCustomerId
                    );
                    const plan = getSubscriptionPlan(workspace.subscriptionPlan);
                    const staffLimit = getSubscriptionStaffLimit(
                      workspace.subscriptionPlan,
                      workspace.staffAddonQuantity
                    );

                    return (
                      <tr
                        key={workspace.id}
                        className="align-top transition hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/customers/${workspace.id}`}
                            className="font-bold text-slate-950 hover:text-[#168b43] hover:underline"
                          >
                            {workspace.name}
                          </Link>
                          <div className="mt-1 max-w-[260px] truncate text-xs text-slate-500">
                            {workspace.id}
                          </div>
                          {workspace.accountStatus === "disabled" && (
                            <span className="mt-2 inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                              Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-800">
                            {workspace.ownerName}
                          </div>
                          <a
                            href={`mailto:${workspace.ownerEmail}`}
                            className="mt-1 block text-xs font-semibold text-[#168b43] hover:underline"
                          >
                            {workspace.ownerEmail}
                          </a>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${getStatusClass(
                              workspace.subscriptionStatus
                            )}`}
                          >
                            {formatStatus(workspace.subscriptionStatus)}
                          </span>
                          <div className="mt-2 text-xs text-slate-500">
                            Renews: {formatDate(workspace.currentPeriodEnd)}
                          </div>
                          {workspace.cancelAtPeriodEnd && (
                            <div className="mt-1 text-xs font-semibold text-amber-700">
                              Cancels at period end
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-extrabold text-slate-950">
                            {plan.name}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-[#168b43]">
                            {plan.priceLabel} {plan.billingLabel}
                          </div>
                          {plan.badge ? (
                            <span className="mt-2 inline-flex rounded-full bg-[#19c653] px-2 py-0.5 text-[0.68rem] font-extrabold text-white">
                              {plan.badge}
                            </span>
                          ) : null}
                        </td>
                        <td className="min-w-[190px] px-4 py-4 text-sm text-slate-700">
                          <div className="space-y-3">
                            <UsageMiniBar
                              label="Customers"
                              used={workspace.appCustomerCount}
                              limit={plan.customerLimit}
                            />
                            <UsageMiniBar
                              label="Staff"
                              used={workspace.activeStaffCount}
                              limit={staffLimit}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {formatDate(workspace.createdAt)}
                        </td>
                        <td className="px-4 py-4">
                          {stripeCustomerUrl ? (
                            <a
                              href={stripeCustomerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#168b43] hover:underline"
                            >
                              Open Stripe
                              <ExternalLink
                                aria-hidden="true"
                                className="size-3.5"
                              />
                            </a>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Not created
                            </span>
                          )}
                          {workspace.stripePriceId && (
                            <div className="mt-2 max-w-[220px] truncate text-xs text-slate-500">
                              {workspace.stripePriceId}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/customers/${workspace.id}`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-[#19c653]/45 hover:bg-[#f1fff6]"
                          >
                            View profile
                            <ArrowRight aria-hidden="true" className="size-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredWorkspaces.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No customer workspaces match this filter.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
