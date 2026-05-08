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
import {
  ensureSubscriptionRow,
  getSubscriptionStatusLabel,
  hasDashboardAccess,
} from "@/lib/billing/subscriptions";
import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/stripe/server";
import { ensureWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const includedFeatures = [
  "Unlimited customers",
  "Unlimited jobs and quotes",
  "Invoicing and payments",
  "Route planning and map view",
  "Staff accounts",
  "Reports and insights",
];

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
  const stripeConfigured = isStripeConfigured();
  const statusLabel = getSubscriptionStatusLabel(subscription);
  const renewalLabel = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-GB")
    : "Not set";

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
                title="Next renewal"
                value={renewalLabel}
                detail="Billing cycle date"
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
                Stripe is not configured yet. Add STRIPE_SECRET_KEY,
                STRIPE_PRICE_ID, SUPABASE_SERVICE_ROLE_KEY, and
                STRIPE_WEBHOOK_SECRET before launch.
              </div>
            )}

            <BillingActions
              stripeConfigured={stripeConfigured}
              showCheckout={!hasAccess}
              showPortal={Boolean(subscription.stripe_customer_id)}
              checkoutLabel="Start subscription"
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
                  All-inclusive
                </p>
                <div className="mt-3 flex items-end gap-2">
                  <p className="text-5xl font-extrabold tracking-normal text-slate-950">
                    £30
                  </p>
                  <p className="pb-2 text-lg font-bold text-[#168b43]">
                    / month
                  </p>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Per business account
                </p>
              </div>
            </div>

            <ul className="mt-8 space-y-3">
              {includedFeatures.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm text-slate-700"
                >
                  <BadgeCheck
                    aria-hidden="true"
                    className="size-4 shrink-0 text-[#18b74f]"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
