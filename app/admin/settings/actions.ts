"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/admin/guard";
import {
  DEFAULT_INVOICE_MESSAGE_TEMPLATE,
  DEFAULT_INVOICE_SUBJECT_TEMPLATE,
  DEFAULT_VERIFICATION_MESSAGE_TEMPLATE,
  DEFAULT_VERIFICATION_SUBJECT_TEMPLATE,
  getPlatformEmailSettings,
} from "@/lib/admin/email-settings";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getPort(formData: FormData) {
  const parsed = Number.parseInt(getText(formData, "smtp_port"), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
}

function getDaysBeforeDue(formData: FormData) {
  const parsed = Number.parseInt(getText(formData, "invoice_days_before_due"), 10);

  return Number.isFinite(parsed) && parsed > 0 ? Math.min(60, parsed) : 7;
}

export async function updateAdminEmailSettingsAction(formData: FormData) {
  await requireAdminAccess("/admin/settings?tab=email");

  const existingSettings = await getPlatformEmailSettings();
  const smtpPassword =
    getText(formData, "smtp_password") || existingSettings.smtpPassword || "";
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("platform_email_settings").upsert(
    {
      id: "primary",
      email_from_name: getText(formData, "email_from_name") || "RoundHQ",
      email_from_address: getText(formData, "email_from_address"),
      email_reply_to: getText(formData, "email_reply_to"),
      smtp_host: getText(formData, "smtp_host"),
      smtp_port: getPort(formData),
      smtp_secure: formData.get("smtp_secure") === "on",
      smtp_username: getText(formData, "smtp_username"),
      smtp_password: smtpPassword,
      invoice_automation_enabled:
        formData.get("invoice_automation_enabled") === "on",
      invoice_days_before_due: getDaysBeforeDue(formData),
      invoice_subject_template:
        getText(formData, "invoice_subject_template") ||
        DEFAULT_INVOICE_SUBJECT_TEMPLATE,
      invoice_message_template:
        getText(formData, "invoice_message_template") ||
        DEFAULT_INVOICE_MESSAGE_TEMPLATE,
      verification_subject_template:
        getText(formData, "verification_subject_template") ||
        DEFAULT_VERIFICATION_SUBJECT_TEMPLATE,
      verification_message_template:
        getText(formData, "verification_message_template") ||
        DEFAULT_VERIFICATION_MESSAGE_TEMPLATE,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/settings");
  redirect("/admin/settings?tab=email&saved=1");
}
