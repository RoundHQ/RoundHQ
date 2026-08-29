export const CUSTOMER_FEATURES = [
  {
    key: "dashboard",
    label: "Dashboard",
    section: "Core",
    description: "Overview cards, attention items, and daily summary.",
  },
  {
    key: "leads",
    label: "Leads",
    section: "Core",
    description: "Website enquiries, lead notes, replies, and conversion tools.",
  },
  {
    key: "aiReceptionist",
    label: "AI Assistant",
    section: "Core",
    description:
      "Private testing access for voicemail-to-lead settings, call history, and lead capture. Keep this off unless the customer is testing the feature.",
  },
  {
    key: "schedule",
    label: "Schedule & jobs",
    section: "Operations",
    description: "Calendar scheduling, one-off jobs, and job profiles.",
  },
  {
    key: "rounds",
    label: "Rounds",
    section: "Operations",
    description: "Weekly rounds, round planning, and commercial round view.",
  },
  {
    key: "routeEfficiency",
    label: "Route insights",
    section: "Operations",
    description: "Route suggestions and change history.",
  },
  {
    key: "history",
    label: "Visit history",
    section: "Operations",
    description: "Completed visits, missed-visit notes, and historic records.",
  },
  {
    key: "map",
    label: "Live map",
    section: "Operations",
    description: "Customer and job map visibility.",
  },
  {
    key: "actions",
    label: "Actions",
    section: "Operations",
    description: "Outstanding operational actions and reminders.",
  },
  {
    key: "customers",
    label: "Customers",
    section: "Customers",
    description: "Customer database and customer profile pages.",
  },
  {
    key: "customerProfit",
    label: "Customer profit",
    section: "Customers",
    description: "Customer profitability views and margin signals.",
  },
  {
    key: "payments",
    label: "Payments",
    section: "Customers",
    description: "Payment tracking and monthly payment controls.",
  },
  {
    key: "expenses",
    label: "Expenses",
    section: "Documents",
    description: "Expense tracking, suppliers, products, and quote item costs.",
  },
  {
    key: "quotes",
    label: "Quotes",
    section: "Documents",
    description: "Quote list, quote builder, and quote follow-ups.",
  },
  {
    key: "invoices",
    label: "Invoices",
    section: "Documents",
    description: "Invoice list, invoice builder, reminders, and recurring invoices.",
  },
  {
    key: "commercialDocs",
    label: "RAMS & documents",
    section: "Documents",
    description: "Commercial RAMS documents and PDF tools.",
  },
  {
    key: "staff",
    label: "Staff",
    section: "Admin",
    description: "Team members, roles, and staff permissions.",
  },
  {
    key: "settings",
    label: "Settings",
    section: "Admin",
    description: "Workspace settings, branding, and defaults.",
  },
] as const;

export type CustomerFeatureKey = (typeof CUSTOMER_FEATURES)[number]["key"];
export type CustomerFeature = (typeof CUSTOMER_FEATURES)[number];
export type CustomerFeatureAccess = Record<CustomerFeatureKey, boolean>;

export function getDefaultCustomerFeatureAccess(): CustomerFeatureAccess {
  return Object.fromEntries(
    CUSTOMER_FEATURES.map((feature) => [
      feature.key,
      feature.key !== "aiReceptionist",
    ])
  ) as CustomerFeatureAccess;
}

export function normalizeCustomerFeatureAccess(
  value: unknown
): CustomerFeatureAccess {
  const defaults = getDefaultCustomerFeatureAccess();

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaults;
  }

  const record = value as Record<string, unknown>;

  CUSTOMER_FEATURES.forEach((feature) => {
    const enabled = record[feature.key];

    if (typeof enabled === "boolean") {
      defaults[feature.key] = enabled;
    }
  });

  return defaults;
}

export function getCustomerFeatureSections() {
  const sections: Array<{
    title: string;
    features: CustomerFeature[];
  }> = [];

  CUSTOMER_FEATURES.forEach((feature) => {
    const section = sections.find((item) => item.title === feature.section);

    if (section) {
      section.features = [...section.features, feature];
      return;
    }

    sections.push({
      title: feature.section,
      features: [feature],
    });
  });

  return sections;
}
