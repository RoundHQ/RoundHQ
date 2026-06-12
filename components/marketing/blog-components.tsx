/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  getBlogPostReadMinutes,
  getVideoEmbedSrc,
  type BlogPost,
} from "@/lib/blog";
import type { SitePage } from "@/lib/site-pages";

export function formatBlogDate(value: string | null) {
  if (!value) {
    return "Draft";
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function RoundHQLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="block shrink-0" aria-label="RoundHQ home">
      <Image
        src="/roundhq-logo-long-white.png"
        alt="RoundHQ"
        width={1200}
        height={300}
        priority={!compact}
        className={compact ? "h-auto w-[160px] sm:w-[180px]" : "h-auto w-[180px] sm:w-[240px]"}
      />
    </Link>
  );
}

export function BlogMarketingHeader({ pages }: { pages: SitePage[] }) {
  return (
    <header className="relative z-10 border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 sm:px-8 sm:py-7">
        <RoundHQLogo />

        <nav className="hidden items-center gap-8 text-sm font-semibold text-white/88 lg:flex">
          {pages.map((page) => (
            <Link key={page.slug} href={`/${page.slug}`} className="hover:text-white">
              {page.navLabel}
            </Link>
          ))}
          <Link href="/blog" className="text-[#20d85a] hover:text-white">
            Blog
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-md px-3 py-2 text-sm font-semibold text-white/88 transition hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-md bg-[#19c653] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.3)] transition hover:bg-[#22d861] sm:px-5"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BlogMarketingFooter({ pages }: { pages: SitePage[] }) {
  return (
    <footer className="bg-[#001d1f] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
        <div>
          <RoundHQLogo compact />
          <p className="mt-6 max-w-sm text-sm leading-7 text-white/62">
            The all-in-one platform for garden and property maintenance
            businesses.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
            Pages
          </h3>
          <ul className="mt-5 space-y-3">
            {pages.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/${page.slug}`}
                  className="text-sm text-white/60 hover:text-white"
                >
                  {page.navLabel}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/blog" className="text-sm text-white/60 hover:text-white">
                Blog
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
            Account
          </h3>
          <ul className="mt-5 space-y-3">
            <li>
              <Link href="/login" className="text-sm text-white/60 hover:text-white">
                Login
              </Link>
            </li>
            <li>
              <Link href="/signup" className="text-sm text-white/60 hover:text-white">
                Sign up
              </Link>
            </li>
            <li>
              <Link href="/support" className="text-sm text-white/60 hover:text-white">
                Support
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
            Contact
          </h3>
          <p className="mt-5 text-sm leading-6 text-white/62">
            Product questions and setup help:
          </p>
          <a
            href="mailto:mail@roundhq.co.uk"
            className="mt-3 inline-flex text-sm font-bold text-[#20d85a] hover:text-white"
          >
            mail@roundhq.co.uk
          </a>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
        <span>&copy; 2026 RoundHQ. All rights reserved.</span>
        <span className="inline-flex items-center gap-2">
          <Sparkles aria-hidden="true" className="size-4 text-[#20d85a]" />
          Built for maintenance teams.
        </span>
      </div>
    </footer>
  );
}

export function BlogPostCard({
  post,
  featured = false,
}: {
  post: BlogPost;
  featured?: boolean;
}) {
  return (
    <article
      className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-[#19c653]/45 hover:shadow-md ${
        featured ? "grid lg:grid-cols-[1.05fr_0.95fr]" : ""
      }`}
    >
      {post.featuredImageUrl ? (
        <div className={featured ? "min-h-[320px]" : "h-56"}>
          <img
            src={post.featuredImageUrl}
            alt={post.featuredImageAlt || post.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          className={`flex items-center justify-center bg-[#e7f9ed] text-[#168b43] ${
            featured ? "min-h-[320px]" : "h-56"
          }`}
        >
          <BadgeCheck aria-hidden="true" className="size-12" />
        </div>
      )}

      <div className="p-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#e7f9ed] px-3 py-1 text-xs font-extrabold text-[#168b43]">
            {post.category?.name ?? "RoundHQ"}
          </span>
          {post.isFeatured ? (
            <span className="rounded-full bg-[#003c35] px-3 py-1 text-xs font-extrabold text-white">
              Featured
            </span>
          ) : null}
        </div>

        <h2
          className={`mt-5 font-extrabold leading-tight tracking-normal text-slate-950 ${
            featured ? "text-3xl sm:text-4xl" : "text-2xl"
          }`}
        >
          {post.title}
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">{post.excerpt}</p>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="size-4" />
            {formatBlogDate(post.publishedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4" />
            {getBlogPostReadMinutes(post.body)} min read
          </span>
        </div>

        <Link
          href={`/blog/${post.slug}`}
          className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#168b43] hover:text-slate-950"
        >
          Read post
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </article>
  );
}

export function BlogPostMedia({ post }: { post: BlogPost }) {
  const embedSrc = getVideoEmbedSrc(post.videoEmbedUrl);

  if (!post.featuredImageUrl && !embedSrc) {
    return null;
  }

  return (
    <section className="grid gap-5">
      {post.featuredImageUrl ? (
        <figure className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <img
            src={post.featuredImageUrl}
            alt={post.featuredImageAlt || post.title}
            className="max-h-[620px] w-full object-cover"
          />
        </figure>
      ) : null}

      {embedSrc ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-sm">
          <iframe
            src={embedSrc}
            title={post.videoEmbedTitle || post.title}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : null}
    </section>
  );
}

export function BlogPostBody({ body }: { body: string }) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {paragraphs.map((paragraph) => (
        <p
          key={paragraph}
          className="whitespace-pre-line text-lg leading-8 text-slate-700"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}
