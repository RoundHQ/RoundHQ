"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import CustomerForm from "./customer-form";
import {
  getCustomerDisplayAddress,
  getCustomerEmailAddresses,
  getCustomerTotals,
  parseEmailAddresses,
} from "./helpers";
import {
  DEFAULT_ROTATION_WEEKS,
  getCutFrequencyFromRotationWeeks,
  getRotationWeeksFromCutFrequency,
  normalizeNullableRotationWeeks,
  normalizeRotationWeeks,
  normalizeWeekNumber,
} from "./rotation";
import type {
  Customer,
  CutFrequency,
  MonthlyPayment,
  RotationWeeks,
  VisitLog,
  WeekNumber,
} from "./types";

type Props = {
  customers: Customer[];
  visits: VisitLog[];
  monthlyPayments: MonthlyPayment[];
  grassCutSeasonStart: string;
  grassCutSeasonEnd: string;
  defaultRotationWeeks?: RotationWeeks;
  customerLimit?: number;
  allowCommercialTools?: boolean;
  onAdd: (customer: Customer) => void;
  onUpdate: (customer: Customer) => void;
  onDelete: (customerId: number) => void;
  onOpenCustomer: (customerId: number) => void;
};

type CustomerTypeFilter = "All" | "Residential" | "Commercial";

type ImportRow = {
  id: string;
  name: string;
  address: string;
  postcode: string;
  town: string;
  phone: string;
  email: string;
  contactEmails: string[];
  customerType: "Residential" | "Commercial";
  isGrassCuttingCustomer: boolean;
  cutFrequency: CutFrequency;
  rotationWeeksOverride: RotationWeeks | null;
  grassCutAmount: number;
  paymentMethod: "Monthly" | "On Day Transfer" | "Cash";
  week: WeekNumber;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  notes: string;
  accessNotes: string;
  duplicateCustomerId: number | null;
  duplicateReason: string | null;
  isValid: boolean;
  invalidReason: string | null;
  importAction: "add" | "update" | "skip";
};

