"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  notifySupportCustomer,
  uploadSupportAttachments,
  type SupportCategory,
  type SupportPriority,
  type SupportTicketStatus,
} from "@/lib/support/helpdesk";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getFiles(formData: FormData) {
  return formData
    .getAll("attachments")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

function getTicketIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("ticket_id")
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            entry
          )
        )
    )
  );
}

function getStatus(value: string): SupportTicketStatus {
  if (
    value === "waiting_on_us" ||
    value === "waiting_on_customer" ||
    value === "resolved" ||
    value === "closed"
  ) {
    return value;
  }

  return "open";
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

async function getTicket(ticketId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, organization_id, subject, customer_email, customer_name, status")
    .eq("id", ticketId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || "Support ticket not found.");
  }

  return data as {
    id: string;
    organization_id: string;
    subject: string | null;
    customer_email: string | null;
    customer_name: string | null;
    status: string | null;
  };
}

export async function updateAdminTicketAction(formData: FormData) {
  await requireAdminAccess("/admin/helpdesk");

  const ticketId = getText(formData, "ticket_id");
  const status = getStatus(getText(formData, "status"));
  const priority = getPriority(getText(formData, "priority"));
  const category = getCategory(getText(formData, "category"));
  const assignedAdminEmail = getText(formData, "assigned_admin_email");

  if (!ticketId) {
    redirect("/admin/helpdesk");
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("support_tickets")
    .update({
      status,
      priority,
      category,
      assigned_admin_email: assignedAdminEmail || null,
      resolved_at: status === "resolved" || status === "closed" ? now : null,
      updated_at: now,
    })
    .eq("id", ticketId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/helpdesk");
  redirect(`/admin/helpdesk/${ticketId}?saved=1`);
}

export async function addAdminTicketReplyAction(formData: FormData) {
  const access = await requireAdminAccess("/admin/helpdesk");
  const ticketId = getText(formData, "ticket_id");
  const cannedReplyId = getText(formData, "canned_reply_id");
  const isInternal = formData.get("is_internal") === "on";

  if (!ticketId) {
    redirect("/admin/helpdesk");
  }

  const supabase = createServiceRoleClient();
  const ticket = await getTicket(ticketId);
  let body = getText(formData, "body");

  if (!body && cannedReplyId) {
    const { data: cannedReply } = await supabase
      .from("support_canned_replies")
      .select("body")
      .eq("id", cannedReplyId)
      .maybeSingle();

    body =
      typeof cannedReply?.body === "string" ? cannedReply.body.trim() : "";
  }

  if (!body) {
    redirect(`/admin/helpdesk/${ticketId}?error=missing`);
  }

  const { data: messageRows, error: messageError } = await supabase
    .from("support_messages")
    .insert({
      ticket_id: ticketId,
      organization_id: ticket.organization_id,
      author_type: "admin",
      author_email: access.userEmail,
      body,
      is_internal: isInternal,
    })
    .select("id")
    .limit(1);

  if (messageError || !messageRows?.[0]?.id) {
    throw new Error(messageError?.message || "Unable to add support reply.");
  }

  const now = new Date().toISOString();
  await supabase
    .from("support_tickets")
    .update(
      isInternal
        ? {
            updated_at: now,
          }
        : {
            status: "waiting_on_customer",
            last_admin_reply_at: now,
            updated_at: now,
          }
    )
    .eq("id", ticketId);

  await uploadSupportAttachments({
    organizationId: ticket.organization_id,
    ticketId,
    messageId: String(messageRows[0].id),
    files: getFiles(formData),
  });

  if (!isInternal) {
    await notifySupportCustomer({
      to: ticket.customer_email ?? "",
      subject: `RoundHQ support reply: ${ticket.subject ?? "Support ticket"}`,
      message: [
        `Hi ${ticket.customer_name || "there"},`,
        "",
        body,
        "",
        "You can reply from your RoundHQ support page:",
        "/support",
      ].join("\n"),
    });
  }

  revalidatePath("/admin/helpdesk");
  redirect(`/admin/helpdesk/${ticketId}?sent=1`);
}

export async function createCannedReplyAction(formData: FormData) {
  await requireAdminAccess("/admin/helpdesk");

  const title = getText(formData, "title");
  const body = getText(formData, "body");
  const category = getCategory(getText(formData, "category"));

  if (!title || !body) {
    redirect("/admin/helpdesk?error=missing_reply");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("support_canned_replies").insert({
    title,
    body,
    category,
    is_active: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/helpdesk");
  redirect("/admin/helpdesk?reply=1");
}

export async function toggleCannedReplyAction(formData: FormData) {
  await requireAdminAccess("/admin/helpdesk");

  const replyId = getText(formData, "reply_id");
  const isActive = formData.get("is_active") === "on";

  if (!replyId) {
    redirect("/admin/helpdesk");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("support_canned_replies")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", replyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/helpdesk");
  redirect("/admin/helpdesk?reply=1");
}

export async function deleteAdminTicketsAction(formData: FormData) {
  await requireAdminAccess("/admin/helpdesk");

  const ticketIds = getTicketIds(formData);

  if (ticketIds.length === 0) {
    redirect("/admin/helpdesk?error=missing_delete");
  }

  const supabase = createServiceRoleClient();
  const { data: attachmentRows, error: attachmentError } = await supabase
    .from("support_attachments")
    .select("storage_bucket, storage_path")
    .in("ticket_id", ticketIds);

  if (attachmentError) {
    throw new Error(attachmentError.message);
  }

  const attachmentsByBucket = new Map<string, string[]>();

  (attachmentRows ?? []).forEach((row) => {
    const bucket =
      typeof row.storage_bucket === "string" && row.storage_bucket.trim()
        ? row.storage_bucket.trim()
        : "support-attachments";
    const storagePath =
      typeof row.storage_path === "string" ? row.storage_path.trim() : "";

    if (!storagePath) {
      return;
    }

    attachmentsByBucket.set(bucket, [
      ...(attachmentsByBucket.get(bucket) ?? []),
      storagePath,
    ]);
  });

  await Promise.allSettled(
    Array.from(attachmentsByBucket.entries()).map(([bucket, paths]) =>
      supabase.storage.from(bucket).remove(paths)
    )
  );

  const { error: deleteError } = await supabase
    .from("support_tickets")
    .delete()
    .in("id", ticketIds);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/helpdesk");
  ticketIds.forEach((ticketId) => revalidatePath(`/admin/helpdesk/${ticketId}`));

  redirect(`/admin/helpdesk?deleted=${ticketIds.length}`);
}
