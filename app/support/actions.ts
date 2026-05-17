"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { ensureWorkspace } from "@/lib/workspace";
import {
  getSupportDeskSettings,
  notifySupportAdmins,
  notifySupportCustomer,
  renderSupportTemplate,
  uploadSupportAttachments,
  type SupportCategory,
  type SupportPriority,
} from "@/lib/support/helpdesk";

const SUPPORT_SUBMIT_SIDE_EFFECT_TIMEOUT_MS = 8000;

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getFiles(formData: FormData) {
  return formData
    .getAll("attachments")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

function getCategory(value: string): SupportCategory {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_ -]+/g, "")
      .replace(/[\s-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "general"
  );
}

function getPriority(value: string): SupportPriority {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_ -]+/g, "")
      .replace(/[\s-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "normal"
  );
}

function getOpenTicketRedirectUrl(
  ticketId: string,
  statusParam: "created" | "sent"
) {
  const params = new URLSearchParams({
    ticket: ticketId,
    [statusParam]: "1",
    opened: Date.now().toString(),
  });

  return `/support?${params.toString()}#ticket-conversation`;
}

function getAdminTicketUrl(ticketId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  const ticketPath = `/admin/helpdesk/${ticketId}`;

  return baseUrl ? `${baseUrl}${ticketPath}` : ticketPath;
}

function getActionErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function runSupportTaskInBackground(
  label: string,
  task: Promise<unknown> | (() => Promise<unknown>)
) {
  after(async () => {
    try {
      await (typeof task === "function" ? task() : task);
    } catch (error) {
      console.error(`${label} failed:`, getActionErrorMessage(error));
    }
  });
}

