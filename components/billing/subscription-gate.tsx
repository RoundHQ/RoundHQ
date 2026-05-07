import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import BillingActions from "@/components/billing/billing-actions";

type SubscriptionGateProps = {
  workspaceName: string;
  subscriptionStatus: string;
  stripeConfigured: boolean;
};

export default function SubscriptionGate({
  workspaceName,
  subscriptionStatus,
  stripeConfigured,
}: SubscriptionGateProps) {
  return (
    <main className="min-h-screen bg-[#f6f5ef] px-5 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between py-2">
          <Link href="/" className="text-xl font-semibold">
            RoundHQ
          </Link>
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-slate-950"
          >
            Login
          </Link>
        </header>

        <section className="flex flex-1 items-center py-12">
          <div className="grid w-full gap-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_320px] md:p-8">
            <div>
              <div className="mb-5 flex size-12 items-center justify-center rounded-md bg-[#173f35] text-white">
                <LockKeyhole aria-hidden="true" className="size-6" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#236b5a]">
                Subscription required
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                Activate {workspaceName} to open the dashboard.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                RoundHQ keeps each business in its own protected workspace. Start
                the monthly subscription and Stripe will return you here with
                access switched on.
              </p>

              {!stripeConfigured && (
                <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Stripe is not configured yet. Add STRIPE_SECRET_KEY and
                  STRIPE_PRICE_ID before taking live subscriptions.
                </div>
              )}

              <BillingActions
                stripeConfigured={stripeConfigured}
                showCheckout
                showPortal={false}
                className="mt-6"
              />
            </div>

            <aside className="rounded-md border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-[#236b5a]">
                <ShieldCheck aria-hidden="true" className="size-5" />
                <span className="text-sm font-semibold">Workspace status</span>
              </div>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Workspace</dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    {workspaceName}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Subscription</dt>
                  <dd className="mt-1 capitalize font-semibold text-slate-950">
                    {subscriptionStatus}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

