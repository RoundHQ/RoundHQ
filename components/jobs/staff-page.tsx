"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  Lock,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";

import type {
  Customer,
  RolePermission,
  StaffMember,
  StaffPageAccessKey,
  StaffRole,
} from "@/components/jobs/types";

type StaffPageAccessOption = {
  key: StaffPageAccessKey;
  label: string;
  section: string;
};

type StaffFormValues = {
  fullName: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  phone: string;
  notes: string;
};

type Props = {
  customers: Customer[];
  staffMembers: StaffMember[];
  rolePermissions: RolePermission[];
  pageOptions: StaffPageAccessOption[];
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  currentUserIsAdmin: boolean;
  staffSystemReady: boolean;
  staffLimit: number;
  staffAddOnQuantity?: number;
  subscriptionPlanName?: string;
  setupMessage?: string | null;
  onAddStaff: (values: StaffFormValues) => Promise<void>;
  onUpdateStaff: (staffId: number, values: StaffFormValues) => Promise<void>;
  onDeleteStaff: (staffId: number) => Promise<void>;
  onUpdateRolePermission: (
    role: Exclude<StaffRole, "Admin">,
    pageKey: StaffPageAccessKey,
    allowed: boolean
  ) => Promise<void>;
};

const EDITABLE_ROLES: Array<Exclude<StaffRole, "Admin">> = ["Staff", "Operator"];
const ADMIN_ONLY_PAGE_KEYS = new Set<StaffPageAccessKey>(["staff", "settings"]);

function getEmptyFormValues(): StaffFormValues {
  return {
    fullName: "",
    email: "",
    role: "Staff",
    isActive: true,
    phone: "",
    notes: "",
  };
}

