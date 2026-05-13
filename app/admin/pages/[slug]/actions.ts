"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isSitePageSlug } from "@/lib/site-pages";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getHighlights(formData: FormData) {
  return getText(formData, "highlights")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function updateSitePageAction(slug: string, formData: FormData) {
  await requireAdminAccess(`/admin/pages/${slug}`);

  if (!isSitePageSlug(slug)) {
    throw new Error("Unknown site page.");
  }

  const navLabel = getText(formData, "nav_label");
  const eyebrow = getText(formData, "eyebrow");
  const title = getText(formData, "title");
  const summary = getText(formData, "summary");
  const body = getText(formData, "body");
  const primaryCtaLabel = getText(formData, "primary_cta_label");
  const primaryCtaHref = getText(formData, "primary_cta_href") || "/signup";
  const sortOrderValue = Number.parseInt(getText(formData, "sort_order"), 10);

  if (!navLabel || !eyebrow || !title || !summary || !body) {
    throw new Error("Navigation label, eyebrow, title, summary, and body are required.");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("site_pages").upsert(
    {
      slug,
      nav_label: navLabel,
      eyebrow,
      title,
      summary,
      body,
      highlights: getHighlights(formData),
      primary_cta_label: primaryCtaLabel || "Sign up",
      primary_cta_href: primaryCtaHref,
      sort_order: Number.isFinite(sortOrderValue) ? sortOrderValue : 50,
      is_published: formData.get("is_published") === "on",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "slug",
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath(`/${slug}`);
  revalidatePath("/admin/pages");
  revalidatePath(`/admin/pages/${slug}`);
  redirect(`/admin/pages/${slug}?saved=1`);
}
