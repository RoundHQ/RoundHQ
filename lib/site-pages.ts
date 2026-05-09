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
    eyebrow: "Everything in one place",
    title: "Tools built for the way maintenance teams actually work.",
    summary:
      "RoundHQ brings customer records, rounds, quotes, invoices, visits, payments, and staff access into one tidy workspace.",
    body:
      "Your team can plan the week, see what is due, track who has been visited, and keep a clean record of every customer without fighting spreadsheets.\n\nEach feature is built around daily field work: quick scheduling, clear route visibility, simple quote creation, invoice tracking, and staff permissions that keep the right data in the right hands.",
    highlights: [
      "Customer management with notes, pricing, documents, and service history",
      "Rounds and scheduling for weekly, fortnightly, and monthly work",
      "Quotes, invoices, payments, route maps, staff roles, and reporting",
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
    eyebrow: "Simple pricing",
    title: "One monthly price. Everything included.",
    summary:
      "RoundHQ is GBP 30 per month for each business account, with no setup fees and no complicated feature tiers.",
    body:
      "The full platform is included from day one: unlimited customers, jobs and quotes, invoicing, payments, route planning, staff accounts, reminders, and reports.\n\nStart with a 14-day free trial. No card is required for the trial, and you can cancel whenever you need to.",
    highlights: [
      "GBP 30 per month per business account",
      "14-day free trial with no card required",
      "All current RoundHQ features included",
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
    eyebrow: "Built for maintenance businesses",
    title: "RoundHQ helps practical teams run calmer days.",
    summary:
      "RoundHQ was created for garden maintenance and field service businesses that need structure without heavy software.",
    body:
      "Most maintenance teams grow from hard work, repeat customers, and a lot of moving parts. RoundHQ gives that work a proper operating base so owners can see what is happening, staff know where they need to be, and customers get a more reliable service.\n\nThe aim is simple: fewer missed details, clearer schedules, faster admin, and more control over the business.",
    highlights: [
      "Designed around rounds, visits, quotes, invoices, and field teams",
      "Built for owners who want visibility without adding admin drag",
      "Focused on practical workflows rather than bloated software",
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
    title: "Questions, support, or setup help.",
    summary:
      "Get in touch if you want to ask about RoundHQ, the free trial, billing, or setting up your business workspace.",
    body:
      "RoundHQ is here for maintenance businesses that want a cleaner way to manage the day-to-day work.\n\nUse this page for contact details, support information, demo requests, or any launch messaging you want customers to see before they sign up.",
    highlights: [
      "Ask about the 14-day free trial",
      "Get help setting up your workspace",
      "Share product questions or customer support requests",
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
