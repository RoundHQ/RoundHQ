import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Newspaper,
  Plus,
  Settings,
  Tags,
  Trash2,
} from "lucide-react";
import {
  AdminHeroShell,
  AdminSetupNotice,
} from "@/components/admin/admin-page-chrome";
import { getAdminAccess } from "@/lib/admin/guard";
import {
  DEFAULT_BLOG_SETTINGS,
  getAdminBlogData,
  type BlogCategory,
  type BlogPost,
} from "@/lib/blog";
import {
  createBlogCategoryAction,
  deleteBlogCategoryAction,
  updateBlogSettingsAction,
} from "./actions";

export const dynamic = "force-dynamic";

type AdminBlogSearchParams = {
  saved?: string;
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getSavedMessage(saved?: string) {
  if (saved === "settings") {
    return "Blog settings saved.";
  }

  if (saved === "category") {
    return "Blog category added.";
  }

  if (saved === "category_deleted") {
    return "Blog category deleted.";
  }

  if (saved === "post_deleted") {
    return "Blog post deleted.";
  }

  return "";
}

function StatTile({
  title,
  value,
  detail,
}: {
  title: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </p>
      <p className="mt-3 text-4xl font-extrabold tracking-normal text-slate-950">
        {value}
      </p>
      <p className="mt-4 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function TextInput({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  rows,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
      />
    </label>
  );
}

function CategoryRow({ category }: { category: BlogCategory }) {
  const deleteAction = deleteBlogCategoryAction.bind(null, category.id);

  return (
    <div className="grid gap-4 border-t border-slate-100 px-4 py-4 sm:grid-cols-[1fr_120px_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-extrabold text-slate-950">{category.name}</p>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
              category.isPublished
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-slate-100 text-slate-600 ring-slate-200"
            }`}
          >
            {category.isPublished ? "Published" : "Hidden"}
          </span>
        </div>
        <p className="mt-1 text-xs font-semibold text-[#168b43]">
          /blog?category={category.slug}
        </p>
        {category.description ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {category.description}
          </p>
        ) : null}
      </div>
      <p className="text-sm font-bold text-slate-500">Order {category.sortOrder}</p>
      <form action={deleteAction}>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Delete
        </button>
      </form>
    </div>
  );
}

function PostStatusBadge({ post }: { post: BlogPost }) {
  const isPublished = post.status === "published";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${
        isPublished
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {post.status}
    </span>
  );
}

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams?: Promise<AdminBlogSearchParams>;
}) {
  const access = await getAdminAccess("/admin/blog");

  if (!access.ok) {
    return (
      <AdminSetupNotice title={access.title}>
        {access.description}
      </AdminSetupNotice>
    );
  }

  const params = (await searchParams) ?? {};
  const savedMessage = getSavedMessage(params.saved);
  let settings = DEFAULT_BLOG_SETTINGS;
  let categories: BlogCategory[] = [];
  let posts: BlogPost[] = [];
  let schemaError = "";

  try {
    const data = await getAdminBlogData();
    settings = data.settings;
    categories = data.categories;
    posts = data.posts;
  } catch (error) {
    schemaError =
      error instanceof Error
        ? error.message
        : "The blog tables could not be loaded.";
  }

  const publishedPosts = posts.filter((post) => post.status === "published").length;

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <AdminHeroShell
        eyebrow="Blog system"
        title="Publish updates and help guides."
        summary="Manage the public blog, categories, SEO settings, featured posts, and media embeds from the owner console."
      >
        <section className="grid gap-4 sm:grid-cols-3">
          <StatTile title="Posts" value={posts.length} detail="Drafts and published" />
          <StatTile
            title="Published"
            value={publishedPosts}
            detail="Visible on the public blog"
          />
          <StatTile
            title="Categories"
            value={categories.length}
            detail="Guide and update groups"
          />
        </section>
      </AdminHeroShell>

      <section className="bg-white px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-6">
          {schemaError ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <span className="font-bold">Database setup needed:</span>{" "}
              Run <code>supabase/blog_schema.sql</code> in Supabase before using
              the blog admin tools. It is a standalone blog setup file, so you do
              not need to run the full tenant schema again.
              <div className="mt-2 text-xs text-amber-800">{schemaError}</div>
            </div>
          ) : null}

          {savedMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {savedMessage}
            </div>
          ) : null}

          {params.error === "category" ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
              Category name is required.
            </div>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                  <Settings aria-hidden="true" className="size-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-normal text-slate-950">
                    Blog settings
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Control the public blog hero, SEO defaults, CTA, and listing
                    behaviour.
                  </p>
                </div>
              </div>

              <form action={updateBlogSettingsAction} className="space-y-5">
                <TextInput
                  label="Hero eyebrow"
                  name="hero_eyebrow"
                  defaultValue={settings.heroEyebrow}
                  required
                />
                <TextInput
                  label="Blog title"
                  name="title"
                  defaultValue={settings.title}
                  required
                />
                <TextArea
                  label="Blog summary"
                  name="summary"
                  defaultValue={settings.summary}
                  rows={3}
                />
                <div className="grid gap-5 md:grid-cols-2">
                  <TextInput
                    label="CTA label"
                    name="cta_label"
                    defaultValue={settings.ctaLabel}
                  />
                  <TextInput
                    label="CTA URL"
                    name="cta_href"
                    defaultValue={settings.ctaHref}
                  />
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <TextInput
                    label="SEO title"
                    name="seo_title"
                    defaultValue={settings.seoTitle}
                  />
                  <TextInput
                    label="Posts per page"
                    name="posts_per_page"
                    type="number"
                    defaultValue={settings.postsPerPage}
                  />
                </div>
                <TextArea
                  label="SEO description"
                  name="seo_description"
                  defaultValue={settings.seoDescription}
                  rows={2}
                />
                <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    name="show_featured_post"
                    defaultChecked={settings.showFeaturedPost}
                    className="size-4 accent-[#19c653]"
                  />
                  Show the featured post area on the blog index
                </label>
                <button
                  type="submit"
                  disabled={Boolean(schemaError)}
                  className="inline-flex items-center justify-center rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save blog settings
                </button>
              </form>
            </article>

            <article className="rounded-lg border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                    <Tags aria-hidden="true" className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-normal text-slate-950">
                      Categories
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Add or remove the groups used for updates and help guides.
                    </p>
                  </div>
                </div>

                <form action={createBlogCategoryAction} className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput label="Name" name="name" placeholder="Help Guides" />
                    <TextInput
                      label="Slug"
                      name="slug"
                      placeholder="help-guides"
                    />
                  </div>
                  <TextArea
                    label="Description"
                    name="description"
                    rows={2}
                    placeholder="How-to articles and setup guidance."
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput
                      label="Sort order"
                      name="sort_order"
                      type="number"
                      defaultValue={50}
                    />
                    <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 md:mt-7">
                      <input
                        type="checkbox"
                        name="is_published"
                        defaultChecked
                        className="size-4 accent-[#19c653]"
                      />
                      Published
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={Boolean(schemaError)}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Add category
                  </button>
                </form>
              </div>

              <div>
                {categories.length ? (
                  categories.map((category) => (
                    <CategoryRow key={category.id} category={category} />
                  ))
                ) : (
                  <div className="border-t border-slate-100 px-6 py-8 text-sm text-slate-500">
                    No blog categories yet.
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
                  <Newspaper aria-hidden="true" className="size-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-normal text-slate-950">
                    Blog posts
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Create posts with image URLs, video embeds, categories, SEO
                    metadata, and publish status.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/blog/posts/new"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861]"
              >
                <Plus aria-hidden="true" className="size-4" />
                New post
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-4 font-bold">Post</th>
                    <th className="px-4 py-4 font-bold">Category</th>
                    <th className="px-4 py-4 font-bold">Status</th>
                    <th className="px-4 py-4 font-bold">Published</th>
                    <th className="px-4 py-4 font-bold">Media</th>
                    <th className="px-4 py-4 font-bold">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {posts.map((post) => (
                    <tr key={post.id} className="align-top hover:bg-slate-50/80">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <FileText
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0 text-[#168b43]"
                          />
                          <div>
                            <p className="font-extrabold text-slate-950">
                              {post.title}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[#168b43]">
                              /blog/{post.slug}
                            </p>
                            {post.excerpt ? (
                              <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500">
                                {post.excerpt}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {post.category?.name ?? "Uncategorised"}
                      </td>
                      <td className="px-4 py-4">
                        <PostStatusBadge post={post} />
                        {post.isFeatured ? (
                          <span className="ml-2 inline-flex rounded-full bg-[#19c653] px-2.5 py-1 text-xs font-bold text-white">
                            Featured
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {formatDate(post.publishedAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {post.featuredImageUrl ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                              Image
                            </span>
                          ) : null}
                          {post.videoEmbedUrl ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                              Video
                            </span>
                          ) : null}
                          {!post.featuredImageUrl && !post.videoEmbedUrl ? (
                            <span className="text-xs text-slate-400">None</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/blog/posts/${post.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-[#19c653]/45 hover:bg-[#f1fff6]"
                        >
                          Edit
                          <ArrowRight aria-hidden="true" className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {posts.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No blog posts yet. Create the first update or help guide.
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
