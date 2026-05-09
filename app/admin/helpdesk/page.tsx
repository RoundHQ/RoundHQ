import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  LifeBuoy,
  MessageSquare,
  Paperclip,
  Search,
  Siren,
} from "lucide-react";
import {
  AdminHeroShell,
  AdminSetupNotice,
} from "@/components/admin/admin-page-chrome";
import { getAdminAccess } from "@/lib/admin/guard";
import {
  getAdminHelpdeskData,
  SUPPORT_STATUSES,
  getActiveSupportCategories,
  getActiveSupportPriorities,
  getSupportDeskSettingsData,
  type SupportPriority,
  type SupportTicketStatus,
} from "@/lib/support/helpdesk";
import {
  createCannedReplyAction,
  toggleCannedReplyAction,
} from "./actions";

export const dynamic = "force-dynamic";

type AdminHelpdeskSearchParams = {
  q?: string;
  status?: string;
  priority?: string;
  reply?: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function getStatusClasses(value: SupportTicketStatus) {
  if (value === "resolved" || value === "closed") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  if (value === "waiting_on_us") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }

  if (value === "waiting_on_customer") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function getPriorityClasses(value: SupportPriority) {
  if (value === "urgent") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (value === "high") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function StatTile({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: number;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-4xl font-extrabold tracking-normal">{value}</p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-md bg-[#e7f9ed] text-[#168b43]">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

export default async function AdminHelpdeskPage({
  searchParams,
}: {
  searchParams?: Promise<AdminHelpdeskSearchParams>;
}) {
  const access = await getAdminAccess("/admin/helpdesk");

  if (!access.ok) {
    return (
      <AdminSetupNotice title={access.title}>
        {access.description}
      </AdminSetupNotice>
    );
  }

  const params = (await searchParams) ?? {};
  const [data, supportSettings] = await Promise.all([
    getAdminHelpdeskData({
      query: params.q,
      status: params.status,
      priority: params.priority,
    }),
    getSupportDeskSettingsData(),
  ]);
  const categoryOptions = getActiveSupportCategories(supportSettings.categories);
  const priorityOptions = getActiveSupportPriorities(supportSettings.priorities);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <AdminHeroShell
        eyebrow="Support inbox"
        title="RoundHQ helpdesk."
        summary="Handle support tickets, view customer context, use canned replies, and keep every customer conversation in one place."
      >
        <section className="grid gap-4 sm:grid-cols-2">
          <StatTile
            title="Open"
            value={data.stats.open}
            detail="Tickets currently open"
            icon={<LifeBuoy aria-hidden="true" className="size-5" />}
          />
          <StatTile
            title="Waiting"
            value={data.stats.waitingOnUs}
            detail="Tickets waiting on RoundHQ"
            icon={<Clock aria-hidden="true" className="size-5" />}
          />
          <StatTile
            title="Urgent"
            value={data.stats.urgent}
            detail="Highest priority support requests"
            icon={<Siren aria-hidden="true" className="size-5" />}
          />
          <StatTile
            title="Resolved"
            value={data.stats.resolved}
            detail="Resolved customer conversations"
            icon={<CheckCircle2 aria-hidden="true" className="size-5" />}
          />
        </section>
      </AdminHeroShell>

      <section className="px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            {data.schemaError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                <span className="font-bold">Database setup needed:</span> run{" "}
                <code>supabase/helpdesk_schema.sql</code> in Supabase SQL
                Editor.
                <div className="mt-2 text-xs">{data.schemaError}</div>
              </div>
            ) : null}

            <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
              <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px_auto]">
                <label className="relative block">
                  <Search
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    name="q"
                    defaultValue={params.q}
                    placeholder="Search tickets, customers, workspaces..."
                    className="w-full rounded-md border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                  />
                </label>

                <select
                  name="status"
                  defaultValue={params.status ?? "all"}
                  className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                >
                  <option value="all">All statuses</option>
                  {SUPPORT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>

                <select
                  name="priority"
                  defaultValue={params.priority ?? "all"}
                  className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                >
                  <option value="all">All priorities</option>
                  {priorityOptions.map((priority) => (
                    <option key={priority.slug} value={priority.slug}>
                      {priority.label}
                    </option>
                  ))}
                </select>

                <button className="rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
                  Filter
                </button>
              </div>
            </form>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-xl font-extrabold tracking-normal">
                  Tickets
                </h2>
              </div>

              {data.tickets.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {data.tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/admin/helpdesk/${ticket.id}`}
                      className="block px-5 py-5 transition hover:bg-slate-50"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${getStatusClasses(
                                ticket.status
                              )}`}
                            >
                              {formatLabel(ticket.status)}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${getPriorityClasses(
                                ticket.priority
                              )}`}
                            >
                              {ticket.priority}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-600">
                              {formatLabel(ticket.category)}
                            </span>
                          </div>
                          <h3 className="mt-3 text-lg font-extrabold tracking-normal">
                            {ticket.subject}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {ticket.workspace?.name ?? "Unknown workspace"} -{" "}
                            {ticket.customerEmail || ticket.workspace?.ownerEmail}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare
                              aria-hidden="true"
                              className="size-4"
                            />
                            {ticket.messageCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Paperclip aria-hidden="true" className="size-4" />
                            {ticket.attachmentCount}
                          </span>
                          <span>Updated {formatDate(ticket.updatedAt)}</span>
                          <ArrowRight
                            aria-hidden="true"
                            className="size-4 text-slate-400"
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
                  <AlertCircle aria-hidden="true" className="size-10 text-slate-300" />
                  <h2 className="mt-4 text-xl font-extrabold tracking-normal">
                    No tickets found
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    New customer tickets will appear here as soon as they are
                    created.
                  </p>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
              <h2 className="text-lg font-extrabold tracking-normal">
                Add canned reply
              </h2>
              <form action={createCannedReplyAction} className="mt-5 space-y-4">
                <input
                  name="title"
                  required
                  placeholder="Reply title"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                />
                <select
                  name="category"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                >
                  {categoryOptions.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <textarea
                  name="body"
                  required
                  rows={6}
                  placeholder="Saved response..."
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                />
                <button className="w-full rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861]">
                  Save reply
                </button>
              </form>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
              <h2 className="text-lg font-extrabold tracking-normal">
                Canned replies
              </h2>
              <div className="mt-4 space-y-3">
                {data.cannedReplies.length > 0 ? (
                  data.cannedReplies.map((reply) => (
                    <form
                      key={reply.id}
                      action={toggleCannedReplyAction}
                      className="rounded-md border border-slate-200 bg-slate-50 p-3"
                    >
                      <input type="hidden" name="reply_id" value={reply.id} />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-950">
                            {reply.title}
                          </p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                            {formatLabel(reply.category)}
                          </p>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <input
                            name="is_active"
                            type="checkbox"
                            defaultChecked={reply.isActive}
                            className="size-4 accent-[#19c653]"
                          />
                          Active
                        </label>
                      </div>
                      <button className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                        Update
                      </button>
                    </form>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-slate-500">
                    Add your first saved response above.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
