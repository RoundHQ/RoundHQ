import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminEmails } from "@/lib/admin/access";
import {
  getAdminCustomerProfile,
  getAdminCustomerWorkspaces,
  type AdminCustomerProfile,
  type AdminCustomerWorkspace,
} from "@/lib/admin/customers";
import {
  getPlatformEmailSettings,
  isPlatformEmailConfigured,
  sendPlatformEmail,
} from "@/lib/admin/email-settings";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";

export const SUPPORT_STATUSES = [
  "open",
  "waiting_on_us",
  "waiting_on_customer",
  "resolved",
  "closed",
] as const;

export const SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const SUPPORT_CATEGORIES = [
  "general",
  "billing",
  "bug",
  "feature_request",
  "account_access",
] as const;

export type SupportTicketStatus = (typeof SUPPORT_STATUSES)[number];
export type SupportPriority = string;
export type SupportCategory = string;
export type SupportAuthorType = "customer" | "admin";

export type SupportCategoryOption = {
  id: string;
  label: string;
  slug: SupportCategory;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SupportPriorityOption = {
  id: string;
  label: string;
  slug: SupportPriority;
  description: string;
  responseTargetHours: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SupportDeskSettings = {
  defaultAssignedAdminEmail: string;
  notifyAdminEmails: string;
  autoAcknowledgeEnabled: boolean;
  autoAcknowledgeSubject: string;
  autoAcknowledgeMessage: string;
  maxAttachmentMb: number;
  updatedAt: string | null;
};

export type SupportDeskSettingsData = {
  categories: SupportCategoryOption[];
  priorities: SupportPriorityOption[];
  settings: SupportDeskSettings;
  schemaError: string;
};

export type SupportTicket = {
  id: string;
  organizationId: string;
  createdByUserId: string | null;
  customerName: string;
  customerEmail: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportTicketStatus;
  assignedAdminEmail: string;
  lastCustomerReplyAt: string | null;
  lastAdminReplyAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  organizationId: string;
  authorType: SupportAuthorType;
  authorEmail: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
};

export type SupportAttachment = {
  id: string;
  ticketId: string;
  messageId: string | null;
  organizationId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageBucket: string;
  storagePath: string;
  fileUrl: string;
  signedUrl: string;
  createdAt: string;
};

export type SupportCannedReply = {
  id: string;
  title: string;
  category: SupportCategory;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminHelpdeskTicket = SupportTicket & {
  workspace: AdminCustomerWorkspace | null;
  messageCount: number;
  attachmentCount: number;
};

export type CustomerSupportData = {
  workspaceName: string;
  tickets: SupportTicket[];
  selectedTicket: SupportTicket | null;
  messages: SupportMessage[];
  attachments: SupportAttachment[];
  schemaError: string;
};

export type AdminHelpdeskData = {
  tickets: AdminHelpdeskTicket[];
  cannedReplies: SupportCannedReply[];
  stats: {
    open: number;
    waitingOnUs: number;
    urgent: number;
    resolved: number;
  };
  schemaError: string;
};

export type AdminHelpdeskNotificationSummary = {
  attentionCount: number;
  newTicketCount: number;
  latestTickets: SupportTicket[];
  schemaError: string;
};

export type AdminTicketDetail = {
  ticket: SupportTicket;
  messages: SupportMessage[];
  attachments: SupportAttachment[];
  cannedReplies: SupportCannedReply[];
  customerProfile: AdminCustomerProfile | null;
};

type SupportTicketRow = {
  id: string;
  organization_id: string;
  created_by_user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  subject: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  assigned_admin_email: string | null;
  last_customer_reply_at: string | null;
  last_admin_reply_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type SupportMessageRow = {
  id: string;
  ticket_id: string;
  organization_id: string;
  author_type: string | null;
  author_email: string | null;
  body: string | null;
  is_internal: boolean | null;
  created_at: string;
};

type SupportAttachmentRow = {
  id: string;
  ticket_id: string;
  message_id: string | null;
  organization_id: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  storage_bucket: string | null;
  storage_path: string | null;
  file_url: string | null;
  created_at: string;
};

type SupportCannedReplyRow = {
  id: string;
  title: string | null;
  category: string | null;
  body: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
};

type SupportCategoryRow = {
  id: string;
  label: string | null;
  slug: string | null;
  description?: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

type SupportPriorityRow = {
  id: string;
  label: string | null;
  slug: string | null;
  description?: string | null;
  response_target_hours?: number | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

type SupportSettingsRow = {
  default_assigned_admin_email: string | null;
  notify_admin_emails: string | null;
  auto_acknowledge_enabled: boolean | null;
  auto_acknowledge_subject: string | null;
  auto_acknowledge_message: string | null;
  max_attachment_mb: number | null;
  updated_at: string | null;
};

type CountRow = {
  ticket_id: string;
};

const SUPPORT_ATTACHMENTS_BUCKET = "support-attachments";
const SUPPORT_TICKET_SELECT =
  "id, organization_id, created_by_user_id, customer_name, customer_email, subject, category, priority, status, assigned_admin_email, last_customer_reply_at, last_admin_reply_at, resolved_at, created_at, updated_at";
const SUPPORT_MESSAGE_SELECT =
  "id, ticket_id, organization_id, author_type, author_email, body, is_internal, created_at";
const SUPPORT_ATTACHMENT_SELECT =
  "id, ticket_id, message_id, organization_id, file_name, file_type, file_size, storage_bucket, storage_path, file_url, created_at";
const SUPPORT_CANNED_REPLY_SELECT =
  "id, title, category, body, is_active, created_at, updated_at";
const SUPPORT_CATEGORY_SELECT =
  "id, label, slug, description, is_active, sort_order, created_at, updated_at";
const SUPPORT_PRIORITY_SELECT =
  "id, label, slug, description, response_target_hours, is_active, sort_order, created_at, updated_at";
const SUPPORT_SETTINGS_SELECT =
  "default_assigned_admin_email, notify_admin_emails, auto_acknowledge_enabled, auto_acknowledge_subject, auto_acknowledge_message, max_attachment_mb, updated_at";

export const DEFAULT_SUPPORT_AUTO_ACKNOWLEDGE_SUBJECT =
  "We received your RoundHQ support request";

export const DEFAULT_SUPPORT_AUTO_ACKNOWLEDGE_MESSAGE = [
  "Hi {{customerName}},",
  "",
  "Thanks for contacting RoundHQ support. We have received your ticket and will reply as soon as possible.",
  "",
  "Ticket: {{ticketSubject}}",
  "",
  "Kind regards,",
  "RoundHQ Support",
].join("\n");

const DEFAULT_SUPPORT_CATEGORY_OPTIONS: SupportCategoryOption[] =
  SUPPORT_CATEGORIES.map((slug, index) => ({
    id: slug,
    slug,
    label: formatDefaultLabel(slug),
    description: "",
    isActive: true,
    sortOrder: (index + 1) * 10,
    createdAt: "",
    updatedAt: "",
  }));

const DEFAULT_SUPPORT_PRIORITY_OPTIONS: SupportPriorityOption[] = [
  {
    id: "low",
    slug: "low",
    label: "Low",
    description: "Useful but not time-sensitive.",
    responseTargetHours: 72,
    isActive: true,
    sortOrder: 10,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "normal",
    slug: "normal",
    label: "Normal",
    description: "Standard support request.",
    responseTargetHours: 24,
    isActive: true,
    sortOrder: 20,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "high",
    slug: "high",
    label: "High",
    description: "Important issue affecting day-to-day use.",
    responseTargetHours: 8,
    isActive: true,
    sortOrder: 30,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "urgent",
    slug: "urgent",
    label: "Urgent",
    description: "Critical access, billing, or service issue.",
    responseTargetHours: 4,
    isActive: true,
    sortOrder: 40,
    createdAt: "",
    updatedAt: "",
  },
];

function formatDefaultLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeSlug(value: string | null | undefined, fallback: string) {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ -]+/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return normalized || fallback;
}

function normalizeStatus(value: string | null | undefined): SupportTicketStatus {
  return SUPPORT_STATUSES.includes(value as SupportTicketStatus)
    ? (value as SupportTicketStatus)
    : "open";
}

function normalizePriority(value: string | null | undefined): SupportPriority {
  return normalizeSlug(value, "normal");
}

function normalizeCategory(value: string | null | undefined): SupportCategory {
  return normalizeSlug(value, "general");
}

function mapTicket(row: SupportTicketRow): SupportTicket {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdByUserId: row.created_by_user_id,
    customerName: row.customer_name?.trim() || "Customer",
    customerEmail: row.customer_email?.trim() || "",
    subject: row.subject?.trim() || "Support request",
    category: normalizeCategory(row.category),
    priority: normalizePriority(row.priority),
    status: normalizeStatus(row.status),
    assignedAdminEmail: row.assigned_admin_email?.trim() || "",
    lastCustomerReplyAt: row.last_customer_reply_at,
    lastAdminReplyAt: row.last_admin_reply_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: SupportMessageRow): SupportMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    organizationId: row.organization_id,
    authorType: row.author_type === "admin" ? "admin" : "customer",
    authorEmail: row.author_email?.trim() || "unknown",
    body: row.body?.trim() || "",
    isInternal: Boolean(row.is_internal),
    createdAt: row.created_at,
  };
}

function mapAttachment(row: SupportAttachmentRow): SupportAttachment {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    messageId: row.message_id,
    organizationId: row.organization_id,
    fileName: row.file_name?.trim() || "Attachment",
    fileType: row.file_type?.trim() || "application/octet-stream",
    fileSize: Number(row.file_size ?? 0),
    storageBucket: row.storage_bucket?.trim() || SUPPORT_ATTACHMENTS_BUCKET,
    storagePath: row.storage_path?.trim() || "",
    fileUrl: row.file_url?.trim() || "",
    signedUrl: "",
    createdAt: row.created_at,
  };
}

function mapCannedReply(row: SupportCannedReplyRow): SupportCannedReply {
  return {
    id: row.id,
    title: row.title?.trim() || "Saved reply",
    category: normalizeCategory(row.category),
    body: row.body?.trim() || "",
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCategory(row: SupportCategoryRow): SupportCategoryOption {
  const slug = normalizeCategory(row.slug);

  return {
    id: row.id,
    label: row.label?.trim() || formatDefaultLabel(slug),
    slug,
    description: row.description?.trim() || "",
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPriority(row: SupportPriorityRow): SupportPriorityOption {
  const slug = normalizePriority(row.slug);

  return {
    id: row.id,
    label: row.label?.trim() || formatDefaultLabel(slug),
    slug,
    description: row.description?.trim() || "",
    responseTargetHours: Number(row.response_target_hours ?? 24),
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getDefaultSupportDeskSettings(
  overrides: Partial<SupportDeskSettings> = {}
): SupportDeskSettings {
  return {
    defaultAssignedAdminEmail: "",
    notifyAdminEmails: "",
    autoAcknowledgeEnabled: true,
    autoAcknowledgeSubject: DEFAULT_SUPPORT_AUTO_ACKNOWLEDGE_SUBJECT,
    autoAcknowledgeMessage: DEFAULT_SUPPORT_AUTO_ACKNOWLEDGE_MESSAGE,
    maxAttachmentMb: 8,
    updatedAt: null,
    ...overrides,
  };
}

function mapSupportSettings(
  row: SupportSettingsRow | null
): SupportDeskSettings {
  if (!row) {
    return getDefaultSupportDeskSettings();
  }

  return getDefaultSupportDeskSettings({
    defaultAssignedAdminEmail: row.default_assigned_admin_email?.trim() || "",
    notifyAdminEmails: row.notify_admin_emails?.trim() || "",
    autoAcknowledgeEnabled: row.auto_acknowledge_enabled !== false,
    autoAcknowledgeSubject:
      row.auto_acknowledge_subject?.trim() ||
      DEFAULT_SUPPORT_AUTO_ACKNOWLEDGE_SUBJECT,
    autoAcknowledgeMessage:
      row.auto_acknowledge_message?.trim() ||
      DEFAULT_SUPPORT_AUTO_ACKNOWLEDGE_MESSAGE,
    maxAttachmentMb: Number(row.max_attachment_mb ?? 8),
    updatedAt: row.updated_at,
  });
}

export function getActiveSupportCategories(categories: SupportCategoryOption[]) {
  return categories.filter((category) => category.isActive);
}

export function getActiveSupportPriorities(priorities: SupportPriorityOption[]) {
  return priorities.filter((priority) => priority.isActive);
}

export async function getSupportDeskSettingsData(): Promise<SupportDeskSettingsData> {
  const { supabase, error } = getServiceRoleClientOrError();

  if (!supabase || error) {
    return {
      categories: DEFAULT_SUPPORT_CATEGORY_OPTIONS,
      priorities: DEFAULT_SUPPORT_PRIORITY_OPTIONS,
      settings: getDefaultSupportDeskSettings(),
      schemaError: error,
    };
  }

  const [categoriesResult, prioritiesResult, settingsResult] = await Promise.all([
    supabase
      .from("support_categories")
      .select(SUPPORT_CATEGORY_SELECT)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true }),
    supabase
      .from("support_priorities")
      .select(SUPPORT_PRIORITY_SELECT)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true }),
    supabase
      .from("support_settings")
      .select(SUPPORT_SETTINGS_SELECT)
      .eq("id", "primary")
      .maybeSingle(),
  ]);

  if (categoriesResult.error || prioritiesResult.error || settingsResult.error) {
    return {
      categories: DEFAULT_SUPPORT_CATEGORY_OPTIONS,
      priorities: DEFAULT_SUPPORT_PRIORITY_OPTIONS,
      settings: getDefaultSupportDeskSettings(),
      schemaError:
        categoriesResult.error?.message ||
        prioritiesResult.error?.message ||
        settingsResult.error?.message ||
        "",
    };
  }

  const categories = ((categoriesResult.data ?? []) as SupportCategoryRow[]).map(
    mapCategory
  );
  const priorities = ((prioritiesResult.data ?? []) as SupportPriorityRow[]).map(
    mapPriority
  );

  return {
    categories: categories.length > 0 ? categories : DEFAULT_SUPPORT_CATEGORY_OPTIONS,
    priorities:
      priorities.length > 0 ? priorities : DEFAULT_SUPPORT_PRIORITY_OPTIONS,
    settings: mapSupportSettings(settingsResult.data as SupportSettingsRow | null),
    schemaError: "",
  };
}

export async function getSupportDeskSettings() {
  return (await getSupportDeskSettingsData()).settings;
}

function getServiceRoleClientOrError() {
  if (!isSupabaseServiceRoleConfigured()) {
    return {
      supabase: null,
      error:
        "Supabase service role credentials are required before using the helpdesk.",
    };
  }

  return { supabase: createServiceRoleClient(), error: "" };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unknown error";
}

async function getSignedAttachments(
  supabase: SupabaseClient,
  attachments: SupportAttachment[]
) {
  return Promise.all(
    attachments.map(async (attachment) => {
      if (!attachment.storagePath) {
        return attachment;
      }

      const { data } = await supabase.storage
        .from(attachment.storageBucket)
        .createSignedUrl(attachment.storagePath, 60 * 60);

      return {
        ...attachment,
        signedUrl: data?.signedUrl ?? "",
      };
    })
  );
}

async function ensureSupportAttachmentsBucket(
  supabase: SupabaseClient,
  maxAttachmentMb: number
) {
  const { data: buckets } = await supabase.storage.listBuckets();

  if (buckets?.some((bucket) => bucket.name === SUPPORT_ATTACHMENTS_BUCKET)) {
    await supabase.storage.updateBucket(SUPPORT_ATTACHMENTS_BUCKET, {
      public: false,
      fileSizeLimit: `${maxAttachmentMb}MB`,
    });
    return;
  }

  await supabase.storage.createBucket(SUPPORT_ATTACHMENTS_BUCKET, {
    public: false,
    fileSizeLimit: `${maxAttachmentMb}MB`,
  });
}

function sanitizeFileName(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120) || "attachment"
  );
}

export async function uploadSupportAttachments(options: {
  organizationId: string;
  ticketId: string;
  messageId: string;
  files: File[];
}) {
  const { supabase, error } = getServiceRoleClientOrError();

  if (!supabase || error) {
    return [];
  }

  const settings = await getSupportDeskSettings();
  const maxAttachmentBytes =
    Math.max(1, settings.maxAttachmentMb) * 1024 * 1024;

  await ensureSupportAttachmentsBucket(supabase, settings.maxAttachmentMb);

  const uploadedRows = [];

  for (const file of options.files) {
    if (!file.size) {
      continue;
    }

    if (file.size > maxAttachmentBytes) {
      throw new Error(
        `${file.name || "Attachment"} is larger than the ${settings.maxAttachmentMb}MB support attachment limit.`
      );
    }

    const safeName = sanitizeFileName(file.name);
    const storagePath = `${options.organizationId}/${options.ticketId}/${options.messageId}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(SUPPORT_ATTACHMENTS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    uploadedRows.push({
      ticket_id: options.ticketId,
      message_id: options.messageId,
      organization_id: options.organizationId,
      file_name: file.name || safeName,
      file_type: file.type || "application/octet-stream",
      file_size: file.size,
      storage_bucket: SUPPORT_ATTACHMENTS_BUCKET,
      storage_path: storagePath,
    });
  }

  if (uploadedRows.length === 0) {
    return [];
  }

  const { data, error: insertError } = await supabase
    .from("support_attachments")
    .insert(uploadedRows)
    .select(SUPPORT_ATTACHMENT_SELECT);

  if (insertError) {
    throw new Error(insertError.message);
  }

  return (data ?? []).map((row) => mapAttachment(row as SupportAttachmentRow));
}

export async function getCustomerSupportData(options: {
  organizationId: string;
  workspaceName: string;
  selectedTicketId?: string;
}): Promise<CustomerSupportData> {
  const { supabase, error } = getServiceRoleClientOrError();

  if (!supabase || error) {
    return {
      workspaceName: options.workspaceName,
      tickets: [],
      selectedTicket: null,
      messages: [],
      attachments: [],
      schemaError: error,
    };
  }

  const ticketsResult = await supabase
    .from("support_tickets")
    .select(SUPPORT_TICKET_SELECT)
    .eq("organization_id", options.organizationId)
    .order("updated_at", { ascending: false });

  if (ticketsResult.error) {
    return {
      workspaceName: options.workspaceName,
      tickets: [],
      selectedTicket: null,
      messages: [],
      attachments: [],
      schemaError: ticketsResult.error.message,
    };
  }

  let tickets = ((ticketsResult.data ?? []) as SupportTicketRow[]).map(mapTicket);
  let selectedTicket =
    tickets.find((ticket) => ticket.id === options.selectedTicketId) ?? null;

  if (!selectedTicket && options.selectedTicketId) {
    const selectedTicketResult = await supabase
      .from("support_tickets")
      .select(SUPPORT_TICKET_SELECT)
      .eq("organization_id", options.organizationId)
      .eq("id", options.selectedTicketId)
      .maybeSingle();

    if (selectedTicketResult.data && !selectedTicketResult.error) {
      selectedTicket = mapTicket(selectedTicketResult.data as SupportTicketRow);
      tickets = [
        selectedTicket,
        ...tickets.filter((ticket) => ticket.id !== selectedTicket?.id),
      ];
    }
  }

  selectedTicket = selectedTicket ?? tickets[0] ?? null;

  if (!selectedTicket) {
    return {
      workspaceName: options.workspaceName,
      tickets,
      selectedTicket: null,
      messages: [],
      attachments: [],
      schemaError: "",
    };
  }

  const [messagesResult, attachmentsResult] = await Promise.all([
    supabase
      .from("support_messages")
      .select(SUPPORT_MESSAGE_SELECT)
      .eq("ticket_id", selectedTicket.id)
      .eq("is_internal", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("support_attachments")
      .select(SUPPORT_ATTACHMENT_SELECT)
      .eq("ticket_id", selectedTicket.id)
      .order("created_at", { ascending: true }),
  ]);

  if (messagesResult.error || attachmentsResult.error) {
    return {
      workspaceName: options.workspaceName,
      tickets,
      selectedTicket,
      messages: [],
      attachments: [],
      schemaError:
        messagesResult.error?.message || attachmentsResult.error?.message || "",
    };
  }

  const attachments = await getSignedAttachments(
    supabase,
    ((attachmentsResult.data ?? []) as SupportAttachmentRow[]).map(mapAttachment)
  );

  return {
    workspaceName: options.workspaceName,
    tickets,
    selectedTicket,
    messages: ((messagesResult.data ?? []) as SupportMessageRow[]).map(mapMessage),
    attachments,
    schemaError: "",
  };
}

export async function getAdminHelpdeskData(filters: {
  query?: string;
  status?: string;
  priority?: string;
}): Promise<AdminHelpdeskData> {
  const { supabase, error } = getServiceRoleClientOrError();

  if (!supabase || error) {
    return {
      tickets: [],
      cannedReplies: [],
      stats: { open: 0, waitingOnUs: 0, urgent: 0, resolved: 0 },
      schemaError: error,
    };
  }

  const [ticketsResult, messagesResult, attachmentsResult, cannedResult, workspaces] =
    await Promise.all([
      supabase
        .from("support_tickets")
        .select(SUPPORT_TICKET_SELECT)
        .order("updated_at", { ascending: false }),
      supabase.from("support_messages").select("ticket_id"),
      supabase.from("support_attachments").select("ticket_id"),
      supabase
        .from("support_canned_replies")
        .select(SUPPORT_CANNED_REPLY_SELECT)
        .order("title", { ascending: true }),
      getAdminCustomerWorkspaces().catch(() => ({ workspaces: [] })),
    ]);

  if (ticketsResult.error) {
    return {
      tickets: [],
      cannedReplies: [],
      stats: { open: 0, waitingOnUs: 0, urgent: 0, resolved: 0 },
      schemaError: ticketsResult.error.message,
    };
  }

  const messageCounts = new Map<string, number>();
  const attachmentCounts = new Map<string, number>();

  if (!messagesResult.error) {
    ((messagesResult.data ?? []) as CountRow[]).forEach((row) => {
      messageCounts.set(row.ticket_id, (messageCounts.get(row.ticket_id) ?? 0) + 1);
    });
  }

  if (!attachmentsResult.error) {
    ((attachmentsResult.data ?? []) as CountRow[]).forEach((row) => {
      attachmentCounts.set(
        row.ticket_id,
        (attachmentCounts.get(row.ticket_id) ?? 0) + 1
      );
    });
  }

  const workspaceMap = new Map(
    ((workspaces as { workspaces?: AdminCustomerWorkspace[] }).workspaces ?? []).map(
      (workspace) => [workspace.id, workspace]
    )
  );
  const query = filters.query?.trim().toLowerCase() ?? "";
  const status = normalizeStatus(filters.status);
  const priority = normalizePriority(filters.priority);

  const allTickets = ((ticketsResult.data ?? []) as SupportTicketRow[]).map(mapTicket);
  const filteredTickets = allTickets.filter((ticket) => {
    const workspace = workspaceMap.get(ticket.organizationId);
    const matchesStatus = !filters.status || filters.status === "all" || ticket.status === status;
    const matchesPriority =
      !filters.priority || filters.priority === "all" || ticket.priority === priority;
    const haystack = [
      ticket.subject,
      ticket.customerName,
      ticket.customerEmail,
      ticket.category,
      ticket.priority,
      ticket.status,
      ticket.assignedAdminEmail,
      workspace?.name,
      workspace?.ownerEmail,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesStatus && matchesPriority && (!query || haystack.includes(query));
  });

  const tickets = filteredTickets.map((ticket) => ({
    ...ticket,
    workspace: workspaceMap.get(ticket.organizationId) ?? null,
    messageCount: messageCounts.get(ticket.id) ?? 0,
    attachmentCount: attachmentCounts.get(ticket.id) ?? 0,
  }));

  return {
    tickets,
    cannedReplies: cannedResult.error
      ? []
      : ((cannedResult.data ?? []) as SupportCannedReplyRow[]).map(mapCannedReply),
    stats: {
      open: allTickets.filter((ticket) => ticket.status === "open").length,
      waitingOnUs: allTickets.filter((ticket) => ticket.status === "waiting_on_us")
        .length,
      urgent: allTickets.filter((ticket) => ticket.priority === "urgent").length,
      resolved: allTickets.filter((ticket) => ticket.status === "resolved").length,
    },
    schemaError: "",
  };
}

export async function getAdminHelpdeskNotificationSummary(): Promise<AdminHelpdeskNotificationSummary> {
  const { supabase, error } = getServiceRoleClientOrError();

  if (!supabase || error) {
    return {
      attentionCount: 0,
      newTicketCount: 0,
      latestTickets: [],
      schemaError: error,
    };
  }

  const [latestResult, newTicketCountResult] = await Promise.all([
    supabase
      .from("support_tickets")
      .select(SUPPORT_TICKET_SELECT, { count: "exact" })
      .in("status", ["open", "waiting_on_us"])
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "waiting_on_us"])
      .is("last_admin_reply_at", null),
  ]);

  if (latestResult.error) {
    return {
      attentionCount: 0,
      newTicketCount: 0,
      latestTickets: [],
      schemaError: latestResult.error.message,
    };
  }

  return {
    attentionCount: latestResult.count ?? latestResult.data?.length ?? 0,
    newTicketCount: newTicketCountResult.error
      ? 0
      : (newTicketCountResult.count ?? 0),
    latestTickets: ((latestResult.data ?? []) as SupportTicketRow[]).map(mapTicket),
    schemaError: "",
  };
}

export async function getAdminTicketDetail(
  ticketId: string
): Promise<AdminTicketDetail | null> {
  const { supabase, error } = getServiceRoleClientOrError();

  if (!supabase || error) {
    throw new Error(error);
  }

  const ticketResult = await supabase
    .from("support_tickets")
    .select(SUPPORT_TICKET_SELECT)
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketResult.error) {
    throw new Error(ticketResult.error.message);
  }

  if (!ticketResult.data) {
    return null;
  }

  const ticket = mapTicket(ticketResult.data as SupportTicketRow);
  const [messagesResult, attachmentsResult, cannedResult, customerProfile] =
    await Promise.all([
      supabase
        .from("support_messages")
        .select(SUPPORT_MESSAGE_SELECT)
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("support_attachments")
        .select(SUPPORT_ATTACHMENT_SELECT)
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("support_canned_replies")
        .select(SUPPORT_CANNED_REPLY_SELECT)
        .eq("is_active", true)
        .order("title", { ascending: true }),
      getAdminCustomerProfile(ticket.organizationId),
    ]);

  if (messagesResult.error || attachmentsResult.error || cannedResult.error) {
    throw new Error(
      messagesResult.error?.message ||
        attachmentsResult.error?.message ||
        cannedResult.error?.message ||
        "Unable to load support ticket"
    );
  }

  const attachments = await getSignedAttachments(
    supabase,
    ((attachmentsResult.data ?? []) as SupportAttachmentRow[]).map(mapAttachment)
  );

  return {
    ticket,
    messages: ((messagesResult.data ?? []) as SupportMessageRow[]).map(mapMessage),
    attachments,
    cannedReplies: ((cannedResult.data ?? []) as SupportCannedReplyRow[]).map(
      mapCannedReply
    ),
    customerProfile,
  };
}

export async function notifySupportAdmins(options: {
  subject: string;
  message: string;
}) {
  const supportSettings = await getSupportDeskSettings();
  const configuredSupportEmails = supportSettings.notifyAdminEmails
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  const adminEmails =
    configuredSupportEmails.length > 0 ? configuredSupportEmails : getAdminEmails();

  if (adminEmails.length === 0) {
    return;
  }

  const settings = await getPlatformEmailSettings();

  if (!isPlatformEmailConfigured(settings)) {
    return;
  }

  await Promise.allSettled(
    adminEmails.map((email) =>
      sendPlatformEmail({
        settings,
        to: email,
        subject: options.subject,
        message: options.message,
      })
    )
  );
}

export function renderSupportTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>
) {
  return Object.entries(values).reduce((body, [key, value]) => {
    const normalized = value == null ? "" : String(value);
    return body.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), normalized);
  }, template);
}

export async function notifySupportCustomer(options: {
  to: string;
  subject: string;
  message: string;
}) {
  if (!options.to.trim()) {
    return;
  }

  const settings = await getPlatformEmailSettings();

  if (!isPlatformEmailConfigured(settings)) {
    return;
  }

  await sendPlatformEmail({
    settings,
    to: options.to,
    subject: options.subject,
    message: options.message,
  }).catch((error) => {
    console.error("Unable to send support customer email:", getErrorMessage(error));
  });
}
