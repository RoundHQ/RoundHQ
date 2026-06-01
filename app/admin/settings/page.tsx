import Link from "next/link";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CreditCard,
  Eye,
  FileText,
  Flag,
  LifeBuoy,
  Mail,
  Megaphone,
  Paperclip,
  Receipt,
  ServerCog,
  Tags,
} from "lucide-react";
import {
  AdminHeroShell,
  AdminSetupNotice,
} from "@/components/admin/admin-page-chrome";
import {
  getPlatformEmailSettings,
  isPlatformEmailConfigured,
} from "@/lib/admin/email-settings";
import { getAdminAccess } from "@/lib/admin/guard";
import {
  getPlatformStripeSettings,
  isPlatformStripeConfigured,
} from "@/lib/admin/stripe-settings";
import { getPlatformTrialSettings } from "@/lib/admin/trial-settings";
import {
  getSupportDeskSettingsData,
  type SupportCategoryOption,
  type SupportPriorityOption,
} from "@/lib/support/helpdesk";
import { getAdminPlatformAnnouncement } from "@/lib/admin/platform-announcements";
import {
  saveSupportCategoryAction,
  saveSupportPriorityAction,
  sendAdminDirectEmailAction,
  updatePlatformAnnouncementAction,
  updateAdminEmailSettingsAction,
  updateAdminHelpdeskSettingsAction,
  updateAdminInvoiceSettingsAction,
  updateAdminStripeSettingsAction,
  updateAdminTrialSettingsAction,
} from "./actions";

export const dynamic = "force-dynamic";

type AdminSettingsSearchParams = {
  saved?: string;
  sent?: string;
  tab?: string;
};

function TextInput({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  rows,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
      />
    </label>
  );
}

