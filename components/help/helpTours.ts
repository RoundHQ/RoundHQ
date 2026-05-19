"use client";

import type { Step } from "react-joyride";

export type ManualHelpTourId =
  | "dashboardOverview"
  | "customerLeads"
  | "customers"
  | "addCustomer"
  | "serviceRound"
  | "jobs"
  | "completeJob"
  | "rounds"
  | "routeInsights"
  | "map"
  | "actions"
  | "history"
  | "quotes"
  | "invoices"
  | "commercialDocs"
  | "recordPayment"
  | "expenses"
  | "customerProfit"
  | "addStaff"
  | "businessSettings"
  | "allSettings"
  | "userMenu"
  | "supportDesk"
  | "billing";

export type HelpTourId = "onboarding" | ManualHelpTourId;

export type HelpTourPage =
  | "dashboard"
  | "customers"
  | "schedule"
  | "jobs"
  | "scheduledJobProfile"
  | "rounds"
  | "routeEfficiency"
  | "map"
  | "actions"
  | "history"
  | "leads"
  | "quotes"
  | "quoteForm"
  | "invoices"
  | "invoiceForm"
  | "commercialDocs"
  | "payments"
  | "expenses"
  | "customerProfit"
  | "staff"
  | "settings";

export type HelpTourActions = {
  navigateToPage: (page: HelpTourPage) => void;
  openAddCustomer: () => void;
  openUserMenu: () => void;
  raiseSupportTicket: (searchTerm?: string) => void;
};

export type HelpTopicOption = {
  id: ManualHelpTourId;
  label: string;
  description: string;
  keywords: string[];
  featured?: boolean;
};

export const FEATURED_HELP_TOPIC_COUNT = 6;

