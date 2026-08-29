"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  AlertTriangle,
  AtSign,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  Mail,
  MapPin,
  MessageSquare,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  StickyNote,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  formatAiReceptionistCallDuration,
  getAiReceptionistCallMetadata,
} from "@/lib/ai-receptionist-leads";

import { buildCustomerDraftFromLead } from "@/lib/customer-leads";
import type {
  CustomerLead,
  CustomerLeadActivity,
  CustomerLeadCustomerDraft,
  CustomerLeadStatus,
  Customer,
} from "./types";

type LeadFilter =
  | "all"
  | "new"
  | "reviewing"
  | "replied"
  | "converted"
  | "archived";

type ReplyPayload = {
  recipient: string;
  subject: string;
  message: string;
};

type Props = {
  leads: CustomerLead[];
  customers: Customer[];
  leadsReady: boolean;
  businessName: string;
  showAiAssistantDetails?: boolean;
  onRefresh: () => Promise<void> | void;
  onSendEmailReply: (
    leadId: string,
    payload: ReplyPayload
  ) => Promise<void> | void;
  onConvertToCustomer: (
    leadId: string,
    draft: CustomerLeadCustomerDraft
  ) => Promise<void> | void;
  onCreateQuote: (leadId: string) => Promise<void> | void;
  onAddActivityNote: (leadId: string, note: string) => Promise<void> | void;
  onUpdateStatus: (
    leadId: string,
    status: CustomerLeadStatus
  ) => Promise<void> | void;
  onDeleteArchivedLead: (leadId: string) => Promise<boolean | void> | boolean | void;
};

const FILTER_OPTIONS: Array<{ key: LeadFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "reviewing", label: "Reviewing" },
  { key: "replied", label: "Replied" },
  { key: "converted", label: "Converted" },
  { key: "archived", label: "Archived" },
];

const STATUS_META: Record<
  CustomerLeadStatus,
  { label: string; badge: string; dot: string; activeBorder: string }
> = {
  new: {
    label: "New",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
    activeBorder: "border-l-rose-500",
  },
  reviewing: {
    label: "Reviewing",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
    activeBorder: "border-l-amber-500",
  },
  replied: {
    label: "Replied",
    badge: "bg-sky-50 text-sky-700 ring-sky-200",
    dot: "bg-sky-500",
    activeBorder: "border-l-sky-500",
  },
  converted: {
    label: "Converted",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
    activeBorder: "border-l-emerald-500",
  },
  archived: {
    label: "Archived",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
    activeBorder: "border-l-slate-400",
  },
};

type DuplicateLeadMatch = {
  customer: Customer;
  reasons: string[];
};

type LeadTimelineItem = {
  id: string;
  occurredAt: string;
  type: CustomerLeadActivity["type"];
  title: string;
  detail?: string;
  metadata?: CustomerLeadActivity["metadata"];
};

function getLeadDisplayName(lead: CustomerLead) {
  return (
    lead.name?.trim() ||
    lead.extractedData.name?.trim() ||
    lead.email?.trim() ||
    lead.phone?.trim() ||
    "New lead"
  );
}

function getLeadInitials(lead: CustomerLead) {
  const displayName = getLeadDisplayName(lead);
  const words = displayName.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return displayName.slice(0, 2).toUpperCase();
}

function getLeadService(lead: CustomerLead) {
  return lead.service || lead.extractedData.service || "General enquiry";
}

function getLeadContactLine(lead: CustomerLead) {
  return [lead.email, lead.phone].filter(Boolean).join(" | ") || "No contact details";
}

function getLeadAddressLine(lead: CustomerLead) {
  return (
    [
      lead.address ?? lead.extractedData.address,
      lead.town ?? lead.extractedData.town,
      lead.postcode ?? lead.extractedData.postcode,
    ]
      .filter(Boolean)
      .join(", ") || "Not supplied"
  );
}

function normalizeSearchText(value: string | undefined | null) {
  return value?.toLowerCase().replace(/\s+/g, " ").trim() ?? "";
}

