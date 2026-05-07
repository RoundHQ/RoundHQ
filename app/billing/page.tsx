import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, ShieldCheck } from "lucide-react";
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

  return (
    <main className="min-h-screen bg-[#f6f5ef] px-5 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between py-2">
          <Link href="/" className="text-xl font-semibold">
            RoundHQ
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-slate-950"
          >
            Dashboard
          </Link>
        </header>

        <section className="flex flex-1 items-center py-12">
          <div className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 flex size-12 items-center justify-center rounded-md bg-[#173f35] text-white">
              <CreditCard aria-hidden="true" className="size-6" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#236b5a]">
              Billing
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              {organizationName}
            </h1>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <dt className="text-sm text-slate-500">Subscription</dt>
                <dd className="mt-2 capitalize font-semibold text-slate-950">
                  {getSubscriptionStatusLabel(subscription)}
                </dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <dt className="text-sm text-slate-500">Dashboard access</dt>
                <dd className="mt-2 font-semibold text-slate-950">
                  {hasAccess ? "Active" : "Waiting for payment"}
                </dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <dt className="text-sm text-slate-500">Next renewal</dt>
                <dd className="mt-2 font-semibold text-slate-950">
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString(
                        "en-GB"
                      )
                    : "Not set"}
                </dd>
              </div>
            </div>

            {!isStripeConfigured() && (
              <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Stripe is not configured yet. Add STRIPE_SECRET_KEY,
                STRIPE_PRICE_ID, SUPABASE_SERVICE_ROLE_KEY, and
                STRIPE_WEBHOOK_SECRET before launch.
              </div>
            )}

            <BillingActions
              stripeConfigured={isStripeConfigured()}
              showCheckout={!hasAccess}
              showPortal={Boolean(subscription.stripe_customer_id)}
              className="mt-6"
            />

            <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck aria-hidden="true" className="size-4 text-[#236b5a]" />
              Stripe handles card details and subscription management.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

