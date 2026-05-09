import type {
  CustomerLead,
  CustomerLeadCustomerDraft,
  CustomerLeadExtractedData,
  CustomerLeadPreferredContact,
  CustomerLeadSource,
  CustomerLeadStatus,
  CustomerType,
} from "@/components/jobs/types";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN =
  /(?:\+44\s?7\d{3}|\(?0\d{3,4}\)?)[\s.-]?\d{3}[\s.-]?\d{3,4}/;
const POSTCODE_PATTERN =
  /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i;

const SOURCE_OPTIONS: CustomerLeadSource[] = [
  "website",
  "email",
  "facebook",
  "whatsapp",
  "manual",
];

const STATUS_OPTIONS: CustomerLeadStatus[] = [
  "new",
  "reviewing",
  "replied",
  "converted",
  "archived",
];

const NAME_KEYS = [
  "name",
  "fullName",
  "full-name",
  "customerName",
  "customer-name",
  "your-name",
];
const EMAIL_KEYS = ["email", "emailAddress", "email-address", "your-email"];
const PHONE_KEYS = [
  "phone",
  "phoneNumber",
  "phone-number",
  "telephone",
  "mobile",
  "your-tel",
  "your-phone",
];
const ADDRESS_KEYS = [
  "address",
  "siteAddress",
  "site-address",
  "propertyAddress",
  "property-address",
  "your-address",
];
const TOWN_KEYS = ["town", "city", "your-town"];
const POSTCODE_KEYS = [
  "postcode",
  "postCode",
  "post-code",
  "zip",
  "your-postcode",
];
const CUSTOMER_TYPE_KEYS = [
  "customerType",
  "customer-type",
  "type",
  "typeOfService",
  "type-of-service",
  "servicetype",
  "your-type-of-service",
];
const SERVICE_KEYS = [
  "service",
  "serviceRequired",
  "service-required",
  "jobType",
  "job-type",
  "workRequired",
  "work-required",
  "your-subject",
  "your-service",
  "your-service-required",
];
const MESSAGE_KEYS = [
  "message",
  "notes",
  "details",
  "enquiry",
  "jobDescription",
  "job-description",
  "job",
  "description",
  "your-message",
  "your-job-description",
];
const MEDIA_KEYS = [
  "mediaUrls",
  "mediaUrl",
  "media",
  "attachments",
  "attachment",
  "photos",
  "photo",
  "videos",
  "video",
  "photosVideo",
  "photos-video",
  "photoVideo",
  "photo-video",
  "photos-video-of-service-requested",
  "file-attach",
  "your-photos-video",
  "your-photos",
  "your-video",
];

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizePayload(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      Array.isArray(entry)
        ? entry
            .map((item) => (typeof item === "string" ? item.trim() : item))
            .filter(Boolean)
        : typeof entry === "string"
          ? entry.trim()
          : entry,
    ])
  );
}

function getTextValues(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmedValue = value.trim();
    return trimmedValue ? [trimmedValue] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(getTextValues);
  }

  return [];
}

function getFirstText(
  payload: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    const value = getTextValues(payload[key])[0];

    if (value) {
      return value;
    }
  }

  return undefined;
}

function getTextList(payload: Record<string, unknown>, keys: string[]) {
  const values = keys.flatMap((key) =>
    getTextValues(payload[key]).flatMap((value) =>
      value
        .split(/[\n,;]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );

  return Array.from(new Map(values.map((value) => [value.toLowerCase(), value])).values());
}

function extractLabelledValue(text: string, labels: string[]) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const label of labels) {
    const pattern = new RegExp(`^${label}\\s*[:\\-]\\s*(.+)$`, "i");
    const matchedLine = lines.find((line) => pattern.test(line));
    const match = matchedLine?.match(pattern);

    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return undefined;
}

function inferNameFromMessage(text: string) {
  const labelledName = extractLabelledValue(text, [
    "name",
    "full name",
    "customer name",
  ]);

  if (labelledName) {
    return labelledName;
  }

  const introMatch = text.match(/\b(?:i am|i'm|im|this is)\s+([a-z][a-z' -]{1,50})/i);
  return introMatch?.[1]?.trim();
}

