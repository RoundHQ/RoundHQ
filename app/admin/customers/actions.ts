"use server";

import { randomUUID } from "crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getSubscriptionPlan,
  normalizePlanKey,
} from "@/lib/billing/plans";
import { getDefaultCustomerFeatureAccess } from "@/lib/customer-features";
import {
  isMissingSubscriptionAddonColumn,
  isMissingSubscriptionPlanColumn,
} from "@/lib/billing/subscriptions";
import { requireAdminAccess } from "@/lib/admin/guard";
import {
  getPlatformEmailSettings,
  isPlatformEmailConfigured,
  sendPlatformEmail,
} from "@/lib/admin/email-settings";
import {
  getPlatformTrialSettings,
  getTrialEndIso,
  normalizeTrialDurationDays,
} from "@/lib/admin/trial-settings";
import { getFriendlySmtpErrorMessage } from "@/lib/email/smtp-delivery";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/workspace";

type ManualSubscriptionStatus = "active" | "incomplete" | "trialing";
type ManualCustomerEmailStatus =
  | "not_requested"
  | "sent"
  | "failed"
  | "not_configured";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeManualSubscriptionStatus(
  value: string
): ManualSubscriptionStatus {
  if (value === "incomplete" || value === "trialing") {
    return value;
  }

  return "active";
}

function formatTrialEndDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isMissingOptionalCustomerSettingsSchema(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "42703";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message.trim()
    : fallback;
}

function redirectManualCustomerError(message: string): never {
  const safeMessage =
    message.trim() || "Unable to create the customer workspace.";

  redirect(`/admin/customers?customer_error=${encodeURIComponent(safeMessage)}`);
}

function getRoundHqLoginUrl() {
  return `${
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://roundhq.co.uk"
  }/login`;
}

function buildManualCustomerWelcomeEmail({
  workspaceName,
  ownerName,
  ownerEmail,
  temporaryPassword,
  plan,
  status,
  trialEndsAt,
}: {
  workspaceName: string;
  ownerName: string;
  ownerEmail: string;
  temporaryPassword: string;
  plan: string;
  status: ManualSubscriptionStatus;
  trialEndsAt: string | null;
}) {
  const subscriptionPlan = getSubscriptionPlan(plan);
  const loginUrl = getRoundHqLoginUrl();
  const statusText =
    status === "active"
      ? "Active manual access"
      : status === "trialing"
        ? "Free trial"
        : "Needs payment";

  return {
    subject: `Your RoundHQ workspace is ready: ${workspaceName}`,
    message: [
      `Hi ${ownerName},`,
      "",
      `Your RoundHQ workspace for ${workspaceName} has been created.`,
      "",
      "Login details:",
      `Login page: ${loginUrl}`,
      `Email: ${ownerEmail}`,
      `Temporary password: ${temporaryPassword}`,
      "",
      "Workspace details:",
      `Plan: ${subscriptionPlan.name}`,
      `Subscription status: ${statusText}`,
      ...(status === "trialing"
        ? [`Free trial ends: ${formatTrialEndDate(trialEndsAt)}`]
        : []),
      "",
      "Please sign in and change your password from your account settings.",
      "",
      "Kind regards,",
      "RoundHQ",
    ].join("\n"),
  };
}

async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<User | null> {
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const match =
      data.users.find(
        (user) => normalizeEmail(user.email ?? "") === email
      ) ?? null;

    if (match || data.users.length < perPage) {
      return match;
    }

    page += 1;
  }
}

async function insertSubscription({
  supabase,
  organizationId,
  plan,
  status,
  trialEndsAt,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  plan: string;
  status: ManualSubscriptionStatus;
  trialEndsAt: string | null;
}) {
  const updatedAt = new Date().toISOString();
  const attempts = [
    {
      organization_id: organizationId,
      plan,
      staff_addon_quantity: 0,
      status,
      trial_ends_at: trialEndsAt,
      updated_at: updatedAt,
    },
    {
      organization_id: organizationId,
      plan,
      status,
      trial_ends_at: trialEndsAt,
      updated_at: updatedAt,
    },
    {
      organization_id: organizationId,
      status,
      trial_ends_at: trialEndsAt,
      updated_at: updatedAt,
    },
  ];

  let lastError: Error | null = null;

  for (const payload of attempts) {
    const { error } = await supabase.from("subscriptions").insert(payload);

    if (!error) {
      return;
    }

    if (
      isMissingSubscriptionAddonColumn(error) ||
      isMissingSubscriptionPlanColumn(error)
    ) {
      lastError = error;
      continue;
    }

    throw error;
  }

  if (lastError) {
    throw lastError;
  }
}

