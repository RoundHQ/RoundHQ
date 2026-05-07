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
};

type SubscriptionRow = {
  organization_id: string;
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

type OrganizationScopedRow = {
  organization_id: string;
};

export type AdminCustomerWorkspace = {
  id: string;
  name: string;
  slug: string | null;
  ownerEmail: string;
  ownerName: string;
  memberCount: number;
  appCustomerCount: number;
  activeStaffCount: number;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminCustomerStats = {
  totalWorkspaces: number;
  activeSubscriptions: number;
  incompleteSubscriptions: number;
  pastDueSubscriptions: number;
  totalAppCustomers: number;
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

export async function getAdminCustomerWorkspaces() {
  const supabase = createServiceRoleClient();

  const [
    organizationsResult,
    membersResult,
    subscriptionsResult,
    customersResult,
    staffResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, owner_user_id, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("organization_members")
      .select("organization_id, user_id, email, full_name, role, status, created_at"),
    supabase
      .from("subscriptions")
      .select(
        "organization_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, trial_ends_at, current_period_end, cancel_at_period_end, created_at, updated_at"
      ),
    supabase.from("customers").select("organization_id"),
    supabase
      .from("staff_members")
      .select("organization_id")
      .eq("is_active", true),
  ]);

  if (organizationsResult.error) {
    throw organizationsResult.error;
  }

  if (membersResult.error) {
    throw membersResult.error;
  }

  if (subscriptionsResult.error) {
    throw subscriptionsResult.error;
  }

  if (customersResult.error) {
    throw customersResult.error;
  }

  if (staffResult.error) {
    throw staffResult.error;
  }

  const organizations = (organizationsResult.data ?? []) as OrganizationRow[];
  const members = (membersResult.data ?? []) as OrganizationMemberRow[];
  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRow[];
  const customers = (customersResult.data ?? []) as OrganizationScopedRow[];
  const staff = (staffResult.data ?? []) as OrganizationScopedRow[];
  const subscriptionsByOrganization = new Map(
    subscriptions.map((subscription) => [
      subscription.organization_id,
      subscription,
    ])
  );
  const membersByOrganization = new Map<string, number>();
  const customersByOrganization = new Map<string, number>();
  const staffByOrganization = new Map<string, number>();

  members.forEach((member) => incrementCount(membersByOrganization, member.organization_id));
  customers.forEach((customer) =>
    incrementCount(customersByOrganization, customer.organization_id)
  );
  staff.forEach((staffMember) =>
    incrementCount(staffByOrganization, staffMember.organization_id)
  );

  const workspaces: AdminCustomerWorkspace[] = organizations.map((organization) => {
    const owner = getOwnerMember(organization, members);
    const subscription = subscriptionsByOrganization.get(organization.id);

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      ownerEmail: owner?.email ?? "Unknown",
      ownerName: owner?.full_name ?? "Unknown",
      memberCount: membersByOrganization.get(organization.id) ?? 0,
      appCustomerCount: customersByOrganization.get(organization.id) ?? 0,
      activeStaffCount: staffByOrganization.get(organization.id) ?? 0,
      subscriptionStatus: subscription?.status ?? "missing",
      stripeCustomerId: subscription?.stripe_customer_id ?? null,
      stripeSubscriptionId: subscription?.stripe_subscription_id ?? null,
      stripePriceId: subscription?.stripe_price_id ?? null,
      currentPeriodEnd: subscription?.current_period_end ?? null,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      createdAt: organization.created_at,
      updatedAt: organization.updated_at,
    };
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
    totalAppCustomers: customers.length,
  };

  return { workspaces, stats };
}

