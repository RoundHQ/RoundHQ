import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  FileUp,
  LifeBuoy,
  Mail,
  Paperclip,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import {
  getCustomerSupportData,
  getActiveSupportCategories,
  getActiveSupportPriorities,
  getSupportDeskSettingsData,
  type SupportAttachment,
  type SupportTicketStatus,
} from "@/lib/support/helpdesk";
import {
  addCustomerTicketReplyAction,
  createCustomerTicketAction,
} from "./actions";

export const dynamic = "force-dynamic";

type SupportSearchParams = {
  ticket?: string;
  created?: string;
  sent?: string;
  error?: string;
};

function formatStatus(value: SupportTicketStatus) {
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

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAttachmentLabel(attachment: SupportAttachment) {
  if (!attachment.fileSize) {
    return attachment.fileName;
  }

  const kilobytes = Math.max(1, Math.round(attachment.fileSize / 1024));
  return `${attachment.fileName} (${kilobytes} KB)`;
}

function AttachmentList({
  attachments,
}: {
  attachments: SupportAttachment[];
}) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.signedUrl || attachment.fileUrl || "#"}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <Paperclip aria-hidden="true" className="size-3.5" />
          {getAttachmentLabel(attachment)}
        </a>
      ))}
    </div>
  );
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<SupportSearchParams>;
}) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    redirect("/login?setup=supabase");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/support");
  }

  const organizationId = await ensureWorkspace(supabase, user);
  const { data: organizationRows } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .limit(1);
  const workspaceName =
    typeof organizationRows?.[0]?.name === "string" &&
    organizationRows[0].name.trim()
      ? organizationRows[0].name.trim()
      : "RoundHQ Workspace";
  const params = (await searchParams) ?? {};
  const [support, supportSettings] = await Promise.all([
    getCustomerSupportData({
      organizationId,
      workspaceName,
      selectedTicketId: params.ticket,
    }),
    getSupportDeskSettingsData(),
  ]);
  const categoryOptions = getActiveSupportCategories(supportSettings.categories);
  const priorityOptions = getActiveSupportPriorities(supportSettings.priorities);
  const attachmentsByMessage = new Map<string, SupportAttachment[]>();

  support.attachments.forEach((attachment) => {
    if (!attachment.messageId) {
      return;
    }

    attachmentsByMessage.set(attachment.messageId, [
      ...(attachmentsByMessage.get(attachment.messageId) ?? []),
      attachment,
    ]);
  });

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-[#001d1f] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#001d1f_0%,#012e31_52%,#001112_100%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />

        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="block shrink-0" aria-label="RoundHQ home">
              <Image
                src="/roundhq-logo-long-white.png"
                alt="RoundHQ"
                width={1200}
                height={300}
                priority
                className="h-auto w-[210px] sm:w-[235px]"
              />
            </Link>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md border border-white/12 px-4 py-2 text-sm font-bold text-white/88 transition hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Dashboard
              </Link>
              <Link
                href="/billing"
                className="inline-flex items-center gap-2 rounded-md border border-white/12 px-4 py-2 text-sm font-bold text-white/88 transition hover:bg-white/10 hover:text-white"
              >
                Billing
              </Link>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <section>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#20d85a]">
                Customer support
              </p>
              <h1 className="mt-5 max-w-3xl text-5xl font-extrabold leading-[1.08] tracking-normal text-white sm:text-6xl">
                Help for {support.workspaceName}.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
                Open a support ticket, send files, and keep the full
                conversation in one place.
              </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                  Open
                </p>
                <p className="mt-3 text-4xl font-extrabold">
                  {
                    support.tickets.filter(
                      (ticket) =>
                        ticket.status !== "resolved" && ticket.status !== "closed"
                    ).length
                  }
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                  Waiting
                </p>
                <p className="mt-3 text-4xl font-extrabold">
                  {
                    support.tickets.filter(
                      (ticket) => ticket.status === "waiting_on_customer"
                    ).length
                  }
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
                  Total
                </p>
                <p className="mt-3 text-4xl font-extrabold">
                  {support.tickets.length}
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-6">
            {support.schemaError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                <span className="font-bold">Database setup needed:</span> run{" "}
                <code>supabase/helpdesk_schema.sql</code> in Supabase SQL
                Editor.
                <div className="mt-2 text-xs">{support.schemaError}</div>
              </div>
            ) : null}

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-2">
                <LifeBuoy aria-hidden="true" className="size-5 text-[#168b43]" />
                <h2 className="text-lg font-extrabold tracking-normal">
                  New ticket
                </h2>
              </div>

              <form
                action={createCustomerTicketAction}
                encType="multipart/form-data"
                className="mt-5 space-y-4"
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Subject
                  </span>
                  <input
                    name="subject"
                    required
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                    placeholder="What can we help with?"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Category
                    </span>
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
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Priority
                    </span>
                    <select
                      name="priority"
                      defaultValue="normal"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                    >
                      {priorityOptions.map((priority) => (
                        <option key={priority.slug} value={priority.slug}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Message
                  </span>
                  <textarea
                    name="body"
                    required
                    rows={6}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                    placeholder="Add the details, steps, or question here."
                  />
                </label>

                <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <FileUp aria-hidden="true" className="size-4" />
                    Attach files
                  </span>
                  <input
                    name="attachments"
                    type="file"
                    multiple
                    className="mt-3 block w-full text-sm text-slate-600"
                  />
                </label>

                <button
                  type="submit"
                  disabled={Boolean(support.schemaError)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send aria-hidden="true" className="size-4" />
                  Send ticket
                </button>
              </form>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
              <h2 className="text-lg font-extrabold tracking-normal">Tickets</h2>
              <div className="mt-4 space-y-3">
                {support.tickets.length > 0 ? (
                  support.tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/support?ticket=${ticket.id}`}
                      className={`block rounded-md border p-4 transition ${
                        support.selectedTicket?.id === ticket.id
                          ? "border-[#19c653] bg-[#f2fbf5]"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-slate-950">{ticket.subject}</p>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-bold capitalize ring-1 ${getStatusClasses(
                            ticket.status
                          )}`}
                        >
                          {formatStatus(ticket.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {ticket.category.replace(/_/g, " ")} - {ticket.priority}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Updated {formatDate(ticket.updatedAt)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-slate-500">
                    No tickets yet. Create one above and the conversation will
                    appear here.
                  </p>
                )}
              </div>
            </section>
          </aside>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
            {params.created === "1" ? (
              <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                Ticket created. We have been notified.
              </div>
            ) : null}
            {params.sent === "1" ? (
              <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                Reply sent.
              </div>
            ) : null}

            {support.selectedTicket ? (
              <>
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#168b43]">
                      Ticket
                    </p>
                    <h2 className="mt-2 text-3xl font-extrabold tracking-normal">
                      {support.selectedTicket.subject}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${getStatusClasses(
                          support.selectedTicket.status
                        )}`}
                      >
                        {formatStatus(support.selectedTicket.status)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-600">
                        {support.selectedTicket.category.replace(/_/g, " ")}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-600">
                        {support.selectedTicket.priority}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    <p className="flex items-center gap-2">
                      <Clock aria-hidden="true" className="size-4" />
                      Created {formatDate(support.selectedTicket.createdAt)}
                    </p>
                    <p className="mt-1 flex items-center gap-2">
                      <Mail aria-hidden="true" className="size-4" />
                      {support.selectedTicket.customerEmail || user.email}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {support.messages.map((message) => {
                    const isCustomer = message.authorType === "customer";

                    return (
                      <article
                        key={message.id}
                        className={`rounded-lg border p-5 ${
                          isCustomer
                            ? "border-slate-200 bg-slate-50"
                            : "border-emerald-200 bg-emerald-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-slate-950">
                            {isCustomer ? "You" : "RoundHQ support"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(message.createdAt)}
                          </p>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                          {message.body}
                        </p>
                        <AttachmentList
                          attachments={attachmentsByMessage.get(message.id) ?? []}
                        />
                      </article>
                    );
                  })}
                </div>

                <form
                  action={addCustomerTicketReplyAction}
                  encType="multipart/form-data"
                  className="mt-8 rounded-lg border border-slate-200 bg-white p-5"
                >
                  <input
                    type="hidden"
                    name="ticket_id"
                    value={support.selectedTicket.id}
                  />
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Reply
                    </span>
                    <textarea
                      name="body"
                      required
                      rows={6}
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                      placeholder="Add a reply..."
                    />
                  </label>
                  <label className="mt-4 block rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <FileUp aria-hidden="true" className="size-4" />
                      Attach files
                    </span>
                    <input
                      name="attachments"
                      type="file"
                      multiple
                      className="mt-3 block w-full text-sm text-slate-600"
                    />
                  </label>
                  <button
                    type="submit"
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    <Send aria-hidden="true" className="size-4" />
                    Send reply
                  </button>
                </form>
              </>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <LifeBuoy aria-hidden="true" className="size-10 text-[#168b43]" />
                <h2 className="mt-4 text-2xl font-extrabold tracking-normal">
                  No ticket selected
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                  Create your first ticket or select an existing one to see the
                  conversation.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