function formatMoney(value: number | null | undefined) {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

function normaliseString(value: unknown) {
  return String(value ?? "").trim();
}

function normaliseLower(value: unknown) {
  return normaliseString(value).toLowerCase();
}

function getCustomerEmailSummary(customer: Customer) {
  return getCustomerEmailAddresses(customer).join(", ");
}

function getCell(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return "";
}

function getText(row: Record<string, unknown>, keys: string[]) {
  return normaliseString(getCell(row, keys));
}

function getNumber(row: Record<string, unknown>, keys: string[]) {
  const raw = getCell(row, keys);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBoolean(
    row: Record<string, unknown>,
    keys: string[],
    fallback = false
) {
  const raw = normaliseLower(getCell(row, keys));
  if (!raw) return fallback;
  if (["yes", "y", "true", "1"].includes(raw)) return true;
  if (["no", "n", "false", "0"].includes(raw)) return false;
  return fallback;
}

function normaliseCustomerType(
    value: string
): "Residential" | "Commercial" {
  return value.toLowerCase().includes("commercial")
      ? "Commercial"
      : "Residential";
}

function normaliseFrequency(
    value: string
): CutFrequency {
  const lower = value.toLowerCase();
  if (lower.includes("3")) return "3 Weekly";
  if (lower.includes("month") || lower.includes("4")) return "Monthly";
  if ((lower.includes("weekly") || lower.includes("week")) && !lower.includes("fortnight")) {
    return "Weekly";
  }
  return "Fortnightly";
}

function normalisePaymentMethod(
    value: string
): "Monthly" | "On Day Transfer" | "Cash" {
  const lower = value.toLowerCase();
  if (lower.includes("cash")) return "Cash";
  if (lower.includes("transfer")) return "On Day Transfer";
  return "Monthly";
}

function normaliseWeek(value: string, rotationWeeks: RotationWeeks): WeekNumber {
  return normalizeWeekNumber(value, rotationWeeks);
}

function normaliseDay(
    value: string
): "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" {
  const lower = value.toLowerCase();
  if (lower.includes("tues")) return "Tuesday";
  if (lower.includes("wednes")) return "Wednesday";
  if (lower.includes("thurs")) return "Thursday";
  if (lower.includes("fri")) return "Friday";
  return "Monday";
}

function findDuplicateCustomer(
    imported: {
      name: string;
      address: string;
      postcode: string;
      contactEmails: string[];
      phone: string;
    },
    existingCustomers: Customer[]
) {
  const importedName = normaliseLower(imported.name);
  const importedAddress = normaliseLower(imported.address);
  const importedPostcode = normaliseLower(imported.postcode);
  const importedEmails = imported.contactEmails.map((email) => normaliseLower(email));
  const importedPhone = normaliseLower(imported.phone);

  for (const customer of existingCustomers) {
    const existingName = normaliseLower(customer.name);
    const existingAddress = normaliseLower(customer.address);
    const existingPostcode = normaliseLower((customer as any).postcode);
    const existingEmails = getCustomerEmailAddresses(customer).map((email) =>
        normaliseLower(email)
    );
    const existingPhone = normaliseLower(
        (customer as any).phone ?? (customer as any).contactNumber
    );

    if (
        importedAddress &&
        existingAddress &&
        importedAddress === existingAddress &&
        importedPostcode &&
        existingPostcode &&
        importedPostcode === existingPostcode
    ) {
      return {
        duplicateCustomerId: customer.id,
        duplicateReason: "Matching address and postcode",
      };
    }

    if (
        importedName &&
        existingName &&
        importedName === existingName &&
        importedAddress &&
        existingAddress &&
        importedAddress === existingAddress
    ) {
      return {
        duplicateCustomerId: customer.id,
        duplicateReason: "Matching name and address",
      };
    }

    if (
        importedEmails.length > 0 &&
        existingEmails.some((existingEmail) => importedEmails.includes(existingEmail))
    ) {
      return {
        duplicateCustomerId: customer.id,
        duplicateReason: "Matching email",
      };
    }

    if (
        importedPhone &&
        existingPhone &&
        importedPhone === existingPhone
    ) {
      return {
        duplicateCustomerId: customer.id,
        duplicateReason: "Matching phone number",
      };
    }
  }

  return {
    duplicateCustomerId: null,
    duplicateReason: null,
  };
}

function parseImportRows(
    workbookRows: Record<string, unknown>[],
    existingCustomers: Customer[],
    defaultRotationWeeks: RotationWeeks,
    allowCommercialTools: boolean
): ImportRow[] {
  return workbookRows.map((row, index) => {
    const name = getText(row, ["Name", "Customer Name"]);
    const address = getText(row, ["Address", "Customer Address"]);
    const postcode = getText(row, ["Postcode", "Post Code", "ZIP"]);
    const town = getText(row, ["Town", "City"]);
    const phone = getText(row, ["Phone", "Contact Number", "Mobile"]);
    const email = getText(row, ["Email", "E-mail"]);
    const contactEmails = parseEmailAddresses(email);
    const customerType = allowCommercialTools
        ? normaliseCustomerType(getText(row, ["Customer Type", "Type"]) || "Residential")
        : "Residential";
    const isGrassCuttingCustomer = getBoolean(
        row,
        ["Service Customer", "Grass Customer", "On Grass Round"],
        true
    );
    const frequencyText = getText(row, ["Service Rotation", "Frequency"]);
    const rotationWeeksOverride = frequencyText
        ? getRotationWeeksFromCutFrequency(normaliseFrequency(frequencyText))
        : null;
    const effectiveRotationWeeks = normalizeRotationWeeks(
        rotationWeeksOverride ?? defaultRotationWeeks
    );
    const cutFrequency = getCutFrequencyFromRotationWeeks(effectiveRotationWeeks);
    const grassCutAmount = getNumber(row, [
      "Service Amount",
      "Service Price",
      "Price",
    ]);
    const paymentMethod = normalisePaymentMethod(
        getText(row, ["Payment Type", "Payment Method"]) || "Monthly"
    );
    const week = normaliseWeek(getText(row, ["Week"]) || "Week 1", effectiveRotationWeeks);
    const day = normaliseDay(getText(row, ["Day"]) || "Monday");
    const notes = getText(row, ["Notes"]);
    const accessNotes = getText(row, ["Access Notes"]);

    let isValid = true;
    let invalidReason: string | null = null;

    if (!name) {
      isValid = false;
      invalidReason = "Missing customer name";
    } else if (!address) {
      isValid = false;
      invalidReason = "Missing address";
    }

    const duplicate = findDuplicateCustomer(
        { name, address, postcode, contactEmails, phone },
        existingCustomers
    );

    return {
      id: `${Date.now()}-${index}`,
      name,
      address,
      postcode,
      town,
      phone,
      email,
      contactEmails,
      customerType,
      isGrassCuttingCustomer,
      cutFrequency,
      rotationWeeksOverride,
      grassCutAmount,
      paymentMethod,
      week,
      day,
      notes,
      accessNotes,
      duplicateCustomerId: duplicate.duplicateCustomerId,
      duplicateReason: duplicate.duplicateReason,
      isValid,
      invalidReason,
      importAction: !isValid
          ? "skip"
          : duplicate.duplicateCustomerId
              ? "update"
              : "add",
    };
  });
}

function CustomerModal({
                         existingCustomer,
                         defaultRotationWeeks,
                         allowCommercialTools,
                         onClose,
                         onSave,
                       }: {
  existingCustomer?: Customer;
  defaultRotationWeeks: RotationWeeks;
  allowCommercialTools: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}) {
  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[24px] bg-white shadow-2xl">
          <CustomerForm
              existing={existingCustomer}
              defaultRotationWeeks={defaultRotationWeeks}
              allowCommercialTools={allowCommercialTools}
              onSave={onSave}
              onCancel={onClose}
          />
        </div>
      </div>
  );
}

export default function CustomersPage({
                                        customers,
                                        visits,
                                        monthlyPayments,
                                        grassCutSeasonStart,
                                        grassCutSeasonEnd,
                                        defaultRotationWeeks = DEFAULT_ROTATION_WEEKS,
                                        customerLimit = Number.POSITIVE_INFINITY,
                                        allowCommercialTools = true,
                                        onAdd,
                                        onUpdate,
                                        onDelete,
                                        onOpenCustomer,
                                      }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] =
      useState<CustomerTypeFilter>("All");

  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importSummary, setImportSummary] = useState<{
    added: number;
    updated: number;
    skipped: number;
  } | null>(null);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const normalizedDefaultRotationWeeks =
      normalizeRotationWeeks(defaultRotationWeeks);
  const customerLimitReached = customers.length >= customerLimit;

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesType =
          typeFilter === "All" ||
          customer.customerType === typeFilter;

      const matchesSearch =
          !query ||
          customer.name.toLowerCase().includes(query) ||
          getCustomerDisplayAddress(customer).toLowerCase().includes(query) ||
          String((customer as any).phone ?? "")
              .toLowerCase()
              .includes(query) ||
          getCustomerEmailSummary(customer).toLowerCase().includes(query) ||
          String((customer as any).postcode ?? "")
              .toLowerCase()
              .includes(query);

      return matchesType && matchesSearch;
    });
  }, [customers, search, typeFilter]);

  function openAddCustomerModal() {
    if (customerLimitReached) {
      return;
    }

    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  }

  function openEditCustomerModal(customer: Customer) {
    setEditingCustomer(customer);
    setIsCustomerModalOpen(true);
  }

  function closeCustomerModal() {
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
  }

  async function saveCustomerModal(customer: Customer) {
    try {
      if (editingCustomer) {
        await onUpdate(customer);
      } else {
        await onAdd(customer);
      }

      closeCustomerModal();
    } catch {
      // Keep the modal open so the user can retry after the shared error banner updates.
    }
  }

  async function handleImportFile(
      e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const templateSheetName =
          workbook.SheetNames.find(
              (name) => name.trim().toLowerCase() === "template"
          ) ?? workbook.SheetNames[0];

      const sheet = workbook.Sheets[templateSheetName];

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      const meaningfulRows = rows.filter((row) => {
        const name = getText(row, ["Name", "Customer Name"]);
        const address = getText(row, ["Address", "Customer Address"]);
        return name || address;
      });

      const parsedRows = parseImportRows(
          meaningfulRows,
          customers,
          normalizedDefaultRotationWeeks,
          allowCommercialTools
      );

      setImportRows(parsedRows);
      setImportFileName(file.name);
      setIsImportModalOpen(true);
      setImportSummary(null);
    } catch (error) {
      console.error(error);
      alert("Import failed. Please check the file format.");
    }

    e.target.value = "";
  }

  function updateImportAction(
      rowId: string,
      action: "add" | "update" | "skip"
  ) {
    setImportRows((prev) =>
        prev.map((row) =>
            row.id === rowId ? { ...row, importAction: action } : row
        )
    );
  }

  function setAllImportActions(action: "add" | "update" | "skip") {
    setImportRows((prev) =>
        prev.map((row) =>
            row.isValid ? { ...row, importAction: action } : row
        )
    );
  }

  async function handleConfirmImport() {
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const [index, row] of importRows.entries()) {
      if (!row.isValid || row.importAction === "skip") {
        skipped += 1;
        continue;
      }

      const builtCustomer: Customer = {
        id:
            row.importAction === "update" && row.duplicateCustomerId
                ? row.duplicateCustomerId
                : Date.now() + index,
        name: row.name,
        address: row.address,
        postcode: row.postcode,
        town: row.town,
        phone: row.phone,
        email: row.contactEmails[0] ?? row.email,
        contactEmails:
            row.customerType === "Commercial" ? row.contactEmails : undefined,
        isGrassCuttingCustomer: row.isGrassCuttingCustomer,
        customerType: row.customerType,
        cutFrequency: row.cutFrequency,
        rotationWeeksOverride: normalizeNullableRotationWeeks(
            row.rotationWeeksOverride
        ),
        grassCutAmount: row.grassCutAmount,
        paymentMethod: row.paymentMethod,
        week: row.week,
        day: row.day,
        notes: row.notes,
        accessNotes: row.accessNotes,
        latitude: null,
        longitude: null,
        createdAt: new Date().toISOString(),
      } as Customer;

      if (row.importAction === "update" && row.duplicateCustomerId) {
        const existing = customers.find((c) => c.id === row.duplicateCustomerId);

        try {
          await onUpdate({
            ...(existing as Customer),
            ...builtCustomer,
            id: row.duplicateCustomerId,
            createdAt:
                (existing as any)?.createdAt ?? new Date().toISOString(),
          });

          updated += 1;
        } catch {
          skipped += 1;
        }
      } else {
        const nextCustomerCount = customers.length + added;

        if (nextCustomerCount >= customerLimit) {
          skipped += 1;
          continue;
        }

        try {
          await onAdd(builtCustomer);
          added += 1;
        } catch {
          skipped += 1;
        }
      }
    }

    setImportSummary({ added, updated, skipped });
  }

  function closeImportModal() {
    setIsImportModalOpen(false);
    setImportRows([]);
    setImportFileName("");
  }

  return (
      <div className="space-y-6">
        <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                Customer System
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Customers
              </h1>
              <p className="mt-2 text-sm text-white/75">
                Search, filter, manage, add, edit, and import customer records.
              </p>
              {Number.isFinite(customerLimit) ? (
                  <p className="mt-2 text-xs font-semibold text-white/70">
                    {customers.length.toLocaleString()} of {customerLimit.toLocaleString()} customer records used.
                  </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                  onClick={openAddCustomerModal}
                  disabled={customerLimitReached}
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Add Customer
              </button>

              <label className={`rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 ${
                  customerLimitReached ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}>
                Import Excel
                <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    disabled={customerLimitReached}
                    onChange={handleImportFile}
                />
              </label>
            </div>
          </div>
          {customerLimitReached ? (
              <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80">
                This plan has reached its customer limit.
              </div>
          ) : null}
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, address, phone, email, postcode..."
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
            />

            <select
                value={typeFilter}
                onChange={(e) =>
                    setTypeFilter(e.target.value as CustomerTypeFilter)
                }
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="All">All Types</option>
              <option value="Residential">Residential</option>
              {allowCommercialTools ? (
                  <option value="Commercial">Commercial</option>
              ) : null}
            </select>

            <div className="text-sm text-slate-400">
              {filteredCustomers.length} customers
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Contact Number</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Season Spent</th>
                <th className="px-4 py-3">Season Outstanding</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
              </thead>

              <tbody>
              {filteredCustomers.length === 0 ? (
                  <tr>
                    <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No customers found.
                    </td>
                  </tr>
              ) : (
                  filteredCustomers.map((customer) => {
                    const totals = getCustomerTotals(
                        customer.id,
                        visits,
                        customers,
                        monthlyPayments,
                        grassCutSeasonStart,
                        grassCutSeasonEnd
                    );

                    return (
                        <tr
                            key={customer.id}
                            className="border-t border-slate-100"
                        >
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            {customer.name}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {getCustomerDisplayAddress(customer) || "—"}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {(customer as any).phone ??
                                (customer as any).contactNumber ??
                                "—"}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {getCustomerEmailSummary(customer) || "—"}
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                            {formatMoney(totals.totalSpent)}
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-rose-600">
                            {formatMoney(totals.outstanding)}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                  onClick={() => onOpenCustomer(customer.id)}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Open
                              </button>

                              <button
                                  onClick={() => openEditCustomerModal(customer)}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Edit
                              </button>

                              <button
                                  onClick={() => onDelete(customer.id)}
                                  className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                    );
                  })
              )}
              </tbody>
            </table>
          </div>
        </section>

        {isCustomerModalOpen && (
            <CustomerModal
                existingCustomer={editingCustomer ?? undefined}
                defaultRotationWeeks={normalizedDefaultRotationWeeks}
                allowCommercialTools={allowCommercialTools}
                onClose={closeCustomerModal}
                onSave={saveCustomerModal}
            />
        )}

        {isImportModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[24px] bg-white shadow-2xl">
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Import Customers
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-slate-900">
                        Review Import File
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        File: {importFileName}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                          onClick={() => setAllImportActions("add")}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Set All to Add
                      </button>
                      <button
                          onClick={() => setAllImportActions("update")}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Set All to Update
                      </button>
                      <button
                          onClick={() => setAllImportActions("skip")}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Set All to Skip
                      </button>
                    </div>
                  </div>
                </div>

                <div className="max-h-[55vh] overflow-auto px-6 py-4">
                  <table className="min-w-full">
                    <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-3 py-3">Name</th>
                      <th className="px-3 py-3">Address</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Grass</th>
                      <th className="px-3 py-3">Amount</th>
                      <th className="px-3 py-3">Duplicate</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Action</th>
                    </tr>
                    </thead>

                    <tbody>
                    {importRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-3 py-3 text-sm font-semibold text-slate-900">
                            {row.name || "—"}
                          </td>

                          <td className="px-3 py-3 text-sm text-slate-600">
                            {row.address || "—"}
                          </td>

                          <td className="px-3 py-3 text-sm text-slate-600">
                            {row.customerType}
                          </td>

                          <td className="px-3 py-3 text-sm text-slate-600">
                            {row.isGrassCuttingCustomer ? "Yes" : "No"}
                          </td>

                          <td className="px-3 py-3 text-sm text-slate-600">
                            {formatMoney(row.grassCutAmount)}
                          </td>

                          <td className="px-3 py-3 text-sm text-slate-600">
                            {row.duplicateReason || "—"}
                          </td>

                          <td className="px-3 py-3 text-sm">
                            {!row.isValid ? (
                                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                            {row.invalidReason}
                          </span>
                            ) : row.duplicateCustomerId ? (
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            Duplicate Found
                          </span>
                            ) : (
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Ready
                          </span>
                            )}
                          </td>

                          <td className="px-3 py-3">
                            <select
                                value={row.importAction}
                                disabled={!row.isValid}
                                onChange={(e) =>
                                    updateImportAction(
                                        row.id,
                                        e.target.value as "add" | "update" | "skip"
                                    )
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                            >
                              <option value="add">Add</option>
                              <option value="update">Update</option>
                              <option value="skip">Skip</option>
                            </select>
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-200 px-6 py-5">
                  {importSummary && (
                      <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                        <span className="font-semibold">{importSummary.added}</span> added,{" "}
                        <span className="font-semibold">{importSummary.updated}</span> updated,{" "}
                        <span className="font-semibold">{importSummary.skipped}</span> skipped.
                      </div>
                  )}

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                        onClick={closeImportModal}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Close
                    </button>

                    <button
                        onClick={handleConfirmImport}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Confirm Import
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}