function inferAddressFromMessage(text: string, postcode?: string) {
  const labelledAddress = extractLabelledValue(text, [
    "address",
    "site address",
    "property address",
  ]);

  if (labelledAddress) {
    return labelledAddress;
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const streetWords =
    /\b(street|st|road|rd|avenue|ave|drive|dr|lane|ln|close|court|place|gardens|crescent|terrace|way|view|park)\b/i;
  const candidate = lines.find(
    (line) =>
      streetWords.test(line) ||
      (postcode && line.toLowerCase().includes(postcode.toLowerCase()))
  );

  return candidate;
}

function inferServiceFromMessage(text: string) {
  const labelledService = extractLabelledValue(text, [
    "service",
    "job",
    "work",
    "enquiry",
  ]);

  if (labelledService) {
    return labelledService;
  }

  const serviceMatches: Array<[RegExp, string]> = [
    [/\bgrass\b|\blawn\b|\bcut(?:ting)?\b/i, "Routine service"],
    [/\bhedge\b|\btrimming\b/i, "Hedge trimming"],
    [/\bstone\b|\bslab\b|\bpaving\b/i, "Stone laying"],
    [/\bturf\b/i, "Turf laying"],
    [/\bovergrown\b/i, "Overgrown garden"],
    [/\bpressure\b|\bjet wash/i, "Pressure washing"],
    [/\bpvc\b|\bupvc\b|\bfascia\b|\bsoffit\b/i, "PVC cleaning"],
    [/\bgutter\b/i, "Gutter cleaning"],
    [/\bgarden\b|\bmaintenance\b/i, "Garden maintenance"],
    [/\bquote\b|\bestimate\b/i, "Quote request"],
  ];

  return serviceMatches.find(([pattern]) => pattern.test(text))?.[1];
}

function normalizeCustomerType(value: unknown): CustomerType | undefined {
  const normalizedValue = getTextValues(value)[0]?.toLowerCase();

  if (!normalizedValue) {
    return undefined;
  }

  if (normalizedValue.includes("commercial")) return "Commercial";
  if (normalizedValue.includes("residential")) return "Residential";

  return undefined;
}

function normalizeService(value: unknown) {
  const normalizedValue = getTextValues(value)[0]?.trim();
  const lowerValue = normalizedValue?.toLowerCase() ?? "";

  if (!lowerValue) return undefined;
  if (lowerValue.includes("grass")) return "Routine service";
  if (lowerValue.includes("hedge")) return "Hedge trimming";
  if (lowerValue.includes("stone") || lowerValue.includes("slab")) return "Stone laying";
  if (lowerValue.includes("turf")) return "Turf laying";
  if (lowerValue.includes("overgrown")) return "Overgrown garden";
  if (lowerValue.includes("gutter")) return "Gutter cleaning";
  if (lowerValue.includes("pressure") || lowerValue.includes("jet")) return "Pressure washing";
  if (lowerValue.includes("pvc") || lowerValue.includes("upvc")) return "PVC cleaning";
  if (lowerValue.includes("other")) return "Other";

  return normalizedValue;
}

export function normalizeCustomerLeadSource(
  value: unknown
): CustomerLeadSource {
  return SOURCE_OPTIONS.includes(value as CustomerLeadSource)
    ? (value as CustomerLeadSource)
    : "website";
}

export function normalizeCustomerLeadStatus(
  value: unknown
): CustomerLeadStatus {
  return STATUS_OPTIONS.includes(value as CustomerLeadStatus)
    ? (value as CustomerLeadStatus)
    : "new";
}

export function normalizeCustomerLeadPreferredContact(
  value: unknown
): CustomerLeadPreferredContact | undefined {
  return value === "email" || value === "text" || value === "phone"
    ? value
    : undefined;
}

export function extractCustomerLeadData(
  payload: Record<string, unknown>
): CustomerLeadExtractedData {
  const message = getFirstText(payload, MESSAGE_KEYS) ?? "";
  const searchText = [
    message,
    getFirstText(payload, NAME_KEYS),
    getFirstText(payload, EMAIL_KEYS),
    getFirstText(payload, PHONE_KEYS),
    getFirstText(payload, ADDRESS_KEYS),
    getFirstText(payload, POSTCODE_KEYS),
    getFirstText(payload, CUSTOMER_TYPE_KEYS),
    getFirstText(payload, SERVICE_KEYS),
  ]
    .filter(Boolean)
    .join("\n");
  const email =
    getFirstText(payload, EMAIL_KEYS) ?? searchText.match(EMAIL_PATTERN)?.[0];
  const phone =
    getFirstText(payload, PHONE_KEYS) ?? searchText.match(PHONE_PATTERN)?.[0];
  const postcode =
    getFirstText(payload, POSTCODE_KEYS) ??
    searchText.match(POSTCODE_PATTERN)?.[1];
  const customerType =
    normalizeCustomerType(getFirstText(payload, CUSTOMER_TYPE_KEYS)) ??
    (/\b(commercial|business|company|office|shop|site|premises)\b/i.test(
      searchText
    )
      ? "Commercial"
      : "Residential");
  const service =
    normalizeService(getFirstText(payload, SERVICE_KEYS)) ??
    inferServiceFromMessage(searchText);
  const extracted: CustomerLeadExtractedData = {
    name: getFirstText(payload, NAME_KEYS) ?? inferNameFromMessage(searchText),
    email,
    phone,
    address:
      getFirstText(payload, ADDRESS_KEYS) ?? inferAddressFromMessage(searchText, postcode),
    town: getFirstText(payload, TOWN_KEYS),
    postcode: postcode?.toUpperCase().replace(/\s+/, " "),
    customerType,
    service,
    notes: message || undefined,
    mediaUrls: getTextList(payload, MEDIA_KEYS),
  };
  const confidenceFields = [
    extracted.name,
    extracted.email,
    extracted.phone,
    extracted.address,
    extracted.postcode,
    extracted.service,
    extracted.mediaUrls?.length ? "media" : undefined,
  ].filter(Boolean).length;

  return {
    ...extracted,
    mediaUrls: extracted.mediaUrls?.length ? extracted.mediaUrls : undefined,
    confidence: Math.min(1, confidenceFields / 7),
  };
}

export function buildCustomerLeadFromPayload(
  payload: Record<string, unknown>,
  fallbackId = crypto.randomUUID()
): CustomerLead {
  const normalizedPayload = normalizePayload(payload);
  const extractedData = extractCustomerLeadData(normalizedPayload);
  const now = new Date().toISOString();
  const message = getFirstText(normalizedPayload, MESSAGE_KEYS) ?? extractedData.notes ?? "";

  return {
    id: fallbackId,
    source: normalizeCustomerLeadSource(normalizedPayload.source),
    status: "new",
    name: extractedData.name,
    email: extractedData.email,
    phone: extractedData.phone,
    address: extractedData.address,
    town: extractedData.town,
    postcode: extractedData.postcode,
    customerType: extractedData.customerType,
    service: extractedData.service,
    preferredContact: normalizeCustomerLeadPreferredContact(
      normalizedPayload.preferredContact
    ),
    message,
    notes: extractedData.notes,
    extractedData,
    rawPayload: normalizedPayload,
    replyHistory: [],
    activityHistory: [],
    submittedAt:
      normalizeText(normalizedPayload.submittedAt) ??
      normalizeText(normalizedPayload.timestamp) ??
      now,
    createdAt: now,
    updatedAt: now,
    convertedCustomerId: null,
  };
}

export function buildCustomerDraftFromLead(
  lead: CustomerLead
): CustomerLeadCustomerDraft {
  return {
    name: lead.name ?? lead.extractedData.name ?? "",
    customerType:
      lead.customerType ?? lead.extractedData.customerType ?? "Residential",
    address: lead.address ?? lead.extractedData.address ?? "",
    town: lead.town ?? lead.extractedData.town ?? "",
    postcode: lead.postcode ?? lead.extractedData.postcode ?? "",
    phone: lead.phone ?? lead.extractedData.phone ?? "",
    email: lead.email ?? lead.extractedData.email ?? "",
    service: lead.service ?? lead.extractedData.service ?? "",
    notes: lead.message || lead.notes || lead.extractedData.notes || "",
    isGrassCuttingCustomer:
      /\bgrass\b|\blawn\b/i.test(`${lead.service ?? ""} ${lead.message}`),
  };
}
