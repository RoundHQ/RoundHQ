import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDefaultCustomerAccountSettings,
  mapCustomerAccountSettingsRow,
  normalizeCustomerAccountStatus,
  normalizeSupportPriority,
  type CustomerAccountSettings,
  type CustomerAccountStatus,
  type CustomerSupportPriority,
} from "@/lib/customer-account";
import {
  normalizePlanKey,
  type SubscriptionPlanKey,
} from "@/lib/billing/plans";
import {
  isMissingSubscriptionPlanColumn,
  LEGACY_SUBSCRIPTION_SELECT,
  SUBSCRIPTION_SELECT,
} from "@/lib/billing/subscriptions";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type OrganizationMemberRow = {
  organization_id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
};

type SubscriptionRow = {
  organization_id: string;
  plan: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

type CustomerAccountSettingsRow = {
  organization_id?: string;
  account_status: string | null;
  disabled_reason: string | null;
  feature_access: unknown;
  internal_notes: string | null;
  support_priority: string | null;
  updated_at: string | null;
};

type OrganizationScopedRow = {
  organization_id: string;
};

type AppCustomerRow = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  customer_type: string | null;
  created_at: string | null;
};

type CustomerLeadRow = {
  id: string;
  name: string | null;
  email: string | null;
  source: string | null;
  status: string | null;
  created_at: string | null;
};

type DocumentRow = {
  id: string;
  customer_name: string | null;
  status: string | null;
  total: number | null;
  date: string | null;
  created_at: string | null;
};

type ScheduledJobRow = {
  id: string;
  title: string | null;
  type: string | null;
  status: string | null;
  date: string | null;
  created_at: string | null;
};

const ADMIN_SUBSCRIPTION_SELECT = `${SUBSCRIPTION_SELECT}, created_at, updated_at`;
const ADMIN_LEGACY_SUBSCRIPTION_SELECT = `${LEGACY_SUBSCRIPTION_SELECT}, created_at, updated_at`;

export type AdminCustomerWorkspace = {
  id: string;
  name: string;
  slug: string | null;
  ownerEmail: string;
  ownerName: string;
  memberCount: number;
  appCustomerCount: number;
  activeStaffCount: number;
  subscriptionPlan: SubscriptionPlanKey;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  accountStatus: CustomerAccountStatus;
  supportPriority: CustomerSupportPriority;
  createdAt: string;
  updatedAt: string;
};

export type AdminCustomerStats = {
  totalWorkspaces: number;
  activeSubscriptions: number;
  incompleteSubscriptions: number;
  pastDueSubscriptions: number;
  disabledAccounts: number;
  totalAppCustomers: number;
  planCounts: Record<SubscriptionPlanKey, number>;
};

export type AdminCustomerMember = {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  createdAt: string;
};

export type AdminCustomerProfile = {
  workspace: AdminCustomerWorkspace;
  settings: CustomerAccountSettings;
  members: AdminCustomerMember[];
  usage: {
    appCustomers: number;
    leads: number;
    quotes: number;
    invoices: number;
    scheduledJobs: number;
    activeStaff: number;
  };
  recentCustomers: AppCustomerRow[];
  recentLeads: CustomerLeadRow[];
  recentQuotes: DocumentRow[];
  recentInvoices: DocumentRow[];
  upcomingJobs: ScheduledJobRow[];
  settingsSchemaError: string;
};

function incrementCount(counts: Map<string, number>, organizationId: string) {
  counts.set(organizationId, (counts.get(organizationId) ?? 0) + 1);
}

function getOwnerMember(
  organization: OrganizationRow,
  members: OrganizationMemberRow[]
) {
  return (
    members.find(
      (member) =>
        member.organization_id === organization.id &&
        member.user_id === organization.owner_user_id
    ) ??
    members.find(
      (member) =>
        member.organization_id === organization.id && member.role === "owner"
    ) ??
    members.find((member) => member.organization_id === organization.id) ??
    null
  );
}

