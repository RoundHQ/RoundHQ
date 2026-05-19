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
  isPlatformEmailConfigured,
  sendPlatformEmail,
} from "@/lib/admin/email-settings";
import { getFriendlySmtpErrorMessage } from "@/lib/email/smtp-delivery";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  DEFAULT_SUPPORT_AUTO_ACKNOWLEDGE_MESSAGE,
  DEFAULT_SUPPORT_AUTO_ACKNOWLEDGE_SUBJECT,
} from "@/lib/support/helpdesk";
import { normalizeAnnouncementTone } from "@/lib/platform-announcements";
import { getPlatformStripeSettings } from "@/lib/admin/stripe-settings";

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

function getPositiveInteger(
  formData: FormData,
  key: string,
  fallback: number,
  max = 10000
) {
  const parsed = Number.parseInt(getText(formData, key), 10);

  return Number.isFinite(parsed) && parsed >= 0
    ? Math.min(max, parsed)
    : fallback;
}

function getSlug(formData: FormData, key: string, fallbackSourceKey: string) {
  const value = getText(formData, key) || getText(formData, fallbackSourceKey);

  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9_ -]+/g, "")
      .replace(/[\s-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "general"
  );
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
      invoice_automation_enabled: existingSettings.invoiceAutomationEnabled,
      invoice_days_before_due: existingSettings.invoiceDaysBeforeDue,
      invoice_subject_template:
        existingSettings.invoiceSubjectTemplate ||
        DEFAULT_INVOICE_SUBJECT_TEMPLATE,
      invoice_message_template:
        existingSettings.invoiceMessageTemplate ||
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

export async function sendAdminDirectEmailAction(formData: FormData) {
  await requireAdminAccess("/admin/settings?tab=send-email");

  const recipient = getText(formData, "recipient_email");
  const subject = getText(formData, "email_subject");
  const message = getText(formData, "email_message");

  if (!recipient || !recipient.includes("@")) {
    throw new Error("Enter a valid recipient email address.");
  }

  if (!subject) {
    throw new Error("Enter an email subject.");
  }

  if (!message) {
    throw new Error("Enter an email message.");
  }

  const settings = await getPlatformEmailSettings();

  if (!isPlatformEmailConfigured(settings)) {
    throw new Error(
      "Email sending is not configured yet. Add SMTP details in the Email tab first."
    );
  }

  try {
    await sendPlatformEmail({
      settings,
      to: recipient,
      subject,
      message,
    });
  } catch (error) {
    throw new Error(
      getFriendlySmtpErrorMessage(
        error,
        settings.smtpPort ?? 587,
        Boolean(settings.smtpSecure)
      )
    );
  }

  redirect("/admin/settings?tab=send-email&sent=1");
}

export async function updateAdminInvoiceSettingsAction(formData: FormData) {
  await requireAdminAccess("/admin/settings?tab=invoices");

  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("platform_email_settings").upsert(
    {
      id: "primary",
      invoice_automation_enabled:
        formData.get("invoice_automation_enabled") === "on",
      invoice_days_before_due: getDaysBeforeDue(formData),
      invoice_subject_template:
        getText(formData, "invoice_subject_template") ||
        DEFAULT_INVOICE_SUBJECT_TEMPLATE,
      invoice_message_template:
        getText(formData, "invoice_message_template") ||
        DEFAULT_INVOICE_MESSAGE_TEMPLATE,
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
  redirect("/admin/settings?tab=invoices&saved=1");
}

export async function updateAdminHelpdeskSettingsAction(formData: FormData) {
  await requireAdminAccess("/admin/settings?tab=helpdesk");

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("support_settings").upsert(
    {
      id: "primary",
      default_assigned_admin_email: getText(
        formData,
        "default_assigned_admin_email"
      ),
      notify_admin_emails: getText(formData, "notify_admin_emails"),
      auto_acknowledge_enabled:
        formData.get("auto_acknowledge_enabled") === "on",
      auto_acknowledge_subject:
        getText(formData, "auto_acknowledge_subject") ||
        DEFAULT_SUPPORT_AUTO_ACKNOWLEDGE_SUBJECT,
      auto_acknowledge_message:
        getText(formData, "auto_acknowledge_message") ||
        DEFAULT_SUPPORT_AUTO_ACKNOWLEDGE_MESSAGE,
      max_attachment_mb: getPositiveInteger(
        formData,
        "max_attachment_mb",
        8,
        25
      ),
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
  redirect("/admin/settings?tab=helpdesk&saved=1");
}

export async function updateAdminStripeSettingsAction(formData: FormData) {
  await requireAdminAccess("/admin/settings?tab=stripe");

  const existingSettings = await getPlatformStripeSettings();
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("platform_stripe_settings").upsert(
    {
      id: "primary",
      stripe_secret_key:
        getText(formData, "stripe_secret_key") || existingSettings.secretKey,
      stripe_webhook_secret:
        getText(formData, "stripe_webhook_secret") ||
        existingSettings.webhookSecret,
      stripe_connect_webhook_secret:
        getText(formData, "stripe_connect_webhook_secret") ||
        existingSettings.connectWebhookSecret,
      starter_price_id: getText(formData, "starter_price_id"),
      growth_price_id: getText(formData, "growth_price_id"),
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
  revalidatePath("/billing");
  revalidatePath("/dashboard");
  redirect("/admin/settings?tab=stripe&saved=1");
}

export async function updatePlatformAnnouncementAction(formData: FormData) {
  await requireAdminAccess("/admin/settings?tab=announcements");

  const title = getText(formData, "announcement_title") || "RoundHQ updates";
  const message = getText(formData, "announcement_message");
  const isActive = formData.get("announcement_active") === "on";
  const now = new Date().toISOString();
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("platform_announcements").upsert(
    {
      id: "primary",
      title,
      message,
      cta_label: getText(formData, "announcement_cta_label"),
      cta_href: getText(formData, "announcement_cta_href"),
      tone: normalizeAnnouncementTone(getText(formData, "announcement_tone")),
      is_active: isActive,
      published_at: isActive ? now : null,
      updated_at: now,
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
  redirect("/admin/settings?tab=announcements&saved=1");
}

export async function saveSupportCategoryAction(formData: FormData) {
  await requireAdminAccess("/admin/settings?tab=helpdesk");

  const id = getText(formData, "category_id");
  const label = getText(formData, "label");
  const slug = getSlug(formData, "slug", "label");

  if (!label) {
    redirect("/admin/settings?tab=helpdesk&error=category");
  }

  const supabase = createServiceRoleClient();
  const payload = {
    label,
    slug,
    description: getText(formData, "description"),
    is_active: formData.get("is_active") === "on",
    sort_order: getPositiveInteger(formData, "sort_order", 50, 9999),
    updated_at: new Date().toISOString(),
  };

  const result = id
    ? await supabase.from("support_categories").update(payload).eq("id", id)
    : await supabase.from("support_categories").insert(payload);

  if (result.error) {
    throw new Error(result.error.message);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/support");
  revalidatePath("/admin/helpdesk");
  redirect("/admin/settings?tab=helpdesk&saved=1");
}

export async function saveSupportPriorityAction(formData: FormData) {
  await requireAdminAccess("/admin/settings?tab=helpdesk");

  const id = getText(formData, "priority_id");
  const label = getText(formData, "label");
  const slug = getSlug(formData, "slug", "label");

  if (!label) {
    redirect("/admin/settings?tab=helpdesk&error=priority");
  }

  const supabase = createServiceRoleClient();
  const payload = {
    label,
    slug,
    description: getText(formData, "description"),
    response_target_hours: getPositiveInteger(
      formData,
      "response_target_hours",
      24,
      720
    ),
    is_active: formData.get("is_active") === "on",
    sort_order: getPositiveInteger(formData, "sort_order", 50, 9999),
    updated_at: new Date().toISOString(),
  };

  const result = id
    ? await supabase.from("support_priorities").update(payload).eq("id", id)
    : await supabase.from("support_priorities").insert(payload);

  if (result.error) {
    throw new Error(result.error.message);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/support");
  revalidatePath("/admin/helpdesk");
  redirect("/admin/settings?tab=helpdesk&saved=1");
}