function getFormValuesFromStaffMember(staffMember: StaffMember): StaffFormValues {
  return {
    fullName: staffMember.fullName,
    email: staffMember.email,
    role: staffMember.role,
    isActive: staffMember.isActive,
    phone: staffMember.phone ?? "",
    notes: staffMember.notes ?? "",
  };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function StaffPage({
  customers,
  staffMembers,
  rolePermissions,
  pageOptions,
  currentUserId,
  currentUserEmail,
  currentUserIsAdmin,
  staffSystemReady,
  staffLimit,
  staffAddOnQuantity = 0,
  subscriptionPlanName = "Current plan",
  setupMessage,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onUpdateRolePermission,
}: Props) {
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<StaffFormValues>(getEmptyFormValues);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingPermissionKey, setPendingPermissionKey] = useState<string | null>(
    null
  );

  const permissionLookup = useMemo(() => {
    return new Map(
      rolePermissions.map((permission) => [
        `${permission.role}:${permission.pageKey}`,
        permission.allowed,
      ])
    );
  }, [rolePermissions]);

  const assignedRoundCount = useMemo(() => {
    return customers.filter(
      (customer) => customer.isGrassCuttingCustomer && customer.assignedStaffId != null
    ).length;
  }, [customers]);

  const activeStaffCount = useMemo(() => {
    return staffMembers.filter((staffMember) => staffMember.isActive).length;
  }, [staffMembers]);
  const safeStaffLimit = Math.max(0, staffLimit);
  const staffUsagePercent =
    safeStaffLimit > 0
      ? Math.min(100, Math.round((activeStaffCount / safeStaffLimit) * 100))
      : 0;

  const currentUserEmailNormalized = normalizeEmail(currentUserEmail ?? "");

  const editingStaffMember = useMemo(() => {
    if (editorMode !== "edit" || editingStaffId == null) {
      return null;
    }

    return staffMembers.find((staffMember) => staffMember.id === editingStaffId) ?? null;
  }, [editingStaffId, editorMode, staffMembers]);

  function resetEditor() {
    setEditorMode("create");
    setEditingStaffId(null);
    setFormValues(getEmptyFormValues());
    setFormError(null);
  }

  function startCreate() {
    resetEditor();
  }

  function startEdit(staffMember: StaffMember) {
    setEditorMode("edit");
    setEditingStaffId(staffMember.id);
    setFormValues(getFormValuesFromStaffMember(staffMember));
    setFormError(null);
  }

  function getRolePermissionValue(
    role: StaffRole,
    pageKey: StaffPageAccessKey
  ): boolean {
    if (role === "Admin") {
      return true;
    }

    return permissionLookup.get(`${role}:${pageKey}`) ?? false;
  }

  function getStaffMemberAssignedRounds(staffMemberId: number) {
    return customers.filter(
      (customer) =>
        customer.isGrassCuttingCustomer && customer.assignedStaffId === staffMemberId
    ).length;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUserIsAdmin) {
      setFormError("Only the admin account can manage staff.");
      return;
    }

    if (!staffSystemReady) {
      setFormError("Run the staff system SQL setup first, then refresh.");
      return;
    }

    const nextFullName = formValues.fullName.trim();
    const nextEmail = normalizeEmail(formValues.email);

    if (!nextFullName) {
      setFormError("Full name is required.");
      return;
    }

    if (!nextEmail) {
      setFormError("Email is required.");
      return;
    }

    if (!nextEmail.includes("@")) {
      setFormError("Enter a valid email address.");
      return;
    }

    setIsSavingForm(true);
    setFormError(null);

    try {
      const payload: StaffFormValues = {
        ...formValues,
        fullName: nextFullName,
        email: nextEmail,
        phone: formValues.phone.trim(),
        notes: formValues.notes.trim(),
      };

      if (editorMode === "edit" && editingStaffId != null) {
        await onUpdateStaff(editingStaffId, payload);
        setFormValues(payload);
      } else {
        await onAddStaff(payload);
        resetEditor();
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save the staff member."
      );
    } finally {
      setIsSavingForm(false);
    }
  }

  async function handleDelete(staffMember: StaffMember) {
    if (!currentUserIsAdmin) {
      return;
    }

    if (!staffSystemReady) {
      setFormError("Run the staff system SQL setup first, then refresh.");
      return;
    }

    const shouldDelete = window.confirm(
      `Delete ${staffMember.fullName}? This will remove their staff record from the app.`
    );

    if (!shouldDelete) {
      return;
    }

    setPendingDeleteId(staffMember.id);

    try {
      await onDeleteStaff(staffMember.id);

      if (editingStaffId === staffMember.id) {
        resetEditor();
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to delete the staff member."
      );
    } finally {
      setPendingDeleteId(null);
    }
  }

  async function handlePermissionToggle(
    role: Exclude<StaffRole, "Admin">,
    pageKey: StaffPageAccessKey,
    allowed: boolean
  ) {
    if (!currentUserIsAdmin || !staffSystemReady || ADMIN_ONLY_PAGE_KEYS.has(pageKey)) {
      return;
    }

    const pendingKey = `${role}:${pageKey}`;
    setPendingPermissionKey(pendingKey);

    try {
      await onUpdateRolePermission(role, pageKey, allowed);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to update the role permissions."
      );
    } finally {
      setPendingPermissionKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Staff System
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              Staff, roles, and page access
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Your current account stays the single admin account. Staff and Operator
              roles can be given page-by-page access, while Staff and Settings remain
              admin-only.
            </p>
          </div>

          <button
            type="button"
            data-tour="add-staff-button"
            onClick={startCreate}
            disabled={!currentUserIsAdmin || !staffSystemReady}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Add Staff Member
          </button>
        </div>

        {setupMessage ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {setupMessage}
          </div>
        ) : null}

        {!currentUserIsAdmin ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Only the admin account can manage staff.
          </div>
        ) : null}

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-900">
                Staff account allowance
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {subscriptionPlanName}
                {staffAddOnQuantity > 0
                  ? ` plus ${staffAddOnQuantity} paid add-on${staffAddOnQuantity === 1 ? "" : "s"}`
                  : " included allowance"}
              </p>
            </div>
            <p className="text-sm font-black text-slate-900">
              {activeStaffCount.toLocaleString("en-GB")} /{" "}
              {safeStaffLimit.toLocaleString("en-GB")} used
            </p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${staffUsagePercent}%` }}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Users size={18} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Staff Members
                </p>
                <p className="text-2xl font-black text-slate-900">{staffMembers.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <ShieldCheck size={18} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Active Staff
                </p>
                <p className="text-2xl font-black text-slate-900">{activeStaffCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white">
                <UserCog size={18} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Assigned Rounds
                </p>
                <p className="text-2xl font-black text-slate-900">{assignedRoundCount}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
        <section className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900">Staff Members</h3>
              <p className="mt-1 text-sm text-slate-500">
                Add, edit, and remove staff accounts for app access.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {staffMembers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No staff members have been added yet.
              </div>
            ) : (
              staffMembers.map((staffMember) => {
                const isCurrentUser =
                  (staffMember.authUserId && staffMember.authUserId === currentUserId) ||
                  normalizeEmail(staffMember.email) === currentUserEmailNormalized;
                const isLockedAdmin = Boolean(staffMember.isSystemAdmin);

                return (
                  <div
                    key={staffMember.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">
                            {staffMember.fullName}
                          </h4>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              staffMember.role === "Admin"
                                ? "bg-slate-900 text-white"
                                : staffMember.role === "Operator"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {staffMember.role}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              staffMember.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {staffMember.isActive ? "Active" : "Inactive"}
                          </span>
                          {isLockedAdmin ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              <Lock size={12} />
                              Primary admin
                            </span>
                          ) : null}
                          {isCurrentUser ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              Logged in now
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-1 text-sm text-slate-500">
                          <p>{staffMember.email}</p>
                          {staffMember.phone ? <p>{staffMember.phone}</p> : null}
                          {staffMember.notes ? <p>{staffMember.notes}</p> : null}
                          <p>
                            {getStaffMemberAssignedRounds(staffMember.id)} assigned
                            round
                            {getStaffMemberAssignedRounds(staffMember.id) === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(staffMember)}
                          disabled={!currentUserIsAdmin}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(staffMember)}
                          disabled={
                            !currentUserIsAdmin ||
                            isLockedAdmin ||
                            isCurrentUser ||
                            pendingDeleteId === staffMember.id
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          {pendingDeleteId === staffMember.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {editorMode === "edit" ? "Edit Staff Member" : "Add Staff Member"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Staff and Operator accounts can be created here. The admin account
                stays locked to your current login.
              </p>
            </div>

            {editorMode === "edit" ? (
              <button
                type="button"
                onClick={resetEditor}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Full name
              </label>
              <input
                type="text"
                value={formValues.fullName}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="Enter staff name"
                disabled={!currentUserIsAdmin || !staffSystemReady}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={formValues.email}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="name@company.com"
                disabled={
                  !currentUserIsAdmin ||
                  !staffSystemReady ||
                  Boolean(editingStaffMember?.isSystemAdmin)
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Role
                </label>
                <select
                  value={formValues.role}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      role: event.target.value as StaffRole,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  disabled={
                    !currentUserIsAdmin ||
                    !staffSystemReady ||
                    Boolean(editingStaffMember?.isSystemAdmin)
                  }
                >
                  {editingStaffMember?.isSystemAdmin ? (
                    <option value="Admin">Admin</option>
                  ) : (
                    EDITABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Phone
                </label>
                <input
                  type="text"
                  value={formValues.phone}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  placeholder="Optional phone number"
                  disabled={!currentUserIsAdmin || !staffSystemReady}
                />
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={formValues.isActive}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300"
                disabled={
                  !currentUserIsAdmin ||
                  !staffSystemReady ||
                  Boolean(editingStaffMember?.isSystemAdmin)
                }
              />
              <span className="text-sm font-medium text-slate-700">
                Staff member can access the app
              </span>
            </label>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Notes
              </label>
              <textarea
                value={formValues.notes}
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="Optional notes"
                disabled={!currentUserIsAdmin || !staffSystemReady}
              />
            </div>

            {formError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!currentUserIsAdmin || !staffSystemReady || isSavingForm}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              {isSavingForm
                ? editorMode === "edit"
                  ? "Saving changes..."
                  : "Creating staff member..."
                : editorMode === "edit"
                  ? "Save Staff Member"
                  : "Create Staff Member"}
            </button>
          </form>
        </section>
      </div>

      <section
        data-tour="staff-permissions"
        className="rounded-3xl border bg-white p-5 shadow-sm"
      >
        <div>
          <h3 className="text-lg font-black text-slate-900">Role Access</h3>
          <p className="mt-1 text-sm text-slate-500">
            Admin always has complete access. Staff and Operator can be allowed
            onto the pages below, while Staff and Settings stay admin-only.
          </p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-slate-900" />
              <h4 className="font-bold text-slate-900">Admin</h4>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Your current account stays locked as the only admin account with full
              site access.
            </p>
            <div className="mt-4 space-y-2">
              {pageOptions.map((pageOption) => (
                <div
                  key={pageOption.key}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {pageOption.label}
                    </p>
                    <p className="text-xs text-slate-500">{pageOption.section}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Enabled
                  </span>
                </div>
              ))}
            </div>
          </div>

          {EDITABLE_ROLES.map((role) => (
            <div key={role} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <UserCog size={16} className="text-slate-900" />
                <h4 className="font-bold text-slate-900">{role}</h4>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Choose which pages this role can open in the app.
              </p>

              <div className="mt-4 space-y-2">
                {pageOptions.map((pageOption) => {
                  const isAdminOnlyPage = ADMIN_ONLY_PAGE_KEYS.has(pageOption.key);
                  const checked = isAdminOnlyPage
                    ? false
                    : getRolePermissionValue(role, pageOption.key);
                  const pendingKey = `${role}:${pageOption.key}`;

                  return (
                    <label
                      key={pageOption.key}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-2 ${
                        isAdminOnlyPage
                          ? "border-amber-200 bg-amber-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          handlePermissionToggle(role, pageOption.key, event.target.checked)
                        }
                        disabled={
                          !currentUserIsAdmin ||
                          !staffSystemReady ||
                          isAdminOnlyPage ||
                          pendingPermissionKey === pendingKey
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {pageOption.label}
                          </p>
                          {isAdminOnlyPage ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              <Lock size={10} />
                              Admin only
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500">{pageOption.section}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
