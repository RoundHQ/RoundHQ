import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, UserRound } from "lucide-react";
import {
  BlogMarketingFooter,
  BlogMarketingHeader,
  BlogPostBody,
  BlogPostMedia,
  formatBlogDate,
} from "@/components/marketing/blog-components";
import {
  getBlogPostReadMinutes,
  getPublishedBlogPost,
  getPublishedBlogPosts,
} from "@/lib/blog";
import { getPublishedSitePages } from "@/lib/site-pages";

export const dynamic = "force-dynamic";

type BlogPostParams = {
  slug: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<BlogPostParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);

  if (!post) {
    return {
      title: "Blog post not found | RoundHQ",
    };
  }

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    openGraph: post.featuredImageUrl
      ? {
          images: [
            {
              url: post.featuredImageUrl,
              alt: post.featuredImageAlt || post.title,
            },
          ],
        }
      : undefined,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<BlogPostParams>;
}) {
  const { slug } = await params;
  const [pages, post] = await Promise.all([
    getPublishedSitePages(),
    getPublishedBlogPost(slug),
  ]);

  if (!post) {
    notFound();
  }

  const relatedPosts = (await getPublishedBlogPosts(post.category?.slug))
    .filter((item) => item.id !== post.id)
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-[#001d1f] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_52%,#001112_100%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />

        <BlogMarketingHeader pages={pages} />

        <div className="relative z-10 mx-auto max-w-5xl px-5 pb-16 pt-12 sm:px-8 lg:pb-24 lg:pt-16">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-bold text-white/75 transition hover:text-white"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to blog
          </Link>

          <div className="mt-8 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#20d85a]/12 px-3 py-1 text-xs font-extrabold text-[#20d85a] ring-1 ring-[#20d85a]/24">
              {post.category?.name ?? "RoundHQ"}
            </span>
            {post.isFeatured ? (
              <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-extrabold text-white ring-1 ring-white/16">
                Featured
              </span>
            ) : null}
          </div>

          <h1 className="mt-6 max-w-4xl text-5xl font-extrabold leading-[1.08] tracking-normal text-white sm:text-6xl">
            {post.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/78">
            {post.excerpt}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-5 text-sm font-bold text-white/70">
            <span className="inline-flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="size-4 text-[#20d85a]" />
              {formatBlogDate(post.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock aria-hidden="true" className="size-4 text-[#20d85a]" />
              {getBlogPostReadMinutes(post.body)} min read
            </span>
            <span className="inline-flex items-center gap-2">
              <UserRound aria-hidden="true" className="size-4 text-[#20d85a]" />
              {post.authorName}
            </span>
          </div>
        </div>
      </section>

      <article className="bg-white px-5 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto grid max-w-5xl gap-10">
          <BlogPostMedia post={post} />
          <BlogPostBody body={post.body} />
        </div>
      </article>

      {relatedPosts.length ? (
        <section className="bg-slate-50 px-5 py-12 sm:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
                Related
              </p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-normal text-slate-950">
                More from this category.
              </h2>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  href={`/blog/${relatedPost.slug}`}
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#19c653]/45 hover:shadow-md"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#168b43]">
                    {relatedPost.category?.name ?? "RoundHQ"}
                  </p>
                  <h3 className="mt-4 text-xl font-extrabold tracking-normal text-slate-950">
                    {relatedPost.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {relatedPost.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <BlogMarketingFooter pages={pages} />
    </main>
  );
}
