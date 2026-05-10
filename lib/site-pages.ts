import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";

export const SITE_PAGE_SLUGS = [
  "features",
  "pricing",
  "about",
  "resources",
  "contact",
] as const;

export type SitePageSlug = (typeof SITE_PAGE_SLUGS)[number];

export type SitePage = {
  slug: SitePageSlug;
  navLabel: string;
  eyebrow: string;
  title: string;
  summary: string;
  body: string;
  highlights: string[];
  primaryCtaLabel: string;
  primaryCtaHref: string;
  sortOrder: number;
  isPublished: boolean;
  updatedAt: string | null;
};

type SitePageRow = {
  slug: string;
  nav_label: string | null;
  eyebrow: string | null;
  title: string | null;
  summary: string | null;
  body: string | null;
  highlights: unknown;
  primary_cta_label: string | null;
  primary_cta_href: string | null;
  sort_order: number | null;
  is_published: boolean | null;
  updated_at: string | null;
};

export const DEFAULT_SITE_PAGES: SitePage[] = [
  {
    slug: "features",
    navLabel: "Features",
    eyebrow: "Complete operating system",
    title: "Everything a maintenance business needs to run the week.",
    summary:
      "RoundHQ replaces scattered spreadsheets, notes, diaries, route lists, quote documents, invoice trackers, and payment chasing with one focused workspace for garden and property maintenance teams.",
    body:
      "Start with your customer records: names, addresses, access notes, service prices, documents, visit history, and the small details that keep work moving smoothly.\n\nPlan recurring rounds by week, day, rotation and customer type. See who is due, log completed or missed visits, keep the route visible on a map, and give staff the right level of access.\n\nWhen work changes, RoundHQ keeps the admin close to the job: capture leads, create quotes, convert accepted quotes into scheduled work, send invoices, record payments, and understand what is still owed.",
    highlights: [
      "CRM, leads, quotes, invoices, payments, rounds, route map, and visit history",
      "Built for weekly, fortnightly, monthly, residential, and commercial maintenance work",
      "Growth tools include staff permissions, RAMS, advanced insights, and customer profitability",
    ],
    primaryCtaLabel: "Start free trial",
    primaryCtaHref: "/signup",
    sortOrder: 10,
    isPublished: true,
    updatedAt: null,
  },
  {
    slug: "pricing",
    navLabel: "Pricing",
    eyebrow: "Simple launch pricing",
    title: "Choose the plan that matches how your team works.",
    summary:
      "Starter is GBP 30 per business / month for solo operators getting organised. Growth is GBP 60 per business / month for teams that need staff permissions, RAMS, commercial workflows, and deeper reporting.",
    body:
      "Starter gives a solo operator the core workspace: leads, customer CRM, scheduling, recurring rounds, route map, quotes, invoices, payment tracking, visit history, notes, one staff account, up to 250 customers, and the main dashboard.\n\nGrowth is built for businesses adding people and complexity. It includes everything in Starter plus up to 5 staff accounts, staff permissions, RAMS generator, advanced dashboard insights, customer profitability, workflow tracking, commercial customer tools, quote conversion workflows, operational reporting, and up to 1,500 customers.\n\nBoth plans start with a 14-day free trial. There are no setup fees, and you can change plan as the business grows.",
    highlights: [
      "Starter: GBP 30 per business / month for solo operators",
      "Growth: GBP 60 per business / month for teams and commercial work",
      "14-day free trial, no setup fees, cancel anytime",
    ],
    primaryCtaLabel: "Start free trial",
    primaryCtaHref: "/signup",
    sortOrder: 20,
    isPublished: true,
    updatedAt: null,
  },
  {
    slug: "about",
    navLabel: "About",
    eyebrow: "Built for maintenance teams",
    title: "RoundHQ is for practical businesses that need less admin drag.",
    summary:
      "RoundHQ is built around the real rhythm of garden maintenance, lawn care, property maintenance, and field service work: repeat visits, changing routes, customer details, quotes, invoices, payments, staff, and the daily pressure to stay organised.",
    body:
      "Most maintenance businesses grow from repeat customers, trusted local work, and a lot of moving parts. The problem is that the admin often grows faster than the systems: spreadsheets for customers, paper for rounds, separate quote and invoice files, messages for staff, and memory for the tiny details.\n\nRoundHQ gives that work a proper operating base. Owners can see what is due, staff know where they need to be, customer records stay clean, and the business gets a clearer view of cashflow, workload, and service history.\n\nThe goal is simple: fewer missed details, calmer scheduling, faster admin, better visibility, and more control over the business without forcing teams into heavy generic software.",
    highlights: [
      "Designed around rounds, visits, quotes, invoices, payments, and field teams",
      "Built for owners who want visibility without adding unnecessary admin",
      "Focused on practical maintenance workflows rather than generic CRM complexity",
    ],
    primaryCtaLabel: "See the features",
    primaryCtaHref: "/features",
    sortOrder: 30,
    isPublished: true,
    updatedAt: null,
  },
  {
    slug: "resources",
    navLabel: "Resources",
    eyebrow: "Guides and updates",
    title: "Helpful resources for growing maintenance teams.",
    summary:
      "Find practical guidance, product updates, and workflow ideas for running a more organised maintenance business.",
    body:
      "This resources area is ready for guides, support articles, product updates, and practical templates as RoundHQ grows.\n\nUse it to explain how to get the most from scheduling, customer management, quoting, invoicing, payments, and staff access.",
    highlights: [
      "Product updates and new feature notes",
      "Guides for scheduling, quoting, invoices, and payments",
      "Operational templates for garden and property maintenance teams",
    ],
    primaryCtaLabel: "Contact RoundHQ",
    primaryCtaHref: "/contact",
    sortOrder: 40,
    isPublished: true,
    updatedAt: null,
  },
  {
    slug: "contact",
    navLabel: "Contact",
    eyebrow: "Talk to RoundHQ",
    title: "Questions, setup help, billing, or support.",
    summary:
      "Use the right route for the quickest answer: public product questions, workspace support, billing help, or setup guidance for moving your maintenance business into RoundHQ.",
    body:
      "If you are looking at RoundHQ for the first time, contact us with the size of your team, the type of maintenance work you do, and what you currently use for scheduling, quotes, invoices, and payment tracking.\n\nIf you already have a RoundHQ workspace, the best place to get help is the support area inside your account. That keeps your ticket, replies, and files attached to your workspace so the conversation is easy to follow.\n\nFor billing questions, workspace setup, or product feedback, include the email address used for your RoundHQ account and any useful screenshots or files.",
    highlights: [
      "Product enquiries: mail@roundhq.co.uk",
      "Workspace support: use the in-app helpdesk from your account",
      "Billing or setup help: include your RoundHQ workspace email",
    ],
    primaryCtaLabel: "Start free trial",
    primaryCtaHref: "/signup",
    sortOrder: 50,
    isPublished: true,
    updatedAt: null,
  },
];