export const HELP_TOPIC_OPTIONS: HelpTopicOption[] = [
  {
    id: "addCustomer",
    label: "Add a customer",
    description: "Create a customer and place them on a regular round.",
    featured: true,
    keywords: [
      "new customer",
      "customer form",
      "customer details",
      "address",
      "contact",
      "service amount",
      "service area",
    ],
  },
  {
    id: "serviceRound",
    label: "Set up a service round",
    description: "Understand weeks, days, and recurring visit rotations.",
    featured: true,
    keywords: [
      "round",
      "rounds",
      "rotation",
      "week",
      "day",
      "schedule",
      "recurring",
      "visit",
    ],
  },
  {
    id: "completeJob",
    label: "Complete a job",
    description: "Open a job, check details, and mark it complete.",
    featured: true,
    keywords: [
      "job",
      "jobs",
      "complete",
      "finish",
      "visit",
      "done",
      "today",
      "checklist",
    ],
  },
  {
    id: "recordPayment",
    label: "Record a payment",
    description: "Track outstanding balances and payment history.",
    featured: true,
    keywords: [
      "payment",
      "payments",
      "paid",
      "outstanding",
      "balance",
      "money",
      "customer payment",
    ],
  },
  {
    id: "addStaff",
    label: "Add staff",
    description: "Invite team members and review their permissions.",
    featured: true,
    keywords: [
      "staff",
      "team",
      "users",
      "permissions",
      "operator",
      "admin",
      "access",
    ],
  },
  {
    id: "businessSettings",
    label: "Change business settings",
    description: "Adjust defaults, business details, and help preferences.",
    featured: true,
    keywords: [
      "settings",
      "system",
      "business details",
      "defaults",
      "branding",
      "help tips",
      "preferences",
    ],
  },
  {
    id: "allSettings",
    label: "All settings guide",
    description: "Walk through every settings tab and what each section controls.",
    featured: true,
    keywords: [
      "settings",
      "all settings",
      "system settings",
      "account settings",
      "business settings",
      "pdf settings",
      "pricing settings",
      "job settings",
      "quote settings",
      "invoice settings",
      "email settings",
      "dashboard settings",
      "data settings",
      "import export",
      "stripe",
      "payment links",
    ],
  },
  {
    id: "dashboardOverview",
    label: "Dashboard overview",
    description: "See the main workspace, daily totals, and quick actions.",
    keywords: [
      "dashboard",
      "overview",
      "home",
      "week selector",
      "day selector",
      "today",
      "quick actions",
    ],
  },
  {
    id: "customerLeads",
    label: "Customer leads",
    description: "Review new enquiries and decide what needs action.",
    keywords: ["lead", "leads", "enquiry", "enquiries", "prospect", "new work"],
  },
  {
    id: "customers",
    label: "Customers and profiles",
    description: "Search customers, open profiles, and edit customer records.",
    keywords: [
      "customer",
      "customers",
      "profile",
      "profiles",
      "search customers",
      "edit customer",
      "customer list",
      "contact number",
    ],
  },
  {
    id: "jobs",
    label: "Jobs list",
    description: "Find scheduled and completed jobs from one searchable list.",
    keywords: ["job list", "jobs", "work list", "search jobs", "visits"],
  },
  {
    id: "rounds",
    label: "Rounds",
    description: "Review weekly round loads and customer placement.",
    keywords: ["rounds", "weekly rounds", "round load", "route", "rotation"],
  },
  {
    id: "routeInsights",
    label: "Route Insights",
    description: "Use route analysis to improve travel time and job ordering.",
    keywords: [
      "route",
      "routes",
      "route efficiency",
      "insights",
      "optimise",
      "optimize",
      "travel",
    ],
  },
  {
    id: "map",
    label: "Map",
    description: "See customers and route stops geographically.",
    keywords: ["map", "maps", "location", "locations", "postcode", "coordinates"],
  },
  {
    id: "actions",
    label: "Actions and reminders",
    description: "Track follow-ups, reminders, and items that need attention.",
    keywords: ["actions", "action", "reminder", "reminders", "tasks", "notifications"],
  },
  {
    id: "history",
    label: "History",
    description: "Review past visits and work completed for customers.",
    keywords: ["history", "past work", "visits", "completed visits", "records"],
  },
  {
    id: "quotes",
    label: "Quotes",
    description: "Create, send, convert, and track customer quotes.",
    keywords: [
      "quote",
      "quotes",
      "estimate",
      "estimates",
      "new quote",
      "convert quote",
      "send quote",
    ],
  },
  {
    id: "invoices",
    label: "Invoices",
    description: "Create, send, track, and schedule recurring invoices.",
    keywords: [
      "invoice",
      "invoices",
      "new invoice",
      "recurring invoice",
      "send invoice",
      "due",
      "paid",
    ],
  },
  {
    id: "commercialDocs",
    label: "RAMS and documents",
    description: "Manage commercial RAMS, documents, and customer paperwork.",
    keywords: [
      "rams",
      "documents",
      "commercial documents",
      "paperwork",
      "risk assessment",
      "method statement",
    ],
  },
  {
    id: "expenses",
    label: "Expenses",
    description: "Record suppliers, products, and business expenses.",
    keywords: [
      "expense",
      "expenses",
      "supplier",
      "suppliers",
      "products",
      "costs",
      "quote items",
    ],
  },
  {
    id: "customerProfit",
    label: "Profit",
    description: "Compare customer revenue, costs, balances, and profit.",
    keywords: ["profit", "customer profit", "margin", "revenue", "cost", "balance"],
  },
  {
    id: "userMenu",
    label: "User menu",
    description: "Find billing, support, and account actions.",
    keywords: ["user menu", "profile menu", "account", "logout", "billing"],
  },
  {
    id: "supportDesk",
    label: "Helpdesk and support tickets",
    description: "Open the support desk and raise a ticket with RoundHQ.",
    keywords: [
      "support",
      "helpdesk",
      "help desk",
      "ticket",
      "tickets",
      "raise ticket",
      "contact support",
    ],
  },
  {
    id: "billing",
    label: "Billing",
    description: "Open billing to review your plan and subscription.",
    keywords: [
      "billing",
      "subscription",
      "plan",
      "upgrade",
      "payment card",
      "manage billing",
    ],
  },
];

export const FEATURED_HELP_TOPIC_OPTIONS = HELP_TOPIC_OPTIONS.filter(
  (option) => option.featured
).slice(0, FEATURED_HELP_TOPIC_COUNT);

const PAGE_TOUR_TARGETS: Partial<Record<HelpTourPage, string>> = {
  dashboard: "sidebar-dashboard",
  leads: "sidebar-leads",
  customers: "sidebar-customers",
  schedule: "sidebar-schedule",
  jobs: "sidebar-jobs",
  rounds: "sidebar-rounds",
  routeEfficiency: "sidebar-route-efficiency",
  map: "sidebar-map",
  actions: "sidebar-actions",
  history: "sidebar-history",
  quotes: "sidebar-quotes",
  invoices: "sidebar-invoices",
  commercialDocs: "sidebar-documents",
  payments: "sidebar-payments",
  expenses: "sidebar-expenses",
  customerProfit: "sidebar-profit",
  staff: "sidebar-staff",
  settings: "sidebar-system",
};

