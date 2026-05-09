import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Sparkles } from "lucide-react";
import {
  getDefaultSitePage,
  getPublishedSitePages,
  type SitePage,
  type SitePageSlug,
} from "@/lib/site-pages";

function RoundHQLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="block shrink-0" aria-label="RoundHQ home">
      <Image
        src="/roundhq-logo-long-white.png"
        alt="RoundHQ"
        width={1200}
        height={300}
        priority={!compact}
        className={compact ? "h-auto w-[180px]" : "h-auto w-[220px] sm:w-[240px]"}
      />
    </Link>
  );
}

function MarketingHeader({ pages }: { pages: SitePage[] }) {
  return (
    <header className="relative z-10 border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-7 sm:px-8">
        <RoundHQLogo />

        <nav className="hidden items-center gap-8 text-sm font-semibold text-white/88 lg:flex">
          {pages.map((page) => (
            <Link key={page.slug} href={`/${page.slug}`} className="hover:text-white">
              {page.navLabel}
            </Link>
          ))}
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
            className="inline-flex items-center rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.3)] transition hover:bg-[#22d861]"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </header>
  );
}

function MarketingFooter({ pages }: { pages: SitePage[] }) {
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
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
            Stay connected
          </h3>
          <p className="mt-5 text-sm leading-6 text-white/62">
            Get product updates and practical ideas for running a cleaner
            maintenance operation.
          </p>
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

function PageBody({ page }: { page: SitePage }) {
  const paragraphs = page.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section className="bg-white px-5 py-16 sm:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.86fr_1.14fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
            {page.navLabel}
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-normal text-slate-950 sm:text-5xl">
            What this page covers.
          </h2>
        </div>

        <div className="space-y-6">
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-lg leading-8 text-slate-600">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function SitePageView({ slug }: { slug: SitePageSlug }) {
  const pages = await getPublishedSitePages();
  const page = pages.find((sitePage) => sitePage.slug === slug) ?? getDefaultSitePage(slug);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-[#001d1f] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_50%,#001112_100%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="absolute -right-24 top-24 hidden h-[420px] w-[420px] rounded-full border border-[#20d85a]/12 lg:block" />
        <div className="absolute -right-8 top-40 hidden h-[300px] w-[300px] rounded-full border border-[#20d85a]/12 lg:block" />

        <MarketingHeader pages={pages} />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:pb-24 lg:pt-16">
          <section>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#20d85a]">
              {page.eyebrow}
            </p>
            <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.08] tracking-normal text-white sm:text-6xl">
              {page.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              {page.summary}
            </p>
            <Link
              href={page.primaryCtaHref}
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#19c653] px-6 py-4 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.3)] transition hover:bg-[#22d861]"
            >
              {page.primaryCtaLabel}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </section>

          <section className="grid content-end gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {page.highlights.map((highlight) => (
              <article
                key={highlight}
                className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]"
              >
                <BadgeCheck
                  aria-hidden="true"
                  className="mb-4 size-5 text-[#18b74f]"
                />
                <p className="text-sm font-bold leading-6 text-slate-800">
                  {highlight}
                </p>
              </article>
            ))}
          </section>
        </div>
      </section>

      <PageBody page={page} />

      <section className="bg-[#002b2d] px-5 py-16 text-white sm:px-8 lg:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#20d85a]">
              Ready when you are
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight tracking-normal">
              Bring your customers, rounds, quotes, invoices, and payments into
              RoundHQ.
            </h2>
          </div>
          <Link
            href="/signup"
            className="inline-flex w-fit items-center justify-center gap-2 rounded-md bg-[#19c653] px-6 py-4 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.3)] transition hover:bg-[#22d861]"
          >
            Start free trial
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>

      <MarketingFooter pages={pages} />
    </main>
  );
}