export const SITE_NAV_ITEMS = DEFAULT_SITE_PAGES.map((page) => ({
  href: `/${page.slug}`,
  label: page.navLabel,
  slug: page.slug,
}));

const SITE_PAGE_SELECT =
  "slug, nav_label, eyebrow, title, summary, body, highlights, primary_cta_label, primary_cta_href, sort_order, is_published, updated_at";

export function isSitePageSlug(value: string): value is SitePageSlug {
  return SITE_PAGE_SLUGS.some((slug) => slug === value);
}

export function getDefaultSitePage(slug: SitePageSlug) {
  return DEFAULT_SITE_PAGES.find((page) => page.slug === slug)!;
}

function asHighlights(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function rowToSitePage(row: SitePageRow): SitePage | null {
  if (!isSitePageSlug(row.slug)) {
    return null;
  }

  const fallback = getDefaultSitePage(row.slug);

  return {
    slug: row.slug,
    navLabel: row.nav_label?.trim() || fallback.navLabel,
    eyebrow: row.eyebrow?.trim() || fallback.eyebrow,
    title: row.title?.trim() || fallback.title,
    summary: row.summary?.trim() || fallback.summary,
    body: row.body?.trim() || fallback.body,
    highlights: asHighlights(row.highlights, fallback.highlights),
    primaryCtaLabel: row.primary_cta_label?.trim() || fallback.primaryCtaLabel,
    primaryCtaHref: row.primary_cta_href?.trim() || fallback.primaryCtaHref,
    sortOrder: row.sort_order ?? fallback.sortOrder,
    isPublished: row.is_published ?? fallback.isPublished,
    updatedAt: row.updated_at,
  };
}

function mergeWithDefaults(rows: SitePage[]) {
  const bySlug = new Map(rows.map((page) => [page.slug, page]));

  return DEFAULT_SITE_PAGES.map((fallback) => bySlug.get(fallback.slug) ?? fallback)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function createPublicContentClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getPublishedSitePages() {
  const supabase = createPublicContentClient();

  if (!supabase) {
    return DEFAULT_SITE_PAGES;
  }

  const { data, error } = await supabase
    .from("site_pages")
    .select(SITE_PAGE_SELECT)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return DEFAULT_SITE_PAGES;
  }

  return mergeWithDefaults(
    data
      .map((row) => rowToSitePage(row as SitePageRow))
      .filter((page): page is SitePage => Boolean(page))
  ).filter((page) => page.isPublished);
}

export async function getPublishedSitePage(slug: SitePageSlug) {
  const pages = await getPublishedSitePages();

  return pages.find((page) => page.slug === slug) ?? getDefaultSitePage(slug);
}

export async function getAdminSitePages() {
  if (!isSupabaseServiceRoleConfigured()) {
    throw new Error("Supabase service role credentials are not configured.");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_pages")
    .select(SITE_PAGE_SELECT)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return mergeWithDefaults(
    (data ?? [])
      .map((row) => rowToSitePage(row as SitePageRow))
      .filter((page): page is SitePage => Boolean(page))
  );
}

export async function getAdminSitePage(slug: SitePageSlug) {
  const pages = await getAdminSitePages();

  return pages.find((page) => page.slug === slug) ?? getDefaultSitePage(slug);
}
