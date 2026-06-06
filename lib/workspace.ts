import { randomUUID } from "crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  getPlatformTrialSettingsForClient,
  getTrialEndIso,
} from "@/lib/admin/trial-settings";

export const DEFAULT_ROLE_PERMISSIONS = [
  ["Admin", "technician", true],
  ["Admin", "dashboard", true],
  ["Admin", "schedule", true],
  ["Admin", "rounds", true],
  ["Admin", "history", true],
  ["Admin", "map", true],
  ["Admin", "actions", true],
  ["Admin", "commercial", true],
  ["Admin", "commercialDocs", true],
  ["Admin", "customers", true],
  ["Admin", "expenses", true],
  ["Admin", "quotes", true],
  ["Admin", "invoices", true],
  ["Admin", "staff", true],
  ["Admin", "settings", true],
  ["Manager", "technician", true],
  ["Manager", "dashboard", true],
  ["Manager", "schedule", true],
  ["Manager", "rounds", true],
  ["Manager", "history", true],
  ["Manager", "map", true],
  ["Manager", "actions", true],
  ["Manager", "commercial", true],
  ["Manager", "commercialDocs", true],
  ["Manager", "customers", true],
  ["Manager", "expenses", true],
  ["Manager", "quotes", true],
  ["Manager", "invoices", true],
  ["Manager", "staff", false],
  ["Manager", "settings", false],
  ["Staff", "technician", true],
  ["Staff", "dashboard", false],
  ["Staff", "schedule", false],
  ["Staff", "rounds", false],
  ["Staff", "history", false],
  ["Staff", "map", false],
  ["Staff", "actions", false],
  ["Staff", "commercial", false],
  ["Staff", "commercialDocs", false],
  ["Staff", "customers", false],
  ["Staff", "expenses", false],
  ["Staff", "quotes", false],
  ["Staff", "invoices", false],
  ["Staff", "staff", false],
  ["Staff", "settings", false],
] as const;

function getWorkspaceName(user: User) {
  const metadataCompanyName = user.user_metadata?.company_name;

  if (typeof metadataCompanyName === "string" && metadataCompanyName.trim()) {
    return metadataCompanyName.trim();
  }

  return user.email?.split("@")[0] || "RoundHQ Workspace";
}

function getUserFullName(user: User) {
  const metadataFullName = user.user_metadata?.full_name;

  if (typeof metadataFullName === "string" && metadataFullName.trim()) {
    return metadataFullName.trim();
  }

  return user.email || "Owner";
}

export async function ensureWorkspace(supabase: SupabaseClient, user: User) {
  const { data: existingMemberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);

  if (membershipError) {
    throw membershipError;
  }

  const existingOrganizationId = existingMemberships?.[0]?.organization_id;

  if (typeof existingOrganizationId === "string" && existingOrganizationId) {
    return existingOrganizationId;
  }

  const organizationId = randomUUID();
  const email = user.email ?? `${user.id}@roundhq.local`;
  const fullName = getUserFullName(user);

  const { error: organizationError } = await supabase
    .from("organizations")
    .insert({
      id: organizationId,
      name: getWorkspaceName(user),
      owner_user_id: user.id,
    });

  if (organizationError) {
    throw organizationError;
  }

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: user.id,
      email,
      full_name: fullName,
      role: "owner",
      status: "active",
    });

  if (memberError) {
    throw memberError;
  }

  const trialSettings = await getPlatformTrialSettingsForClient(supabase);
  const subscriptionPayload = trialSettings.enabled
    ? {
        organization_id: organizationId,
        status: "trialing",
        trial_ends_at: getTrialEndIso(trialSettings.defaultDays),
      }
    : {
        organization_id: organizationId,
        status: "incomplete",
      };

  const seedOperations = [
    supabase.from("subscriptions").insert(subscriptionPayload),
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
      auth_user_id: user.id,
      email,
      full_name: fullName,
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
  ];

  const seedResults = await Promise.all(seedOperations);
  const seedError = seedResults.find((result) => result.error)?.error;

  if (seedError) {
    throw seedError;
  }

  return organizationId;
}
