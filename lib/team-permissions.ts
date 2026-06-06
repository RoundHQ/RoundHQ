import type { StaffPageAccessKey, StaffRole } from "@/components/jobs/types";

export const STAFF_ROLES: StaffRole[] = ["Admin", "Manager", "Staff"];
export const EDITABLE_STAFF_ROLES: Array<Exclude<StaffRole, "Admin" | "Operator">> = [
  "Manager",
  "Staff",
];

export const ADMIN_ONLY_STAFF_PAGE_KEYS = new Set<StaffPageAccessKey>([
  "staff",
  "settings",
]);

export const DEFAULT_ROLE_PAGE_ACCESS: Record<StaffRole, StaffPageAccessKey[]> = {
  Admin: [
    "dashboard",
    "schedule",
    "rounds",
    "history",
    "map",
    "actions",
    "commercial",
    "commercialDocs",
    "customers",
    "expenses",
    "quotes",
    "invoices",
    "staff",
    "settings",
    "technician",
  ],
  Manager: [
    "dashboard",
    "schedule",
    "rounds",
    "history",
    "map",
    "actions",
    "commercial",
    "commercialDocs",
    "customers",
    "expenses",
    "quotes",
    "invoices",
    "technician",
  ],
  Staff: ["technician"],
  Operator: [
    "dashboard",
    "schedule",
    "rounds",
    "history",
    "map",
    "actions",
    "commercial",
    "commercialDocs",
    "customers",
    "expenses",
    "quotes",
    "invoices",
    "technician",
  ],
};

export function normalizeStaffRole(value: unknown): StaffRole {
  if (value === "Admin" || value === "Manager" || value === "Staff") {
    return value;
  }

  if (value === "Operator") {
    return "Manager";
  }

  return "Staff";
}

export function isAdminStaffRole(role: StaffRole | null | undefined) {
  return normalizeStaffRole(role) === "Admin";
}

export function canManageTeam(role: StaffRole | null | undefined) {
  return isAdminStaffRole(role);
}

export function canAccessBilling(role: StaffRole | null | undefined) {
  return isAdminStaffRole(role);
}

export function canAccessAdminSettings(role: StaffRole | null | undefined) {
  return isAdminStaffRole(role);
}

export function canAccessOperationalScreens(role: StaffRole | null | undefined) {
  const normalizedRole = normalizeStaffRole(role);
  return normalizedRole === "Admin" || normalizedRole === "Manager";
}

export function canAccessTechnicianMode(role: StaffRole | null | undefined) {
  return getDefaultRolePageAccess(role).includes("technician");
}

export function getDefaultRolePageAccess(role: StaffRole | null | undefined) {
  return DEFAULT_ROLE_PAGE_ACCESS[normalizeStaffRole(role)];
}

export function getAllowedStaffPageKeys(
  role: StaffRole | null | undefined,
  explicitPermissions: StaffPageAccessKey[] = []
) {
  const normalizedRole = normalizeStaffRole(role);

  if (normalizedRole === "Admin") {
    return new Set(DEFAULT_ROLE_PAGE_ACCESS.Admin);
  }

  const operationalPermissions =
    explicitPermissions.length > 0
      ? explicitPermissions
      : DEFAULT_ROLE_PAGE_ACCESS[normalizedRole];

  return new Set(
    operationalPermissions.filter((pageKey) => !ADMIN_ONLY_STAFF_PAGE_KEYS.has(pageKey))
  );
}

export function canAccessStaffPageKey(
  role: StaffRole | null | undefined,
  pageKey: StaffPageAccessKey,
  allowedPageKeys?: Set<StaffPageAccessKey>
) {
  const normalizedRole = normalizeStaffRole(role);

  if (normalizedRole === "Admin") {
    return true;
  }

  if (ADMIN_ONLY_STAFF_PAGE_KEYS.has(pageKey)) {
    return false;
  }

  return allowedPageKeys?.has(pageKey) ?? getDefaultRolePageAccess(normalizedRole).includes(pageKey);
}