async function waitForSupportTaskOrContinue(
  label: string,
  promise: Promise<unknown>,
  timeoutMs = SUPPORT_SUBMIT_SIDE_EFFECT_TIMEOUT_MS
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const result = await Promise.race([
    promise
      .then(() => "completed" as const)
      .catch((error) => {
        console.error(`${label} failed:`, getActionErrorMessage(error));
        return "failed" as const;
      }),
    new Promise<"timed-out">((resolve) => {
      timeoutId = setTimeout(() => resolve("timed-out"), timeoutMs);
    }),
  ]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (result === "timed-out") {
    console.warn(`${label} timed out; continuing support ticket redirect.`);
    runSupportTaskInBackground(label, promise);
  }
}

async function getCurrentCustomerContext() {
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

  return {
    organizationId,
    workspaceName,
    userId: user.id,
    userEmail: user.email ?? "",
    userName:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "",
  };
}

export async function createCustomerTicketAction(formData: FormData) {
  const context = await getCurrentCustomerContext();
  const subject = getText(formData, "subject");
  const body = getText(formData, "body");
  const category = getCategory(getText(formData, "category"));
  const priority = getPriority(getText(formData, "priority"));
  const supportSettings = await getSupportDeskSettings();

  if (!subject || !body) {
    redirect("/support?error=missing");
  }

  const now = new Date().toISOString();
  const serviceSupabase = createServiceRoleClient();
  const { data: ticketRows, error: ticketError } = await serviceSupabase
    .from("support_tickets")
    .insert({
      organization_id: context.organizationId,
      created_by_user_id: context.userId,
      customer_name: context.userName || context.workspaceName,
      customer_email: context.userEmail,
      subject,
      category,
      priority,
      status: "waiting_on_us",
      assigned_admin_email:
        supportSettings.defaultAssignedAdminEmail.trim() || null,
      last_customer_reply_at: now,
      updated_at: now,
    })
    .select("id")
    .limit(1);

  if (ticketError || !ticketRows?.[0]?.id) {
    throw new Error(ticketError?.message || "Unable to create support ticket.");
  }

  const ticketId = String(ticketRows[0].id);
  const { data: messageRows, error: messageError } = await serviceSupabase
    .from("support_messages")
    .insert({
      ticket_id: ticketId,
      organization_id: context.organizationId,
      author_type: "customer",
      author_email: context.userEmail,
      body,
      is_internal: false,
    })
    .select("id")
    .limit(1);

  if (messageError || !messageRows?.[0]?.id) {
    throw new Error(messageError?.message || "Unable to add support message.");
  }

  const files = getFiles(formData);

  if (files.length > 0) {
    await waitForSupportTaskOrContinue(
      "Support attachment upload",
      uploadSupportAttachments({
        organizationId: context.organizationId,
        ticketId,
        messageId: String(messageRows[0].id),
        files,
      })
    );
  }

  runSupportTaskInBackground(
    "Support ticket notifications",
    () =>
      Promise.allSettled([
        notifySupportAdmins({
          subject: `New RoundHQ support ticket: ${subject}`,
          message: [
            `Workspace: ${context.workspaceName}`,
            `Customer: ${context.userEmail || "Unknown"}`,
            `Priority: ${priority}`,
            `Category: ${category.replace(/_/g, " ")}`,
            "",
            body,
            "",
            `Open in admin: ${getAdminTicketUrl(ticketId)}`,
          ].join("\n"),
        }),
        supportSettings.autoAcknowledgeEnabled
          ? notifySupportCustomer({
              to: context.userEmail,
              subject: renderSupportTemplate(
                supportSettings.autoAcknowledgeSubject,
                {
                  customerName: context.userName || context.workspaceName,
                  workspaceName: context.workspaceName,
                  ticketSubject: subject,
                  ticketId,
                }
              ),
              message: renderSupportTemplate(
                supportSettings.autoAcknowledgeMessage,
                {
                  customerName: context.userName || context.workspaceName,
                  workspaceName: context.workspaceName,
                  ticketSubject: subject,
                  ticketId,
                }
              ),
            })
          : Promise.resolve(),
      ])
  );

  revalidatePath("/support");
  revalidatePath("/admin");
  revalidatePath("/admin/helpdesk");
  redirect(getOpenTicketRedirectUrl(ticketId, "created"));
}

export async function addCustomerTicketReplyAction(formData: FormData) {
  const context = await getCurrentCustomerContext();
  const ticketId = getText(formData, "ticket_id");
  const body = getText(formData, "body");

  if (!ticketId || !body) {
    redirect("/support?error=missing");
  }

  const serviceSupabase = createServiceRoleClient();
  const { data: ticket, error: ticketError } = await serviceSupabase
    .from("support_tickets")
    .select("id, subject, organization_id")
    .eq("id", ticketId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (ticketError || !ticket) {
    throw new Error(ticketError?.message || "Support ticket not found.");
  }

  const { data: messageRows, error: messageError } = await serviceSupabase
    .from("support_messages")
    .insert({
      ticket_id: ticketId,
      organization_id: context.organizationId,
      author_type: "customer",
      author_email: context.userEmail,
      body,
      is_internal: false,
    })
    .select("id")
    .limit(1);

  if (messageError || !messageRows?.[0]?.id) {
    throw new Error(messageError?.message || "Unable to add support reply.");
  }

  const now = new Date().toISOString();
  await serviceSupabase
    .from("support_tickets")
    .update({
      status: "waiting_on_us",
      last_customer_reply_at: now,
      updated_at: now,
      resolved_at: null,
    })
    .eq("id", ticketId);

  const files = getFiles(formData);

  if (files.length > 0) {
    await waitForSupportTaskOrContinue(
      "Support reply attachment upload",
      uploadSupportAttachments({
        organizationId: context.organizationId,
        ticketId,
        messageId: String(messageRows[0].id),
        files,
      })
    );
  }

  runSupportTaskInBackground(
    "Support reply notification",
    () =>
      notifySupportAdmins({
        subject: `Customer replied: ${String(ticket.subject ?? "Support ticket")}`,
        message: [
          `Workspace: ${context.workspaceName}`,
          `Customer: ${context.userEmail || "Unknown"}`,
          "",
          body,
          "",
          `Open in admin: ${getAdminTicketUrl(ticketId)}`,
        ].join("\n"),
      })
  );

  revalidatePath("/support");
  revalidatePath("/admin");
  revalidatePath("/admin/helpdesk");
  revalidatePath(`/admin/helpdesk/${ticketId}`);
  redirect(getOpenTicketRedirectUrl(ticketId, "sent"));
}
