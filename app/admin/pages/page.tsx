import Link from "next/link";
import { ArrowRight, BadgeCheck, FileText } from "lucide-react";
import {
  AdminHeroShell,
  AdminSetupNotice,
} from "@/components/admin/admin-page-chrome";
import { getAdminAccess } from "@/lib/admin/guard";
import {
  DEFAULT_SITE_PAGES,
  getAdminSitePages,
  type SitePage,
} from "@/lib/site-pages";

export const dynamic = "force-dynamic";

function PageStat({
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

function PageCard({ page }: { page: SitePage }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-4 flex size-11 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
            <FileText aria-hidden="true" className="size-5" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
            /{page.slug}
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-normal text-slate-950">
            {page.navLabel}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {page.title}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
            page.isPublished
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-slate-100 text-slate-600 ring-slate-200"
          }`}
        >
          {page.isPublished ? "Published" : "Hidden"}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/admin/pages/${page.slug}`}
          className="inline-flex items-center gap-2 rounded-md bg-[#19c653] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861]"
        >
          Edit content
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <Link
          href={`/${page.slug}`}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[#19c653]/45 hover:bg-[#f1fff6]"
        >
          View page
        </Link>
      </div>
    </article>
  );
}

export default async function AdminPagesPage() {
  const access = await getAdminAccess("/admin/pages");

  if (!access.ok) {
    return (
      <AdminSetupNotice title={access.title}>
        {access.description}
      </AdminSetupNotice>
    );
  }

  let pages: SitePage[] = [];
  let schemaError = "";

  try {
    pages = await getAdminSitePages();
  } catch (error) {
    schemaError =
      error instanceof Error
        ? error.message
        : "The site_pages table could not be loaded.";
    pages = DEFAULT_SITE_PAGES;
  }

  const publishedCount = pages.filter((page) => page.isPublished).length;

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <AdminHeroShell
        eyebrow="Page content"
        title="Edit the public website pages."
        summary="Manage the copy for Features, Pricing, About, Resources, and Contact from the owner console."
      >
        <section className="grid gap-4 sm:grid-cols-2">
          <PageStat title="Pages" value={pages.length || 5} detail="Main nav pages" />
          <PageStat
            title="Published"
            value={publishedCount || 0}
            detail="Visible to visitors"
          />
        </section>
      </AdminHeroShell>

      <section className="bg-white px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          {schemaError && (
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <span className="font-bold">Database setup needed:</span>{" "}
              Run the latest <code>supabase/roundhq_tenant_schema.sql</code> in
              Supabase so the <code>site_pages</code> table exists. The public
              pages will use built-in default content until then.
              <div className="mt-2 text-xs text-amber-800">{schemaError}</div>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            {pages.map((page) => (
              <PageCard key={page.slug} page={page} />
            ))}
          </div>

          {!schemaError && (
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <BadgeCheck aria-hidden="true" className="size-4 text-[#168b43]" />
              Changes are stored in Supabase and reflected on the public pages.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
