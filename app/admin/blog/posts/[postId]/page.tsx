import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, FileText } from "lucide-react";
import {
  AdminHeroShell,
  AdminSetupNotice,
} from "@/components/admin/admin-page-chrome";
import { getAdminAccess } from "@/lib/admin/guard";
import { getAdminBlogPost } from "@/lib/blog";
import { deleteBlogPostAction, updateBlogPostAction } from "../../actions";
import BlogPostForm from "../blog-post-form";

export const dynamic = "force-dynamic";

type EditPostParams = {
  postId: string;
};

type EditPostSearchParams = {
  saved?: string;
  error?: string;
};

export default async function EditBlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<EditPostParams>;
  searchParams?: Promise<EditPostSearchParams>;
}) {
  const { postId } = await params;
  const access = await getAdminAccess(`/admin/blog/posts/${postId}`);

  if (!access.ok) {
    return (
      <AdminSetupNotice title={access.title}>
        {access.description}
      </AdminSetupNotice>
    );
  }

  let data: Awaited<ReturnType<typeof getAdminBlogPost>>;

  try {
    data = await getAdminBlogPost(postId);
  } catch (error) {
    return (
      <AdminSetupNotice title="Blog database setup needed">
        Run <code>supabase/blog_schema.sql</code> in Supabase before editing
        blog posts.
        <div className="mt-2 text-xs text-amber-800">
          {error instanceof Error ? error.message : "The blog tables are missing."}
        </div>
      </AdminSetupNotice>
    );
  }

  if (!data.post) {
    notFound();
  }

  const query = (await searchParams) ?? {};
  const updateAction = updateBlogPostAction.bind(null, data.post.id);
  const deleteAction = deleteBlogPostAction.bind(null, data.post.id);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <AdminHeroShell
        eyebrow="Edit blog post"
        title={data.post.title}
        summary="Update the post body, category, status, SEO details, and photo or video embed."
      >
        <section className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
              <FileText aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                Public URL
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">
                /blog/{data.post.slug}
              </p>
              {data.post.status === "published" ? (
                <Link
                  href={`/blog/${data.post.slug}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#168b43] hover:text-slate-950"
                >
                  <Eye aria-hidden="true" className="size-4" />
                  View public post
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </AdminHeroShell>

      <section className="bg-white px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto max-w-5xl">
          <BlogPostForm
            action={updateAction}
            categories={data.categories}
            post={data.post}
            mode="edit"
            error={query.error}
            saved={query.saved === "1"}
            deleteAction={deleteAction}
          />
        </div>
      </section>
    </main>
  );
}
