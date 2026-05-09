import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Eye, FileText } from "lucide-react";
import {
  AdminHeroShell,
  AdminSetupNotice,
} from "@/components/admin/admin-page-chrome";
import { getAdminAccess } from "@/lib/admin/guard";
import {
  getAdminSitePage,
  getDefaultSitePage,
  isSitePageSlug,
  type SitePage,
} from "@/lib/site-pages";
import { updateSitePageAction } from "./actions";

export const dynamic = "force-dynamic";

type EditPageParams = {
  slug: string;
};

type EditPageSearchParams = {
  saved?: string;
};

function TextInput({
  label,
  name,
  defaultValue,
  type = "text",
  required = true,
}: {
  label: string;
  name: string;
  defaultValue: string | number;
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
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        required
        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
      />
    </label>
  );
}

function PagePreview({ page }: { page: SitePage }) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
      <div className="mb-5 flex size-12 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
        <Eye aria-hidden="true" className="size-6" />
      </div>
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
        Live preview
      </p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-normal text-slate-950">
        {page.title}
      </h2>
      <p className="mt-4 text-sm leading-6 text-slate-600">{page.summary}</p>
      <ul className="mt-6 space-y-3">
        {page.highlights.map((highlight) => (
          <li key={highlight} className="flex gap-3 text-sm leading-6 text-slate-700">
            <BadgeCheck
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-[#18b74f]"
            />
            {highlight}
          </li>
        ))}
      </ul>
      <Link
        href={`/${page.slug}`}
        className="mt-7 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[#19c653]/45 hover:bg-[#f1fff6]"
      >
        View public page
      </Link>
    </aside>
  );
}

export default async function EditSitePage({
  params,
  searchParams,
}: {
  params: Promise<EditPageParams>;
  searchParams?: Promise<EditPageSearchParams>;
}) {
  const { slug } = await params;

  if (!isSitePageSlug(slug)) {
    notFound();
  }

  const access = await getAdminAccess(`/admin/pages/${slug}`);

  if (!access.ok) {
    return (
      <AdminSetupNotice title={access.title}>
        {access.description}
      </AdminSetupNotice>
    );
  }

  let page = getDefaultSitePage(slug);
  let schemaError = "";

  try {
    page = await getAdminSitePage(slug);
  } catch (error) {
    schemaError =
      error instanceof Error
        ? error.message
        : "The site_pages table could not be loaded.";
  }

  const saved = (await searchParams)?.saved === "1";
  const updateAction = updateSitePageAction.bind(null, slug);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <AdminHeroShell
        eyebrow="Edit page"
        title={`Edit ${page.navLabel}.`}
        summary="Update public website copy, calls to action, page status, and navigation labels from one place."
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
                /{page.slug}
              </p>
            </div>
          </div>
        </section>
      </AdminHeroShell>

      <section className="bg-white px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
            {saved && (
              <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                Page content saved.
              </div>
            )}

            {schemaError && (
              <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                <span className="font-bold">Database setup needed:</span>{" "}
                Run the latest <code>supabase/roundhq_tenant_schema.sql</code>{" "}
                in Supabase before saving page edits.
                <div className="mt-2 text-xs text-amber-800">{schemaError}</div>
              </div>
            )}

            <form action={updateAction} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <TextInput
                  label="Navigation label"
                  name="nav_label"
                  defaultValue={page.navLabel}
                />
                <TextInput
                  label="Sort order"
                  name="sort_order"
                  type="number"
                  defaultValue={page.sortOrder}
                />
              </div>

              <TextInput
                label="Eyebrow"
                name="eyebrow"
                defaultValue={page.eyebrow}
              />
              <TextInput label="Page title" name="title" defaultValue={page.title} />
              <TextArea
                label="Summary"
                name="summary"
                defaultValue={page.summary}
                rows={3}
              />
              <TextArea label="Body" name="body" defaultValue={page.body} rows={8} />
              <TextArea
                label="Highlights, one per line"
                name="highlights"
                defaultValue={page.highlights.join("\n")}
                rows={5}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <TextInput
                  label="Primary button label"
                  name="primary_cta_label"
                  defaultValue={page.primaryCtaLabel}
                />
                <TextInput
                  label="Primary button URL"
                  name="primary_cta_href"
                  defaultValue={page.primaryCtaHref}
                />
              </div>

              <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  name="is_published"
                  defaultChecked={page.isPublished}
                  className="size-4 accent-[#19c653]"
                />
                Published in the public navigation
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={Boolean(schemaError)}
                  className="inline-flex items-center justify-center rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save page content
                </button>
                <Link
                  href="/admin/pages"
                  className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-[#19c653]/45 hover:bg-[#f1fff6]"
                >
                  Back to pages
                </Link>
              </div>
            </form>
          </section>

          <PagePreview page={page} />
        </div>
      </section>
    </main>
  );
}
