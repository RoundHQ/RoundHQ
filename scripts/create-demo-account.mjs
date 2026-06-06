import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.ROUNDHQ_DEMO_EMAIL || "demo@roundhq.co.uk";
const DEMO_PASSWORD = process.env.ROUNDHQ_DEMO_PASSWORD || "RoundHQDemo2026!";
const DEMO_NAME = "RoundHQ Demo";
const DEMO_WORKSPACE_NAME = "RoundHQ East Kilbride Demo";
const DEMO_WORKSPACE_SLUG = "roundhq-east-kilbride-demo";

const ROLE_PERMISSIONS = [
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
];

const demoCustomers = [
  {
    key: "stewart",
    name: "Helen Stewart",
    address: "14 Calderwood Road",
    postcode: "G74 3BQ",
    phone: "07400 111 201",
    email: "helen.stewart@example.co.uk",
    week: 1,
    day: "Monday",
    customer_type: "Residential",
    cut_frequency: "Fortnightly",
    payment_method: "Monthly",
    price: 32,
    route_order: 1,
    lat: 55.7731,
    lng: -4.1605,
    notes: "Back gate code 1974. Prefers morning visits.",
  },
  {
    key: "campbell",
    name: "Mark Campbell",
    address: "6 St Leonards Square",
    postcode: "G74 2AT",
    phone: "07400 111 202",
    email: "mark.campbell@example.co.uk",
    week: 1,
    day: "Monday",
    customer_type: "Residential",
    cut_frequency: "Fortnightly",
    payment_method: "On Day Transfer",
    price: 38,
    route_order: 2,
    lat: 55.7616,
    lng: -4.1747,
    notes: "Small front lawn and larger rear lawn.",
  },
  {
    key: "macdonald",
    name: "Fiona MacDonald",
    address: "22 The Murray Square",
    postcode: "G75 0BH",
    phone: "07400 111 203",
    email: "fiona.macdonald@example.co.uk",
    week: 1,
    day: "Wednesday",
    customer_type: "Residential",
    cut_frequency: "Fortnightly",
    payment_method: "Cash",
    price: 30,
    route_order: 1,
    lat: 55.7526,
    lng: -4.1973,
    notes: "Elderly customer. Knock before entering garden.",
  },
  {
    key: "ek-office",
    name: "East Kilbride Office Park",
    address: "1 Redwood Crescent",
    postcode: "G74 5PA",
    phone: "01355 555 204",
    email: "facilities@ekofficepark.example.co.uk",
    week: 2,
    day: "Tuesday",
    customer_type: "Commercial",
    cut_frequency: "Fortnightly",
    payment_method: "Monthly",
    price: 185,
    route_order: 1,
    lat: 55.7647,
    lng: -4.2207,
    site_name: "East Kilbride Office Park",
    site_address: "1 Redwood Crescent",
    site_town: "East Kilbride",
    site_postcode: "G74 5PA",
    notes: "Commercial grounds maintenance. Sign in at reception.",
  },
  {
    key: "patel",
    name: "Anika Patel",
    address: "9 Westwood Hill",
    postcode: "G75 8JH",
    phone: "07400 111 205",
    email: "anika.patel@example.co.uk",
    week: 2,
    day: "Thursday",
    customer_type: "Residential",
    cut_frequency: "Fortnightly",
    payment_method: "Monthly",
    price: 42,
    route_order: 1,
    lat: 55.7445,
    lng: -4.226,
    notes: "Includes lawn edges and patio sweep.",
  },
  {
    key: "hunter",
    name: "Graham Hunter",
    address: "18 Greenhills Road",
    postcode: "G75 8TT",
    phone: "07400 111 206",
    email: "graham.hunter@example.co.uk",
    week: 2,
    day: "Friday",
    customer_type: "Residential",
    cut_frequency: "Fortnightly",
    payment_method: "On Day Transfer",
    price: 36,
    route_order: 1,
    lat: 55.7414,
    lng: -4.1968,
    notes: "Rear garden access through side path.",
  },
];

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env.local");
  let content = "";

  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(key) {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is missing. Add it to .env.local first.`);
  }

  return value;
}

async function findUserByEmail(supabase, email) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === normalizedEmail);

    if (match) {
      return match;
    }

    if (users.length < 100) {
      return null;
    }

    page += 1;
  }

  return null;
}

async function upsertDemoUser(supabase) {
  const existingUser = await findUserByEmail(supabase, DEMO_EMAIL);

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: DEMO_PASSWORD,
      user_metadata: {
        company_name: DEMO_WORKSPACE_NAME,
        full_name: DEMO_NAME,
      },
    });

    if (error) {
      throw error;
    }

    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      company_name: DEMO_WORKSPACE_NAME,
      full_name: DEMO_NAME,
    },
  });

  if (error) {
    throw error;
  }

  return data.user;
}

async function upsertWorkspace(supabase, user) {
  const { data: existingOrganization, error: organizationLookupError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", DEMO_WORKSPACE_SLUG)
    .maybeSingle();

  if (organizationLookupError) {
    throw organizationLookupError;
  }

  const organizationId = existingOrganization?.id ?? crypto.randomUUID();

  const { error: organizationError } = await supabase.from("organizations").upsert(
    {
      id: organizationId,
      name: DEMO_WORKSPACE_NAME,
      slug: DEMO_WORKSPACE_SLUG,
      owner_user_id: user.id,
      default_rotation_weeks: 2,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (organizationError) {
    throw organizationError;
  }

  const { error: memberError } = await supabase.from("organization_members").upsert(
    {
      organization_id: organizationId,
      user_id: user.id,
      email: DEMO_EMAIL,
      full_name: DEMO_NAME,
      role: "owner",
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,user_id" }
  );

  if (memberError) {
    throw memberError;
  }

  return organizationId;
}

async function clearDemoWorkspace(supabase, organizationId) {
  const tables = [
    "commercial_rams_documents",
    "scheduled_jobs",
    "recurring_invoice_templates",
    "invoices",
    "quotes",
    "items",
    "monthly_payments",
    "visits",
    "customer_leads",
    "customers",
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("organization_id", organizationId);

    if (error && error.code !== "42P01") {
      throw error;
    }
  }
}

function lineItem(id, description, quantity, price) {
  return { id, description, quantity, price };
}

function getAddressFields(customer) {
  return {
    customer_type: customer.customer_type,
    customer_address: customer.address,
    customer_town: "East Kilbride",
    customer_postcode: customer.postcode,
    site_name: customer.site_name ?? null,
    site_address: customer.site_address ?? null,
    site_town: customer.site_town ?? null,
    site_postcode: customer.site_postcode ?? null,
  };
}

async function seedDemoData(supabase, organizationId, user) {
  await clearDemoWorkspace(supabase, organizationId);

  const now = new Date().toISOString();

  const { error: subscriptionError } = await supabase.from("subscriptions").upsert(
    {
      organization_id: organizationId,
      plan: "growth",
      status: "active",
      staff_addon_quantity: 0,
      current_period_end: "2026-06-16T00:00:00.000Z",
      updated_at: now,
    },
    { onConflict: "organization_id" }
  );

  if (subscriptionError) {
    throw subscriptionError;
  }

  const staffPayload = {
      organization_id: organizationId,
      auth_user_id: user.id,
      email: DEMO_EMAIL,
      full_name: DEMO_NAME,
      role: "Admin",
      is_active: true,
      is_system_admin: true,
      phone: "01355 555 100",
      notes: "Demo administrator account.",
      updated_at: now,
  };
  const { data: existingStaffMember, error: staffLookupError } = await supabase
    .from("staff_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("email", DEMO_EMAIL)
    .maybeSingle();

  if (staffLookupError) {
    throw staffLookupError;
  }

  const staffResult = existingStaffMember
    ? await supabase
        .from("staff_members")
        .update(staffPayload)
        .eq("id", existingStaffMember.id)
    : await supabase.from("staff_members").insert({
        ...staffPayload,
        created_at: now,
      });

  if (staffResult.error) {
    throw staffResult.error;
  }

  const { error: roleError } = await supabase.from("role_permissions").upsert(
    ROLE_PERMISSIONS.map(([role, pageKey, allowed]) => ({
      organization_id: organizationId,
      role,
      page_key: pageKey,
      allowed,
      updated_at: now,
    })),
    { onConflict: "organization_id,role,page_key" }
  );

  if (roleError) {
    throw roleError;
  }

  const { data: insertedCustomers, error: customerError } = await supabase
    .from("customers")
    .insert(
      demoCustomers.map((customer) => ({
        organization_id: organizationId,
        name: customer.name,
        address: customer.address,
        postcode: customer.postcode,
        town: "East Kilbride",
        phone: customer.phone,
        email: customer.email,
        contact_emails: [customer.email],
        is_grass_cutting_customer: true,
        grass_cut_areas: ["All"],
        week: customer.week,
        day: customer.day,
        customer_type: customer.customer_type,
        cut_frequency: customer.cut_frequency,
        rotation_weeks_override: null,
        site_name: customer.site_name ?? null,
        site_address: customer.site_address ?? null,
        site_town: customer.site_town ?? null,
        site_postcode: customer.site_postcode ?? null,
        payment_method: customer.payment_method,
        access_notes: customer.notes,
        notes: customer.notes,
        route_order: customer.route_order,
        price: customer.price,
        lat: customer.lat,
        lng: customer.lng,
        created_at: now,
        updated_at: now,
      }))
    )
    .select("id,name");

  if (customerError) {
    throw customerError;
  }

  const customerIds = new Map();
  insertedCustomers.forEach((customer, index) => {
    customerIds.set(demoCustomers[index].key, customer.id);
  });

  const catalogItems = [
    ["item-lawn-cut", "Lawn cut", "Garden maintenance", "service", 32, 0],
    ["item-hedge-trim", "Hedge trim", "Garden maintenance", "service", 85, 0],
    ["item-pressure-wash", "Pressure washing", "Exterior cleaning", "service", 140, 0],
    ["item-green-waste", "Green waste removal", "Waste", "service", 35, 0],
    ["item-lawn-feed", "Lawn feed treatment", "Products", "product", 45, 18],
  ];

  const { error: itemsError } = await supabase.from("items").insert(
    catalogItems.map(([id, title, category, itemType, price, buyPrice]) => ({
      id,
      organization_id: organizationId,
      title,
      category,
      item_type: itemType,
      price,
      buy_price: buyPrice,
      created_at: now,
      updated_at: now,
    }))
  );

  if (itemsError) {
    throw itemsError;
  }

  const customersByKey = Object.fromEntries(
    demoCustomers.map((customer) => [customer.key, customer])
  );

  const quotes = [
    {
      id: "demo-quote-001",
      quote_number: "Q-DEMO-001",
      customerKey: "patel",
      date: "2026-05-10",
      status: "Accepted",
      items: [
        lineItem("q1-1", "Patio pressure washing", 1, 140),
        lineItem("q1-2", "Green waste removal", 1, 35),
      ],
      notes: "Demo quote for a one-off patio clean in East Kilbride.",
    },
    {
      id: "demo-quote-002",
      quote_number: "Q-DEMO-002",
      customerKey: "ek-office",
      date: "2026-05-12",
      status: "Scheduled",
      items: [
        lineItem("q2-1", "Commercial hedge trim", 1, 420),
        lineItem("q2-2", "Green waste removal", 2, 35),
      ],
      notes: "Demo commercial quote for East Kilbride office grounds.",
    },
    {
      id: "demo-quote-003",
      quote_number: "Q-DEMO-003",
      customerKey: "hunter",
      date: "2026-05-15",
      status: "Draft",
      items: [
        lineItem("q3-1", "Lawn renovation and feed", 1, 125),
        lineItem("q3-2", "Lawn feed treatment", 2, 45),
      ],
      notes: "Draft demo quote for seasonal lawn treatment.",
    },
  ].map((quote) => {
    const customer = customersByKey[quote.customerKey];
    const total = quote.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    return {
      id: quote.id,
      organization_id: organizationId,
      quote_number: quote.quote_number,
      customer_id: customerIds.get(quote.customerKey),
      customer_name: customer.name,
      ...getAddressFields(customer),
      date: quote.date,
      status: quote.status,
      items: quote.items,
      notes: quote.notes,
      total,
      created_at: now,
      updated_at: now,
    };
  });

  const { error: quotesError } = await supabase.from("quotes").insert(quotes);

  if (quotesError) {
    throw quotesError;
  }

  const invoices = [
    {
      id: "demo-invoice-001",
      invoice_number: "INV-DEMO-001",
      customerKey: "stewart",
      date: "2026-05-01",
      due_date: "2026-05-15",
      status: "Paid",
      items: [lineItem("i1-1", "Fortnightly lawn care - May", 1, 64)],
      notes: "Paid demo monthly invoice.",
    },
    {
      id: "demo-invoice-002",
      invoice_number: "INV-DEMO-002",
      customerKey: "campbell",
      date: "2026-05-09",
      due_date: "2026-05-23",
      status: "Unpaid",
      items: [lineItem("i2-1", "Lawn cut and tidy", 1, 38)],
      notes: "Unpaid demo invoice for dashboard follow-up.",
    },
    {
      id: "demo-invoice-003",
      invoice_number: "INV-DEMO-003",
      customerKey: "patel",
      date: "2026-05-11",
      due_date: "2026-05-25",
      status: "Sent",
      linked_quote_id: "demo-quote-001",
      items: [
        lineItem("i3-1", "Patio pressure washing", 1, 140),
        lineItem("i3-2", "Green waste removal", 1, 35),
      ],
      notes: "Created from accepted quote Q-DEMO-001.",
    },
    {
      id: "demo-invoice-004",
      invoice_number: "INV-DEMO-004",
      customerKey: "ek-office",
      date: "2026-05-14",
      due_date: "2026-05-28",
      status: "Approved",
      linked_quote_id: "demo-quote-002",
      items: [
        lineItem("i4-1", "Commercial hedge trim", 1, 420),
        lineItem("i4-2", "Green waste removal", 2, 35),
      ],
      notes: "Approved commercial demo invoice.",
    },
  ].map((invoice) => {
    const customer = customersByKey[invoice.customerKey];
    const total = invoice.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );

    return {
      id: invoice.id,
      organization_id: organizationId,
      invoice_number: invoice.invoice_number,
      customer_id: customerIds.get(invoice.customerKey),
      customer_name: customer.name,
      ...getAddressFields(customer),
      date: invoice.date,
      due_date: invoice.due_date,
      status: invoice.status,
      items: invoice.items,
      notes: invoice.notes,
      terms: "Payment due within 14 days.",
      vat_rate: null,
      vat_amount: null,
      total,
      linked_quote_id: invoice.linked_quote_id ?? null,
      created_at: now,
      updated_at: now,
    };
  });

  const { error: invoicesError } = await supabase.from("invoices").insert(invoices);

  if (invoicesError) {
    throw invoicesError;
  }

  const scheduledJobs = [
    {
      id: "demo-job-001",
      title: "Quoted Work - Anika Patel",
      date: "2026-05-18",
      notes: "Patio pressure washing from accepted quote Q-DEMO-001.",
      start_time: "10:00",
      finish_time: "12:00",
      customerKey: "patel",
      type: "Quote Accepted",
      status: "Scheduled",
      quote_ids: ["demo-quote-001"],
      invoice_ids: ["demo-invoice-003"],
    },
    {
      id: "demo-job-002",
      title: "Commercial Hedge Trim - East Kilbride Office Park",
      date: "2026-05-19",
      notes: "Commercial hedge trim and waste removal.",
      start_time: "09:00",
      finish_time: "14:00",
      customerKey: "ek-office",
      type: "Commercial",
      status: "Scheduled",
      quote_ids: ["demo-quote-002"],
      invoice_ids: ["demo-invoice-004"],
    },
  ].map((job) => {
    const customer = customersByKey[job.customerKey];

    return {
      id: job.id,
      organization_id: organizationId,
      title: job.title,
      date: job.date,
      notes: job.notes,
      start_time: job.start_time,
      finish_time: job.finish_time,
      customer_id: customerIds.get(job.customerKey),
      customer_name: customer.name,
      type: job.type,
      status: job.status,
      quote_ids: job.quote_ids,
      invoice_ids: job.invoice_ids,
      created_at: now,
      updated_at: now,
    };
  });

  const { error: jobsError } = await supabase
    .from("scheduled_jobs")
    .insert(scheduledJobs);

  if (jobsError && jobsError.code !== "42P01") {
    throw jobsError;
  }

  const appState = {
    version: 1,
    selectedWeek: "Week 1",
    selectedDay: "Monday",
    appSettings: {
      businessName: "RoundHQ East Kilbride Demo",
      tradingName: "EK Demo Gardens",
      businessEmail: DEMO_EMAIL,
      businessPhone: "01355 555 100",
      website: "https://roundhq.co.uk",
      addressLine1: "Demo Workspace",
      townCity: "East Kilbride",
      county: "South Lanarkshire",
      postcode: "G74",
      currencyCode: "GBP",
      defaultRotationWeeks: 2,
      quotePrefix: "Q-DEMO",
      nextQuoteNumber: 4,
      invoicePrefix: "INV-DEMO",
      nextInvoiceNumber: 5,
      paymentTermsDays: 14,
      defaultQuoteNotes: "Demo quote prepared by RoundHQ.",
      defaultInvoiceNotes: "Thank you for using the RoundHQ demo workspace.",
    },
    expenseSuppliers: [
      {
        id: "demo-supplier-001",
        name: "EK Garden Supplies",
        contactName: "Demo Supplier",
        email: "sales@ekgardensupplies.example.co.uk",
        phone: "01355 555 220",
        website: "",
        notes: "Demo supplier for materials and lawn feed.",
        createdAt: now,
        updatedAt: now,
      },
    ],
    expenseProducts: [
      {
        id: "demo-product-001",
        name: "Lawn feed treatment",
        supplierId: "demo-supplier-001",
        sku: "LAWN-FEED-DEMO",
        category: "Products",
        unitCost: 18,
        quotePrice: 45,
        isQuoteItem: true,
        notes: "Demo product also available as a quote item.",
        createdAt: now,
        updatedAt: now,
      },
    ],
    expenses: [
      {
        id: "demo-expense-001",
        date: "2026-05-08",
        supplierId: "demo-supplier-001",
        productId: "demo-product-001",
        category: "Materials",
        description: "Lawn feed stock",
        amount: 72,
        paymentMethod: "Card",
        receiptReference: "DEMO-1001",
        notes: "Demo expense for product stock.",
        createdAt: now,
        updatedAt: now,
      },
    ],
  };

  const { error: appStateError } = await supabase.from("app_state").upsert(
    {
      organization_id: organizationId,
      id: "primary",
      data: appState,
      updated_at: now,
    },
    { onConflict: "organization_id,id" }
  );

  if (appStateError) {
    throw appStateError;
  }
}

async function main() {
  loadEnvFile();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const user = await upsertDemoUser(supabase);
  const organizationId = await upsertWorkspace(supabase, user);

  await seedDemoData(supabase, organizationId, user);

  console.log("Demo account ready");
  console.log(`Email: ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log(`Workspace: ${DEMO_WORKSPACE_NAME}`);
  console.log(`Organization ID: ${organizationId}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
