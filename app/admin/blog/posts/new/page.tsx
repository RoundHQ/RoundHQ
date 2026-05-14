import { FileText } from "lucide-react";
import {
  AdminHeroShell,
  AdminSetupNotice,
} from "@/components/admin/admin-page-chrome";
import { getAdminAccess } from "@/lib/admin/guard";
import { getAdminBlogData, type BlogCategory } from "@/lib/blog";
import { createBlogPostAction } from "../../actions";
import BlogPostForm from "../blog-post-form";

export const dynamic = "force-dynamic";

type NewPostSearchParams = {
  error?: string;
};

export default async function NewBlogPostPage({
  searchParams,
}: {
  searchParams?: Promise<NewPostSearchParams>;
}) {
  const access = await getAdminAccess("/admin/blog/posts/new");

  if (!access.ok) {
    return (
      <AdminSetupNotice title={access.title}>
        {access.description}
      </AdminSetupNotice>
    );
  }

  let categories: BlogCategory[] = [];

  try {
    const data = await getAdminBlogData();
    categories = data.categories;
  } catch (error) {
    return (
      <AdminSetupNotice title="Blog database setup needed">
        Run <code>supabase/blog_schema.sql</code> in Supabase before creating
        blog posts.
        <div className="mt-2 text-xs text-amber-800">
          {error instanceof Error ? error.message : "The blog tables are missing."}
        </div>
      </AdminSetupNotice>
    );
  }

  const params = (await searchParams) ?? {};

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <AdminHeroShell
        eyebrow="New blog post"
        title="Create an update or help guide."
        summary="Write the post body, choose a category, publish status, SEO details, and optional image or video embed."
      >
        <section className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
              <FileText aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                Content
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">
                Draft first, publish when ready.
              </p>
            </div>
          </div>
        </section>
      </AdminHeroShell>

      <section className="bg-white px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto max-w-5xl">
          <BlogPostForm
            action={createBlogPostAction}
            categories={categories}
            mode="create"
            error={params.error}
          />
        </div>
      </section>
    </main>
  );
}
