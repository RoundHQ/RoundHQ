import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";

export const BLOG_POST_STATUSES = ["draft", "published"] as const;

export type BlogPostStatus = (typeof BLOG_POST_STATUSES)[number];

export type BlogSettings = {
  heroEyebrow: string;
  title: string;
  summary: string;
  ctaLabel: string;
  ctaHref: string;
  seoTitle: string;
  seoDescription: string;
  postsPerPage: number;
  showFeaturedPost: boolean;
  updatedAt: string | null;
};

export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type BlogPost = {
  id: string;
  categoryId: string | null;
  category: BlogCategory | null;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  authorName: string;
  status: BlogPostStatus;
  featuredImageUrl: string;
  featuredImageAlt: string;
  videoEmbedUrl: string;
  videoEmbedTitle: string;
  seoTitle: string;
  seoDescription: string;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type BlogSettingsRow = {
  hero_eyebrow: string | null;
  title: string | null;
  summary: string | null;
  cta_label: string | null;
  cta_href: string | null;
  seo_title: string | null;
  seo_description: string | null;
  posts_per_page: number | null;
  show_featured_post: boolean | null;
  updated_at: string | null;
};

type BlogCategoryRow = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  sort_order: number | null;
  is_published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type BlogPostRow = {
  id: string;
  category_id: string | null;
  title: string | null;
  slug: string | null;
  excerpt: string | null;
  body: string | null;
  author_name: string | null;
  status: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  video_embed_url: string | null;
  video_embed_title: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_featured: boolean | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const DEFAULT_BLOG_SETTINGS: BlogSettings = {
  heroEyebrow: "Updates and guides",
  title: "RoundHQ updates and practical help guides.",
  summary:
    "Product news, setup guidance, and useful operating notes for garden and property maintenance teams using RoundHQ.",
  ctaLabel: "Contact RoundHQ",
  ctaHref: "/contact",
  seoTitle: "RoundHQ Blog",
  seoDescription:
    "Updates, product news, and practical guides for using RoundHQ.",
  postsPerPage: 12,
  showFeaturedPost: true,
  updatedAt: null,
};

const BLOG_SETTINGS_SELECT =
  "hero_eyebrow, title, summary, cta_label, cta_href, seo_title, seo_description, posts_per_page, show_featured_post, updated_at";

const BLOG_CATEGORY_SELECT =
  "id, name, slug, description, sort_order, is_published, created_at, updated_at";

const BLOG_POST_SELECT =
  "id, category_id, title, slug, excerpt, body, author_name, status, featured_image_url, featured_image_alt, video_embed_url, video_embed_title, seo_title, seo_description, is_featured, published_at, created_at, updated_at";

export function slugifyBlogValue(value: string, fallback = "post") {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

export function isBlogPostStatus(value: string): value is BlogPostStatus {
  return BLOG_POST_STATUSES.some((status) => status === value);
}

export function getBlogPostReadMinutes(body: string) {
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.ceil(wordCount / 220));
}

export function getVideoEmbedSrc(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : trimmed;
    }

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : trimmed;
    }

    if (host === "vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : trimmed;
    }

    return trimmed;
  } catch {
    return "";
  }
}