function buildWorkspace({
  organization,
  members,
  subscription,
  appCustomerCount,
  activeStaffCount,
  settings,
}: {
  organization: OrganizationRow;
  members: OrganizationMemberRow[];
  subscription?: SubscriptionRow | null;
  appCustomerCount: number;
  activeStaffCount: number;
  settings?: CustomerAccountSettings | null;
}): AdminCustomerWorkspace {
  const owner = getOwnerMember(organization, members);
  const memberCount = members.filter(
    (member) => member.organization_id === organization.id
  ).length;

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    ownerEmail: owner?.email ?? "Unknown",
    ownerName: owner?.full_name ?? "Unknown",
    memberCount,
    appCustomerCount,
    activeStaffCount,
    subscriptionPlan: normalizePlanKey(subscription?.plan),
    subscriptionStatus: subscription?.status ?? "missing",
    stripeCustomerId: subscription?.stripe_customer_id ?? null,
    stripeSubscriptionId: subscription?.stripe_subscription_id ?? null,
    stripePriceId: subscription?.stripe_price_id ?? null,
    trialEndsAt: subscription?.trial_ends_at ?? null,
    currentPeriodEnd: subscription?.current_period_end ?? null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    accountStatus: settings?.accountStatus ?? "active",
    supportPriority: settings?.supportPriority ?? "standard",
    createdAt: organization.created_at,
    updatedAt: organization.updated_at,
  };
}

function getSettingsFromListRows(settingsRows: CustomerAccountSettingsRow[]) {
  return new Map(
    settingsRows
      .filter((row) => typeof row.organization_id === "string")
      .map((row) => [
        row.organization_id as string,
        {
          accountStatus: normalizeCustomerAccountStatus(row.account_status),
          supportPriority: normalizeSupportPriority(row.support_priority),
        },
      ])
  );
}

function throwIfError(result: { error: unknown }) {
  if (result.error) {
    throw result.error;
  }
}

async function selectSubscriptionRows(supabase: SupabaseClient) {
  const result = await supabase
    .from("subscriptions")
    .select(ADMIN_SUBSCRIPTION_SELECT);

  if (!isMissingSubscriptionPlanColumn(result.error)) {
    return result;
  }

  return supabase
    .from("subscriptions")
    .select(ADMIN_LEGACY_SUBSCRIPTION_SELECT);
}

async function selectSubscriptionRow(
  supabase: SupabaseClient,
  organizationId: string
) {
  const result = await supabase
    .from("subscriptions")
    .select(ADMIN_SUBSCRIPTION_SELECT)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!isMissingSubscriptionPlanColumn(result.error)) {
    return result;
  }

  return supabase
    .from("subscriptions")
    .select(ADMIN_LEGACY_SUBSCRIPTION_SELECT)
    .eq("organization_id", organizationId)
    .maybeSingle();
}

export async function getAdminCustomerWorkspaces() {
  const supabase = createServiceRoleClient();

  const [
    organizationsResult,
    membersResult,
    subscriptionsResult,
    customersResult,
    staffResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, owner_user_id, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("organization_members")
      .select("organization_id, user_id, email, full_name, role, status, created_at"),
    selectSubscriptionRows(supabase),
    supabase.from("customers").select("organization_id"),
    supabase
      .from("staff_members")
      .select("organization_id")
      .eq("is_active", true),
    supabase
      .from("customer_account_settings")
      .select("organization_id, account_status, support_priority"),
  ]);

  throwIfError(organizationsResult);
  throwIfError(membersResult);
  throwIfError(subscriptionsResult);
  throwIfError(customersResult);
  throwIfError(staffResult);

  const organizations = (organizationsResult.data ?? []) as OrganizationRow[];
  const members = (membersResult.data ?? []) as OrganizationMemberRow[];
  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRow[];
  const customers = (customersResult.data ?? []) as OrganizationScopedRow[];
  const staff = (staffResult.data ?? []) as OrganizationScopedRow[];
  const settingsRows = settingsResult.error
    ? []
    : ((settingsResult.data ?? []) as CustomerAccountSettingsRow[]);
  const settingsByOrganization = getSettingsFromListRows(settingsRows);
  const subscriptionsByOrganization = new Map(
    subscriptions.map((subscription) => [
      subscription.organization_id,
      subscription,
    ])
  );
  const customersByOrganization = new Map<string, number>();
  const staffByOrganization = new Map<string, number>();

  customers.forEach((customer) =>
    incrementCount(customersByOrganization, customer.organization_id)
  );
  staff.forEach((staffMember) =>
    incrementCount(staffByOrganization, staffMember.organization_id)
  );

  const workspaces: AdminCustomerWorkspace[] = organizations.map((organization) => {
    const setting = settingsByOrganization.get(organization.id);

    return buildWorkspace({
      organization,
      members,
      subscription: subscriptionsByOrganization.get(organization.id),
      appCustomerCount: customersByOrganization.get(organization.id) ?? 0,
      activeStaffCount: staffByOrganization.get(organization.id) ?? 0,
      settings: setting
        ? getDefaultCustomerAccountSettings({
            accountStatus: setting.accountStatus,
            supportPriority: setting.supportPriority,
          })
        : null,
    });
  });

  const stats: AdminCustomerStats = {
    totalWorkspaces: workspaces.length,
    activeSubscriptions: workspaces.filter(
      (workspace) => workspace.subscriptionStatus === "active"
    ).length,
    incompleteSubscriptions: workspaces.filter(
      (workspace) =>
        workspace.subscriptionStatus === "incomplete" ||
        workspace.subscriptionStatus === "missing"
    ).length,
    pastDueSubscriptions: workspaces.filter(
      (workspace) => workspace.subscriptionStatus === "past_due"
    ).length,
    disabledAccounts: workspaces.filter(
      (workspace) => workspace.accountStatus === "disabled"
    ).length,
    totalAppCustomers: customers.length,
    planCounts: {
      starter: workspaces.filter(
        (workspace) => workspace.subscriptionPlan === "starter"
      ).length,
      growth: workspaces.filter(
        (workspace) => workspace.subscriptionPlan === "growth"
      ).length,
    },
  };

  return { workspaces, stats };
}

