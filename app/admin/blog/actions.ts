"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/admin/guard";
import {
  DEFAULT_BLOG_SETTINGS,
  isBlogPostStatus,
  slugifyBlogValue,
} from "@/lib/blog";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getInteger(formData: FormData, key: string, fallback: number, max = 9999) {
  const parsed = Number.parseInt(getText(formData, key), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(max, parsed));
}

function getPostStatus(formData: FormData) {
  const status = getText(formData, "status");

  return isBlogPostStatus(status) ? status : "draft";
}

function getPublishedAt(formData: FormData, status: string, existingValue?: string | null) {
  if (status !== "published") {
    return null;
  }

  const value = getText(formData, "published_at");

  if (value) {
    return new Date(value).toISOString();
  }

  return existingValue ?? new Date().toISOString();
}

function getExcerpt(formData: FormData) {
  const provided = getText(formData, "excerpt");

  if (provided) {
    return provided;
  }

  return getText(formData, "body").replace(/\s+/g, " ").slice(0, 220);
}

async function getUniqueSlug({
  table,
  requestedSlug,
  currentId,
}: {
  table: "blog_categories" | "blog_posts";
  requestedSlug: string;
  currentId?: string;
}) {
  const supabase = createServiceRoleClient();
  const baseSlug = slugifyBlogValue(requestedSlug, table === "blog_posts" ? "post" : "category");

  for (let index = 1; index <= 50; index += 1) {
    const slug = index === 1 ? baseSlug : `${baseSlug}-${index}`;
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const existing = data as { id: string } | null;

    if (!existing || existing.id === currentId) {
      return slug;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}

function revalidateBlogPaths(slug?: string) {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/blog");

  if (slug) {
    revalidatePath(`/blog/${slug}`);
  }
}

export async function updateBlogSettingsAction(formData: FormData) {
  await requireAdminAccess("/admin/blog");

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("blog_settings").upsert(
    {
      id: "primary",
      hero_eyebrow:
        getText(formData, "hero_eyebrow") || DEFAULT_BLOG_SETTINGS.heroEyebrow,
      title: getText(formData, "title") || DEFAULT_BLOG_SETTINGS.title,
      summary: getText(formData, "summary") || DEFAULT_BLOG_SETTINGS.summary,
      cta_label: getText(formData, "cta_label") || DEFAULT_BLOG_SETTINGS.ctaLabel,
      cta_href: getText(formData, "cta_href") || DEFAULT_BLOG_SETTINGS.ctaHref,
      seo_title: getText(formData, "seo_title") || DEFAULT_BLOG_SETTINGS.seoTitle,
      seo_description:
        getText(formData, "seo_description") ||
        DEFAULT_BLOG_SETTINGS.seoDescription,
      posts_per_page: getInteger(
        formData,
        "posts_per_page",
        DEFAULT_BLOG_SETTINGS.postsPerPage,
        48
      ),
      show_featured_post: formData.get("show_featured_post") === "on",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidateBlogPaths();
  redirect("/admin/blog?saved=settings");
}

export async function createBlogCategoryAction(formData: FormData) {
  await requireAdminAccess("/admin/blog");

  const name = getText(formData, "name");

  if (!name) {
    redirect("/admin/blog?error=category");
  }

  const slug = await getUniqueSlug({
    table: "blog_categories",
    requestedSlug: getText(formData, "slug") || name,
  });
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("blog_categories").insert({
    name,
    slug,
    description: getText(formData, "description"),
    sort_order: getInteger(formData, "sort_order", 50),
    is_published: formData.get("is_published") === "on",
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateBlogPaths();
  redirect("/admin/blog?saved=category");
}

export async function deleteBlogCategoryAction(categoryId: string) {
  await requireAdminAccess("/admin/blog");

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("blog_categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateBlogPaths();
  redirect("/admin/blog?saved=category_deleted");
}

export async function createBlogPostAction(formData: FormData) {
  await requireAdminAccess("/admin/blog/posts/new");

  const title = getText(formData, "title");
  const body = getText(formData, "body");

  if (!title || !body) {
    redirect("/admin/blog/posts/new?error=required");
  }

  const status = getPostStatus(formData);
  const slug = await getUniqueSlug({
    table: "blog_posts",
    requestedSlug: getText(formData, "slug") || title,
  });
  const categoryId = getText(formData, "category_id") || null;
  const now = new Date().toISOString();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      category_id: categoryId,
      title,
      slug,
      excerpt: getExcerpt(formData),
      body,
      author_name: getText(formData, "author_name") || "RoundHQ",
      status,
      featured_image_url: getText(formData, "featured_image_url"),
      featured_image_alt: getText(formData, "featured_image_alt"),
      video_embed_url: getText(formData, "video_embed_url"),
      video_embed_title: getText(formData, "video_embed_title"),
      seo_title: getText(formData, "seo_title"),
      seo_description: getText(formData, "seo_description"),
      is_featured: formData.get("is_featured") === "on",
      published_at: getPublishedAt(formData, status),
      updated_at: now,
    })
    .select("id, slug")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const created = data as { id: string; slug: string };
  revalidateBlogPaths(created.slug);
  redirect(`/admin/blog/posts/${created.id}?saved=1`);
}

export async function updateBlogPostAction(postId: string, formData: FormData) {
  await requireAdminAccess(`/admin/blog/posts/${postId}`);

  const title = getText(formData, "title");
  const body = getText(formData, "body");

  if (!title || !body) {
    redirect(`/admin/blog/posts/${postId}?error=required`);
  }

  const supabase = createServiceRoleClient();
  const { data: existingData, error: existingError } = await supabase
    .from("blog_posts")
    .select("slug, published_at")
    .eq("id", postId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existing = existingData as { slug: string; published_at: string | null } | null;
  const status = getPostStatus(formData);
  const slug = await getUniqueSlug({
    table: "blog_posts",
    requestedSlug: getText(formData, "slug") || title,
    currentId: postId,
  });
  const categoryId = getText(formData, "category_id") || null;
  const { error } = await supabase
    .from("blog_posts")
    .update({
      category_id: categoryId,
      title,
      slug,
      excerpt: getExcerpt(formData),
      body,
      author_name: getText(formData, "author_name") || "RoundHQ",
      status,
      featured_image_url: getText(formData, "featured_image_url"),
      featured_image_alt: getText(formData, "featured_image_alt"),
      video_embed_url: getText(formData, "video_embed_url"),
      video_embed_title: getText(formData, "video_embed_title"),
      seo_title: getText(formData, "seo_title"),
      seo_description: getText(formData, "seo_description"),
      is_featured: formData.get("is_featured") === "on",
      published_at: getPublishedAt(formData, status, existing?.published_at),
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateBlogPaths(existing?.slug);
  revalidateBlogPaths(slug);
  revalidatePath(`/admin/blog/posts/${postId}`);
  redirect(`/admin/blog/posts/${postId}?saved=1`);
}

export async function deleteBlogPostAction(postId: string) {
  await requireAdminAccess(`/admin/blog/posts/${postId}`);

  const supabase = createServiceRoleClient();
  const { data: existingData, error: existingError } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("id", postId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const { error } = await supabase.from("blog_posts").delete().eq("id", postId);

  if (error) {
    throw new Error(error.message);
  }

  const existing = existingData as { slug: string } | null;
  revalidateBlogPaths(existing?.slug);
  redirect("/admin/blog?saved=post_deleted");
}