function target(name: string) {
  return `[data-tour="${name}"]`;
}

function normalizeSearchValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getSearchTermVariants(term: string) {
  const variants = new Set([term]);

  if (term.endsWith("ies") && term.length > 4) {
    variants.add(`${term.slice(0, -3)}y`);
  }

  if (term.endsWith("s") && term.length > 3) {
    variants.add(term.slice(0, -1));
  }

  return Array.from(variants);
}

function getHelpTopicSearchText(option: HelpTopicOption) {
  return normalizeSearchValue(
    [option.id, option.label, option.description, ...option.keywords].join(" ")
  );
}

export function searchHelpTopics(query: string) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return FEATURED_HELP_TOPIC_OPTIONS;
  }

  const termGroups = normalizedQuery
    .split(" ")
    .filter(Boolean)
    .map(getSearchTermVariants);

  return HELP_TOPIC_OPTIONS.map((option) => {
    const searchText = getHelpTopicSearchText(option);
    const label = normalizeSearchValue(option.label);
    const keywordHit = option.keywords.some(
      (keyword) => normalizeSearchValue(keyword) === normalizedQuery
    );
    const matches = termGroups.every((group) =>
      group.some((term) => searchText.includes(term))
    );
    let score = 0;

    if (label === normalizedQuery) {
      score -= 30;
    } else if (label.startsWith(normalizedQuery)) {
      score -= 20;
    }

    if (keywordHit) {
      score -= 12;
    }

    if (option.featured) {
      score -= 2;
    }

    return { option, matches, score };
  })
    .filter((entry) => entry.matches)
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.option.label.localeCompare(right.option.label)
    )
    .map((entry) => entry.option);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForTarget(selector: string, timeoutMs = 2000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (document.querySelector(selector)) {
      return;
    }

    await wait(80);
  }
}

function navigateBefore(
  actions: HelpTourActions,
  page: HelpTourPage,
  targetName?: string,
  extraDelayMs = 150
) {
  return async () => {
    actions.navigateToPage(page);
    await wait(extraDelayMs);
    const expectedTarget = targetName
      ? target(targetName)
      : target(PAGE_TOUR_TARGETS[page] ?? "sidebar-dashboard");
    await waitForTarget(expectedTarget).catch(() => undefined);
  };
}

function openAddCustomerBefore(actions: HelpTourActions, targetName: string) {
  return async () => {
    actions.openAddCustomer();
    await wait(250);
    await waitForTarget(target(targetName), 2500).catch(() => undefined);
  };
}

function openUserMenuBefore(actions: HelpTourActions, targetName: string) {
  return async () => {
    actions.openUserMenu();
    await wait(160);
    await waitForTarget(target(targetName), 2500).catch(() => undefined);
  };
}

function openSettingsTabBefore(
  actions: HelpTourActions,
  tabId: string,
  targetName: string
) {
  return async () => {
    actions.navigateToPage("settings");
    await wait(220);

    const tabButton = document.querySelector(target(`settings-tab-${tabId}`));

    if (tabButton instanceof HTMLElement) {
      tabButton.click();
    }

    await wait(180);
    await waitForTarget(target(targetName), 2500).catch(() => undefined);
  };
}

function step(
  dataTour: string,
  title: string,
  content: string,
  options: Partial<Step> = {}
): Step {
  return {
    target: target(dataTour),
    title,
    content,
    skipBeacon: true,
    spotlightPadding: 8,
    targetWaitTimeout: 1800,
    ...options,
  };
}

function navStep(
  page: HelpTourPage,
  title: string,
  content: string,
  actions: HelpTourActions
) {
  return step(PAGE_TOUR_TARGETS[page] ?? "sidebar-dashboard", title, content, {
    placement: "right",
    before: navigateBefore(actions, page),
  });
}

