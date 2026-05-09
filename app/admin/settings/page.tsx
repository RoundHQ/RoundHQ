import Link from "next/link";
import { BadgeCheck, Mail, ServerCog } from "lucide-react";
import {
  AdminHeroShell,
  AdminSetupNotice,
} from "@/components/admin/admin-page-chrome";
import {
  getPlatformEmailSettings,
  isPlatformEmailConfigured,
} from "@/lib/admin/email-settings";
import { getAdminAccess } from "@/lib/admin/guard";
import { updateAdminEmailSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

type AdminSettingsSearchParams = {
  saved?: string;
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
  const emailReady = isPlatformEmailConfigured(settings);
  const saved = params.saved === "1";

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <AdminHeroShell
        eyebrow="Platform settings"
        title="RoundHQ owner settings."
        summary="Configure platform email delivery, signup verification emails, and automated invoice reminders from the owner console."
      >
        <section className="grid gap-4 sm:grid-cols-2">
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
        </section>
      </AdminHeroShell>

      <section className="bg-white px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap gap-2">
            <Link
              href="/admin/settings?tab=email"
              className="inline-flex items-center gap-2 rounded-md bg-[#19c653] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)]"
            >
              <Mail aria-hidden="true" className="size-4" />
              Email
            </Link>
          </div>

          {saved && (
            <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Email settings saved.
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
                  Automated invoices
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The daily automation sends invoices from recurring invoice
                  templates before the saved payment due date.
                </p>

                <div className="mt-6 space-y-5">
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
                    rows={8}
                  />
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
        </div>
      </section>
    </main>
  );
}
