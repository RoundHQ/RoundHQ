import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeStaffInviteEmail,
  normalizeStaffInviteText,
  validateStaffPassword,
} from "@/lib/staff-invitations";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AcceptInviteRequest = {
  token?: unknown;
  password?: unknown;
};

type StaffInviteRow = {
  id: string;
  organization_id: string;
  staff_member_id: number;
  email: string;
  expires_at: string;
  accepted_at: string | null;
};

type StaffMemberRow = {
  id: number;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

const STAFF_MEMBER_SELECT_FIELDS =
  "id,auth_user_id,email,full_name,role,is_active";

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
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

  return fallback;
}

async function getWorkspaceName(
  supabase: SupabaseClient,
  organizationId: string
) {
  const { data } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();

  return typeof data?.name === "string" && data.name.trim()
    ? data.name.trim()
    : "RoundHQ Workspace";
}

async function findAuthUserByEmail(supabase: SupabaseClient, email: string) {
  let page = 1;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw error;
    }

    const user =
      data.users.find(
        (entry) => entry.email?.trim().toLowerCase() === email
      ) ?? null;

    if (user || data.users.length < 100) {
      return user;
    }

    page += 1;
  }

  return null;
}

async function getExistingAuthUser(
  supabase: SupabaseClient,
  staffMember: StaffMemberRow
) {
  if (staffMember.auth_user_id) {
    const { data, error } = await supabase.auth.admin.getUserById(
      staffMember.auth_user_id
    );

    if (!error && data.user) {
      return data.user;
    }
  }

  return findAuthUserByEmail(supabase, staffMember.email);
}

async function ensureAuthUserWithPassword(options: {
  supabase: SupabaseClient;
  staffMember: StaffMemberRow;
  organizationId: string;
  workspaceName: string;
  password: string;
}) {
  const existingUser = await getExistingAuthUser(
    options.supabase,
    options.staffMember
  );
  const userMetadata = {
    full_name: options.staffMember.full_name,
    company_name: options.workspaceName,
    organization_id: options.organizationId,
    staff_member_id: options.staffMember.id,
  };

  if (existingUser) {
    const { data, error } = await options.supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        email: options.staffMember.email,
        password: options.password,
        email_confirm: true,
        user_metadata: {
          ...(existingUser.user_metadata ?? {}),
          ...userMetadata,
        },
      }
    );

    if (error) {
      throw error;
    }

    return data.user;
  }

  const { data, error } = await options.supabase.auth.admin.createUser({
    email: options.staffMember.email,
    password: options.password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (error) {
    throw error;
  }

  return data.user;
}

async function linkStaffUser(options: {
  supabase: SupabaseClient;
  organizationId: string;
  staffMember: StaffMemberRow;
  authUserId: string;
}) {
  const now = new Date().toISOString();

  const { error: memberError } = await options.supabase
    .from("organization_members")
    .upsert(
      {
        organization_id: options.organizationId,
        user_id: options.authUserId,
        email: options.staffMember.email,
        full_name: options.staffMember.full_name,
        role: "member",
        status: "active",
        updated_at: now,
      },
      { onConflict: "organization_id,user_id" }
    );

  if (memberError) {
    throw memberError;
  }

  const { data, error } = await options.supabase
    .from("staff_members")
    .update({
      auth_user_id: options.authUserId,
      updated_at: now,
    })
    .eq("organization_id", options.organizationId)
    .eq("id", options.staffMember.id)
    .select(STAFF_MEMBER_SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return data as StaffMemberRow;
}

export async function POST(request: Request) {
  let body: AcceptInviteRequest;

  try {
    body = (await request.json()) as AcceptInviteRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "Supabase service role credentials are required for staff setup." },
      { status: 503 }
    );
  }

  const token = normalizeStaffInviteText(body.token);
  const password = normalizeStaffInviteText(body.password);
  const passwordError = validateStaffPassword(password);

  if (!token) {
    return NextResponse.json(
      { error: "Setup token is required." },
      { status: 400 }
    );
  }

  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  try {
    const { data: invite, error: inviteError } = await supabase
      .from("staff_account_invites")
      .select("id,organization_id,staff_member_id,email,expires_at,accepted_at")
      .eq("token_hash", hashInviteToken(token))
      .is("accepted_at", null)
      .maybeSingle();

    if (inviteError) {
      throw inviteError;
    }

    if (!invite) {
      return NextResponse.json(
        { error: "That setup link is invalid or has already been used." },
        { status: 400 }
      );
    }

    const staffInvite = invite as StaffInviteRow;
    const expiryDate = new Date(staffInvite.expires_at);

    if (Number.isNaN(expiryDate.getTime()) || expiryDate < new Date()) {
      return NextResponse.json(
        { error: "That setup link has expired. Ask your dashboard owner to send a new invite." },
        { status: 400 }
      );
    }

    const { data: staffMemberData, error: staffMemberError } = await supabase
      .from("staff_members")
      .select(STAFF_MEMBER_SELECT_FIELDS)
      .eq("organization_id", staffInvite.organization_id)
      .eq("id", staffInvite.staff_member_id)
      .single();

    if (staffMemberError) {
      throw staffMemberError;
    }

    const staffMember = staffMemberData as StaffMemberRow;

    if (
      normalizeStaffInviteEmail(staffMember.email) !==
      normalizeStaffInviteEmail(staffInvite.email)
    ) {
      return NextResponse.json(
        { error: "That setup link no longer matches this staff member." },
        { status: 400 }
      );
    }

    const workspaceName = await getWorkspaceName(
      supabase,
      staffInvite.organization_id
    );
    const authUser = await ensureAuthUserWithPassword({
      supabase,
      staffMember,
      organizationId: staffInvite.organization_id,
      workspaceName,
      password,
    });
    const linkedStaffMember = await linkStaffUser({
      supabase,
      organizationId: staffInvite.organization_id,
      staffMember,
      authUserId: authUser.id,
    });
    const now = new Date().toISOString();
    const { error: acceptError } = await supabase
      .from("staff_account_invites")
      .update({
        accepted_at: now,
        accepted_by_user_id: authUser.id,
        updated_at: now,
      })
      .eq("id", staffInvite.id)
      .is("accepted_at", null);

    if (acceptError) {
      throw acceptError;
    }

    return NextResponse.json({
      ok: true,
      email: linkedStaffMember.email,
      message: "Your RoundHQ staff account is ready.",
    });
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Unable to set up the staff account."
    );

    if (message.toLowerCase().includes("staff_account_invites")) {
      return NextResponse.json(
        {
          error:
            "Staff account invites are not ready yet. Ask the dashboard owner to run the latest RoundHQ SQL.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
