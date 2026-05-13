"use server";

import { randomUUID } from "crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getPlanFeatureAccess,
  normalizePlanKey,
} from "@/lib/billing/plans";
import {
  isMissingSubscriptionAddonColumn,
  isMissingSubscriptionPlanColumn,
} from "@/lib/billing/subscriptions";
import { requireAdminAccess } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/workspace";

type ManualSubscriptionStatus = "active" | "incomplete";

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
  return value === "incomplete" ? "incomplete" : "active";
}

function isMissingOptionalCustomerSettingsSchema(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "42703";
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
}: {
  supabase: SupabaseClient;
  organizationId: string;
  plan: string;
  status: ManualSubscriptionStatus;
}) {
  const updatedAt = new Date().toISOString();
  const attempts = [
    {
      organization_id: organizationId,
      plan,
      staff_addon_quantity: 0,
      status,
      updated_at: updatedAt,
    },
    {
      organization_id: organizationId,
      plan,
      status,
      updated_at: updatedAt,
    },
    {
      organization_id: organizationId,
      status,
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
}: {
  supabase: SupabaseClient;
  organizationId: string;
  workspaceName: string;
  owner: User;
  ownerName: string;
  plan: string;
  status: ManualSubscriptionStatus;
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
        feature_access: getPlanFeatureAccess(plan, 0),
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

  if (!workspaceName) {
    throw new Error("Enter a workspace name.");
  }

  if (!ownerName) {
    throw new Error("Enter the owner name.");
  }

  if (!ownerEmail || !ownerEmail.includes("@")) {
    throw new Error("Enter a valid owner email address.");
  }

  if (temporaryPassword.length < 8) {
    throw new Error("Temporary password must be at least 8 characters.");
  }

  const supabase = createServiceRoleClient();
  const { data: existingMembers, error: existingMembersError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .ilike("email", ownerEmail)
    .eq("status", "active")
    .limit(1);

  if (existingMembersError) {
    throw new Error(existingMembersError.message);
  }

  if (existingMembers?.length) {
    throw new Error("This owner email already has a customer workspace.");
  }

  const existingAuthUser = await findAuthUserByEmail(supabase, ownerEmail);

  if (existingAuthUser) {
    throw new Error("A login user already exists for this owner email.");
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
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error("Supabase did not return the new customer user.");
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
      status,
    });
  } catch (error) {
    await supabase.from("organizations").delete().eq("id", organizationId);
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${organizationId}?saved=created`);
}
