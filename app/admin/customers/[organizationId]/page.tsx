import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  ExternalLink,
  Mail,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  AdminHeroShell,
  AdminSetupNotice,
} from "@/components/admin/admin-page-chrome";
import { getAdminCustomerProfile } from "@/lib/admin/customers";
import { getAdminAccess } from "@/lib/admin/guard";
import {
  getPlanUsagePercent,
  getSubscriptionStaffLimit,
  getSubscriptionPlan,
  STAFF_ADDON_PRICE_MONTHLY,
  SUBSCRIPTION_PLANS,
} from "@/lib/billing/plans";
import { getCustomerFeatureSections } from "@/lib/customer-features";
import {
  deleteCustomerWorkspaceAction,
  updateCustomerAccountAction,
  updateCustomerStaffAllowanceAction,
} from "./actions";

export const dynamic = "force-dynamic";

type CustomerPageParams = {
  organizationId: string;
};

type CustomerPageSearchParams = {
  saved?: string;
  email?: string;
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

function formatCurrency(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ");
}

function getStatusClass(value: string) {
  if (value === "active" || value === "trialing") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (value === "disabled" || value === "past_due" || value === "unpaid") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (value === "priority" || value === "watch") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function stripeCustomerUrl(stripeCustomerId: string | null) {
  return stripeCustomerId
    ? `https://dashboard.stripe.com/customers/${stripeCustomerId}`
    : "";
}

function stripeSubscriptionUrl(stripeSubscriptionId: string | null) {
  return stripeSubscriptionId
    ? `https://dashboard.stripe.com/subscriptions/${stripeSubscriptionId}`
    : "";
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-4xl font-extrabold tracking-normal text-slate-950">
        {value}
      </p>
      <p className="mt-4 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[170px_1fr]">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="text-sm font-semibold text-slate-800">{value}</dd>
    </div>
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
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="font-extrabold text-slate-950">
          {used.toLocaleString("en-GB")} / {limit.toLocaleString("en-GB")}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-[#19c653]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default async function AdminCustomerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<CustomerPageParams>;
  searchParams?: Promise<CustomerPageSearchParams>;
}) {
  const { organizationId } = await params;
  const access = await getAdminAccess(`/admin/customers/${organizationId}`);

  if (!access.ok) {
    return (
      <AdminSetupNotice title={access.title}>
        {access.description}
      </AdminSetupNotice>
    );
  }

  const profile = await getAdminCustomerProfile(organizationId);

  if (!profile) {
    notFound();
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const saved = resolvedSearchParams.saved === "1";
  const staffSaved = resolvedSearchParams.saved === "staff";
  const createdSaved = resolvedSearchParams.saved === "created";
  const ownerEmailSent = createdSaved && resolvedSearchParams.email === "sent";
  const ownerEmailNotConfigured =
    createdSaved && resolvedSearchParams.email === "not_configured";
  const ownerEmailFailed =
    createdSaved &&
    (resolvedSearchParams.email === "failed" || ownerEmailNotConfigured);
  const updateAction = updateCustomerAccountAction.bind(null, organizationId);
  const staffAllowanceAction = updateCustomerStaffAllowanceAction.bind(
    null,
    organizationId
  );
  const deleteAction = deleteCustomerWorkspaceAction.bind(null, organizationId);
  const customerUrl = stripeCustomerUrl(profile.workspace.stripeCustomerId);
  const subscriptionUrl = stripeSubscriptionUrl(
    profile.workspace.stripeSubscriptionId
  );
  const featureSections = getCustomerFeatureSections();
  const activePlan = getSubscriptionPlan(profile.workspace.subscriptionPlan);
  const staffLimit = getSubscriptionStaffLimit(
    profile.workspace.subscriptionPlan,
    profile.workspace.staffAddonQuantity
  );
  const paidStaffAddOns = profile.workspace.staffAddonQuantity;

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <AdminHeroShell
        eyebrow="Customer profile"
        title={profile.workspace.name}
        summary="View customer details, billing state, product access, support notes, and workspace usage from the owner console."
      >
        <section className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Account"
            value={formatStatus(profile.workspace.accountStatus)}
            detail={`Support priority: ${formatStatus(
              profile.workspace.supportPriority
            )}`}
          />
          <StatCard
            label="Subscription"
            value={formatStatus(profile.workspace.subscriptionStatus)}
            detail={`Renews: ${formatDate(profile.workspace.currentPeriodEnd)}`}
          />
          <StatCard
            label="Plan"
            value={activePlan.name}
            detail={`${activePlan.priceLabel} ${activePlan.billingLabel}`}
          />
          <StatCard
            label="Customers"
            value={profile.usage.appCustomers}
            detail={`${activePlan.customerLimit.toLocaleString("en-GB")} customer limit`}
          />
        </section>
      </AdminHeroShell>

      <section className="bg-white px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin/customers"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[#19c653]/45 hover:bg-[#f1fff6]"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to customers
            </Link>
            <div className="flex flex-wrap gap-2">
              <a
                href={`mailto:${profile.workspace.ownerEmail}`}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[#19c653]/45 hover:bg-[#f1fff6]"
              >
                <Mail aria-hidden="true" className="size-4" />
                Email owner
              </a>
              {customerUrl && (
                <a
                  href={customerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-[#19c653] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861]"
                >
                  Open Stripe
                  <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              )}
            </div>
          </div>

          {saved && (
            <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Customer account settings saved.
            </div>
          )}

          {createdSaved && (
            <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Customer workspace created.
              {ownerEmailSent
                ? " The owner email was sent with the workspace details."
                : " Share the owner email and temporary password with the customer."}
            </div>
          )}

          {ownerEmailFailed && (
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              {ownerEmailNotConfigured
                ? "The workspace was created, but the owner email was not sent because SMTP settings are not configured."
                : "The workspace was created, but RoundHQ could not send the owner email."}{" "}
              Check the admin SMTP settings and send the details manually if
              needed.
            </div>
          )}

          {staffSaved && (
            <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Staff allowance updated. The customer dashboard now uses the new
              limit.
            </div>
          )}

          {profile.settingsSchemaError && (
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <span className="font-bold">Database setup needed:</span>{" "}
              Run the latest <code>supabase/customer_admin_schema.sql</code> or{" "}
              <code>supabase/roundhq_tenant_schema.sql</code> in Supabase before
              saving account controls.
              <div className="mt-2 text-xs text-amber-800">
                {profile.settingsSchemaError}
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <InfoCard title="Customer profile" icon={Users}>
                <dl>
                  <DetailRow label="Workspace ID" value={profile.workspace.id} />
                  <DetailRow label="Owner" value={profile.workspace.ownerName} />
                  <DetailRow
                    label="Owner email"
                    value={
                      <a
                        href={`mailto:${profile.workspace.ownerEmail}`}
                        className="text-[#168b43] hover:underline"
                      >
                        {profile.workspace.ownerEmail}
                      </a>
                    }
                  />
                  <DetailRow
                    label="Created"
                    value={formatDate(profile.workspace.createdAt)}
                  />
                  <DetailRow
                    label="Members"
                    value={`${profile.workspace.memberCount} total, ${profile.workspace.activeStaffCount} active staff`}
                  />
                </dl>
              </InfoCard>

              <InfoCard title="Billing information" icon={CreditCard}>
                <dl>
                  <DetailRow
                    label="Plan"
                    value={`${activePlan.name} - ${activePlan.priceLabel} ${activePlan.billingLabel}`}
                  />
                  <DetailRow
                    label="Status"
                    value={
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${getStatusClass(
                          profile.workspace.subscriptionStatus
                        )}`}
                      >
                        {formatStatus(profile.workspace.subscriptionStatus)}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Trial ends"
                    value={formatDate(profile.workspace.trialEndsAt)}
                  />
                  <DetailRow
                    label="Current period"
                    value={formatDate(profile.workspace.currentPeriodEnd)}
                  />
                  <DetailRow
                    label="Cancel pending"
                    value={profile.workspace.cancelAtPeriodEnd ? "Yes" : "No"}
                  />
                  <DetailRow
                    label="Stripe customer"
                    value={
                      customerUrl ? (
                        <a
                          href={customerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[#168b43] hover:underline"
                        >
                          {profile.workspace.stripeCustomerId}
                          <ExternalLink aria-hidden="true" className="size-3.5" />
                        </a>
                      ) : (
                        "Not created"
                      )
                    }
                  />
                  <DetailRow
                    label="Stripe subscription"
                    value={
                      subscriptionUrl ? (
                        <a
                          href={subscriptionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[#168b43] hover:underline"
                        >
                          {profile.workspace.stripeSubscriptionId}
                          <ExternalLink aria-hidden="true" className="size-3.5" />
                        </a>
                      ) : (
                        "Not created"
                      )
                    }
                  />
                  <DetailRow
                    label="Price ID"
                    value={profile.workspace.stripePriceId ?? "Not set"}
                  />
                </dl>
              </InfoCard>

              <InfoCard title="Workspace usage" icon={BriefcaseBusiness}>
                <div className="space-y-4">
                  <UsageBar
                    label="Customers"
                    used={profile.usage.appCustomers}
                    limit={activePlan.customerLimit}
                  />
                  <UsageBar
                    label="Staff accounts"
                    used={profile.usage.activeStaff}
                    limit={staffLimit}
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Leads", profile.usage.leads],
                    ["Quotes", profile.usage.quotes],
                    ["Invoices", profile.usage.invoices],
                    ["Jobs", profile.usage.scheduledJobs],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-md border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        {label}
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-slate-950">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </InfoCard>

              <InfoCard title="Staff allowance" icon={UserPlus}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Included
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-950">
                      {activePlan.staffLimit}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Paid add-ons
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-950">
                      {paidStaffAddOns}
                    </p>
                  </div>
                  <div className="rounded-md border border-[#19c653]/30 bg-[#f1fff6] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#168b43]">
                      Total allowed
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-950">
                      {staffLimit}
                    </p>
                  </div>
                </div>

                <form action={staffAllowanceAction} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Staff members to add or remove
                    </span>
                    <input
                      type="number"
                      name="quantity"
                      min={1}
                      step={1}
                      defaultValue={1}
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                    />
                  </label>

                  <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    Extra staff are charged at{" "}
                    <span className="font-extrabold text-slate-950">
                      GBP {STAFF_ADDON_PRICE_MONTHLY}
                    </span>{" "}
                    per staff member / month when this workspace has a Stripe
                    subscription.
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      name="operation"
                      value="add"
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-[#19c653] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861]"
                    >
                      <UserPlus aria-hidden="true" className="size-4" />
                      Add staff allowance
                    </button>
                    <button
                      type="submit"
                      name="operation"
                      value="remove"
                      disabled={paidStaffAddOns <= 0}
                      className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove paid staff
                    </button>
                  </div>
                </form>
              </InfoCard>
            </div>

            <div className="space-y-6">
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                    <SlidersHorizontal aria-hidden="true" className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                      Account controls
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Assign the subscription plan, disable access, set support
                      priority, leave private notes, and choose which modules this
                      customer can use.
                    </p>
                  </div>
                </div>

                <form action={updateAction} className="space-y-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-700">
                        Subscription plan
                      </span>
                      <select
                        name="subscription_plan"
                        defaultValue={activePlan.key}
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                      >
                        {SUBSCRIPTION_PLANS.map((plan) => (
                          <option key={plan.key} value={plan.key}>
                            {plan.name} - {plan.priceLabel} per business / month
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-700">
                        Account status
                      </span>
                      <select
                        name="account_status"
                        defaultValue={profile.settings.accountStatus}
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="mb-2 block text-sm font-bold text-slate-700">
                        Support priority
                      </span>
                      <select
                        name="support_priority"
                        defaultValue={profile.settings.supportPriority}
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                      >
                        <option value="standard">Standard</option>
                        <option value="priority">Priority</option>
                        <option value="watch">Watch list</option>
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Disabled reason
                    </span>
                    <textarea
                      name="disabled_reason"
                      defaultValue={profile.settings.disabledReason}
                      rows={3}
                      placeholder="Shown internally here, and available for the customer disabled screen."
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                    />
                  </label>

                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
                      Feature access
                    </h3>
                    <div className="mt-4 space-y-5">
                      {featureSections.map((section) => (
                        <div key={section.title}>
                          <p className="mb-3 text-sm font-extrabold text-slate-950">
                            {section.title}
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {section.features.map((feature) => (
                              <label
                                key={feature.key}
                                className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm transition hover:border-[#19c653]/45 hover:bg-[#f1fff6]"
                              >
                                <input
                                  type="checkbox"
                                  name={`feature_${feature.key}`}
                                  defaultChecked={
                                    profile.settings.featureAccess[feature.key]
                                  }
                                  className="mt-1 size-4 shrink-0 accent-[#19c653]"
                                />
                                <span>
                                  <span className="block font-bold text-slate-900">
                                    {feature.label}
                                  </span>
                                  <span className="mt-1 block leading-5 text-slate-600">
                                    {feature.description}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Internal notes
                    </span>
                    <textarea
                      name="internal_notes"
                      defaultValue={profile.settings.internalNotes}
                      rows={5}
                      placeholder="Private owner-console notes about onboarding, support history, special pricing, or risk."
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={Boolean(profile.settingsSchemaError)}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save aria-hidden="true" className="size-4" />
                    Save customer controls
                  </button>
                </form>
              </section>

              <section className="rounded-lg border border-rose-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-700">
                    <Trash2 aria-hidden="true" className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                      Delete customer
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Delete this workspace, its app data, members,
                      subscriptions row, support tickets, customers, jobs,
                      quotes, and invoices. Any linked Stripe subscription is
                      cancelled first.
                    </p>
                  </div>
                </div>

                <form action={deleteAction} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Type {profile.workspace.name} to confirm
                    </span>
                    <input
                      type="text"
                      name="confirm_name"
                      required
                      className="w-full rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100"
                    />
                  </label>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(225,29,72,0.18)] transition hover:bg-rose-700"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    Delete customer
                  </button>
                </form>
              </section>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <InfoCard title="Members" icon={ShieldCheck}>
              <div className="divide-y divide-slate-100">
                {profile.members.map((member) => (
                  <div key={member.userId} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-slate-950">{member.fullName}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${getStatusClass(
                          member.status
                        )}`}
                      >
                        {member.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{member.email}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {member.role} joined {formatDate(member.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </InfoCard>

            <InfoCard title="Recent activity" icon={CalendarDays}>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-bold text-slate-950">
                    Recent customers
                  </p>
                  <div className="space-y-2">
                    {profile.recentCustomers.length ? (
                      profile.recentCustomers.slice(0, 4).map((customer) => (
                        <div
                          key={customer.id}
                          className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"
                        >
                          <p className="font-bold text-slate-900">
                            {customer.name || "Unnamed customer"}
                          </p>
                          <p className="mt-1 text-slate-600">
                            {customer.email || customer.phone || "No contact stored"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        No customer profiles created yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[...profile.recentQuotes, ...profile.recentInvoices]
                    .slice(0, 4)
                    .map((document) => (
                      <div
                        key={document.id}
                        className="rounded-md border border-slate-200 bg-white p-3 text-sm"
                      >
                        <p className="font-bold text-slate-900">
                          {document.customer_name || "Unknown customer"}
                        </p>
                        <p className="mt-1 text-slate-600">
                          {document.status || "No status"} -{" "}
                          {formatCurrency(document.total)}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </InfoCard>
          </div>
        </div>
      </section>
    </main>
  );
}