export function createHelpTourSteps(
  tourId: HelpTourId,
  actions: HelpTourActions
): Step[] {
  switch (tourId) {
    case "dashboardOverview":
      return [
        step(
          "dashboard-overview",
          "Dashboard Overview",
          "The dashboard gives you today's work, key totals, and quick actions in one place.",
          {
            placement: "bottom",
            before: navigateBefore(actions, "dashboard", "dashboard-overview"),
          }
        ),
        step(
          "sidebar-dashboard",
          "Return Home",
          "Use Overview to get back to the main workspace without losing where the app lives.",
          { placement: "right" }
        ),
      ];

    case "customerLeads":
      return [
        navStep(
          "leads",
          "Customer Leads",
          "Leads is where new enquiries and prospects can be reviewed before they become customers.",
          actions
        ),
        step(
          "in-app-help-button",
          "Need Help With Leads?",
          "Use the help button in the header if you want to search for another guide or raise a support ticket.",
          { placement: "bottom" }
        ),
      ];

    case "customers":
      return [
        navStep(
          "customers",
          "Customers",
          "Customers holds names, addresses, contact details, notes, payment totals, and profile links.",
          actions
        ),
        step(
          "customer-search",
          "Search and Filter",
          "Search by name, address, phone, email, or postcode, then filter by customer type.",
          {
            placement: "bottom",
            before: navigateBefore(actions, "customers", "customer-search"),
          }
        ),
        step(
          "customer-row-name",
          "Open a Profile",
          "Customer names are clickable. Open a profile to review jobs, payments, documents, and round details.",
          { placement: "bottom" }
        ),
        step(
          "add-customer-button",
          "Add or Edit Records",
          "Use Add Customer for new records, or Edit on a row to update an existing customer.",
          { placement: "bottom" }
        ),
      ];

    case "addCustomer":
      return [
        step(
          "sidebar-customers",
          "Go to Customers",
          "The Customers section is where you add, search, and manage customer records.",
          { placement: "right", before: navigateBefore(actions, "customers") }
        ),
        step(
          "add-customer-button",
          "Add Customer",
          "Use this button to open the customer form.",
          {
            placement: "bottom",
            before: navigateBefore(actions, "customers", "add-customer-button"),
          }
        ),
        step(
          "customer-service-round",
          "Customer Type and Round",
          "Choose whether the customer is residential or commercial, then decide if they should be added to the service round.",
          {
            placement: "bottom",
            before: openAddCustomerBefore(actions, "customer-service-round"),
          }
        ),
        step(
          "customer-name-input",
          "Name, Address, and Contact",
          "Add the customer name, address, phone, and email details so documents, schedules, and payments stay linked.",
          { placement: "bottom" }
        ),
        step(
          "customer-address-input",
          "Address Search",
          "Start typing an address and choose a suggestion to fill postcode, town, and map details when available.",
          { placement: "bottom" }
        ),
        step(
          "customer-service-amount",
          "Service Amount",
          "Set the usual price for each service visit. This helps RoundHQ calculate totals and payment status.",
          { placement: "top" }
        ),
        step(
          "customer-service-rotation",
          "Rotation",
          "Use the business default rotation or choose a custom rotation for this customer.",
          { placement: "top" }
        ),
        step(
          "customer-service-day",
          "Week and Day",
          "Pick the week and day this customer appears on the round.",
          { placement: "top" }
        ),
        step(
          "customer-service-areas",
          "Service Areas",
          "Tick the areas included in the regular visit so the work is clear for staff.",
          { placement: "top" }
        ),
        step(
          "customer-notes",
          "Notes",
          "Use notes for internal reminders, and access notes for gate codes or site instructions.",
          { placement: "top" }
        ),
        step(
          "customer-save-button",
          "Save Customer",
          "Save the customer when the details are ready. The customer will stay linked to future quotes, invoices, and visits.",
          { placement: "top" }
        ),
      ];

    case "serviceRound":
      return [
        step(
          "sidebar-schedule",
          "Service Schedule",
          "The schedule shows planned work and helps you manage upcoming visits.",
          { placement: "right", before: navigateBefore(actions, "schedule") }
        ),
        step(
          "schedule-week-view",
          "Week and Day Filtering",
          "Use the schedule view to see work across dates, then open a job to view the customer and access details.",
          {
            placement: "bottom",
            before: navigateBefore(actions, "schedule", "schedule-week-view"),
          }
        ),
        step(
          "sidebar-customers",
          "Recurring Rounds",
          "Recurring round placement is controlled from each customer's service setup.",
          { placement: "right", before: navigateBefore(actions, "customers") }
        ),
        step(
          "customer-service-rotation",
          "Customer Rotation",
          "When adding or editing a customer, choose their rotation, week, and day to build the round.",
          {
            placement: "bottom",
            before: openAddCustomerBefore(actions, "customer-service-rotation"),
          }
        ),
      ];

    case "jobs":
      return [
        navStep(
          "jobs",
          "Jobs",
          "Jobs gives you a searchable list of scheduled and completed work across customers.",
          actions
        ),
        step(
          "jobs-search",
          "Search Jobs",
          "Search by title, customer, linked quote or invoice, notes, and dates.",
          { placement: "bottom", before: navigateBefore(actions, "jobs", "jobs-search") }
        ),
      ];

    case "completeJob":
      return [
        step(
          "sidebar-schedule",
          "Find the Job",
          "Start in the Service Schedule and open the job you want to complete.",
          { placement: "right", before: navigateBefore(actions, "schedule") }
        ),
        step(
          "job-card",
          "Job Card",
          "Job cards show the customer, timing, and any notes available for the visit.",
          {
            placement: "bottom",
            before: navigateBefore(actions, "schedule", "job-card"),
          }
        ),
        step(
          "complete-job-button",
          "Complete Job",
          "Marking a job complete updates the job status, checklist, and can create or link the invoice for completed work.",
          { placement: "bottom" }
        ),
      ];

    case "rounds":
      return [
        navStep(
          "rounds",
          "Rounds",
          "Rounds shows how customers are distributed across weeks and days so you can balance workloads.",
          actions
        ),
        step(
          "sidebar-customers",
          "Change a Customer's Round",
          "Edit the customer's service setup to change their week, day, or rotation.",
          { placement: "right", before: navigateBefore(actions, "customers") }
        ),
      ];

    case "routeInsights":
      return [
        navStep(
          "routeEfficiency",
          "Route Insights",
          "Route Insights helps you review travel distance, order stops, and find ways to tighten the round.",
          actions
        ),
        step(
          "sidebar-map",
          "Check the Map",
          "Use the Map alongside insights when you need to inspect where customers sit geographically.",
          { placement: "right" }
        ),
      ];

    case "map":
      return [
        navStep(
          "map",
          "Map",
          "The Map view plots customers and route stops so you can plan work by location.",
          actions
        ),
        step(
          "sidebar-route-efficiency",
          "Optimise Routes",
          "Route Insights can help you compare stop order and travel efficiency after reviewing the map.",
          { placement: "right" }
        ),
      ];

    case "actions":
      return [
        navStep(
          "actions",
          "Actions",
          "Actions collects follow-ups, reminders, and items that need attention across the workspace.",
          actions
        ),
        step(
          "in-app-help-button",
          "Keep Moving",
          "Use the help button in the header whenever you need a guide for the next task.",
          { placement: "bottom" }
        ),
      ];

    case "history":
      return [
        navStep(
          "history",
          "History",
          "History helps you look back at completed work and customer visit records.",
          actions
        ),
        step(
          "sidebar-customers",
          "Customer Profiles",
          "Open a customer profile when you want the history for one customer only.",
          { placement: "right" }
        ),
      ];

    case "quotes":
      return [
        navStep(
          "quotes",
          "Quotes",
          "Quotes is where you create, send, convert, and track quote status.",
          actions
        ),
        step(
          "quote-new-button",
          "New Quote",
          "Start a quote from here. If the customer does not exist yet, RoundHQ can add them without leaving the quote flow.",
          {
            placement: "bottom",
            before: navigateBefore(actions, "quotes", "quote-new-button"),
          }
        ),
        step(
          "quote-filters",
          "Quote Status",
          "Use status filters to separate drafts, accepted quotes, declined work, and scheduled jobs.",
          { placement: "bottom" }
        ),
      ];

    case "invoices":
      return [
        navStep(
          "invoices",
          "Invoices",
          "Invoices lets you create, send, export, and track customer invoice status.",
          actions
        ),
        step(
          "invoice-new-button",
          "New Invoice",
          "Create a fresh invoice, or convert from an accepted quote when the work is ready to bill.",
          {
            placement: "bottom",
            before: navigateBefore(actions, "invoices", "invoice-new-button"),
          }
        ),
        step(
          "recurring-invoices",
          "Recurring Invoices",
          "Recurring templates generate repeated invoices using the saved customer and line item details.",
          { placement: "bottom" }
        ),
        step(
          "invoice-filters",
          "Invoice Status",
          "Filter drafts, paid invoices, and overdue invoices to see what needs action.",
          { placement: "bottom" }
        ),
      ];

    case "commercialDocs":
      return [
        navStep(
          "commercialDocs",
          "RAMS and Documents",
          "Use RAMS and Documents to manage commercial paperwork linked to customers and jobs.",
          actions
        ),
        step(
          "sidebar-quotes",
          "Documents Workflow",
          "Quotes and invoices sit in the same Documents area for customer-facing paperwork.",
          { placement: "right" }
        ),
      ];

    case "recordPayment":
      return [
        step(
          "sidebar-payments",
          "Payments",
          "Payments shows outstanding balances and payment status across customers.",
          { placement: "right", before: navigateBefore(actions, "payments") }
        ),
        step(
          "payment-status",
          "Outstanding Balance",
          "Use the summary and customer rows to see who has paid and who still owes money.",
          {
            placement: "bottom",
            before: navigateBefore(actions, "payments", "payment-status"),
          }
        ),
        step(
          "record-payment-button",
          "Record Payment",
          "Enter or update the payment date to record when a customer paid.",
          { placement: "top" }
        ),
      ];

    case "expenses":
      return [
        navStep(
          "expenses",
          "Expenses",
          "Expenses tracks suppliers, products, and business costs so profitability stays visible.",
          actions
        ),
        step(
          "sidebar-profit",
          "Profit Reporting",
          "Profit combines revenue and costs to show customer-level performance.",
          { placement: "right" }
        ),
      ];

    case "customerProfit":
      return [
        navStep(
          "customerProfit",
          "Profit",
          "Profit helps compare revenue, outstanding balances, costs, and margin by customer.",
          actions
        ),
        step(
          "sidebar-expenses",
          "Cost Inputs",
          "Add costs in Expenses so profit reporting has the right inputs.",
          { placement: "right" }
        ),
      ];

    case "addStaff":
      return [
        step(
          "sidebar-staff",
          "Staff",
          "Admins can manage team members from the Staff section.",
          { placement: "right", before: navigateBefore(actions, "staff") }
        ),
        step(
          "add-staff-button",
          "Add Staff Member",
          "Add a staff profile so team members can be identified in RoundHQ.",
          {
            placement: "bottom",
            before: navigateBefore(actions, "staff", "add-staff-button"),
          }
        ),
        step(
          "staff-permissions",
          "Permissions",
          "Use permissions to choose which sections staff and operators can access.",
          { placement: "top" }
        ),
      ];

    case "businessSettings":
      return [
        step(
          "sidebar-system",
          "System Settings",
          "System settings hold business details, defaults, document settings, and app preferences.",
          { placement: "right", before: navigateBefore(actions, "settings") }
        ),
        step(
          "business-settings-section",
          "Business Defaults",
          "Keep business contact details and branding up to date for documents and customer communication.",
          {
            placement: "bottom",
            before: navigateBefore(actions, "settings", "business-settings-section"),
          }
        ),
        step(
          "service-defaults-section",
          "Service Defaults",
          "Job defaults control the usual payment method, visit day, rotation, and customer notes for new records.",
          {
            placement: "bottom",
            before: openSettingsTabBefore(actions, "jobs", "service-defaults-section"),
          }
        ),
        step(
          "help-settings-toggle",
          "In-app Help",
          "Turn automatic help tips on or off. Manual In App Help remains available from the header help button.",
          {
            placement: "bottom",
            before: openSettingsTabBefore(actions, "data", "help-settings-toggle"),
          }
        ),
      ];

    case "allSettings":
      return [
        step(
          "sidebar-system",
          "Open Settings",
          "Settings is where admins manage the account, business details, documents, prices, jobs, quotes, invoices, email, dashboard widgets, and data tools.",
          { placement: "right", before: navigateBefore(actions, "settings") }
        ),
        step(
          "settings-overview",
          "Settings Overview",
          "The tabs keep each group of controls separate. Use the save buttons in the header after changing settings.",
          {
            placement: "bottom",
            before: navigateBefore(actions, "settings", "settings-overview"),
          }
        ),
        step(
          "settings-save-button",
          "Save or Reset",
          "Save settings applies your changes. Reset changes rolls the screen back to the last saved settings before you commit them.",
          { placement: "left" }
        ),
        step(
          "settings-account-email",
          "Account Email",
          "Use Account to update the login email for this RoundHQ user without changing the business contact email on documents.",
          {
            placement: "bottom",
            before: openSettingsTabBefore(actions, "account", "settings-account-email"),
          }
        ),
        step(
          "settings-account-password",
          "Password",
          "Change the password for this login here. Keep it separate from staff permissions and business email settings.",
          { placement: "bottom" }
        ),
        step(
          "settings-account-subscription",
          "Subscription",
          "Open the secure billing portal from here when you need to manage or cancel the workspace subscription.",
          { placement: "top" }
        ),
        step(
          "business-settings-section",
          "Business Details",
          "Business details feed into quotes, invoices, emails, and internal records, so keep names and contact details current.",
          {
            placement: "bottom",
            before: openSettingsTabBefore(actions, "business", "business-settings-section"),
          }
        ),
        step(
          "settings-business-address-section",
          "Business Address",
          "The business address and terms URL appear on documents and customer-facing paperwork where needed.",
          { placement: "bottom" }
        ),
        step(
          "settings-branding-section",
          "Logo and Colours",
          "PDFs uses your uploaded logo, brand colours, theme choice, and compact mode preference across the app and generated documents.",
          {
            placement: "bottom",
            before: openSettingsTabBefore(actions, "documents", "settings-branding-section"),
          }
        ),
        step(
          "settings-pdf-customisation-section",
          "PDF Customisation",
          "Control PDF header style, logo treatment, footer visibility, and footer text for quotes, invoices, and RAMS documents.",
          { placement: "bottom" }
        ),
        step(
          "settings-pdf-preview-section",
          "Live Preview",
          "Switch between quote, invoice, and RAMS previews to check the document layout before saving.",
          { placement: "left" }
        ),
        step(
          "settings-pricing-defaults-section",
          "Pricing Defaults",
          "Pricing sets the currency and common default prices used when creating jobs and quote line items.",
          {
            placement: "bottom",
            before: openSettingsTabBefore(actions, "pricing", "settings-pricing-defaults-section"),
          }
        ),
        step(
          "service-defaults-section",
          "Job Defaults",
          "Jobs controls default payment method, service type, visit day, season dates, and completion requirements.",
          {
            placement: "bottom",
            before: openSettingsTabBefore(actions, "jobs", "service-defaults-section"),
          }
        ),
        step(
          "settings-round-settings-section",
          "Round Settings",
          "Set the default service rotation for new customers. Individual customer records can still override this.",
          { placement: "bottom" }
        ),
        step(
          "settings-default-notes-section",
          "Default Notes",
          "Save standard customer notes here so new customer records can start with useful default wording.",
          { placement: "bottom" }
        ),
        step(
          "settings-quote-numbering-section",
          "Quote Numbering",
          "Quotes lets you control the quote prefix and next number so new quotes follow your preferred sequence.",
          {
            placement: "bottom",
            before: openSettingsTabBefore(actions, "quotes", "settings-quote-numbering-section"),
          }
        ),
        step(
          "settings-quote-defaults-section",
          "Quote Defaults",
          "Save default quote notes, terms, and calculator rates so new quotes start with your standard wording.",
          { placement: "bottom" }
        ),
        step(
          "settings-quote-items-section",
          "Reusable Quote Items",
          "Build a library of services and products that can be added quickly when preparing quotes.",
          { placement: "top" }
        ),
        step(
          "settings-invoice-settings-section",
          "Invoice Settings",
          "Invoices controls numbering, payment terms, VAT status, and invoice defaults.",
          {
            placement: "bottom",
            before: openSettingsTabBefore(actions, "invoices", "settings-invoice-settings-section"),
          }
        ),
        step(
          "settings-invoice-text-section",
          "Invoice Document Text",
          "Save the notes and terms that should appear automatically when new invoices are created.",
          { placement: "left" }
        ),
        step(
          "settings-bank-transfer-section",
          "Bank Transfer Details",
          "Add bank details and the default payment reference shown on invoice PDFs.",
          { placement: "left" }
        ),
        step(
          "settings-stripe-payments-section",
          "Stripe Payment Links",
          "Connect the workspace owner's Stripe account and turn on invoice payment links when Stripe is ready.",
          { placement: "left" }
        ),
        step(
          "settings-email-account-section",
          "Sending Email Account",
          "Email settings control the sender name, sender address, reply-to address, and customer-facing email identity.",
          {
            placement: "bottom",
            before: openSettingsTabBefore(actions, "email", "settings-email-account-section"),
          }
        ),
        step(
          "settings-smtp-section",
          "SMTP Server",
          "Add SMTP host, port, username, password, and security settings so RoundHQ can send quotes and invoices directly.",
          { placement: "bottom" }
        ),
        step(
          "settings-workflow-messages-section",
          "Workflow Messages",
          "Growth workspaces can edit follow-up and overdue invoice reminder templates used from the dashboard.",
          { placement: "top" }
        ),
        step(
          "settings-dashboard-widgets-section",
          "Dashboard Widgets",
          "Dashboard settings choose which summary cards and activity widgets appear on the overview screen.",
          {
            placement: "bottom",
            before: openSettingsTabBefore(actions, "dashboard", "settings-dashboard-widgets-section"),
          }
        ),
        step(
          "settings-edit-collaboration-section",
          "Edit Collaboration",
          "Data settings include inactive edit warnings and what should happen to unsaved work after inactivity.",
          {
            placement: "bottom",
            before: openSettingsTabBefore(actions, "data", "settings-edit-collaboration-section"),
          }
        ),
        step(
          "settings-help-section",
          "In-app Help",
          "Use this toggle to show or hide automatic help tips. Manual help from the header remains available.",
          { placement: "bottom" }
        ),
        step(
          "settings-import-export-section",
          "Import and Export",
          "Backup or restore settings and full workspace data, including customers, quotes, invoices, payments, visits, jobs, staff, and histories.",
          { placement: "bottom" }
        ),
        step(
          "settings-danger-zone-section",
          "Danger Zone",
          "Use reset only when you want a clean settings slate and have a backup if you need one.",
          { placement: "top" }
        ),
      ];

    case "userMenu":
      return [
        step(
          "user-menu-pill",
          "User Menu",
          "The user menu is where you open support, billing, and account options.",
          { placement: "bottom", before: openUserMenuBefore(actions, "user-menu-pill") }
        ),
        step(
          "support-menu-item",
          "Help and Support",
          "Open support when you need to raise a ticket or review support conversations.",
          { placement: "left" }
        ),
        step(
          "billing-menu-item",
          "Billing",
          "Billing opens your subscription and plan management area.",
          { placement: "left" }
        ),
      ];

    case "supportDesk":
      return [
        step(
          "user-menu-pill",
          "Open the User Menu",
          "Support is available from the user menu in the top-right corner.",
          { placement: "bottom", before: openUserMenuBefore(actions, "user-menu-pill") }
        ),
        step(
          "support-menu-item",
          "Help and Support",
          "Choose Help and support to open the helpdesk, create a ticket, and view replies.",
          {
            placement: "left",
            before: openUserMenuBefore(actions, "support-menu-item"),
          }
        ),
      ];

    case "billing":
      return [
        step(
          "user-menu-pill",
          "Open the User Menu",
          "Billing is available from the user menu in the top-right corner.",
          { placement: "bottom", before: openUserMenuBefore(actions, "user-menu-pill") }
        ),
        step(
          "billing-menu-item",
          "Billing",
          "Choose Billing to review your plan, subscription, and billing details.",
          {
            placement: "left",
            before: openUserMenuBefore(actions, "billing-menu-item"),
          }
        ),
      ];

    case "onboarding":
    default:
      return [
        step(
          "dashboard-overview",
          "Welcome to RoundHQ",
          "RoundHQ brings customers, rounds, schedules, payments, documents, and staff tools into one workspace.",
          {
            placement: "bottom",
            before: navigateBefore(actions, "dashboard", "dashboard-overview"),
          }
        ),
        step(
          "sidebar-dashboard",
          "Dashboard Overview",
          "The dashboard gives you a quick view of today's work, key totals, and items that need attention.",
          { placement: "right" }
        ),
        step(
          "sidebar-customers",
          "Customers",
          "Customers is where records, contact details, service amounts, notes, and round placement live.",
          { placement: "right" }
        ),
        step(
          "sidebar-schedule",
          "Service Schedule",
          "Use the schedule to plan jobs, review upcoming work, and open job details.",
          { placement: "right" }
        ),
        step(
          "sidebar-payments",
          "Payments",
          "Payments helps you track paid and outstanding service visits.",
          { placement: "right" }
        ),
        step(
          "sidebar-staff",
          "Staff",
          "Admins can add team members and set page access for staff roles.",
          { placement: "right" }
        ),
        step(
          "sidebar-system",
          "System Settings",
          "System settings let you control business details, document defaults, pricing, and help tips.",
          { placement: "right" }
        ),
        step(
          "in-app-help-button",
          "In App Help",
          "Use this help button any time to choose a guided walkthrough for the task you are doing.",
          { placement: "bottom" }
        ),
      ];
  }
}