export async function getAdminCustomerProfile(organizationId: string) {
  const supabase = createServiceRoleClient();

  const [
    organizationResult,
    membersResult,
    subscriptionResult,
    settingsResult,
    customersResult,
    staffResult,
    leadsResult,
    quotesResult,
    invoicesResult,
    jobsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, owner_user_id, created_at, updated_at")
      .eq("id", organizationId)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("organization_id, user_id, email, full_name, role, status, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    selectSubscriptionRow(supabase, organizationId),
    supabase
      .from("customer_account_settings")
      .select(
        "account_status, disabled_reason, feature_access, internal_notes, support_priority, updated_at"
      )
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("id, name, email, phone, customer_type, created_at", {
        count: "exact",
      })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("staff_members")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    supabase
      .from("customer_leads")
      .select("id, name, email, source, status, created_at", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("quotes")
      .select("id, customer_name, status, total, date, created_at", {
        count: "exact",
      })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("invoices")
      .select("id, customer_name, status, total, date, created_at", {
        count: "exact",
      })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("scheduled_jobs")
      .select("id, title, type, status, date, created_at", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("date", { ascending: false })
      .limit(6),
  ]);

  throwIfError(organizationResult);
  throwIfError(membersResult);
  throwIfError(customersResult);
  throwIfError(staffResult);
  throwIfError(leadsResult);
  throwIfError(quotesResult);
  throwIfError(invoicesResult);
  throwIfError(jobsResult);

  if (subscriptionResult.error && subscriptionResult.error.code !== "PGRST116") {
    throw subscriptionResult.error;
  }

  const organization = organizationResult.data as OrganizationRow | null;

  if (!organization) {
    return null;
  }

  const members = (membersResult.data ?? []) as OrganizationMemberRow[];
  const subscription = subscriptionResult.data as SubscriptionRow | null;
  const settingsSchemaError = settingsResult.error ? settingsResult.error.message : "";
  const settings = settingsResult.error
    ? getDefaultCustomerAccountSettings({
        schemaReady: false,
        schemaError: settingsSchemaError,
      })
    : mapCustomerAccountSettingsRow(
        settingsResult.data as CustomerAccountSettingsRow | null
      );
  const recentCustomers = (customersResult.data ?? []) as AppCustomerRow[];
  const recentLeads = (leadsResult.data ?? []) as CustomerLeadRow[];
  const recentQuotes = (quotesResult.data ?? []) as DocumentRow[];
  const recentInvoices = (invoicesResult.data ?? []) as DocumentRow[];
  const upcomingJobs = (jobsResult.data ?? []) as ScheduledJobRow[];

  return {
    workspace: buildWorkspace({
      organization,
      members,
      subscription,
      appCustomerCount: customersResult.count ?? recentCustomers.length,
      activeStaffCount: ((staffResult.data ?? []) as OrganizationScopedRow[]).length,
      settings,
    }),
    settings,
    members: members.map((member) => ({
      userId: member.user_id,
      email: member.email ?? "Unknown",
      fullName: member.full_name ?? "Unknown",
      role: member.role,
      status: member.status,
      createdAt: member.created_at,
    })),
    usage: {
      appCustomers: customersResult.count ?? recentCustomers.length,
      leads: leadsResult.count ?? recentLeads.length,
      quotes: quotesResult.count ?? recentQuotes.length,
      invoices: invoicesResult.count ?? recentInvoices.length,
      scheduledJobs: jobsResult.count ?? upcomingJobs.length,
      activeStaff: ((staffResult.data ?? []) as OrganizationScopedRow[]).length,
    },
    recentCustomers,
    recentLeads,
    recentQuotes,
    recentInvoices,
    upcomingJobs,
    settingsSchemaError,
  } satisfies AdminCustomerProfile;
}
