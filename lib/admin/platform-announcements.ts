import {
  DEFAULT_PLATFORM_ANNOUNCEMENT,
  PLATFORM_ANNOUNCEMENT_SELECT,
  mapPlatformAnnouncementRow,
  type PlatformAnnouncement,
  type PlatformAnnouncementRow,
} from "@/lib/platform-announcements";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";

export type AdminPlatformAnnouncement = PlatformAnnouncement & {
  schemaReady: boolean;
  schemaError?: string;
};

export function getDefaultAdminPlatformAnnouncement(
  overrides: Partial<AdminPlatformAnnouncement> = {}
): AdminPlatformAnnouncement {
  return {
    ...DEFAULT_PLATFORM_ANNOUNCEMENT,
    schemaReady: true,
    ...overrides,
  };
}

export async function getAdminPlatformAnnouncement() {
  if (!isSupabaseServiceRoleConfigured()) {
    return getDefaultAdminPlatformAnnouncement({
      schemaReady: false,
      schemaError: "Supabase service role credentials are not configured.",
    });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("platform_announcements")
    .select(PLATFORM_ANNOUNCEMENT_SELECT)
    .eq("id", "primary")
    .maybeSingle();

  if (error) {
    return getDefaultAdminPlatformAnnouncement({
      schemaReady: false,
      schemaError: error.message,
    });
  }

  return {
    ...mapPlatformAnnouncementRow(data as PlatformAnnouncementRow | null),
    schemaReady: true,
  };
}
