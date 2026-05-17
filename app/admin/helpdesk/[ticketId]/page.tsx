import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  FileUp,
  Mail,
  MessageSquare,
  Paperclip,
  Send,
  Trash2,
  User,
} from "lucide-react";
import {
  AdminHeroShell,
  AdminSetupNotice,
} from "@/components/admin/admin-page-chrome";
import { getAdminAccess } from "@/lib/admin/guard";
import {
  getAdminTicketDetail,
  SUPPORT_STATUSES,
  getActiveSupportCategories,
  getActiveSupportPriorities,
  getSupportDeskSettingsData,
  type SupportAttachment,
  type SupportTicketStatus,
} from "@/lib/support/helpdesk";
import {
  addAdminTicketReplyAction,
  deleteAdminTicketsAction,
  updateAdminTicketAction,
} from "../actions";

export const dynamic = "force-dynamic";

type TicketPageParams = {
  ticketId: string;
};

type TicketSearchParams = {
  saved?: string;
  sent?: string;
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export default async function AdminHelpdeskTicketPage({
  params,
  searchParams,
}: {
  params: Promise<TicketPageParams>;
  searchParams?: Promise<TicketSearchParams>;
}) {
  const access = await getAdminAccess("/admin/helpdesk");

  if (!access.ok) {
    return (
      <AdminSetupNotice title={access.title}>
        {access.description}
      </AdminSetupNotice>
    );
  }

  const { ticketId } = await params;
  const pageParams = (await searchParams) ?? {};
  const [detail, supportSettings] = await Promise.all([
    getAdminTicketDetail(ticketId),
    getSupportDeskSettingsData(),
  ]);

  if (!detail) {
    notFound();
  }

  const attachmentsByMessage = new Map<string, SupportAttachment[]>();

  detail.attachments.forEach((attachment) => {
    if (!attachment.messageId) {
      return;
    }

    attachmentsByMessage.set(attachment.messageId, [
      ...(attachmentsByMessage.get(attachment.messageId) ?? []),
      attachment,
    ]);
  });

  const profile = detail.customerProfile;
  const categoryOptions = getActiveSupportCategories(supportSettings.categories);
  const priorityOptions = getActiveSupportPriorities(supportSettings.priorities);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <AdminHeroShell
        eyebrow="Support ticket"
        title={detail.ticket.subject}
        summary={`${detail.ticket.customerEmail || "Customer"} - ${formatLabel(
          detail.ticket.category
        )} - ${formatLabel(detail.ticket.priority)} priority.`}
      >
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
              Status
            </p>
            <span
              className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-bold capitalize ring-1 ${getStatusClasses(
                detail.ticket.status
              )}`}
            >
              {formatLabel(detail.ticket.status)}
            </span>
            <p className="mt-4 text-sm text-slate-600">
              Updated {formatDate(detail.ticket.updatedAt)}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
              Assigned
            </p>
            <p className="mt-3 text-xl font-extrabold tracking-normal">
              {detail.ticket.assignedAdminEmail || "Unassigned"}
            </p>
            <p className="mt-4 text-sm text-slate-600">
              Created {formatDate(detail.ticket.createdAt)}
            </p>
          </div>
        </section>
      </AdminHeroShell>

      <section className="px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-6">
            <Link
              href="/admin/helpdesk"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to tickets
            </Link>

            {pageParams.saved === "1" ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                Ticket updated.
              </div>
            ) : null}
            {pageParams.sent === "1" ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                Reply added.
              </div>
            ) : null}
            {pageParams.error === "missing" ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                Add a message or choose a canned reply before sending.
              </div>
            ) : null}

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
              <div className="flex items-center gap-2">
                <MessageSquare
                  aria-hidden="true"
                  className="size-5 text-[#168b43]"
                />
                <h2 className="text-xl font-extrabold tracking-normal">
                  Conversation
                </h2>
              </div>

              <div className="mt-6 space-y-4">
                {detail.messages.map((message) => {
                  const isAdmin = message.authorType === "admin";
                  const isInternal = message.isInternal;

                  return (
                    <article
                      key={message.id}
                      className={`rounded-lg border p-5 ${
                        isInternal
                          ? "border-amber-200 bg-amber-50"
                          : isAdmin
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-950">
                            {isInternal
                              ? "Internal note"
                              : isAdmin
                                ? "RoundHQ support"
                                : detail.ticket.customerName || "Customer"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {message.authorEmail}
                          </p>
                        </div>
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
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-8">
              <h2 className="text-xl font-extrabold tracking-normal">
                Reply
              </h2>
              <form
                action={addAdminTicketReplyAction}
                className="mt-6 space-y-5"
              >
                <input type="hidden" name="ticket_id" value={detail.ticket.id} />

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Canned reply
                  </span>
                  <select
                    name="canned_reply_id"
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                  >
                    <option value="">Write a custom reply</option>
                    {detail.cannedReplies.map((reply) => (
                      <option key={reply.id} value={reply.id}>
                        {reply.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Message
                  </span>
                  <textarea
                    name="body"
                    rows={7}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                    placeholder="Write a reply, or choose a canned reply above."
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

                <label className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                  <input
                    name="is_internal"
                    type="checkbox"
                    className="size-4 accent-amber-600"
                  />
                  Internal note only
                </label>

                <button className="inline-flex items-center justify-center gap-2 rounded-md bg-[#19c653] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(25,198,83,0.2)] transition hover:bg-[#22d861]">
                  <Send aria-hidden="true" className="size-4" />
                  Send reply
                </button>
              </form>
            </section>
          </section>

          <aside className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
              <h2 className="text-lg font-extrabold tracking-normal">
                Ticket settings
              </h2>
              <form action={updateAdminTicketAction} className="mt-5 space-y-4">
                <input type="hidden" name="ticket_id" value={detail.ticket.id} />

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Status
                  </span>
                  <select
                    name="status"
                    defaultValue={detail.ticket.status}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                  >
                    {SUPPORT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {formatLabel(status)}
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
                    defaultValue={detail.ticket.priority}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority.slug} value={priority.slug}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Category
                  </span>
                  <select
                    name="category"
                    defaultValue={detail.ticket.category}
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
                    Assigned admin email
                  </span>
                  <input
                    name="assigned_admin_email"
                    defaultValue={detail.ticket.assignedAdminEmail}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#19c653] focus:bg-white focus:ring-4 focus:ring-[#19c653]/12"
                  />
                </label>

                <button className="w-full rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
                  Save ticket
                </button>
              </form>
            </section>

            <section className="rounded-lg border border-rose-200 bg-rose-50 p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
              <h2 className="text-lg font-extrabold tracking-normal text-rose-950">
                Delete ticket
              </h2>
              <p className="mt-2 text-sm leading-6 text-rose-800">
                Remove this ticket, its conversation, and any stored attachment
                files.
              </p>
              <form action={deleteAdminTicketsAction} className="mt-4">
                <input type="hidden" name="ticket_id" value={detail.ticket.id} />
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-700">
                  <Trash2 aria-hidden="true" className="size-4" />
                  Delete this ticket
                </button>
              </form>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
              <h2 className="text-lg font-extrabold tracking-normal">
                Customer context
              </h2>
              <div className="mt-5 space-y-3 text-sm leading-6">
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="flex items-center gap-2 font-bold text-slate-950">
                    <Building2 aria-hidden="true" className="size-4" />
                    {profile?.workspace.name ?? "Unknown workspace"}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {profile?.workspace.slug ?? "No slug"}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="flex items-center gap-2 font-bold text-slate-950">
                    <User aria-hidden="true" className="size-4" />
                    {profile?.workspace.ownerName ?? detail.ticket.customerName}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-slate-500">
                    <Mail aria-hidden="true" className="size-4" />
                    {profile?.workspace.ownerEmail ?? detail.ticket.customerEmail}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="flex items-center gap-2 font-bold text-slate-950">
                    <CreditCard aria-hidden="true" className="size-4" />
                    {profile?.workspace.subscriptionStatus ?? "missing"}
                  </p>
                  <p className="mt-1 text-slate-500">
                    Account {profile?.workspace.accountStatus ?? "active"} -
                    support {profile?.workspace.supportPriority ?? "standard"}
                  </p>
                </div>
                {profile ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                        Customers
                      </p>
                      <p className="mt-2 text-2xl font-extrabold">
                        {profile.usage.appCustomers}
                      </p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                        Invoices
                      </p>
                      <p className="mt-2 text-2xl font-extrabold">
                        {profile.usage.invoices}
                      </p>
                    </div>
                  </div>
                ) : null}
                {profile ? (
                  <Link
                    href={`/admin/customers/${profile.workspace.id}`}
                    className="inline-flex w-full items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Open customer profile
                  </Link>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
