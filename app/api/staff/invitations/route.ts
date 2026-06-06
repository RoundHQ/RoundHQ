import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  getPlatformEmailSettings,
  isPlatformEmailConfigured,
  sendPlatformEmail,
} from "@/lib/admin/email-settings";
import {
  buildStaffPasswordEmail,
  buildStaffSetupEmail,
  getStaffInviteExpiryDate,
  normalizeStaffInviteEmail,
  normalizeStaffInviteRole,
  normalizeStaffInviteText,
  validateStaffPassword,
} from "@/lib/staff-invitations";
import {
  createServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam, normalizeStaffRole } from "@/lib/team-permissions";
import { getFriendlySmtpErrorMessage } from "@/lib/email/smtp-delivery";
import { ensureWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

type StaffInviteRequest = {
  action?: "create" | "update";
  staffMemberId?: number;
  values?: Record<string, unknown>;
  temporaryPassword?: string;
  sendSetupInvite?: boolean;
};

type StaffMemberRow = {
  id: number;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  phone: string | null;
  notes: string | null;
  is_system_admin: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type OrganizationMemberRow = {
  role: string | null;
};

type StaffAccessRow = {
  role: string | null;
  is_active: boolean | null;
  is_system_admin: boolean | null;
};

const STAFF_MEMBER_SELECT_FIELDS =
  "id,auth_user_id,email,full_name,role,is_active,phone,notes,is_system_admin,created_at,updated_at";

function getBaseUrl(requestUrl: string) {
  const url = new URL(requestUrl);
  return `${url.protocol}//${url.host}`;
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createInviteToken() {
  return randomBytes(32).toString("base64url");
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

function getErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return "";
}

function getStaffMemberResponse(row: StaffMemberRow) {
  return {
    id: Number(row.id),
    authUserId: row.auth_user_id,
    email: row.email,
    fullName: row.full_name,
    role: normalizeStaffRole(row.role),
    isActive: Boolean(row.is_active),
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
    isSystemAdmin: Boolean(row.is_system_admin),
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function getPayloadValues(body: StaffInviteRequest) {
  const values = body.values ?? {};
  const email = normalizeStaffInviteEmail(values.email);
  const fullName = normalizeStaffInviteText(values.fullName);
  const role = normalizeStaffInviteRole(values.role);
  const phone = normalizeStaffInviteText(values.phone);
  const notes = normalizeStaffInviteText(values.notes);
  const isActive = values.isActive !== false;

  if (!fullName) {
    return { error: "Full name is required." as const };
  }

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." as const };
  }

  return {
    values: {
      email,
      fullName,
      role,
      isActive,
      phone,
      notes,
    },
  };
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

async function getStaffMemberByEmail(options: {
  supabase: SupabaseClient;
  organizationId: string;
  email: string;
}) {
  const { data, error } = await options.supabase
    .from("staff_members")
    .select(STAFF_MEMBER_SELECT_FIELDS)
    .eq("organization_id", options.organizationId)
    .limit(1000);

  if (error) {
    throw error;
  }

  return (
    ((data ?? []) as StaffMemberRow[]).find(
      (staffMember) =>
        normalizeStaffInviteEmail(staffMember.email) === options.email
    ) ?? null
  );
}

async function getCanManageTeam(options: {
  supabase: SupabaseClient;
  organizationId: string;
  user: User;
}) {
  const [membershipResult, staffByUserResult] = await Promise.all([
    options.supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", options.organizationId)
      .eq("user_id", options.user.id)
      .eq("status", "active")
      .maybeSingle(),
    options.supabase
      .from("staff_members")
      .select("role,is_active,is_system_admin")
      .eq("organization_id", options.organizationId)
      .eq("auth_user_id", options.user.id)
      .maybeSingle(),
  ]);
  const membershipRole = (membershipResult.data as OrganizationMemberRow | null)
    ?.role;
  const staffAccess = staffByUserResult.data as StaffAccessRow | null;

  return (
    membershipRole === "owner" ||
    membershipRole === "admin" ||
    Boolean(staffAccess?.is_system_admin) ||
    (staffAccess?.is_active === true && canManageTeam(normalizeStaffRole(staffAccess.role)))
  );
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

async function ensureAuthUserWithPassword(options: {
  supabase: SupabaseClient;
  staffMember: StaffMemberRow;
  organizationId: string;
  workspaceName: string;
  password: string;
}) {
  const existingUser = options.staffMember.auth_user_id
    ? (await options.supabase.auth.admin.getUserById(options.staffMember.auth_user_id))
        .data.user
    : await findAuthUserByEmail(options.supabase, options.staffMember.email);
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
  workspaceName: string;
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

async function createSetupInvite(options: {
  supabase: SupabaseClient;
  requestUrl: string;
  organizationId: string;
  staffMember: StaffMemberRow;
  createdByUserId: string;
}) {
  const token = createInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = getStaffInviteExpiryDate();
  const setupLink = `${getBaseUrl(options.requestUrl)}/staff-setup?token=${token}`;
  const now = new Date().toISOString();

  const { error: expireError } = await options.supabase
    .from("staff_account_invites")
    .update({
      expires_at: now,
      updated_at: now,
    })
    .eq("organization_id", options.organizationId)
    .eq("staff_member_id", options.staffMember.id)
    .is("accepted_at", null);

  if (expireError) {
    throw expireError;
  }

  const { error } = await options.supabase.from("staff_account_invites").insert({
    organization_id: options.organizationId,
    staff_member_id: options.staffMember.id,
    email: options.staffMember.email,
    token_hash: tokenHash,
    mode: "setup",
    created_by_user_id: options.createdByUserId,
    expires_at: expiresAt.toISOString(),
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return {
    setupLink,
    expiresAt,
  };
}

export async function POST(request: Request) {
  let body: StaffInviteRequest;

  try {
    body = (await request.json()) as StaffInviteRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "Supabase service role credentials are required for staff invites." },
      { status: 503 }
    );
  }

  const payload = getPayloadValues(body);

  if ("error" in payload) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const temporaryPassword = normalizeStaffInviteText(body.temporaryPassword);
  const shouldSetPassword = temporaryPassword.length > 0;
  const shouldSendSetupInvite =
    !shouldSetPassword && body.sendSetupInvite === true;
  const passwordError = shouldSetPassword
    ? validateStaffPassword(temporaryPassword)
    : "";

  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const emailSettings = await getPlatformEmailSettings();

  if (!isPlatformEmailConfigured(emailSettings)) {
    return NextResponse.json(
      {
        error:
          "RoundHQ email is not configured yet. Add SMTP details in Admin Settings > Email.",
      },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const organizationId = await ensureWorkspace(supabase, user);
  const canManage = await getCanManageTeam({
    supabase,
    organizationId,
    user,
  });

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const serviceSupabase = createServiceRoleClient();
  const workspaceName = await getWorkspaceName(serviceSupabase, organizationId);
  const values = payload.values;
  const action = body.action === "update" ? "update" : "create";
  const now = new Date().toISOString();
  let staffMember: StaffMemberRow;

  try {
    if (action === "update") {
      const staffMemberId = Number(body.staffMemberId);

      if (!Number.isInteger(staffMemberId) || staffMemberId <= 0) {
        return NextResponse.json(
          { error: "Staff member ID is required." },
          { status: 400 }
        );
      }

      const { data: existingStaffMember, error: existingError } =
        await serviceSupabase
          .from("staff_members")
          .select(STAFF_MEMBER_SELECT_FIELDS)
          .eq("organization_id", organizationId)
          .eq("id", staffMemberId)
          .single();

      if (existingError) {
        throw existingError;
      }

      const existing = existingStaffMember as StaffMemberRow;

      if (existing.is_system_admin) {
        return NextResponse.json(
          { error: "The primary admin account cannot be edited here." },
          { status: 400 }
        );
      }

      const { data, error } = await serviceSupabase
        .from("staff_members")
        .update({
          email: values.email,
          full_name: values.fullName,
          role: values.role,
          is_active: values.isActive,
          phone: values.phone || null,
          notes: values.notes || null,
          updated_at: now,
        })
        .eq("organization_id", organizationId)
        .eq("id", staffMemberId)
        .select(STAFF_MEMBER_SELECT_FIELDS)
        .single();

      if (error) {
        throw error;
      }

      staffMember = data as StaffMemberRow;
    } else {
      const existingStaffMember = await getStaffMemberByEmail({
        supabase: serviceSupabase,
        organizationId,
        email: values.email,
      });

      if (existingStaffMember) {
        return NextResponse.json(
          {
            error: existingStaffMember.is_system_admin
              ? "That email belongs to the primary admin account."
              : "A staff member with this email already exists. Select them from Staff Members and use Edit to send a setup link or reset their password.",
            staffMember: getStaffMemberResponse(existingStaffMember),
          },
          { status: 409 }
        );
      }

      const { data, error } = await serviceSupabase
        .from("staff_members")
        .insert({
          organization_id: organizationId,
          auth_user_id: null,
          email: values.email,
          full_name: values.fullName,
          role: values.role,
          is_active: values.isActive,
          phone: values.phone || null,
          notes: values.notes || null,
          is_system_admin: false,
          created_at: now,
          updated_at: now,
        })
        .select(STAFF_MEMBER_SELECT_FIELDS)
        .single();

      if (error) {
        throw error;
      }

      staffMember = data as StaffMemberRow;
    }

    if (shouldSetPassword) {
      const authUser = await ensureAuthUserWithPassword({
        supabase: serviceSupabase,
        staffMember,
        organizationId,
        workspaceName,
        password: temporaryPassword,
      });
      staffMember = await linkStaffUser({
        supabase: serviceSupabase,
        organizationId,
        workspaceName,
        staffMember,
        authUserId: authUser.id,
      });

      await sendPlatformEmail({
        settings: emailSettings,
        to: staffMember.email,
        subject: `Your RoundHQ login for ${workspaceName}`,
        message: buildStaffPasswordEmail({
          staffName: staffMember.full_name,
          workspaceName,
          loginUrl: `${getBaseUrl(request.url)}/login?next=%2Fdashboard`,
          email: staffMember.email,
          temporaryPassword,
        }),
      });

      return NextResponse.json({
        ok: true,
        message: "Staff account saved and login details sent.",
        staffMember: getStaffMemberResponse(staffMember),
      });
    }

    if (action === "create") {
      const invite = await createSetupInvite({
        supabase: serviceSupabase,
        requestUrl: request.url,
        organizationId,
        staffMember,
        createdByUserId: user.id,
      });

      await sendPlatformEmail({
        settings: emailSettings,
        to: staffMember.email,
        subject: `Set up your RoundHQ staff account for ${workspaceName}`,
        message: buildStaffSetupEmail({
          staffName: staffMember.full_name,
          workspaceName,
          setupLink: invite.setupLink,
          expiresAt: invite.expiresAt.toLocaleDateString("en-GB"),
        }),
      });

      return NextResponse.json({
        ok: true,
        message: "Staff member created and setup email sent.",
        staffMember: getStaffMemberResponse(staffMember),
      });
    }

    if (shouldSendSetupInvite) {
      const invite = await createSetupInvite({
        supabase: serviceSupabase,
        requestUrl: request.url,
        organizationId,
        staffMember,
        createdByUserId: user.id,
      });

      await sendPlatformEmail({
        settings: emailSettings,
        to: staffMember.email,
        subject: `Set up your RoundHQ staff account for ${workspaceName}`,
        message: buildStaffSetupEmail({
          staffName: staffMember.full_name,
          workspaceName,
          setupLink: invite.setupLink,
          expiresAt: invite.expiresAt.toLocaleDateString("en-GB"),
        }),
      });

      return NextResponse.json({
        ok: true,
        message: "Staff member saved and setup email sent.",
        staffMember: getStaffMemberResponse(staffMember),
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Staff member saved.",
      staffMember: getStaffMemberResponse(staffMember),
    });
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Unable to save the staff member."
    );
    const code = getErrorCode(error);
    const lowerMessage = message.toLowerCase();

    if (
      code === "23505" &&
      lowerMessage.includes("staff_members_org_email_unique_idx")
    ) {
      return NextResponse.json(
        {
          error:
            "A staff member with this email already exists. Select them from Staff Members and use Edit to send a setup link or reset their password.",
        },
        { status: 409 }
      );
    }

    if (lowerMessage.includes("staff_account_invites")) {
      return NextResponse.json(
        {
          error:
            "Staff account invites are not ready yet. Run supabase/staff_account_invites.sql and refresh.",
        },
        { status: 503 }
      );
    }

    if (
      lowerMessage.includes("smtp") ||
      lowerMessage.includes("tls") ||
      lowerMessage.includes("ssl")
    ) {
      return NextResponse.json(
        {
          error: getFriendlySmtpErrorMessage(
            error,
            emailSettings.smtpPort ?? 587,
            Boolean(emailSettings.smtpSecure)
          ),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