function normalizePhoneDigits(value: string | undefined | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function normalizeAddressKey(value: string | undefined | null) {
  return value?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
}

function getCustomerEmailValues(customer: Customer) {
  return [
    customer.email,
    ...(customer.contactEmails ?? []),
  ]
    .map((value) => normalizeSearchText(value))
    .filter(Boolean);
}

function getDuplicateMatches(
  lead: CustomerLead,
  customers: Customer[]
): DuplicateLeadMatch[] {
  const leadEmail = normalizeSearchText(lead.email ?? lead.extractedData.email);
  const leadPhone = normalizePhoneDigits(lead.phone ?? lead.extractedData.phone);
  const leadPostcode = normalizeAddressKey(
    lead.postcode ?? lead.extractedData.postcode
  );
  const leadAddress = normalizeAddressKey(
    lead.address ?? lead.extractedData.address
  );

  return customers
    .map((customer) => {
      const reasons: string[] = [];
      const customerEmails = getCustomerEmailValues(customer);
      const customerPhone = normalizePhoneDigits(customer.phone);
      const customerPostcode = normalizeAddressKey(customer.postcode);
      const customerAddress = normalizeAddressKey(customer.address);

      if (leadEmail && customerEmails.includes(leadEmail)) {
        reasons.push("email");
      }

      if (
        leadPhone.length >= 8 &&
        customerPhone.length >= 8 &&
        (customerPhone.endsWith(leadPhone.slice(-8)) ||
          leadPhone.endsWith(customerPhone.slice(-8)))
      ) {
        reasons.push("phone");
      }

      if (
        leadPostcode &&
        customerPostcode &&
        leadPostcode === customerPostcode &&
        leadAddress &&
        customerAddress &&
        (leadAddress.includes(customerAddress.slice(0, 8)) ||
          customerAddress.includes(leadAddress.slice(0, 8)))
      ) {
        reasons.push("address");
      }

      return reasons.length > 0 ? { customer, reasons } : null;
    })
    .filter((match): match is DuplicateLeadMatch => Boolean(match))
    .slice(0, 5);
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

function getLeadMediaReferences(lead: CustomerLead) {
  const payload = lead.rawPayload ?? {};
  const payloadMediaKeys = [
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
  const values = [
    ...(lead.extractedData.mediaUrls ?? []),
    ...payloadMediaKeys.flatMap((key) => getPayloadTextValues(payload[key])),
  ];

  return Array.from(
    new Map(
      values
        .flatMap((value) =>
          value
            .split(/[\n,;]+/)
            .map((entry) => entry.trim())
            .filter(Boolean)
        )
        .map((value) => [value.toLowerCase(), value])
    ).values()
  );
}

function getLeadJobDescription(lead: CustomerLead) {
  const payload = lead.rawPayload ?? {};
  const payloadDescriptionKeys = [
    "jobDescription",
    "job-description",
    "job",
    "message",
    "your-message",
    "notes",
    "details",
    "enquiry",
  ];

  return (
    lead.message.trim() ||
    payloadDescriptionKeys
      .flatMap((key) => getPayloadTextValues(payload[key]))
      .find(Boolean) ||
    ""
  );
}

function getLeadPreview(lead: CustomerLead) {
  return getLeadJobDescription(lead) || "No job description supplied.";
}

function isLinkValue(value: string) {
  return /^https?:\/\//i.test(value);
}

function formatLeadDate(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date";
  }

  return parsedDate.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClasses(status: CustomerLeadStatus) {
  return STATUS_META[status].badge;
}

function getStatusLabel(status: CustomerLeadStatus) {
  return STATUS_META[status].label;
}

export function getSourceLabel(
  source: CustomerLead["source"],
  showAiAssistantDetails = true
) {
  switch (source) {
    case "facebook":
      return "Facebook";
    case "whatsapp":
      return "WhatsApp";
    case "email":
      return "Email";
    case "ai_receptionist":
      return showAiAssistantDetails ? "Voicemail" : "Phone";
    case "manual":
      return "Manual";
    default:
      return "Website";
  }
}

function getLeadSearchText(
  lead: CustomerLead,
  duplicateMatches: DuplicateLeadMatch[]
) {
  return normalizeSearchText(
    [
      getLeadDisplayName(lead),
      getLeadService(lead),
      getLeadContactLine(lead),
      getLeadAddressLine(lead),
      getLeadJobDescription(lead),
      lead.source,
      lead.status,
      ...duplicateMatches.map((match) => match.customer.name),
    ].join(" ")
  );
}

function getLeadTimeline(
  lead: CustomerLead,
  showAiAssistantDetails: boolean
): LeadTimelineItem[] {
  const activityItems = lead.activityHistory
    .filter(
      (entry) =>
        showAiAssistantDetails || entry.type !== "ai_receptionist_call"
    )
    .map((entry) => ({
      id: entry.id,
      occurredAt: entry.occurredAt,
      type: entry.type,
      title: entry.title,
      detail: entry.detail,
      metadata: entry.metadata,
    }));
  const replyActivityIds = new Set(
    lead.activityHistory
      .filter((entry) => entry.type === "reply" && entry.relatedId)
      .map((entry) => entry.relatedId)
  );
  const replyItems = lead.replyHistory
    .filter((reply) => !replyActivityIds.has(reply.id))
    .map((reply) => ({
      id: `reply-${reply.id}`,
      occurredAt: reply.sentAt,
      type: "reply" as const,
      title: "Email reply sent",
      detail: `${reply.subject} to ${reply.recipient}`,
    }));

  return [
    ...activityItems,
    ...replyItems,
    {
      id: "received",
      occurredAt: lead.submittedAt,
      type: "received" as const,
      title: "Lead received",
      detail: `${getSourceLabel(
        lead.source,
        showAiAssistantDetails
      )} enquiry submitted.`,
    },
  ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

function getAiReceptionistLeadAlert(lead: CustomerLead) {
  const metadata = lead.activityHistory
    .map((entry) => getAiReceptionistCallMetadata(entry))
    .find(
      (entry) =>
        entry?.emergency_detected || entry?.priority?.toLowerCase() === "high"
    );

  if (!metadata) {
    return null;
  }

  return {
    keywords: metadata.emergency_keywords ?? [],
    outcome: metadata.call_outcome,
  };
}

function getDefaultReplySubject(lead: CustomerLead, businessName: string) {
  const service = lead.service || lead.extractedData.service;
  return service
    ? `Re: ${service} enquiry`
    : `Re: Your enquiry with ${businessName}`;
}

function getDefaultReplyMessage(lead: CustomerLead, businessName: string) {
  const name = lead.name || lead.extractedData.name || "there";

  return [
    `Hi ${name},`,
    "",
    "Thanks for getting in touch. I have received your enquiry and will come back to you with the next steps.",
    "",
    "Kind regards,",
    businessName,
  ].join("\n");
}

function StatusBadge({ status }: { status: CustomerLeadStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${getStatusClasses(
        status
      )}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[status].dot}`} />
      {getStatusLabel(status)}
    </span>
  );
}

function DetailTile({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 p-3 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-1.5 text-sm font-semibold text-slate-900">{children}</div>
    </div>
  );
}

function ExpandableActivityText({
  text,
  maxLength = 1600,
  className = "",
}: {
  text: string;
  maxLength?: number;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongText = text.length > maxLength;
  const visibleText =
    isLongText && !isExpanded
      ? `${text.slice(0, maxLength).trimEnd()}...`
      : text;

  return (
    <div>
      <p className={`whitespace-pre-wrap break-words ${className}`}>
        {visibleText}
      </p>
      {isLongText ? (
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="mt-2 text-xs font-bold text-slate-900 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-600"
        >
          {isExpanded ? "Show Less" : "Show More"}
        </button>
      ) : null}
    </div>
  );
}

function AiReceptionistActivityField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}:
      </p>
      <div className="mt-1 text-sm leading-5 text-slate-700">{children}</div>
    </div>
  );
}

function AiReceptionistActivityContent({
  entry,
}: {
  entry: LeadTimelineItem;
}) {
  const metadata = getAiReceptionistCallMetadata(entry);

  if (!metadata) {
    return entry.detail ? (
      <ExpandableActivityText
        text={entry.detail}
        className="text-sm leading-5 text-slate-600"
      />
    ) : null;
  }

  const recordingPlaybackUrl = metadata.recording_id
    ? `/api/ai-receptionist/recordings/${encodeURIComponent(
        metadata.recording_id
      )}`
    : metadata.recording_url;

  return (
    <div className="mt-2 space-y-3">
      {metadata.ai_summary ? (
        <AiReceptionistActivityField label="Summary">
          <ExpandableActivityText
            text={metadata.ai_summary}
            maxLength={900}
            className="text-sm leading-5 text-slate-700"
          />
        </AiReceptionistActivityField>
      ) : null}

      {metadata.ai_summary_short ? (
        <AiReceptionistActivityField label="Short Summary">
          {metadata.ai_summary_short}
        </AiReceptionistActivityField>
      ) : null}

      {metadata.ai_summary_detailed ? (
        <AiReceptionistActivityField label="Detailed Summary">
          <ExpandableActivityText
            text={metadata.ai_summary_detailed}
            maxLength={1200}
            className="text-sm leading-5 text-slate-700"
          />
        </AiReceptionistActivityField>
      ) : null}

      {metadata.call_duration_seconds !== undefined ? (
        <AiReceptionistActivityField label="Call Duration">
          {formatAiReceptionistCallDuration(metadata.call_duration_seconds)}
        </AiReceptionistActivityField>
      ) : null}

      {metadata.priority?.toLowerCase() === "high" ||
      metadata.emergency_detected ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          High priority
          {metadata.emergency_keywords?.length
            ? ` - ${metadata.emergency_keywords.join(", ")}`
            : ""}
        </div>
      ) : null}

      {metadata.call_outcome ? (
        <AiReceptionistActivityField label="Outcome">
          {metadata.call_outcome}
        </AiReceptionistActivityField>
      ) : null}

      {metadata.caller_phone ? (
        <AiReceptionistActivityField label="Phone">
          {metadata.caller_phone}
        </AiReceptionistActivityField>
      ) : null}

      {metadata.transcript ? (
        <AiReceptionistActivityField label="Transcript">
          <ExpandableActivityText
            text={metadata.transcript}
            maxLength={1800}
            className="text-sm leading-5 text-slate-700"
          />
        </AiReceptionistActivityField>
      ) : null}

      {metadata.recording_status?.toLowerCase() === "failed" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          Transcription failed or is not available yet.
        </div>
      ) : null}

      {recordingPlaybackUrl ? (
        <AiReceptionistActivityField label="Recording">
          <div className="space-y-2">
            <audio
              controls
              preload="none"
              src={recordingPlaybackUrl}
              className="w-full max-w-md"
            >
              <a href={recordingPlaybackUrl}>Play Recording</a>
            </audio>
            <a
              href={recordingPlaybackUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-xs font-bold text-slate-900 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-600"
            >
              Play Recording
            </a>
          </div>
        </AiReceptionistActivityField>
      ) : null}

      <AiReceptionistActivityField label="Created By">
        {metadata.created_by}
      </AiReceptionistActivityField>
    </div>
  );
}

function ActivityTimelineEntry({ entry }: { entry: LeadTimelineItem }) {
  const isAiReceptionistCall = entry.type === "ai_receptionist_call";
  const activityTitle = entry.title;

  return (
    <article className="flex gap-3">
      <span
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
          isAiReceptionistCall ? "bg-emerald-500" : "bg-slate-300"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-slate-900">{activityTitle}</p>
          {isAiReceptionistCall ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
              [Voicemail]
            </span>
          ) : null}
          <time className="text-[11px] font-semibold text-slate-400">
            {formatLeadDate(entry.occurredAt)}
          </time>
        </div>
        {isAiReceptionistCall ? (
          <AiReceptionistActivityContent entry={entry} />
        ) : entry.detail ? (
          <div className="mt-1">
            <ExpandableActivityText
              text={entry.detail}
              className="text-sm leading-5 text-slate-600"
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function CustomerLeadsPage({
  leads,
  customers,
  leadsReady,
  businessName,
  showAiAssistantDetails = false,
  onRefresh,
  onSendEmailReply,
  onConvertToCustomer,
  onCreateQuote,
  onAddActivityNote,
  onUpdateStatus,
  onDeleteArchivedLead,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<LeadFilter>("new");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(
    leads[0]?.id ?? null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isDeletingArchivedLead, setIsDeletingArchivedLead] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activityNote, setActivityNote] = useState("");
  const [reply, setReply] = useState<ReplyPayload>({
    recipient: "",
    subject: "",
    message: "",
  });
  const [draft, setDraft] = useState<CustomerLeadCustomerDraft>({
    name: "",
    customerType: "Residential",
    address: "",
    town: "",
    postcode: "",
    phone: "",
    email: "",
    service: "",
    notes: "",
    isGrassCuttingCustomer: true,
  });

  const websiteEndpoint = useMemo(() => {
    if (typeof window === "undefined") {
      return "/api/customer-leads";
    }

    return `${window.location.origin}/api/customer-leads`;
  }, []);

  const filterCounts = useMemo(
    () => ({
      all: leads.length,
      new: leads.filter((lead) => lead.status === "new").length,
      reviewing: leads.filter((lead) => lead.status === "reviewing").length,
      replied: leads.filter((lead) => lead.status === "replied").length,
      converted: leads.filter((lead) => lead.status === "converted").length,
      archived: leads.filter((lead) => lead.status === "archived").length,
    }),
    [leads]
  );

  const duplicateMatchesByLeadId = useMemo(() => {
    return new Map(
      leads.map((lead) => [lead.id, getDuplicateMatches(lead, customers)])
    );
  }, [customers, leads]);
  const normalizedSearchTerm = normalizeSearchText(searchTerm);
  const filteredLeads = useMemo(() => {
    const statusFilteredLeads =
      activeFilter === "all"
        ? leads
        : leads.filter((lead) => lead.status === activeFilter);

    if (!normalizedSearchTerm) {
      return statusFilteredLeads;
    }

    return statusFilteredLeads.filter((lead) =>
      getLeadSearchText(
        lead,
        duplicateMatchesByLeadId.get(lead.id) ?? []
      ).includes(normalizedSearchTerm)
    );
  }, [activeFilter, duplicateMatchesByLeadId, leads, normalizedSearchTerm]);

  useEffect(() => {
    if (filteredLeads.length === 0) {
      setSelectedLeadId(null);
      return;
    }

    if (!selectedLeadId || !filteredLeads.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(filteredLeads[0].id);
    }
  }, [filteredLeads, selectedLeadId]);

  const selectedLead = useMemo(
    () => filteredLeads.find((lead) => lead.id === selectedLeadId) ?? null,
    [filteredLeads, selectedLeadId]
  );
  const selectedLeadMediaReferences = useMemo(
    () => (selectedLead ? getLeadMediaReferences(selectedLead) : []),
    [selectedLead]
  );
  const selectedLeadDuplicateMatches = selectedLead
    ? duplicateMatchesByLeadId.get(selectedLead.id) ?? []
    : [];
  const selectedLeadTimeline = useMemo(
    () =>
      selectedLead
        ? getLeadTimeline(selectedLead, showAiAssistantDetails)
        : [],
    [selectedLead, showAiAssistantDetails]
  );
  const selectedLeadAiAlert = useMemo(
    () =>
      selectedLead && showAiAssistantDetails
        ? getAiReceptionistLeadAlert(selectedLead)
        : null,
    [selectedLead, showAiAssistantDetails]
  );
  const inboxStats = useMemo(
    () => [
      { label: "New", value: filterCounts.new, tone: "text-rose-600", bg: "bg-rose-50" },
      {
        label: "Reviewing",
        value: filterCounts.reviewing,
        tone: "text-amber-600",
        bg: "bg-amber-50",
      },
      {
        label: "Replied",
        value: filterCounts.replied,
        tone: "text-sky-600",
        bg: "bg-sky-50",
      },
      {
        label: "Converted",
        value: filterCounts.converted,
        tone: "text-emerald-600",
        bg: "bg-emerald-50",
      },
    ],
    [filterCounts]
  );

  useEffect(() => {
    if (!selectedLead) {
      return;
    }

    setDraft(buildCustomerDraftFromLead(selectedLead));
    setReply({
      recipient: selectedLead.email || selectedLead.extractedData.email || "",
      subject: getDefaultReplySubject(selectedLead, businessName),
      message: getDefaultReplyMessage(selectedLead, businessName),
    });
    setActivityNote("");
    setNotice(null);
  }, [businessName, selectedLead]);

  function updateDraft<K extends keyof CustomerLeadCustomerDraft>(
    key: K,
    value: CustomerLeadCustomerDraft[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function refreshLeads() {
    setIsRefreshing(true);
    setNotice(null);

    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function sendReply() {
    if (!selectedLead || !reply.recipient.trim() || !reply.subject.trim()) {
      return;
    }

    setIsSendingReply(true);
    setNotice(null);

    try {
      await onSendEmailReply(selectedLead.id, {
        recipient: reply.recipient.trim(),
        subject: reply.subject.trim(),
        message: reply.message.trim(),
      });
      setNotice(`Email sent to ${reply.recipient.trim()}.`);
    } finally {
      setIsSendingReply(false);
    }
  }

  async function convertToCustomer() {
    if (!selectedLead || !draft.name.trim()) {
      return;
    }

    setIsConverting(true);
    setNotice(null);

    try {
      await onConvertToCustomer(selectedLead.id, {
        ...draft,
        name: draft.name.trim(),
        address: draft.address.trim(),
        town: draft.town.trim(),
        postcode: draft.postcode.trim(),
        phone: draft.phone.trim(),
        email: draft.email.trim(),
        service: draft.service.trim(),
        notes: draft.notes.trim(),
      });
      setNotice(`${draft.name.trim()} added as a customer.`);
    } finally {
      setIsConverting(false);
    }
  }

  async function addActivityNote() {
    if (!selectedLead || !activityNote.trim()) {
      return;
    }

    setIsAddingNote(true);
    setNotice(null);

    try {
      await onAddActivityNote(selectedLead.id, activityNote.trim());
      setActivityNote("");
      setNotice("Note added to lead activity.");
    } finally {
      setIsAddingNote(false);
    }
  }

  async function deleteArchivedLead() {
    if (!selectedLead || selectedLead.status !== "archived") {
      return;
    }

    const leadName = getLeadDisplayName(selectedLead);
    const shouldDelete = window.confirm(
      `Permanently delete archived message "${leadName}"? This cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeletingArchivedLead(true);
    setNotice(null);

    try {
      const wasDeleted = await onDeleteArchivedLead(selectedLead.id);

      if (wasDeleted === false) {
        return;
      }

      setSelectedLeadId(null);
      setNotice("Archived message permanently deleted.");
    } finally {
      setIsDeletingArchivedLead(false);
    }
  }

  return (
    <div className="space-y-5">
      <aside className="space-y-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <Inbox size={21} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Customer Messages
                </p>
                <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-950">
                  Leads Inbox
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
              <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
                {inboxStats.map((stat) => (
                  <span
                    key={stat.label}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${stat.bg} ${stat.tone}`}
                  >
                    <span className="text-slate-500">{stat.label}</span>
                    <span>{stat.value}</span>
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={refreshLeads}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
        </section>

      {!leadsReady ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Run `supabase/customer_leads.sql` to enable the lead inbox and website
          form endpoint.
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          <CheckCircle2 size={18} />
          {notice}
        </div>
      ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center">
              <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Website Endpoint
              </p>
              <p className="min-w-0 break-all rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 xl:truncate">
                {websiteEndpoint}
              </p>
            </div>

            <label className="relative min-w-[240px] flex-1 xl:max-w-sm">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search leads"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400"
              />
            </label>

            <div className="flex max-w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 xl:flex-nowrap">
              {FILTER_OPTIONS.map((option) => {
                const isActive = activeFilter === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setActiveFilter(option.key)}
                    aria-pressed={isActive}
                    className={`inline-flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                    }`}
                  >
                    {option.label}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isActive
                          ? "bg-slate-100 text-slate-700"
                          : "bg-white text-slate-500"
                      }`}
                    >
                      {filterCounts[option.key]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </aside>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">
              {filteredLeads.length} shown
            </p>
            <p className="text-xs text-slate-500">
              {filterCounts.all} total enquiries
            </p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {activeFilter === "all" ? "All statuses" : getStatusLabel(activeFilter)}
          </p>
        </div>

        <div className="grid min-h-[640px] xl:grid-cols-[minmax(320px,420px)_1fr]">
          <div className="border-b border-slate-200 bg-slate-50/45 xl:border-b-0 xl:border-r">
            {filteredLeads.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-500">
                No leads in this view.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredLeads.map((lead) => {
                  const isSelected = selectedLead?.id === lead.id;
                  const statusMeta = STATUS_META[lead.status];
                  const duplicateMatches =
                    duplicateMatchesByLeadId.get(lead.id) ?? [];

                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={`block w-full border-l-4 px-4 py-4 text-left transition ${
                        isSelected
                          ? `${statusMeta.activeBorder} bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]`
                          : "border-l-transparent hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">
                          {getLeadInitials(lead)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-950">
                                {getLeadDisplayName(lead)}
                              </p>
                              <p className="mt-0.5 truncate text-sm font-medium text-slate-500">
                                {getLeadService(lead)}
                              </p>
                            </div>
                            <StatusBadge status={lead.status} />
                          </div>
                          <p className="mt-2 truncate text-xs text-slate-500">
                            {getLeadPreview(lead)}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={13} />
                              {formatLeadDate(lead.submittedAt)}
                            </span>
                            <span>
                              {getSourceLabel(
                                lead.source,
                                showAiAssistantDetails
                              )}
                            </span>
                            <span>{getLeadContactLine(lead)}</span>
                            {duplicateMatches.length > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 ring-1 ring-amber-200">
                                <AlertTriangle size={12} />
                                Possible duplicate
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white">
            {selectedLead ? (
              <div>
                <div className="border-b border-slate-200 px-5 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-white">
                        {getLeadInitials(selectedLead)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="break-words text-2xl font-black tracking-tight text-slate-950">
                            {getLeadDisplayName(selectedLead)}
                          </h2>
                          <StatusBadge status={selectedLead.status} />
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {getLeadService(selectedLead)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatLeadDate(selectedLead.submittedAt)} | Source:{" "}
                          {getSourceLabel(
                            selectedLead.source,
                            showAiAssistantDetails
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void onCreateQuote(selectedLead.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        <FileText size={14} />
                        Create Quote
                      </button>
                      {selectedLead.status === "new" ? (
                        <button
                          type="button"
                          onClick={() =>
                            void onUpdateStatus(selectedLead.id, "reviewing")
                          }
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                        >
                          Reviewing
                        </button>
                      ) : null}
                      {selectedLead.status !== "archived" &&
                      selectedLead.status !== "converted" ? (
                        <button
                          type="button"
                          onClick={() =>
                            void onUpdateStatus(selectedLead.id, "archived")
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Archive size={14} />
                          Archive
                        </button>
                      ) : null}
                      {selectedLead.status === "archived" ? (
                        <button
                          type="button"
                          onClick={() => void deleteArchivedLead()}
                          disabled={isDeletingArchivedLead}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-rose-100 disabled:bg-rose-50 disabled:text-rose-300"
                        >
                          <Trash2 size={14} />
                          {isDeletingArchivedLead
                            ? "Deleting..."
                            : "Delete Permanently"}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <AtSign size={15} className="shrink-0 text-slate-400" />
                      <span className="truncate">
                        {selectedLead.email || selectedLead.extractedData.email || "No email"}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <Phone size={15} className="shrink-0 text-slate-400" />
                      <span className="truncate">
                        {selectedLead.phone || selectedLead.extractedData.phone || "No phone"}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <MapPin size={15} className="shrink-0 text-slate-400" />
                      <span className="truncate">{getLeadAddressLine(selectedLead)}</span>
                    </div>
                  </div>

                  {selectedLeadAiAlert ? (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle
                          size={18}
                          className="mt-0.5 shrink-0 text-rose-600"
                        />
                        <div>
                          <p className="text-sm font-bold text-rose-900">
                            High priority call
                          </p>
                          <p className="mt-1 text-sm font-semibold text-rose-800">
                            {selectedLeadAiAlert.keywords.length > 0
                              ? `Matched: ${selectedLeadAiAlert.keywords.join(", ")}`
                              : "This lead was flagged during the call."}
                            {selectedLeadAiAlert.outcome
                              ? ` Outcome: ${selectedLeadAiAlert.outcome}.`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {selectedLeadDuplicateMatches.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle
                          size={18}
                          className="mt-0.5 shrink-0 text-amber-600"
                        />
                        <div>
                          <p className="text-sm font-bold text-amber-900">
                            Possible existing customer
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedLeadDuplicateMatches.map((match) => (
                              <span
                                key={match.customer.id}
                                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
                              >
                                {match.customer.name} - {match.reasons.join(", ")}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-6 p-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
                  <div className="space-y-5">
                    <section>
                      <div className="mb-3 flex items-center gap-2 text-slate-900">
                        <MessageSquare size={18} />
                        <h3 className="font-black tracking-tight">Lead Details</h3>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <DetailTile label="Customer Type">
                          {selectedLead.customerType ??
                            selectedLead.extractedData.customerType ??
                            "Not supplied"}
                        </DetailTile>
                        <DetailTile label="Service Required">
                          {selectedLead.service ??
                            selectedLead.extractedData.service ??
                            "Not supplied"}
                        </DetailTile>
                        <DetailTile label="Address" className="md:col-span-2">
                          <span className="font-medium text-slate-700">
                            {getLeadAddressLine(selectedLead)}
                          </span>
                        </DetailTile>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Job Description
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {getLeadJobDescription(selectedLead) ||
                          "No job description supplied."}
                      </p>
                    </section>

                    {selectedLeadMediaReferences.length > 0 ? (
                      <section className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2">
                          <Paperclip size={16} className="text-slate-400" />
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Photos / Video
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedLeadMediaReferences.map((mediaReference) =>
                            isLinkValue(mediaReference) ? (
                              <a
                                key={mediaReference}
                                href={mediaReference}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                Open media
                              </a>
                            ) : (
                              <span
                                key={mediaReference}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                              >
                                {mediaReference}
                              </span>
                            )
                          )}
                        </div>
                      </section>
                    ) : null}
                  </div>

                  <div className="space-y-5">
                    <section className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-slate-900">
                        <StickyNote size={18} />
                        <h3 className="font-black tracking-tight">Activity</h3>
                      </div>

                      <div className="mt-4 space-y-3">
                        <textarea
                          value={activityNote}
                          onChange={(event) => setActivityNote(event.target.value)}
                          placeholder="Add a call note, quote visit detail, or follow-up reminder"
                          className="min-h-[88px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                        />
                        <button
                          type="button"
                          onClick={addActivityNote}
                          disabled={isAddingNote || !activityNote.trim()}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <StickyNote size={16} />
                          {isAddingNote ? "Adding..." : "Add Note"}
                        </button>
                      </div>

                      <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                        {selectedLeadTimeline.map((entry) => (
                          <ActivityTimelineEntry key={entry.id} entry={entry} />
                        ))}
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-slate-900">
                        <UserPlus size={18} />
                        <h3 className="font-black tracking-tight">Customer Details</h3>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Customer Name
                          </label>
                          <input
                            value={draft.name}
                            onChange={(event) => updateDraft("name", event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                              Customer Type
                            </label>
                            <select
                              value={draft.customerType}
                              onChange={(event) =>
                                updateDraft(
                                  "customerType",
                                  event.target
                                    .value as CustomerLeadCustomerDraft["customerType"]
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                            >
                              <option value="Residential">Residential</option>
                              <option value="Commercial">Commercial</option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                              Phone
                            </label>
                            <input
                              value={draft.phone}
                              onChange={(event) =>
                                updateDraft("phone", event.target.value)
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Email
                          </label>
                          <input
                            value={draft.email}
                            onChange={(event) => updateDraft("email", event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Address
                          </label>
                          <input
                            value={draft.address}
                            onChange={(event) =>
                              updateDraft("address", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                              Town
                            </label>
                            <input
                              value={draft.town}
                              onChange={(event) => updateDraft("town", event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                              Postcode
                            </label>
                            <input
                              value={draft.postcode}
                              onChange={(event) =>
                                updateDraft("postcode", event.target.value)
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Service Required
                          </label>
                          <input
                            value={draft.service}
                            onChange={(event) =>
                              updateDraft("service", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Job Description
                          </label>
                          <textarea
                            value={draft.notes}
                            onChange={(event) => updateDraft("notes", event.target.value)}
                            className="min-h-[104px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                          />
                        </div>

                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={draft.isGrassCuttingCustomer}
                            onChange={(event) =>
                              updateDraft(
                                "isGrassCuttingCustomer",
                                event.target.checked
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                          />
                          Add to service rounds
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={convertToCustomer}
                        disabled={
                          isConverting ||
                          !draft.name.trim() ||
                          selectedLead.status === "converted"
                        }
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <UserPlus size={16} />
                        {selectedLead.status === "converted"
                          ? "Customer Added"
                          : isConverting
                            ? "Adding..."
                            : "Add as Customer"}
                      </button>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-slate-900">
                        <Mail size={18} />
                        <h3 className="font-black tracking-tight">Email Reply</h3>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Send To
                          </label>
                          <input
                            value={reply.recipient}
                            onChange={(event) =>
                              setReply((prev) => ({
                                ...prev,
                                recipient: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Subject
                          </label>
                          <input
                            value={reply.subject}
                            onChange={(event) =>
                              setReply((prev) => ({
                                ...prev,
                                subject: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Message
                          </label>
                          <textarea
                            value={reply.message}
                            onChange={(event) =>
                              setReply((prev) => ({
                                ...prev,
                                message: event.target.value,
                              }))
                            }
                            className="min-h-[140px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={sendReply}
                        disabled={
                          isSendingReply ||
                          !reply.recipient.trim() ||
                          !reply.subject.trim() ||
                          !reply.message.trim()
                        }
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send size={16} />
                        {isSendingReply ? "Sending..." : "Send Email"}
                      </button>

                      {selectedLead.replyHistory.length > 0 ? (
                        <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
                          {selectedLead.replyHistory.map((entry) => (
                            <article key={entry.id} className="py-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">
                                  {entry.subject}
                                </p>
                                <time className="text-xs font-semibold text-slate-400">
                                  {formatLeadDate(entry.sentAt)}
                                </time>
                              </div>
                              <p className="mt-1 text-xs text-slate-400">
                                {entry.recipient}
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                {entry.message}
                              </p>
                            </article>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center px-5 text-center text-sm text-slate-500">
                Select a lead.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
