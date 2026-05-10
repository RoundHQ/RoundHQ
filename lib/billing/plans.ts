import {
  CUSTOMER_FEATURES,
  type CustomerFeatureAccess,
  type CustomerFeatureKey,
} from "@/lib/customer-features";

export const SUBSCRIPTION_PLAN_KEYS = ["starter", "growth"] as const;

export type SubscriptionPlanKey = (typeof SUBSCRIPTION_PLAN_KEYS)[number];

export type SubscriptionPlan = {
  key: SubscriptionPlanKey;
  name: string;
  priceMonthly: number;
  priceLabel: string;
  billingLabel: string;
  description: string;
  badge?: string;
  customerLimit: number;
  staffLimit: number;
  dashboardLabel: string;
  summaryLimits: string[];
  includedFeatures: string[];
};

export const DEFAULT_SUBSCRIPTION_PLAN: SubscriptionPlanKey = "starter";

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    key: "starter",
    name: "Starter",
    priceMonthly: 30,
    priceLabel: "£30",
    billingLabel: "per business / month",
    description: "For solo operators getting organised.",
    customerLimit: 250,
    staffLimit: 1,
    dashboardLabel: "Basic dashboard",
    summaryLimits: ["1 staff account", "Up to 250 customers", "Basic dashboard"],
    includedFeatures: [
      "Leads inbox",
      "Customer CRM",
      "Quotes",
      "Invoices",
      "Scheduling",
      "Recurring rounds",
      "Route map",
      "Payment tracking",
      "Dashboard",
      "Visit history",
      "Customer notes",
      "1 staff account",
      "Up to 250 customers",
      "Basic dashboard",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    priceMonthly: 60,
    priceLabel: "£60",
    billingLabel: "per business / month",
    description: "For growing businesses managing staff, customers, and recurring work.",
    badge: "Most Popular",
    customerLimit: 1500,
    staffLimit: 5,
    dashboardLabel: "Advanced insights",
    summaryLimits: ["Up to 5 staff accounts", "Up to 1,500 customers", "Advanced insights", "RAMS", "Staff permissions"],
    includedFeatures: [
      "Everything in Starter",
      "Up to 5 staff accounts",
      "Staff permissions",
      "RAMS generator",
      "Advanced dashboard insights",
      "Customer profitability",
      "Workflow tracking",
      "Payment overview",
      "Commercial customer tools",
      "Quote conversion workflows",
      "Operational reporting",
      "Up to 1,500 customers",
    ],
  },
];

export const PLAN_BY_KEY: Record<SubscriptionPlanKey, SubscriptionPlan> = {
  starter: SUBSCRIPTION_PLANS[0],
  growth: SUBSCRIPTION_PLANS[1],
};

export function normalizePlanKey(plan: unknown): SubscriptionPlanKey {
  return plan === "growth" ? "growth" : DEFAULT_SUBSCRIPTION_PLAN;
}

export function getSubscriptionPlan(plan: unknown): SubscriptionPlan {
  return PLAN_BY_KEY[normalizePlanKey(plan)];
}

export function getPlanUsagePercent(used: number, limit: number): number {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((used / limit) * 100));
}

const STARTER_FEATURES = new Set<CustomerFeatureKey>([
  "dashboard",
  "leads",
  "schedule",
  "rounds",
  "history",
  "map",
  "customers",
  "payments",
  "quotes",
  "invoices",
  "settings",
]);

export function getPlanFeatureAccess(plan: unknown): CustomerFeatureAccess {
  const planKey = normalizePlanKey(plan);

  return Object.fromEntries(
    CUSTOMER_FEATURES.map((feature) => [
      feature.key,
      planKey === "growth" || STARTER_FEATURES.has(feature.key),
    ])
  ) as CustomerFeatureAccess;
}

export function hasGrowthFeatures(plan: unknown) {
  return normalizePlanKey(plan) === "growth";
}
