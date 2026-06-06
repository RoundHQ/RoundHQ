import type { StaffRole } from "@/components/jobs/types";
import { normalizeStaffRole } from "@/lib/team-permissions";

export const STAFF_INVITE_EXPIRY_DAYS = 7;
export const STAFF_MIN_PASSWORD_LENGTH = 8;

export type StaffInviteMode = "setup" | "owner_password";

export function normalizeStaffInviteEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeStaffInviteText(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeStaffInviteRole(value: unknown): Exclude<StaffRole, "Admin" | "Operator"> {
  const role = normalizeStaffRole(value);
  return role === "Manager" ? "Manager" : "Staff";
}

export function getStaffInviteExpiryDate(now = new Date()) {
  const expiryDate = new Date(now);
  expiryDate.setDate(expiryDate.getDate() + STAFF_INVITE_EXPIRY_DAYS);
  return expiryDate;
}

export function validateStaffPassword(password: string) {
  if (!password) {
    return "Enter a password.";
  }

  if (password.length < STAFF_MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${STAFF_MIN_PASSWORD_LENGTH} characters.`;
  }

  return "";
}

export function buildStaffSetupEmail(options: {
  staffName: string;
  workspaceName: string;
  setupLink: string;
  expiresAt: string;
}) {
  return [
    `Hi ${options.staffName},`,
    "",
    `You have been invited to join ${options.workspaceName} on RoundHQ.`,
    "",
    "Set up your staff account here:",
    options.setupLink,
    "",
    `This link expires on ${options.expiresAt}.`,
    "",
    "Once your password is saved, you can sign in and open your assigned work in RoundHQ.",
    "",
    "Kind regards,",
    "RoundHQ",
  ].join("\n");
}

export function buildStaffPasswordEmail(options: {
  staffName: string;
  workspaceName: string;
  loginUrl: string;
  email: string;
  temporaryPassword: string;
}) {
  return [
    `Hi ${options.staffName},`,
    "",
    `Your RoundHQ staff account for ${options.workspaceName} has been set up.`,
    "",
    "Login here:",
    options.loginUrl,
    "",
    `Email: ${options.email}`,
    `Password: ${options.temporaryPassword}`,
    "",
    "Keep these details private. Your dashboard owner can reset this password if needed.",
    "",
    "Kind regards,",
    "RoundHQ",
  ].join("\n");
}
