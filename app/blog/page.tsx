import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Tags } from "lucide-react";
import {
  BlogMarketingFooter,
  BlogMarketingHeader,
  BlogPostCard,
} from "@/components/marketing/blog-components";
import {
  getBlogSettings,
  getPublishedBlogCategories,
  getPublishedBlogPosts,
} from "@/lib/blog";
import { getPublishedSitePages } from "@/lib/site-pages";

export const dynamic = "force-dynamic";

type BlogSearchParams = {
  category?: string;
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getBlogSettings();

  return {
    title: settings.seoTitle,
    description: settings.seoDescription,
  };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: Promise<BlogSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const selectedCategorySlug = params.category?.trim() || "";
  const [pages, settings, categories, posts] = await Promise.all([
    getPublishedSitePages(),
    getBlogSettings(),
    getPublishedBlogCategories(),
    getPublishedBlogPosts(selectedCategorySlug || undefined),
  ]);
  const selectedCategory = selectedCategorySlug
    ? categories.find((category) => category.slug === selectedCategorySlug)
    : null;
  const featuredPost =
    settings.showFeaturedPost && !selectedCategory
      ? posts.find((post) => post.isFeatured) ?? posts[0]
      : null;
  const remainingPosts = featuredPost
    ? posts.filter((post) => post.id !== featuredPost.id)
    : posts;
  const visiblePosts = remainingPosts.slice(0, settings.postsPerPage);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-[#001d1f] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_52%,#001112_100%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />

        <BlogMarketingHeader pages={pages} />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:pb-24 lg:pt-16">
          <section>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#20d85a]">
              {settings.heroEyebrow}
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-normal text-white sm:text-6xl">
              {settings.title}
            </h1>
            <p className="mt-6 max-w-2xl whitespace-pre-line text-lg leading-8 text-white/78">
              {settings.summary}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={settings.ctaHref}
                className="inline-flex items-center gap-2 rounded-md bg-[#19c653] px-6 py-4 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.3)] transition hover:bg-[#22d861]"
              >
                {settings.ctaLabel}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </section>

          <section className="grid content-end gap-4 sm:grid-cols-2">
            <article className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
              <BookOpen aria-hidden="true" className="mb-4 size-6 text-[#18b74f]" />
              <p className="text-3xl font-extrabold tracking-normal">
                {posts.length}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                Published articles
              </p>
            </article>
            <article className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
              <Tags aria-hidden="true" className="mb-4 size-6 text-[#18b74f]" />
              <p className="text-3xl font-extrabold tracking-normal">
                {categories.length}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                Public categories
              </p>
            </article>
          </section>
        </div>
      </section>

      <section className="bg-white px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/blog"
              className={`rounded-md px-4 py-3 text-sm font-bold transition ${
                !selectedCategorySlug
                  ? "bg-[#19c653] text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-[#19c653]/45 hover:bg-[#f1fff6]"
              }`}
            >
              All posts
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/blog?category=${category.slug}`}
                className={`rounded-md px-4 py-3 text-sm font-bold transition ${
                  selectedCategorySlug === category.slug
                    ? "bg-[#19c653] text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-[#19c653]/45 hover:bg-[#f1fff6]"
                }`}
              >
                {category.name}
              </Link>
            ))}
          </div>

          {selectedCategory ? (
            <div className="mt-8 max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
                {selectedCategory.name}
              </p>
              {selectedCategory.description ? (
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {selectedCategory.description}
                </p>
              ) : null}
            </div>
          ) : null}

          {featuredPost ? (
            <section className="mt-10">
              <BlogPostCard post={featuredPost} featured />
            </section>
          ) : null}

          {visiblePosts.length ? (
            <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visiblePosts.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </section>
          ) : null}

          {!posts.length ? (
            <section className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
                Coming soon
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-normal text-slate-950">
                Updates and guides will appear here.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                Add categories and publish posts from the owner console to turn
                this page into a live knowledge base.
              </p>
            </section>
          ) : null}
        </div>
      </section>

      <BlogMarketingFooter pages={pages} />
    </main>
  );
}
