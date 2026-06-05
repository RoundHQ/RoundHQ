import type {
  CustomerLead,
  CustomerLeadActivity,
  CustomerLeadExtractedData,
  CustomerLeadReply,
} from "@/components/jobs/types";
import {
  normalizeCustomerLeadPreferredContact,
  normalizeCustomerLeadSource,
  normalizeCustomerLeadStatus,
} from "@/lib/customer-leads";

export const CUSTOMER_LEAD_SELECT_FIELDS = [
  "id",
  "source",
  "status",
  "name",
  "email",
  "phone",
  "address",
  "town",
  "postcode",
  "customer_type",
  "service",
  "preferred_contact",
  "message",
  "notes",
  "extracted_data",
  "raw_payload",
  "reply_history",
  "activity_history",
  "submitted_at",
  "created_at",
  "updated_at",
  "converted_customer_id",
].join(",");

export type CustomerLeadRow = {
  id: string;
  source: string | null;
  status: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  town: string | null;
  postcode: string | null;
  customer_type: string | null;
  service: string | null;
  preferred_contact: string | null;
  message: string | null;
  notes: string | null;
  extracted_data: CustomerLeadExtractedData | null;
  raw_payload: Record<string, unknown> | null;
  reply_history: CustomerLeadReply[] | null;
  activity_history: CustomerLeadActivity[] | null;
  submitted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  converted_customer_id: number | null;
};

export type CustomerLeadWriteRow = {
  id: string;
  source: CustomerLead["source"];
  status: CustomerLead["status"];
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  town: string | null;
  postcode: string | null;
  customer_type: CustomerLead["customerType"] | null;
  service: string | null;
  preferred_contact: CustomerLead["preferredContact"] | null;
  message: string;
  notes: string | null;
  extracted_data: CustomerLeadExtractedData;
  raw_payload: Record<string, unknown>;
  reply_history: CustomerLeadReply[];
  activity_history: CustomerLeadActivity[];
  submitted_at: string;
  converted_customer_id: number | null;
};

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getPayloadTextValues(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmedValue = value.trim();
    return trimmedValue ? [trimmedValue] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(getPayloadTextValues);
  }

  return [];
}

function getFirstPayloadText(
  payload: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  if (!payload) {
    return undefined;
  }

  for (const key of keys) {
    const value = getPayloadTextValues(payload[key])[0];

    if (value) {
      return value;
    }
  }

  return undefined;
}

function normalizeLeadCustomerType(value: string | null | undefined) {
  return value === "Commercial" || value === "Residential" ? value : undefined;
}

function normalizeMediaUrls(value: string[] | null | undefined) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const mediaUrls = Array.from(
    new Map(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
        .map((entry) => [entry.toLowerCase(), entry])
    ).values()
  );

  return mediaUrls.length > 0 ? mediaUrls : undefined;
}

function normalizeExtractedData(
  value: CustomerLeadExtractedData | null | undefined
): CustomerLeadExtractedData {
  if (!value || typeof value !== "object") {
    return {};
  }

  return {
    name: normalizeOptionalText(value.name),
    email: normalizeOptionalText(value.email),
    phone: normalizeOptionalText(value.phone),
    address: normalizeOptionalText(value.address),
    town: normalizeOptionalText(value.town),
    postcode: normalizeOptionalText(value.postcode),
    customerType: normalizeLeadCustomerType(value.customerType),
    service: normalizeOptionalText(value.service),
    notes: normalizeOptionalText(value.notes),
    mediaUrls: normalizeMediaUrls(value.mediaUrls),
    confidence:
      typeof value.confidence === "number" && Number.isFinite(value.confidence)
        ? Math.min(1, Math.max(0, value.confidence))
        : undefined,
  };
}

function normalizeReplyHistory(value: CustomerLeadReply[] | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry): entry is CustomerLeadReply =>
        Boolean(
          entry &&
            typeof entry.id === "string" &&
            typeof entry.sentAt === "string" &&
            typeof entry.recipient === "string" &&
            typeof entry.subject === "string" &&
            typeof entry.message === "string"
        )
    )
    .sort((left, right) => right.sentAt.localeCompare(left.sentAt));
}

function normalizeActivityMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return { ...(value as Record<string, unknown>) };
}

function normalizeActivityHistory(
  value: CustomerLeadActivity[] | null | undefined
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry): entry is CustomerLeadActivity =>
        Boolean(
          entry &&
            typeof entry.id === "string" &&
            typeof entry.type === "string" &&
            typeof entry.occurredAt === "string" &&
            typeof entry.title === "string"
        )
    )
    .map((entry) => ({
      id: entry.id,
      type: entry.type,
      occurredAt: entry.occurredAt,
      title: entry.title,
      detail:
        typeof entry.detail === "string" && entry.detail.trim()
          ? entry.detail.trim()
          : undefined,
      relatedId:
        typeof entry.relatedId === "string" && entry.relatedId.trim()
          ? entry.relatedId.trim()
          : undefined,
      metadata: normalizeActivityMetadata(entry.metadata),
    }))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

export function mapCustomerLeadRowToLead(row: CustomerLeadRow): CustomerLead {
  const extractedData = normalizeExtractedData(row.extracted_data);
  const message =
    normalizeOptionalText(row.message) ??
    getFirstPayloadText(row.raw_payload, [
      "jobDescription",
      "job-description",
      "job",
      "message",
      "your-message",
      "notes",
      "details",
      "enquiry",
    ]) ??
    "";

  return {
    id: row.id,
    source: normalizeCustomerLeadSource(row.source),
    status: normalizeCustomerLeadStatus(row.status),
    name: normalizeOptionalText(row.name) ?? extractedData.name,
    email: normalizeOptionalText(row.email) ?? extractedData.email,
    phone: normalizeOptionalText(row.phone) ?? extractedData.phone,
    address: normalizeOptionalText(row.address) ?? extractedData.address,
    town: normalizeOptionalText(row.town) ?? extractedData.town,
    postcode: normalizeOptionalText(row.postcode) ?? extractedData.postcode,
    customerType:
      normalizeLeadCustomerType(row.customer_type) ?? extractedData.customerType,
    service: normalizeOptionalText(row.service) ?? extractedData.service,
    preferredContact: normalizeCustomerLeadPreferredContact(
      row.preferred_contact
    ),
    message,
    notes: normalizeOptionalText(row.notes),
    extractedData,
    rawPayload: row.raw_payload ?? undefined,
    replyHistory: normalizeReplyHistory(row.reply_history),
    activityHistory: normalizeActivityHistory(row.activity_history),
    submittedAt:
      row.submitted_at ?? row.created_at ?? new Date().toISOString(),
    createdAt: row.created_at ?? row.submitted_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? undefined,
    convertedCustomerId: row.converted_customer_id,
  };
}

export function mapCustomerLeadToWriteRow(
  lead: CustomerLead
): CustomerLeadWriteRow {
  return {
    id: lead.id,
    source: lead.source,
    status: lead.status,
    name: lead.name?.trim() || null,
    email: lead.email?.trim() || null,
    phone: lead.phone?.trim() || null,
    address: lead.address?.trim() || null,
    town: lead.town?.trim() || null,
    postcode: lead.postcode?.trim() || null,
    customer_type: lead.customerType ?? null,
    service: lead.service?.trim() || null,
    preferred_contact: lead.preferredContact ?? null,
    message: lead.message.trim(),
    notes: lead.notes?.trim() || null,
    extracted_data: lead.extractedData,
    raw_payload: lead.rawPayload ?? {},
    reply_history: lead.replyHistory,
    activity_history: lead.activityHistory,
    submitted_at: lead.submittedAt,
    converted_customer_id: lead.convertedCustomerId ?? null,
  };
}

export function sortCustomerLeads(leads: CustomerLead[]) {
  return [...leads].sort((left, right) =>
    right.submittedAt.localeCompare(left.submittedAt)
  );
}
