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
  Search,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  getAdminCustomerWorkspaces,
  type AdminCustomerWorkspace,
} from "@/lib/admin/customers";
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
                title="App customers"
                value={stats.totalAppCustomers}
                detail="Customers stored inside all workspaces"
                icon={Users}
              />
            </section>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-8 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
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
                    <th className="px-4 py-4 font-bold">Usage</th>
                    <th className="px-4 py-4 font-bold">Joined</th>
                    <th className="px-4 py-4 font-bold">Stripe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWorkspaces.map((workspace) => {
                    const stripeCustomerUrl = getStripeCustomerUrl(
                      workspace.stripeCustomerId
                    );

                    return (
                      <tr
                        key={workspace.id}
                        className="align-top transition hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-950">
                            {workspace.name}
                          </div>
                          <div className="mt-1 max-w-[260px] truncate text-xs text-slate-500">
                            {workspace.id}
                          </div>
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
                        <td className="px-4 py-4 text-sm text-slate-700">
                          <div>{workspace.appCustomerCount} app customers</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {workspace.memberCount} members,{" "}
                            {workspace.activeStaffCount} active staff
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
