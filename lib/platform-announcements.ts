export type PlatformAnnouncementTone = "info" | "success" | "warning";

export type PlatformAnnouncement = {
  id: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  tone: PlatformAnnouncementTone;
  isActive: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
};

export type PlatformAnnouncementRow = {
  id: string;
  title: string | null;
  message: string | null;
  cta_label: string | null;
  cta_href: string | null;
  tone: string | null;
  is_active: boolean | null;
  published_at: string | null;
  updated_at: string | null;
};

export const DEFAULT_PLATFORM_ANNOUNCEMENT: PlatformAnnouncement = {
  id: "primary",
  title: "RoundHQ updates",
  message: "",
  ctaLabel: "",
  ctaHref: "",
  tone: "info",
  isActive: false,
  publishedAt: null,
  updatedAt: null,
};

export const PLATFORM_ANNOUNCEMENT_SELECT =
  "id,title,message,cta_label,cta_href,tone,is_active,published_at,updated_at";

export function normalizeAnnouncementTone(
  value: string | null | undefined
): PlatformAnnouncementTone {
  return value === "success" || value === "warning" ? value : "info";
}

export function mapPlatformAnnouncementRow(
  row: PlatformAnnouncementRow | null | undefined
): PlatformAnnouncement {
  if (!row) {
    return DEFAULT_PLATFORM_ANNOUNCEMENT;
  }

  return {
    id: row.id || "primary",
    title: row.title?.trim() || DEFAULT_PLATFORM_ANNOUNCEMENT.title,
    message: row.message?.trim() || "",
    ctaLabel: row.cta_label?.trim() || "",
    ctaHref: row.cta_href?.trim() || "",
    tone: normalizeAnnouncementTone(row.tone),
    isActive: Boolean(row.is_active),
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}