function SettingStat({
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
      <p className="mt-3 text-3xl font-extrabold tracking-normal text-slate-950">
        {value}
      </p>
      <p className="mt-4 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function SettingsTabLink({
  href,
  isActive,
  icon,
  label,
}: {
  href: string;
  isActive: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-3 text-sm font-bold transition ${
        isActive
          ? "bg-[#19c653] text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)]"
          : "border border-slate-200 bg-white text-slate-700 hover:border-[#19c653]/40 hover:bg-[#f2fbf5]"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function TemplateVariable({
  name,
  detail,
}: {
  name: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <code className="text-xs font-bold text-slate-950">{name}</code>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function InvoicePdfPreview({
  settings,
}: {
  settings: Awaited<ReturnType<typeof getPlatformEmailSettings>>;
}) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 shadow-[0_18px_46px_rgba(15,23,42,0.16)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2">
          <Eye aria-hidden="true" className="size-4 text-[#19c653]" />
          <p className="text-sm font-extrabold">PDF preview</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
          Attached to invoice emails
        </span>
      </div>

      <div className="mx-auto max-w-[520px] rounded-md bg-white p-6 text-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-2xl font-black tracking-normal">RoundHQ</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#19c653]">
              Invoice
            </p>
          </div>
          <div className="text-right text-xs leading-5 text-slate-500">
            <p className="font-bold text-slate-950">INV-1042</p>
            <p>Issued 09 May 2026</p>
            <p>Due {dueDate.toLocaleDateString("en-GB")}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              From
            </p>
            <p className="mt-2 font-bold">RoundHQ Maintenance</p>
            <p className="text-slate-500">mail@roundhq.co.uk</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              To
            </p>
            <p className="mt-2 font-bold">Green Acre Gardens</p>
            <p className="text-slate-500">accounts@example.com</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-md border border-slate-200">
          <div className="grid grid-cols-[1fr_80px] bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            <span>Description</span>
            <span className="text-right">Total</span>
          </div>
          {[
            ["Monthly grounds maintenance", "£195.00"],
            ["Waste removal", "£45.00"],
            ["VAT", "£48.00"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[1fr_80px] border-t border-slate-100 px-4 py-3 text-sm"
            >
              <span>{label}</span>
              <span className="text-right font-bold">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-[220px] rounded-md bg-[#e7f9ed] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-600">Amount due</span>
              <span className="text-2xl font-black text-slate-950">£288.00</span>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          <p className="font-bold text-slate-950">Payment details</p>
          <p className="mt-1">
            Please use the invoice number as your payment reference.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/75">
        Email subject preview:{" "}
        <span className="font-semibold text-white">
          {settings.invoiceSubjectTemplate
            .replace("{{invoiceNumber}}", "INV-1042")
            .replace("{{businessName}}", "RoundHQ Maintenance")}
        </span>
      </div>
    </div>
  );
}

function SupportCategoryEditor({
  category,
}: {
  category?: SupportCategoryOption;
}) {
  return (
    <form
      action={saveSupportCategoryAction}
      className="rounded-md border border-slate-200 bg-slate-50 p-4"
    >
      {category ? (
        <input type="hidden" name="category_id" value={category.id} />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_90px]">
        <TextInput
          label="Label"
          name="label"
          defaultValue={category?.label ?? ""}
          placeholder="Technical issue"
          required
        />
        <TextInput
          label="Slug"
          name="slug"
          defaultValue={category?.slug ?? ""}
          placeholder="technical_issue"
        />
        <TextInput
          label="Sort"
          name="sort_order"
          type="number"
          defaultValue={category?.sortOrder ?? 50}
        />
      </div>
      <div className="mt-4">
        <TextArea
          label="Description"
          name="description"
          defaultValue={category?.description ?? ""}
          rows={3}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={category?.isActive ?? true}
            className="size-4 accent-[#19c653]"
          />
          Active
        </label>
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800">
          {category ? "Update category" : "Add category"}
        </button>
      </div>
    </form>
  );
}

function SupportPriorityEditor({
  priority,
}: {
  priority?: SupportPriorityOption;
}) {
  return (
    <form
      action={saveSupportPriorityAction}
      className="rounded-md border border-slate-200 bg-slate-50 p-4"
    >
      {priority ? (
        <input type="hidden" name="priority_id" value={priority.id} />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_100px_90px]">
        <TextInput
          label="Label"
          name="label"
          defaultValue={priority?.label ?? ""}
          placeholder="Critical"
          required
        />
        <TextInput
          label="Slug"
          name="slug"
          defaultValue={priority?.slug ?? ""}
          placeholder="critical"
        />
        <TextInput
          label="Target hrs"
          name="response_target_hours"
          type="number"
          defaultValue={priority?.responseTargetHours ?? 24}
        />
        <TextInput
          label="Sort"
          name="sort_order"
          type="number"
          defaultValue={priority?.sortOrder ?? 50}
        />
      </div>
      <div className="mt-4">
        <TextArea
          label="Description"
          name="description"
          defaultValue={priority?.description ?? ""}
          rows={3}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={priority?.isActive ?? true}
            className="size-4 accent-[#19c653]"
          />
          Active
        </label>
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800">
          {priority ? "Update priority" : "Add priority"}
        </button>
      </div>
    </form>
  );
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<AdminSettingsSearchParams>;
}) {
  const access = await getAdminAccess("/admin/settings");

  if (!access.ok) {
    return (
      <AdminSetupNotice title={access.title}>
        {access.description}
      </AdminSetupNotice>
    );
  }

  const params = (await searchParams) ?? {};
  const settings = await getPlatformEmailSettings();
  const stripeSettings = await getPlatformStripeSettings();
  const trialSettings = await getPlatformTrialSettings();
  const supportSettings = await getSupportDeskSettingsData();
  const announcement = await getAdminPlatformAnnouncement();
  const emailReady = isPlatformEmailConfigured(settings);
  const stripeReady =
    isPlatformStripeConfigured(stripeSettings) &&
    Boolean(stripeSettings.webhookSecret) &&
    Boolean(stripeSettings.connectWebhookSecret);
  const saved = params.saved === "1";
  const activeTab =
    params.tab === "invoices" ||
    params.tab === "send-email" ||
    params.tab === "stripe" ||
    params.tab === "trials" ||
    params.tab === "helpdesk" ||
    params.tab === "announcements"
      ? params.tab
      : "email";
  const sent = activeTab === "send-email" && params.sent === "1";

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <AdminHeroShell
        eyebrow="Platform settings"
        title="RoundHQ owner settings."
        summary="Configure platform email delivery, signup verification emails, automated invoice reminders, Stripe checkout, helpdesk defaults, and dashboard announcements from the owner console."
      >
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SettingStat
            title="Email"
            value={emailReady ? "Ready" : "Setup"}
            detail={
              emailReady
                ? "SMTP sender is configured"
                : "Add SMTP details before sending automated emails"
            }
          />
          <SettingStat
            title="Invoices"
            value={settings.invoiceAutomationEnabled ? "Auto" : "Manual"}
            detail={`Send ${settings.invoiceDaysBeforeDue} days before the due date`}
          />
          <SettingStat
            title="Stripe"
            value={stripeReady ? "Ready" : "Setup"}
            detail={
              stripeReady
                ? "Checkout and both webhook secrets are saved"
                : "Add keys, webhook secrets, and price IDs before taking payments"
            }
          />
          <SettingStat
            title="Free Trial"
            value={trialSettings.enabled ? "On" : "Off"}
            detail={`${trialSettings.defaultDays} day default for new workspaces`}
          />
          <SettingStat
            title="Announcements"
            value={announcement.isActive ? "Live" : "Paused"}
            detail={
              announcement.isActive
                ? "Shown inside every customer dashboard"
                : "No active customer dashboard notice"
            }
          />
        </section>
      </AdminHeroShell>

      <section className="bg-white px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap gap-2">
            <SettingsTabLink
              href="/admin/settings?tab=email"
              isActive={activeTab === "email"}
              icon={<Mail aria-hidden="true" className="size-4" />}
              label="Email"
            />
            <SettingsTabLink
              href="/admin/settings?tab=invoices"
              isActive={activeTab === "invoices"}
              icon={<Receipt aria-hidden="true" className="size-4" />}
              label="Invoices"
            />
            <SettingsTabLink
              href="/admin/settings?tab=send-email"
              isActive={activeTab === "send-email"}
              icon={<Mail aria-hidden="true" className="size-4" />}
              label="Send Email"
            />
            <SettingsTabLink
              href="/admin/settings?tab=stripe"
              isActive={activeTab === "stripe"}
              icon={<CreditCard aria-hidden="true" className="size-4" />}
              label="Stripe"
            />
            <SettingsTabLink
              href="/admin/settings?tab=trials"
              isActive={activeTab === "trials"}
              icon={<CalendarClock aria-hidden="true" className="size-4" />}
              label="Free Trial"
            />
            <SettingsTabLink
              href="/admin/settings?tab=helpdesk"
              isActive={activeTab === "helpdesk"}
              icon={<LifeBuoy aria-hidden="true" className="size-4" />}
              label="Helpdesk"
            />
            <SettingsTabLink
              href="/admin/settings?tab=announcements"
              isActive={activeTab === "announcements"}
              icon={<Megaphone aria-hidden="true" className="size-4" />}
              label="Announcements"
            />
          </div>

          {saved && (
            <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {activeTab === "invoices"
                ? "Invoice settings saved."
                : activeTab === "stripe"
                  ? "Stripe settings saved."
                : activeTab === "trials"
                  ? "Free trial settings saved."
                : activeTab === "helpdesk"
                  ? "Helpdesk settings saved."
                : activeTab === "announcements"
                  ? "Announcement saved."
                : "Email settings saved."}
            </div>
          )}

          {sent && (
            <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Email sent successfully.
            </div>
          )}

          {settings.schemaError && (
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <span className="font-bold">Database setup needed:</span>{" "}
              Run <code>supabase/platform_email_settings_schema.sql</code> or
              the latest <code>supabase/roundhq_tenant_schema.sql</code> before
              saving email settings.
              <div className="mt-2 text-xs text-amber-800">
                {settings.schemaError}
              </div>
            </div>
          )}

          {activeTab === "stripe" && stripeSettings.schemaError && (
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <span className="font-bold">Stripe database setup needed:</span>{" "}
              Run <code>supabase/platform_stripe_settings_schema.sql</code> or
              the latest <code>supabase/roundhq_tenant_schema.sql</code> before
              saving Stripe settings.
              <div className="mt-2 text-xs text-amber-800">
                {stripeSettings.schemaError}
              </div>
            </div>
          )}

          {activeTab === "trials" && trialSettings.schemaError && (
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <span className="font-bold">Free trial database setup needed:</span>{" "}
              Run <code>supabase/platform_trial_settings_schema.sql</code> or
              the latest <code>supabase/roundhq_tenant_schema.sql</code> before
              saving free trial settings.
              <div className="mt-2 text-xs text-amber-800">
                {trialSettings.schemaError}
              </div>
            </div>
          )}

          {activeTab === "helpdesk" && supportSettings.schemaError && (
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <span className="font-bold">Helpdesk database setup needed:</span>{" "}
              Run <code>supabase/helpdesk_schema.sql</code> or the latest{" "}
              <code>supabase/roundhq_tenant_schema.sql</code> before saving
              helpdesk settings.
              <div className="mt-2 text-xs text-amber-800">
                {supportSettings.schemaError}
              </div>
            </div>
          )}

          {activeTab === "announcements" && announcement.schemaError && (
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <span className="font-bold">Announcements database setup needed:</span>{" "}
              Run <code>supabase/platform_announcements_schema.sql</code> or
              the latest <code>supabase/roundhq_tenant_schema.sql</code> before
              saving dashboard announcements.
              <div className="mt-2 text-xs text-amber-800">
                {announcement.schemaError}
              </div>
            </div>
          )}

          {activeTab === "email" ? (
            <form
              action={updateAdminEmailSettingsAction}
              className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
            >
            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                  <ServerCog aria-hidden="true" className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                    SMTP sender
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    These details are stored server-side and used for RoundHQ
                    signup verification and automated invoice emails.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextInput
                    label="From name"
                    name="email_from_name"
                    defaultValue={settings.emailFromName}
                    required
                  />
                  <TextInput
                    label="From email"
                    name="email_from_address"
                    type="email"
                    defaultValue={settings.emailFromAddress}
                    required
                  />
                </div>

                <TextInput
                  label="Reply-to email"
                  name="email_reply_to"
                  type="email"
                  defaultValue={settings.emailReplyTo}
                />

                <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
                  <TextInput
                    label="SMTP host"
                    name="smtp_host"
                    defaultValue={settings.smtpHost}
                    placeholder="smtp.yourprovider.com"
                    required
                  />
                  <TextInput
                    label="Port"
                    name="smtp_port"
                    type="number"
                    defaultValue={settings.smtpPort}
                    required
                  />
                </div>

                <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    name="smtp_secure"
                    defaultChecked={settings.smtpSecure}
                    className="size-4 accent-[#19c653]"
                  />
                  Use SSL / TLS
                </label>

                <TextInput
                  label="SMTP username"
                  name="smtp_username"
                  defaultValue={settings.smtpUsername}
                  required
                />

                <TextInput
                  label={
                    settings.passwordConfigured
                      ? "SMTP password (leave blank to keep saved password)"
                      : "SMTP password"
                  }
                  name="smtp_password"
                  type="password"
                  placeholder={
                    settings.passwordConfigured ? "Saved password present" : ""
                  }
                  required={!settings.passwordConfigured}
                />
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                    <BadgeCheck aria-hidden="true" className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                      Signup verification
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Used when new customers sign up so the confirmation email
                      comes from RoundHQ instead of the Supabase default sender.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <TextInput
                    label="Verification subject"
                    name="verification_subject_template"
                    defaultValue={settings.verificationSubjectTemplate}
                    required
                  />
                  <TextArea
                    label="Verification email body"
                    name="verification_message_template"
                    defaultValue={settings.verificationMessageTemplate}
                    rows={8}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                  Email delivery status
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Invoice PDF attachments, signup verification, and customer
                  messages all use this sender once SMTP is configured.
                </p>

                <div className="mt-6 grid gap-3">
                  <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                    <Mail aria-hidden="true" className="size-4 text-[#168b43]" />
                    {emailReady ? "SMTP is ready to send" : "SMTP setup is incomplete"}
                  </div>
                  <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                    <Paperclip
                      aria-hidden="true"
                      className="size-4 text-[#168b43]"
                    />
                    Invoice emails attach the generated PDF automatically
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={Boolean(settings.schemaError)}
                className="inline-flex w-full items-center justify-center rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save email settings
              </button>
            </section>
            </form>
          ) : activeTab === "invoices" ? (
            <form
              action={updateAdminInvoiceSettingsAction}
              className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
            >
              <section className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                  <div className="mb-6 flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                      <CalendarClock aria-hidden="true" className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                        Invoice automation
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Send recurring invoices before the customer payment due
                        date. Each email includes the invoice PDF attachment.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        name="invoice_automation_enabled"
                        defaultChecked={settings.invoiceAutomationEnabled}
                        className="size-4 accent-[#19c653]"
                      />
                      Automatically send recurring invoices
                    </label>

                    <TextInput
                      label="Send invoices this many days before due date"
                      name="invoice_days_before_due"
                      type="number"
                      defaultValue={settings.invoiceDaysBeforeDue}
                      required
                    />

                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                      Invoices are queued from recurring invoice templates and
                      sent once per due cycle. The generated PDF is attached to
                      the email automatically.
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                  <div className="mb-6 flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                      <FileText aria-hidden="true" className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                        Invoice email
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        The email body sits alongside the PDF attachment and
                        can use invoice variables.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <TextInput
                      label="Invoice email subject"
                      name="invoice_subject_template"
                      defaultValue={settings.invoiceSubjectTemplate}
                      required
                    />
                    <TextArea
                      label="Invoice email body"
                      name="invoice_message_template"
                      defaultValue={settings.invoiceMessageTemplate}
                      rows={9}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={Boolean(settings.schemaError)}
                  className="inline-flex w-full items-center justify-center rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save invoice settings
                </button>
              </section>

              <section className="space-y-6">
                <InvoicePdfPreview settings={settings} />

                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                  <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                    Template variables
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Use these placeholders in the subject or message. RoundHQ
                    swaps them with the invoice details before sending.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <TemplateVariable
                      name="{{invoiceNumber}}"
                      detail="The invoice reference shown on the PDF."
                    />
                    <TemplateVariable
                      name="{{customerName}}"
                      detail="The customer or business name."
                    />
                    <TemplateVariable
                      name="{{businessName}}"
                      detail="Your business name from the invoice sender."
                    />
                    <TemplateVariable
                      name="{{invoiceTotal}}"
                      detail="The total amount due."
                    />
                    <TemplateVariable
                      name="{{dueDate}}"
                      detail="The invoice payment due date."
                    />
                    <TemplateVariable
                      name="{{paymentLink}}"
                      detail="A hosted payment link when one is available."
                    />
                  </div>
                </div>
              </section>
            </form>
          ) : activeTab === "send-email" ? (
            <form
              action={sendAdminDirectEmailAction}
              className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
            >
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                    <Mail aria-hidden="true" className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                      Send an email
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Send a plain email directly from RoundHQ using the saved
                      platform SMTP sender.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <TextInput
                    label="Recipient email"
                    name="recipient_email"
                    type="email"
                    placeholder="customer@example.co.uk"
                    required
                  />
                  <TextInput
                    label="Subject"
                    name="email_subject"
                    placeholder="Message from RoundHQ"
                    required
                  />
                  <TextArea
                    label="Message"
                    name="email_message"
                    defaultValue=""
                    rows={11}
                  />
                </div>

                <button
                  type="submit"
                  disabled={Boolean(settings.schemaError) || !emailReady}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send email
                </button>
              </section>

              <section className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                  <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                    Sender status
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Direct emails use the same SMTP account as signup
                    verification, invoice emails, and support notifications.
                  </p>

                  <div className="mt-6 grid gap-3">
                    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <span className="font-bold text-slate-700">SMTP sender</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          emailReady
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {emailReady ? "Ready" : "Missing"}
                      </span>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      From:{" "}
                      <span className="font-bold text-slate-950">
                        {settings.emailFromName || "RoundHQ"}{" "}
                        {settings.emailFromAddress
                          ? `<${settings.emailFromAddress}>`
                          : ""}
                      </span>
                    </div>
                  </div>

                  {!emailReady ? (
                    <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                      Add SMTP host, username, password, and From email in the
                      Email tab before sending direct emails.
                    </div>
                  ) : null}
                </div>
              </section>
            </form>
          ) : activeTab === "trials" ? (
            <form
              action={updateAdminTrialSettingsAction}
              className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
            >
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                    <CalendarClock aria-hidden="true" className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                      Free trial defaults
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Control whether new RoundHQ workspaces start on a free
                      trial and how long the trial runs before the dashboard
                      requires a paid subscription.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      name="free_trial_enabled"
                      defaultChecked={trialSettings.enabled}
                      className="mt-1 size-4 accent-[#19c653]"
                    />
                    <span>
                      Enable free trials for new workspaces
                      <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                        This applies to new public signups and becomes the
                        default when you add a customer manually.
                      </span>
                    </span>
                  </label>

                  <TextInput
                    label="Default free trial length (days)"
                    name="free_trial_days"
                    type="number"
                    defaultValue={trialSettings.defaultDays}
                    required
                  />
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                  <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                    Customer dashboard behaviour
                  </h2>
                  <div className="mt-5 grid gap-3">
                    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <span className="font-bold text-slate-700">
                        Trial status
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          trialSettings.enabled
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {trialSettings.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      New trial workspaces are created with{" "}
                      <span className="font-bold text-slate-950">
                        {trialSettings.defaultDays} days
                      </span>{" "}
                      of dashboard access. When the expiry time passes, the
                      dashboard is locked until the customer pays for a Starter
                      or Growth subscription.
                    </div>
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                      Customers see a countdown under their plan in the sidebar
                      while the trial is active.
                    </div>
                  </div>
                  {trialSettings.updatedAt ? (
                    <p className="mt-4 text-xs font-semibold text-slate-500">
                      Last saved{" "}
                      {new Date(trialSettings.updatedAt).toLocaleString("en-GB")}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={Boolean(trialSettings.schemaError)}
                  className="inline-flex w-full items-center justify-center rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save free trial settings
                </button>
              </section>
            </form>
          ) : activeTab === "stripe" ? (
            <form
              action={updateAdminStripeSettingsAction}
              className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
            >
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                    <CreditCard aria-hidden="true" className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                      Stripe credentials
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Save the platform Stripe keys used by checkout, customer
                      portal sessions, and webhook verification.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <TextInput
                    label={
                      stripeSettings.secretKey
                        ? "Secret key (leave blank to keep saved key)"
                        : "Secret key"
                    }
                    name="stripe_secret_key"
                    type="password"
                    placeholder={
                      stripeSettings.secretKey
                        ? "Saved secret key present"
                        : "sk_live_..."
                    }
                    required={!stripeSettings.secretKey}
                  />
                  <TextInput
                    label={
                      stripeSettings.webhookSecret
                        ? "Platform webhook signing secret (leave blank to keep saved secret)"
                        : "Platform webhook signing secret"
                    }
                    name="stripe_webhook_secret"
                    type="password"
                    placeholder={
                      stripeSettings.webhookSecret
                        ? "Saved webhook secret present"
                        : "whsec_..."
                    }
                    required={!stripeSettings.webhookSecret}
                  />
                  <TextInput
                    label={
                      stripeSettings.connectWebhookSecret
                        ? "Connect webhook signing secret (leave blank to keep saved secret)"
                        : "Connect webhook signing secret"
                    }
                    name="stripe_connect_webhook_secret"
                    type="password"
                    placeholder={
                      stripeSettings.connectWebhookSecret
                        ? "Saved Connect webhook secret present"
                        : "whsec_..."
                    }
                    required={!stripeSettings.connectWebhookSecret}
                  />

                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                    Platform and Connect webhook endpoint:{" "}
                    <code className="font-bold">/api/stripe/webhook</code>.
                    Add one platform webhook and one connected-accounts webhook
                    in Stripe, then paste each signing secret above.
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                  <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                    Payment tier price IDs
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Paste the recurring Stripe Price ID for each RoundHQ tier.
                    Checkout uses these IDs when customers choose Starter or
                    Growth.
                  </p>

                  <div className="mt-6 space-y-5">
                    <TextInput
                      label="Starter price ID"
                      name="starter_price_id"
                      defaultValue={stripeSettings.starterPriceId}
                      placeholder="price_..."
                      required
                    />
                    <TextInput
                      label="Growth price ID"
                      name="growth_price_id"
                      defaultValue={stripeSettings.growthPriceId}
                      placeholder="price_..."
                      required
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                  <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                    Stripe status
                  </h2>
                  <div className="mt-5 grid gap-3">
                    {[
                      ["Secret key", Boolean(stripeSettings.secretKey)],
                      [
                        "Platform webhook signing secret",
                        Boolean(stripeSettings.webhookSecret),
                      ],
                      [
                        "Connect webhook signing secret",
                        Boolean(stripeSettings.connectWebhookSecret),
                      ],
                      ["Starter price ID", Boolean(stripeSettings.starterPriceId)],
                      ["Growth price ID", Boolean(stripeSettings.growthPriceId)],
                    ].map(([label, isReady]) => (
                      <div
                        key={String(label)}
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      >
                        <span className="font-bold text-slate-700">{label}</span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            isReady
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isReady ? "Ready" : "Missing"}
                        </span>
                      </div>
                    ))}
                  </div>
                  {stripeSettings.updatedAt ? (
                    <p className="mt-4 text-xs font-semibold text-slate-500">
                      Last saved{" "}
                      {new Date(stripeSettings.updatedAt).toLocaleString("en-GB")}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={Boolean(stripeSettings.schemaError)}
                  className="inline-flex w-full items-center justify-center rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Stripe settings
                </button>
              </section>
            </form>
          ) : activeTab === "announcements" ? (
            <form
              action={updatePlatformAnnouncementAction}
              className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
            >
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                    <Megaphone aria-hidden="true" className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                      Customer dashboard announcement
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Publish one platform-wide message for every logged-in
                      RoundHQ workspace. Turn it off when the update is no
                      longer needed.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      name="announcement_active"
                      defaultChecked={announcement.isActive}
                      className="size-4 accent-[#19c653]"
                    />
                    Show announcement to all customers
                  </label>

                  <TextInput
                    label="Announcement title"
                    name="announcement_title"
                    defaultValue={announcement.title}
                    required
                  />

                  <TextArea
                    label="Message"
                    name="announcement_message"
                    defaultValue={announcement.message}
                    rows={7}
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextInput
                      label="CTA label"
                      name="announcement_cta_label"
                      defaultValue={announcement.ctaLabel}
                      placeholder="Read more"
                    />
                    <TextInput
                      label="CTA link"
                      name="announcement_cta_href"
                      defaultValue={announcement.ctaHref}
                      placeholder="/support"
                    />
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Tone
                    </span>
                    <select
                      name="announcement_tone"
                      defaultValue={announcement.tone}
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                    >
                      <option value="info">Information</option>
                      <option value="success">Success</option>
                      <option value="warning">Warning</option>
                    </select>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={Boolean(announcement.schemaError)}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save announcement
                </button>
              </section>

              <section className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                  <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                    Dashboard preview
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    This preview uses the saved version. After saving, customers
                    will see the new message in the announcement panel on their
                    dashboard.
                  </p>

                  <div className="mt-6 rounded-[22px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          RoundHQ Announcement
                        </p>
                        <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                          {announcement.title}
                        </h3>
                      </div>
                      <Megaphone className="shrink-0 text-[#19c653]" size={24} />
                    </div>
                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                      {announcement.message ||
                        "Write a message to broadcast an update to customers."}
                    </p>
                    {announcement.ctaLabel && announcement.ctaHref ? (
                      <span className="mt-5 inline-flex rounded-xl bg-[#003c35] px-4 py-2 text-sm font-bold text-white">
                        {announcement.ctaLabel}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    Status:{" "}
                    <span className="font-bold text-slate-950">
                      {announcement.isActive ? "Live" : "Paused"}
                    </span>
                    {announcement.updatedAt ? (
                      <>
                        {" "}
                        | Last saved{" "}
                        {new Date(announcement.updatedAt).toLocaleString("en-GB")}
                      </>
                    ) : null}
                  </div>
                </div>
              </section>
            </form>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
              <section className="space-y-6">
                <form
                  action={updateAdminHelpdeskSettingsAction}
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8"
                >
                  <div className="mb-6 flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                      <LifeBuoy aria-hidden="true" className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                        Helpdesk defaults
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Set owner notification routing, default ticket
                        ownership, customer acknowledgements, and attachment
                        limits.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <TextInput
                      label="Default assigned admin email"
                      name="default_assigned_admin_email"
                      type="email"
                      defaultValue={
                        supportSettings.settings.defaultAssignedAdminEmail
                      }
                      placeholder="mail@roundhq.co.uk"
                    />
                    <TextArea
                      label="Notify admin emails"
                      name="notify_admin_emails"
                      defaultValue={supportSettings.settings.notifyAdminEmails}
                      rows={3}
                    />
                    <TextInput
                      label="Maximum attachment size (MB)"
                      name="max_attachment_mb"
                      type="number"
                      defaultValue={supportSettings.settings.maxAttachmentMb}
                    />
                    <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        name="auto_acknowledge_enabled"
                        defaultChecked={
                          supportSettings.settings.autoAcknowledgeEnabled
                        }
                        className="size-4 accent-[#19c653]"
                      />
                      Send customer auto-acknowledgement on new tickets
                    </label>
                    <TextInput
                      label="Auto-acknowledgement subject"
                      name="auto_acknowledge_subject"
                      defaultValue={
                        supportSettings.settings.autoAcknowledgeSubject
                      }
                    />
                    <TextArea
                      label="Auto-acknowledgement message"
                      name="auto_acknowledge_message"
                      defaultValue={
                        supportSettings.settings.autoAcknowledgeMessage
                      }
                      rows={8}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={Boolean(supportSettings.schemaError)}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save helpdesk settings
                  </button>
                </form>

                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                  <div className="mb-6 flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                      <Flag aria-hidden="true" className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                        Priorities
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Control which priorities customers can choose and set
                        internal response targets.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {supportSettings.priorities.map((priority) => (
                      <SupportPriorityEditor
                        key={priority.id}
                        priority={priority}
                      />
                    ))}
                    <SupportPriorityEditor />
                  </div>
                </section>
              </section>

              <section className="space-y-6">
                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                  <div className="mb-6 flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                      <Tags aria-hidden="true" className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                        Categories
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Add and edit categories used by customer tickets and
                        canned replies.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {supportSettings.categories.map((category) => (
                      <SupportCategoryEditor
                        key={category.id}
                        category={category}
                      />
                    ))}
                    <SupportCategoryEditor />
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
                  <h2 className="text-xl font-extrabold tracking-normal text-slate-950">
                    Helpdesk template variables
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Use these placeholders in acknowledgement messages.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <TemplateVariable
                      name="{{customerName}}"
                      detail="The logged-in customer's name or workspace."
                    />
                    <TemplateVariable
                      name="{{workspaceName}}"
                      detail="The customer workspace name."
                    />
                    <TemplateVariable
                      name="{{ticketSubject}}"
                      detail="The new support ticket subject."
                    />
                    <TemplateVariable
                      name="{{ticketId}}"
                      detail="The support ticket reference."
                    />
                  </div>
                </section>
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