async function seedManualCustomerWorkspace({
  supabase,
  organizationId,
  workspaceName,
  owner,
  ownerName,
  plan,
  status,
  trialEndsAt,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  workspaceName: string;
  owner: User;
  ownerName: string;
  plan: string;
  status: ManualSubscriptionStatus;
  trialEndsAt: string | null;
}) {
  const ownerEmail = owner.email ?? "";

  const { error: organizationError } = await supabase
    .from("organizations")
    .insert({
      id: organizationId,
      name: workspaceName,
      owner_user_id: owner.id,
    });

  if (organizationError) {
    throw organizationError;
  }

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: owner.id,
      email: ownerEmail,
      full_name: ownerName,
      role: "owner",
      status: "active",
    });

  if (memberError) {
    throw memberError;
  }

  await insertSubscription({
    supabase,
    organizationId,
    plan,
    status,
    trialEndsAt,
  });

  const seedResults = await Promise.all([
    supabase.from("app_state").upsert(
      {
        organization_id: organizationId,
        id: "primary",
        data: {},
      },
      { onConflict: "organization_id,id" }
    ),
    supabase.from("staff_members").insert({
      organization_id: organizationId,
      auth_user_id: owner.id,
      email: ownerEmail,
      full_name: ownerName,
      role: "Admin",
      is_active: true,
      is_system_admin: true,
    }),
    supabase.from("role_permissions").upsert(
      DEFAULT_ROLE_PERMISSIONS.map(([role, pageKey, allowed]) => ({
        organization_id: organizationId,
        role,
        page_key: pageKey,
        allowed,
      })),
      { onConflict: "organization_id,role,page_key" }
    ),
  ]);
  const seedError = seedResults.find((result) => result.error)?.error;

  if (seedError) {
    throw seedError;
  }

  const { error: settingsError } = await supabase
    .from("customer_account_settings")
    .upsert(
      {
        organization_id: organizationId,
        account_status: "active",
        disabled_reason: "",
        feature_access: getDefaultCustomerFeatureAccess(),
        internal_notes: "",
        support_priority: "standard",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    );

  if (
    settingsError &&
    !isMissingOptionalCustomerSettingsSchema(settingsError)
  ) {
    throw settingsError;
  }
}

export async function createManualCustomerAction(formData: FormData) {
  await requireAdminAccess("/admin/customers");

  const workspaceName = getText(formData, "workspace_name");
  const ownerName = getText(formData, "owner_name");
  const ownerEmail = normalizeEmail(getText(formData, "owner_email"));
  const temporaryPassword = getText(formData, "temporary_password");
  const plan = normalizePlanKey(getText(formData, "subscription_plan"));
  const status = normalizeManualSubscriptionStatus(
    getText(formData, "subscription_status")
  );
  const trialSettings = await getPlatformTrialSettings();
  const trialRequested =
    status === "trialing" || formData.get("free_trial_enabled") === "on";
  const trialDays = normalizeTrialDurationDays(
    getText(formData, "free_trial_days"),
    trialSettings.defaultDays
  );
  const effectiveStatus: ManualSubscriptionStatus = trialRequested
    ? "trialing"
    : status;
  const trialEndsAt = trialRequested ? getTrialEndIso(trialDays) : null;
  const shouldEmailOwner = formData.get("send_owner_email") === "on";

  if (!workspaceName) {
    redirectManualCustomerError("Enter a workspace name.");
  }

  if (!ownerName) {
    redirectManualCustomerError("Enter the owner name.");
  }

  if (!ownerEmail || !ownerEmail.includes("@")) {
    redirectManualCustomerError("Enter a valid owner email address.");
  }

  if (temporaryPassword.length < 8) {
    redirectManualCustomerError("Temporary password must be at least 8 characters.");
  }

  const emailSettings = shouldEmailOwner
    ? await getPlatformEmailSettings()
    : null;

  const supabase = createServiceRoleClient();
  const { data: existingMembers, error: existingMembersError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .ilike("email", ownerEmail)
    .eq("status", "active")
    .limit(1);

  if (existingMembersError) {
    redirectManualCustomerError(existingMembersError.message);
  }

  if (existingMembers?.length) {
    redirectManualCustomerError(
      "This owner email already has a customer workspace."
    );
  }

  let existingAuthUser: User | null = null;

  try {
    existingAuthUser = await findAuthUserByEmail(supabase, ownerEmail);
  } catch (error) {
    redirectManualCustomerError(
      getErrorMessage(error, "Unable to check existing login users.")
    );
  }

  if (existingAuthUser) {
    redirectManualCustomerError(
      "A login user already exists for this owner email."
    );
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        company_name: workspaceName,
        full_name: ownerName,
      },
    });

  if (authError) {
    redirectManualCustomerError(authError.message);
  }

  if (!authData.user) {
    redirectManualCustomerError("Supabase did not return the new customer user.");
  }

  const organizationId = randomUUID();

  try {
    await seedManualCustomerWorkspace({
      supabase,
      organizationId,
      workspaceName,
      owner: authData.user,
      ownerName,
      plan,
      status: effectiveStatus,
      trialEndsAt,
    });
  } catch (error) {
    await supabase.from("organizations").delete().eq("id", organizationId);
    await supabase.auth.admin.deleteUser(authData.user.id);
    redirectManualCustomerError(
      getErrorMessage(error, "Unable to create the customer workspace.")
    );
  }

  let emailStatus: ManualCustomerEmailStatus = "not_requested";

  if (shouldEmailOwner && emailSettings) {
    if (!isPlatformEmailConfigured(emailSettings)) {
      emailStatus = "not_configured";
      console.warn(
        "Manual customer workspace created but owner email was not sent because SMTP is not configured."
      );
    } else {
      const email = buildManualCustomerWelcomeEmail({
        workspaceName,
        ownerName,
        ownerEmail,
        temporaryPassword,
        plan,
        status: effectiveStatus,
        trialEndsAt,
      });

      try {
        await sendPlatformEmail({
          settings: emailSettings,
          to: ownerEmail,
          subject: email.subject,
          message: email.message,
        });
        emailStatus = "sent";
      } catch (error) {
        emailStatus = "failed";
        console.error(
          "Manual customer workspace created but owner email failed:",
          getFriendlySmtpErrorMessage(
            error,
            emailSettings.smtpPort ?? 587,
            Boolean(emailSettings.smtpSecure)
          )
        );
      }
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${organizationId}?saved=created&email=${emailStatus}`);
}