function createPublicBlogClient() {
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

function rowToBlogSettings(row?: BlogSettingsRow | null): BlogSettings {
  if (!row) {
    return DEFAULT_BLOG_SETTINGS;
  }

  return {
    heroEyebrow: row.hero_eyebrow?.trim() || DEFAULT_BLOG_SETTINGS.heroEyebrow,
    title: row.title?.trim() || DEFAULT_BLOG_SETTINGS.title,
    summary: row.summary?.trim() || DEFAULT_BLOG_SETTINGS.summary,
    ctaLabel: row.cta_label?.trim() || DEFAULT_BLOG_SETTINGS.ctaLabel,
    ctaHref: row.cta_href?.trim() || DEFAULT_BLOG_SETTINGS.ctaHref,
    seoTitle: row.seo_title?.trim() || DEFAULT_BLOG_SETTINGS.seoTitle,
    seoDescription:
      row.seo_description?.trim() || DEFAULT_BLOG_SETTINGS.seoDescription,
    postsPerPage: row.posts_per_page ?? DEFAULT_BLOG_SETTINGS.postsPerPage,
    showFeaturedPost:
      row.show_featured_post ?? DEFAULT_BLOG_SETTINGS.showFeaturedPost,
    updatedAt: row.updated_at,
  };
}

function rowToBlogCategory(row: BlogCategoryRow): BlogCategory {
  return {
    id: row.id,
    name: row.name?.trim() || "Uncategorised",
    slug: row.slug?.trim() || "uncategorised",
    description: row.description?.trim() || "",
    sortOrder: row.sort_order ?? 50,
    isPublished: row.is_published ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToBlogPost(
  row: BlogPostRow,
  categoriesById: Map<string, BlogCategory>
): BlogPost {
  const rawStatus = row.status ?? "";
  const status: BlogPostStatus = isBlogPostStatus(rawStatus)
    ? rawStatus
    : "draft";

  return {
    id: row.id,
    categoryId: row.category_id,
    category: row.category_id ? categoriesById.get(row.category_id) ?? null : null,
    title: row.title?.trim() || "Untitled post",
    slug: row.slug?.trim() || row.id,
    excerpt: row.excerpt?.trim() || "",
    body: row.body?.trim() || "",
    authorName: row.author_name?.trim() || "RoundHQ",
    status,
    featuredImageUrl: row.featured_image_url?.trim() || "",
    featuredImageAlt: row.featured_image_alt?.trim() || "",
    videoEmbedUrl: row.video_embed_url?.trim() || "",
    videoEmbedTitle: row.video_embed_title?.trim() || "",
    seoTitle: row.seo_title?.trim() || "",
    seoDescription: row.seo_description?.trim() || "",
    isFeatured: row.is_featured ?? false,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getPublicCategories() {
  const supabase = createPublicBlogClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("blog_categories")
    .select(BLOG_CATEGORY_SELECT)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => rowToBlogCategory(row as BlogCategoryRow));
}

export async function getPublishedBlogCategories() {
  return getPublicCategories();
}

export async function getBlogSettings() {
  const supabase = createPublicBlogClient();

  if (!supabase) {
    return DEFAULT_BLOG_SETTINGS;
  }

  const { data, error } = await supabase
    .from("blog_settings")
    .select(BLOG_SETTINGS_SELECT)
    .eq("id", "primary")
    .maybeSingle();

  if (error) {
    return DEFAULT_BLOG_SETTINGS;
  }

  return rowToBlogSettings(data as BlogSettingsRow | null);
}

export async function getPublishedBlogPosts(categorySlug?: string) {
  const supabase = createPublicBlogClient();

  if (!supabase) {
    return [];
  }

  const categories = await getPublicCategories();
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const selectedCategory = categorySlug
    ? categories.find((category) => category.slug === categorySlug)
    : null;

  if (categorySlug && !selectedCategory) {
    return [];
  }

  let query = supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false });

  if (selectedCategory) {
    query = query.eq("category_id", selectedCategory.id);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map((row) => rowToBlogPost(row as BlogPostRow, categoriesById));
}

export async function getPublishedBlogPost(slug: string) {
  const supabase = createPublicBlogClient();

  if (!supabase) {
    return null;
  }

  const categories = await getPublicCategories();
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return rowToBlogPost(data as BlogPostRow, categoriesById);
}

export async function getAdminBlogData() {
  if (!isSupabaseServiceRoleConfigured()) {
    throw new Error("Supabase service role credentials are not configured.");
  }

  const supabase = createServiceRoleClient();
  const [settingsResult, categoriesResult, postsResult] = await Promise.all([
    supabase
      .from("blog_settings")
      .select(BLOG_SETTINGS_SELECT)
      .eq("id", "primary")
      .maybeSingle(),
    supabase
      .from("blog_categories")
      .select(BLOG_CATEGORY_SELECT)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("blog_posts")
      .select(BLOG_POST_SELECT)
      .order("updated_at", { ascending: false }),
  ]);

  if (settingsResult.error) {
    throw settingsResult.error;
  }

  if (categoriesResult.error) {
    throw categoriesResult.error;
  }

  if (postsResult.error) {
    throw postsResult.error;
  }

  const categories = (categoriesResult.data ?? []).map((row) =>
    rowToBlogCategory(row as BlogCategoryRow)
  );
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const posts = (postsResult.data ?? []).map((row) =>
    rowToBlogPost(row as BlogPostRow, categoriesById)
  );

  return {
    settings: rowToBlogSettings(settingsResult.data as BlogSettingsRow | null),
    categories,
    posts,
  };
}

export async function getAdminBlogPost(id: string) {
  if (!isSupabaseServiceRoleConfigured()) {
    throw new Error("Supabase service role credentials are not configured.");
  }

  const supabase = createServiceRoleClient();
  const [categoriesResult, postResult] = await Promise.all([
    supabase
      .from("blog_categories")
      .select(BLOG_CATEGORY_SELECT)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("blog_posts").select(BLOG_POST_SELECT).eq("id", id).maybeSingle(),
  ]);

  if (categoriesResult.error) {
    throw categoriesResult.error;
  }

  if (postResult.error) {
    throw postResult.error;
  }

  const categories = (categoriesResult.data ?? []).map((row) =>
    rowToBlogCategory(row as BlogCategoryRow)
  );
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  return {
    categories,
    post: postResult.data
      ? rowToBlogPost(postResult.data as BlogPostRow, categoriesById)
      : null,
  };
}
