import { redirect } from "next/navigation";
import { isAdminAccessConfigured, isAdminEmail } from "@/lib/admin/access";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/admin";

export type AdminAccessResult =
  | {
      ok: true;
      userEmail: string;
    }
  | {
      ok: false;
      title: string;
      description: string;
    };

export async function getAdminAccess(nextPath = "/admin"): Promise<AdminAccessResult> {
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
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isAdminAccessConfigured()) {
    return {
      ok: false,
      title: "Admin access is not configured",
      description:
        "Add your login email to ROUNDHQ_ADMIN_EMAILS in local and Vercel environment variables, then redeploy.",
    };
  }

  if (!isAdminEmail(user.email)) {
    return {
      ok: false,
      title: "This account is not allowed into the owner console",
      description: `You are signed in as ${
        user.email ?? "unknown email"
      }. Add that exact email address to ROUNDHQ_ADMIN_EMAILS, restart the local dev server, then refresh /admin.`,
    };
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return {
      ok: false,
      title: "Admin data access is not configured",
      description:
        "Add SUPABASE_SERVICE_ROLE_KEY in local and Vercel environment variables. This key is used server-side only and is never sent to the browser.",
    };
  }

  return {
    ok: true,
    userEmail: user.email ?? "",
  };
}

export async function requireAdminAccess(nextPath = "/admin") {
  const access = await getAdminAccess(nextPath);

  if (!access.ok) {
    throw new Error(access.description);
  }

  return access;
}
