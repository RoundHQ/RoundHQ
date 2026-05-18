"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import CustomerForm from "./customer-form";
import {
  getCustomerDisplayAddress,
  getCustomerEmailAddresses,
  getCustomerTotals,
} from "./helpers";
import {
  DEFAULT_ROTATION_WEEKS,
  getCutFrequencyFromRotationWeeks,
  normalizeRotationWeeks,
  normalizeWeekNumber,
} from "./rotation";
import type { EditFormCollaboration } from "./edit-collaboration";
import type {
  Customer,
  CustomerType,
  DayName,
  GrassCutArea,
  MonthlyPayment,
  PaymentMethod,
  RotationWeeks,
  VisitLog,
} from "./types";
import { GRASS_CUT_AREA_OPTIONS } from "./types";

type Props = {
  customers: Customer[];
  visits: VisitLog[];
  monthlyPayments: MonthlyPayment[];
  grassCutSeasonStart: string;
  grassCutSeasonEnd: string;
  defaultRotationWeeks?: RotationWeeks;
  customerLimit?: number;
  allowCommercialTools?: boolean;
  autoOpenAddCustomerRequestId?: number;
  onAdd: (customer: Customer) => void | Promise<void>;
  onUpdate: (customer: Customer) => void | Promise<void>;
  onDelete: (customerId: number) => void;
  onOpenCustomer: (customerId: number) => void;
  getCustomerEditCollaboration?: (
    customer: Customer | undefined
  ) => EditFormCollaboration<Customer> | undefined;
};

type CustomerTypeFilter = "All" | "Residential" | "Commercial";
type SpreadsheetCell = string | number | boolean | Date | null | undefined;
type SpreadsheetRow = Record<string, SpreadsheetCell>;
type ImportIssue = { rowNumber: number; message: string };
type ParsedCustomerImport = {
  rowNumber: number;
  customer: Customer;
  warnings: string[];
};
type ImportPreview = {
  fileName: string;
  totalRows: number;
  validRows: ParsedCustomerImport[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
};
type ImportStatus = {
  tone: "success" | "error" | "info";
  message: string;
} | null;

const DAY_OPTIONS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  "Monthly",
  "On Day Transfer",
  "Cash",
];

const CUSTOMER_IMPORT_TEMPLATE_HEADERS = [
  "Customer Name (required)",
  "Customer Type",
  "Address (required)",
  "Town",
  "Postcode",
  "Contact Number",
  "Email",
  "Additional Emails",
  "On Service Round",
  "Service Amount",
  "Rotation Weeks",
  "Week",
  "Day",
  "Payment Method",
  "Service Areas",
  "Site Name",
  "Site Address",
  "Site Town",
  "Site Postcode",
  "Access Notes",
  "Notes",
  "Latitude",
  "Longitude",
  "Route Order",
];

const CUSTOMER_IMPORT_TEMPLATE_ROWS: Array<Record<string, string | number>> = [
  {
    "Customer Name (required)": "Jane Smith",
    "Customer Type": "Residential",
    "Address (required)": "10 Green Lane",
    Town: "East Kilbride",
    Postcode: "G75 1AA",
    "Contact Number": "07123 456789",
    Email: "jane@example.co.uk",
    "Additional Emails": "",
    "On Service Round": "Yes",
    "Service Amount": 25,
    "Rotation Weeks": 2,
    Week: "Week 1",
    Day: "Monday",
    "Payment Method": "On Day Transfer",
    "Service Areas": "Front, Back",
    "Site Name": "",
    "Site Address": "",
    "Site Town": "",
    "Site Postcode": "",
    "Access Notes": "Side gate code 1234",
    Notes: "Prefers morning visits",
    Latitude: "",
    Longitude: "",
    "Route Order": 1,
  },
  {
    "Customer Name (required)": "Acme Office Park",
    "Customer Type": "Commercial",
    "Address (required)": "1 Business Road",
    Town: "Glasgow",
    Postcode: "G1 2AB",
    "Contact Number": "0141 555 0123",
    Email: "facilities@example.co.uk",
    "Additional Emails": "accounts@example.co.uk; manager@example.co.uk",
    "On Service Round": "Yes",
    "Service Amount": 120,
    "Rotation Weeks": 4,
    Week: "Week 2",
    Day: "Friday",
    "Payment Method": "Monthly",
    "Service Areas": "All",
    "Site Name": "North entrance",
    "Site Address": "1 Business Road",
    "Site Town": "Glasgow",
    "Site Postcode": "G1 2AB",
    "Access Notes": "Report to reception",
    Notes: "Commercial example, remove if not needed",
    Latitude: "",
    Longitude: "",
    "Route Order": 2,
  },
];

function formatMoney(value: number | null | undefined) {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

function getCustomerEmailSummary(customer: Customer) {
  return getCustomerEmailAddresses(customer).join(", ");
}

function getCustomerPhone(customer: Customer) {
  const legacyCustomer = customer as Customer & {
    contactNumber?: string | null;
  };

  return legacyCustomer.phone ?? legacyCustomer.contactNumber ?? "";
}

function getCustomerPostcode(customer: Customer) {
  return customer.postcode ?? "";
}

function normalizeImportHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeComparable(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanImportCell(value: SpreadsheetCell) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value ?? "").trim();
}

function isSpreadsheetRowEmpty(row: SpreadsheetRow) {
  return Object.values(row).every((value) => cleanImportCell(value) === "");
}

function buildImportRowLookup(row: SpreadsheetRow) {
  const lookup = new Map<string, string>();

  Object.entries(row).forEach(([header, value]) => {
    lookup.set(normalizeImportHeader(header), cleanImportCell(value));
  });

  return lookup;
}

function getImportCell(lookup: Map<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = lookup.get(normalizeImportHeader(alias));

    if (value !== undefined) {
      return value;
    }
  }

  return "";
}

function parseImportNumber(value: string, fallback = 0) {
  if (!value.trim()) {
    return fallback;
  }

  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalImportNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseImportBoolean(value: string, fallback: boolean) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "y", "on", "round", "service"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "off", "none"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseImportCustomerType(value: string): CustomerType | null {
  const normalized = value.trim().toLowerCase();

  if (!normalized || normalized.startsWith("res")) {
    return "Residential";
  }

  if (
    normalized.startsWith("com") ||
    normalized.includes("business") ||
    normalized.includes("company")
  ) {
    return "Commercial";
  }

  return null;
}

function parseImportDay(value: string): DayName | null {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "Monday";
  }

  const directMatch = DAY_OPTIONS.find(
    (day) => day.toLowerCase() === normalized
  );

  if (directMatch) {
    return directMatch;
  }

  const shortMatch = DAY_OPTIONS.find(
    (day) => day.toLowerCase().slice(0, 3) === normalized.slice(0, 3)
  );

  return shortMatch ?? null;
}

function parseImportPaymentMethod(value: string): PaymentMethod | undefined {
  const normalized = normalizeComparable(value);

  if (!normalized) {
    return undefined;
  }

  if (normalized.includes("monthly")) {
    return "Monthly";
  }

  if (normalized.includes("cash")) {
    return "Cash";
  }

  if (
    normalized.includes("onday") ||
    normalized.includes("transfer") ||
    normalized.includes("bank")
  ) {
    return "On Day Transfer";
  }

  return undefined;
}

function parseImportRotationWeeks(
  value: string,
  fallback: RotationWeeks
): { value: RotationWeeks; explicit: boolean; isValid: boolean } {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return { value: fallback, explicit: false, isValid: true };
  }

  let parsed: number | null = null;
  const wholeNumberMatch = normalized.match(/\b([1-4])\b/);

  if (wholeNumberMatch) {
    parsed = Number(wholeNumberMatch[1]);
  } else if (normalized.includes("fortnight")) {
    parsed = 2;
  } else if (normalized.includes("month")) {
    parsed = 4;
  } else if (normalized.includes("3")) {
    parsed = 3;
  } else if (normalized.includes("4")) {
    parsed = 4;
  } else if (normalized.includes("weekly") || normalized === "week") {
    parsed = 1;
  }

  if ([1, 2, 3, 4].includes(Number(parsed))) {
    return {
      value: parsed as RotationWeeks,
      explicit: true,
      isValid: true,
    };
  }

  return { value: fallback, explicit: true, isValid: false };
}

function splitImportList(value: string) {
  return value
    .split(/[;,\n|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseImportGrassCutAreas(value: string) {
  const warnings: string[] = [];
  const parts = splitImportList(value);

  if (parts.length === 0) {
    return { areas: ["All"] as GrassCutArea[], warnings };
  }

  const areas: GrassCutArea[] = [];

  parts.forEach((part) => {
    const normalized = normalizeComparable(part);
    const match = GRASS_CUT_AREA_OPTIONS.find(
      (option) => normalizeComparable(option) === normalized
    );

    if (match && !areas.includes(match)) {
      areas.push(match);
      return;
    }

    warnings.push(`Unknown service area "${part}" was ignored.`);
  });

  if (areas.includes("All")) {
    return { areas: ["All"] as GrassCutArea[], warnings };
  }

  return {
    areas: areas.length > 0 ? areas : (["All"] as GrassCutArea[]),
    warnings,
  };
}

function looksLikeEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseImportEmails(primaryEmail: string, additionalEmails: string) {
  const warnings: string[] = [];
  const uniqueEmails = new Set<string>();

  [...splitImportList(primaryEmail), ...splitImportList(additionalEmails)].forEach(
    (email) => {
      const normalized = email.toLowerCase();

      if (!looksLikeEmailAddress(normalized)) {
        warnings.push(`"${email}" does not look like a valid email address.`);
        return;
      }

      uniqueEmails.add(normalized);
    }
  );

  return {
    emails: Array.from(uniqueEmails),
    warnings,
  };
}

function getCustomerDuplicateKey(
  name: string,
  address: string,
  postcode: string | undefined
) {
  const locationKey = normalizeComparable(postcode ?? "") || normalizeComparable(address);
  return `${normalizeComparable(name)}|${locationKey}`;
}

function createImportCustomerId(rowNumber: number, index: number) {
  return Date.now() + rowNumber + index;
}

function buildCustomerImportPreview({
  rows,
  customers,
  defaultRotationWeeks,
  customerLimit,
  allowCommercialTools,
  fileName,
}: {
  rows: SpreadsheetRow[];
  customers: Customer[];
  defaultRotationWeeks: RotationWeeks;
  customerLimit: number;
  allowCommercialTools: boolean;
  fileName: string;
}): ImportPreview {
  const validRows: ParsedCustomerImport[] = [];
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const seenImportKeys = new Set<string>();
  const existingKeys = new Set(
    customers.map((customer) =>
      getCustomerDuplicateKey(customer.name, customer.address, customer.postcode)
    )
  );
  const remainingSlots = Number.isFinite(customerLimit)
    ? Math.max(0, customerLimit - customers.length)
    : Number.POSITIVE_INFINITY;
  let totalRows = 0;

  rows.forEach((row, index) => {
    if (isSpreadsheetRowEmpty(row)) {
      return;
    }

    totalRows += 1;

    const rowNumber = index + 2;
    const lookup = buildImportRowLookup(row);
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];
    const name = getImportCell(lookup, [
      "Customer Name (required)",
      "Customer Name",
      "Customer",
      "Name",
    ]);
    const address = getImportCell(lookup, [
      "Address (required)",
      "Address",
      "Customer Address",
    ]);
    const town = getImportCell(lookup, ["Town", "City"]);
    const postcode = getImportCell(lookup, ["Postcode", "Post Code", "Zip"]);
    const phone = getImportCell(lookup, [
      "Contact Number",
      "Phone",
      "Telephone",
      "Mobile",
    ]);
    const email = getImportCell(lookup, ["Email", "Email Address"]);
    const additionalEmails = getImportCell(lookup, [
      "Additional Emails",
      "Contact Emails",
      "Extra Emails",
    ]);
    const customerTypeCell = getImportCell(lookup, [
      "Customer Type",
      "Type",
    ]);
    const customerType = parseImportCustomerType(customerTypeCell);
    const onServiceRound = parseImportBoolean(
      getImportCell(lookup, [
        "On Service Round",
        "Grass Cutting Customer",
        "Service Customer",
      ]),
      true
    );
    const grassCutAmount = parseImportNumber(
      getImportCell(lookup, [
        "Service Amount",
        "Grass Cut Amount",
        "Amount",
        "Price",
      ]),
      0
    );
    const rotation = parseImportRotationWeeks(
      getImportCell(lookup, [
        "Rotation Weeks",
        "Rotation",
        "Frequency Weeks",
        "Frequency",
      ]),
      defaultRotationWeeks
    );
    const weekCell = getImportCell(lookup, ["Week", "Service Week"]);
    const week = normalizeWeekNumber(weekCell || "Week 1", rotation.value);
    const day = parseImportDay(getImportCell(lookup, ["Day", "Service Day"]));
    const paymentMethod = parseImportPaymentMethod(
      getImportCell(lookup, ["Payment Method", "Payment"])
    );
    const serviceAreas = parseImportGrassCutAreas(
      getImportCell(lookup, [
        "Service Areas",
        "Grass Cut Areas",
        "Areas",
      ])
    );
    const emailResult = parseImportEmails(email, additionalEmails);
    const latitude = parseOptionalImportNumber(
      getImportCell(lookup, ["Latitude", "Lat"])
    );
    const longitude = parseOptionalImportNumber(
      getImportCell(lookup, ["Longitude", "Lng", "Long"])
    );
    const routeOrder = parseOptionalImportNumber(
      getImportCell(lookup, ["Route Order", "Order"])
    );

    if (!name) {
      rowErrors.push("Customer name is required.");
    }

    if (!address) {
      rowErrors.push("Address is required.");
    }

    if (!customerType) {
      rowErrors.push(
        "Customer Type must be Residential or Commercial when provided."
      );
    }

    if (customerType === "Commercial" && !allowCommercialTools) {
      rowErrors.push("Commercial customers are not available on this plan.");
    }

    if (!rotation.isValid) {
      rowErrors.push("Rotation Weeks must be 1, 2, 3, or 4 when provided.");
    }

    if (!day) {
      rowErrors.push(
        "Day must be Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, or Sunday."
      );
    }

    if (
      weekCell &&
      normalizeComparable(weekCell) !== normalizeComparable(week)
    ) {
      rowWarnings.push(
        `${weekCell} was adjusted to ${week} for the selected rotation.`
      );
    }

    if (emailResult.warnings.length > 0) {
      rowWarnings.push(...emailResult.warnings);
    }

    if (serviceAreas.warnings.length > 0) {
      rowWarnings.push(...serviceAreas.warnings);
    }

    if (!paymentMethod && getImportCell(lookup, ["Payment Method", "Payment"])) {
      rowWarnings.push(
        "Payment method was not recognised, so the business default will be used."
      );
    }

    if (name && address) {
      const duplicateKey = getCustomerDuplicateKey(name, address, postcode);

      if (existingKeys.has(duplicateKey)) {
        rowErrors.push("A matching customer already exists.");
      }

      if (seenImportKeys.has(duplicateKey)) {
        rowErrors.push("This customer appears more than once in the spreadsheet.");
      }

      seenImportKeys.add(duplicateKey);
    }

    if (validRows.length >= remainingSlots) {
      rowErrors.push("This row is over the plan customer limit.");
    }

    if (rowErrors.length > 0) {
      rowErrors.forEach((message) => errors.push({ rowNumber, message }));
      rowWarnings.forEach((message) => warnings.push({ rowNumber, message }));
      return;
    }

    const contactEmails = emailResult.emails;
    const effectiveCustomerType = customerType ?? "Residential";
    const nextCustomer: Customer = {
      id: createImportCustomerId(rowNumber, validRows.length),
      name,
      address,
      town: town || undefined,
      postcode: postcode || undefined,
      phone: phone || undefined,
      email: contactEmails[0] ?? undefined,
      contactEmails,
      isGrassCuttingCustomer: onServiceRound,
      grassCutAreas: onServiceRound ? serviceAreas.areas : [],
      week,
      day: day ?? "Monday",
      customerType: effectiveCustomerType,
      cutFrequency: getCutFrequencyFromRotationWeeks(rotation.value),
      rotationWeeksOverride: rotation.explicit ? rotation.value : null,
      grassCutAmount,
      siteName: getImportCell(lookup, ["Site Name"]) || undefined,
      siteAddress: getImportCell(lookup, ["Site Address"]) || undefined,
      siteTown: getImportCell(lookup, ["Site Town"]) || undefined,
      sitePostcode: getImportCell(lookup, ["Site Postcode"]) || undefined,
      paymentMethod,
      accessNotes: getImportCell(lookup, ["Access Notes", "Access"]) || undefined,
      notes: getImportCell(lookup, ["Notes", "Customer Notes"]) || undefined,
      latitude,
      longitude,
      routeOrder:
        routeOrder !== null && routeOrder > 0 ? Math.floor(routeOrder) : undefined,
      createdAt: new Date().toISOString(),
    };

    rowWarnings.forEach((message) => warnings.push({ rowNumber, message }));
    validRows.push({ rowNumber, customer: nextCustomer, warnings: rowWarnings });
  });

  return {
    fileName,
    totalRows,
    validRows,
    errors,
    warnings,
  };
}

function downloadCustomerImportTemplate() {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(CUSTOMER_IMPORT_TEMPLATE_ROWS, {
    header: CUSTOMER_IMPORT_TEMPLATE_HEADERS,
  });

  worksheet["!cols"] = CUSTOMER_IMPORT_TEMPLATE_HEADERS.map((header) => ({
    wch: Math.max(14, Math.min(34, header.length + 4)),
  }));

  const instructions = XLSX.utils.aoa_to_sheet([
    ["RoundHQ customer import template"],
    [""],
    ["Required columns", "Customer Name (required), Address (required)"],
    ["Customer Type", "Residential or Commercial"],
    ["On Service Round", "Yes or No"],
    ["Rotation Weeks", "1, 2, 3, or 4"],
    ["Week", "Week 1, Week 2, Week 3, or Week 4"],
    ["Day", "Monday through Sunday"],
    ["Payment Method", PAYMENT_METHOD_OPTIONS.join(", ")],
    ["Service Areas", GRASS_CUT_AREA_OPTIONS.join(", ")],
    [""],
    ["Tip", "Keep the header row unchanged, then replace the example rows."],
  ]);

  instructions["!cols"] = [{ wch: 24 }, { wch: 80 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
  XLSX.writeFile(workbook, "roundhq-customer-import-template.xlsx");
}

function CustomerModal({
                         existingCustomer,
                         defaultRotationWeeks,
                         allowCommercialTools,
                         editCollaboration,
                         onClose,
                         onSave,
                       }: {
  existingCustomer?: Customer;
  defaultRotationWeeks: RotationWeeks;
  allowCommercialTools: boolean;
  editCollaboration?: EditFormCollaboration<Customer>;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}) {
  return (
      <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
      >
        <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[24px] bg-white shadow-2xl">
          <CustomerForm
              existing={existingCustomer}
              defaultRotationWeeks={defaultRotationWeeks}
              allowCommercialTools={allowCommercialTools}
              editCollaboration={editCollaboration}
              onSave={onSave}
              onCancel={onClose}
          />
        </div>
      </div>
  );
}

function CustomerImportModal({
  preview,
  status,
  isImporting,
  onClose,
  onFileChange,
  onImport,
}: {
  preview: ImportPreview | null;
  status: ImportStatus;
  isImporting: boolean;
  onClose: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
}) {
  const statusClasses =
    status?.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status?.tone === "error"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isImporting) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[24px] bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Customer import
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Import customers from Excel
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Upload an .xlsx, .xls, or .csv file using the RoundHQ template.
                Rows are checked before customers are saved.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-950">
                Start with the template
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Keep the column headings as they are, replace the example rows,
                then upload the finished spreadsheet here.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadCustomerImportTemplate}
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Download template
            </button>
          </div>

          <label className="block rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center transition hover:border-emerald-300 hover:bg-emerald-50/40">
            <span className="text-sm font-semibold text-slate-900">
              Choose spreadsheet
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              Accepted formats: .xlsx, .xls, .csv
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onFileChange}
              disabled={isImporting}
              className="sr-only"
            />
          </label>

          {status ? (
            <div className={`rounded-2xl border px-4 py-3 text-sm ${statusClasses}`}>
              {status.message}
            </div>
          ) : null}

          {preview ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    File
                  </p>
                  <p className="mt-2 truncate text-sm font-bold text-slate-900">
                    {preview.fileName}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Rows found
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {preview.totalRows}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Ready
                  </p>
                  <p className="mt-2 text-2xl font-black text-emerald-900">
                    {preview.validRows.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                    Issues
                  </p>
                  <p className="mt-2 text-2xl font-black text-rose-900">
                    {preview.errors.length}
                  </p>
                </div>
              </div>

              {preview.errors.length > 0 ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <h3 className="text-sm font-bold text-rose-900">
                    Rows that need fixing
                  </h3>
                  <ul className="mt-3 max-h-36 space-y-2 overflow-auto text-sm text-rose-800">
                    {preview.errors.slice(0, 12).map((issue, index) => (
                      <li key={`${issue.rowNumber}-${index}`}>
                        Row {issue.rowNumber}: {issue.message}
                      </li>
                    ))}
                  </ul>
                  {preview.errors.length > 12 ? (
                    <p className="mt-2 text-xs font-semibold text-rose-700">
                      {preview.errors.length - 12} more issues hidden.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {preview.warnings.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="text-sm font-bold text-amber-900">
                    Warnings
                  </h3>
                  <ul className="mt-3 max-h-28 space-y-2 overflow-auto text-sm text-amber-800">
                    {preview.warnings.slice(0, 8).map((issue, index) => (
                      <li key={`${issue.rowNumber}-${index}`}>
                        Row {issue.rowNumber}: {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {preview.validRows.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Address</th>
                      <th className="px-4 py-3">Round</th>
                      <th className="px-4 py-3">Amount</th>
                    </tr>
                    </thead>
                    <tbody>
                    {preview.validRows.slice(0, 6).map(({ rowNumber, customer }) => (
                      <tr key={rowNumber} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-500">
                          {rowNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {customer.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {[customer.address, customer.town, customer.postcode]
                            .filter(Boolean)
                            .join(", ")}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {customer.week}, {customer.day}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {formatMoney(customer.grassCutAmount)}
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Rows with errors will be skipped until the spreadsheet is fixed.
                </p>
                <button
                  type="button"
                  onClick={onImport}
                  disabled={isImporting || preview.validRows.length === 0}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isImporting
                    ? "Importing..."
                    : `Import ${preview.validRows.length} customer${
                        preview.validRows.length === 1 ? "" : "s"
                      }`}
                </button>
              </div>
            </div>
          ) : null}
        </div>
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
                                        autoOpenAddCustomerRequestId = 0,
                                        onAdd,
                                        onUpdate,
                                        onDelete,
                                        onOpenCustomer,
                                        getCustomerEditCollaboration,
                                      }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] =
      useState<CustomerTypeFilter>("All");

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>(null);
  const [isImporting, setIsImporting] = useState(false);
  const handledAutoOpenRequestRef = useRef(0);
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
          getCustomerPhone(customer).toLowerCase().includes(query) ||
          getCustomerEmailSummary(customer).toLowerCase().includes(query) ||
          getCustomerPostcode(customer).toLowerCase().includes(query);

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

  function openImportModal() {
    if (customerLimitReached) {
      return;
    }

    setImportPreview(null);
    setImportStatus(null);
    setIsImportModalOpen(true);
  }

  useEffect(() => {
    if (
      autoOpenAddCustomerRequestId <= 0 ||
      customerLimitReached ||
      handledAutoOpenRequestRef.current === autoOpenAddCustomerRequestId
    ) {
      return;
    }

    handledAutoOpenRequestRef.current = autoOpenAddCustomerRequestId;
    const timeoutId = window.setTimeout(() => {
      setEditingCustomer(null);
      setIsCustomerModalOpen(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [autoOpenAddCustomerRequestId, customerLimitReached]);

  function openEditCustomerModal(customer: Customer) {
    setEditingCustomer(customer);
    setIsCustomerModalOpen(true);
  }

  function closeCustomerModal() {
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
  }

  function closeImportModal() {
    if (isImporting) {
      return;
    }

    setIsImportModalOpen(false);
    setImportPreview(null);
    setImportStatus(null);
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

  async function handleCustomerImportFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImportPreview(null);
    setImportStatus({
      tone: "info",
      message: "Reading spreadsheet...",
    });

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", raw: false });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error("Spreadsheet does not contain any sheets.");
      }

      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(worksheet, {
        defval: "",
        raw: false,
      });
      const nextPreview = buildCustomerImportPreview({
        rows,
        customers,
        defaultRotationWeeks: normalizedDefaultRotationWeeks,
        customerLimit,
        allowCommercialTools,
        fileName: file.name,
      });

      setImportPreview(nextPreview);
      setImportStatus({
        tone: nextPreview.validRows.length > 0 ? "info" : "error",
        message:
          nextPreview.validRows.length > 0
            ? `${nextPreview.validRows.length.toLocaleString()} customer${
                nextPreview.validRows.length === 1 ? "" : "s"
              } ready to import.`
            : "No importable customers were found. Check the required name and address columns.",
      });
    } catch (error) {
      setImportPreview(null);
      setImportStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "The spreadsheet could not be read.",
      });
    } finally {
      event.target.value = "";
    }
  }

  async function importCustomersFromPreview() {
    if (!importPreview || importPreview.validRows.length === 0) {
      return;
    }

    setIsImporting(true);
    setImportStatus({
      tone: "info",
      message: "Importing customers...",
    });

    const failedRows: ImportIssue[] = [];
    const remainingRows: ParsedCustomerImport[] = [];
    let importedCount = 0;

    for (const parsedRow of importPreview.validRows) {
      try {
        await onAdd(parsedRow.customer);
        importedCount += 1;
      } catch (error) {
        failedRows.push({
          rowNumber: parsedRow.rowNumber,
          message:
            error instanceof Error
              ? error.message
              : "This customer could not be saved.",
        });
        remainingRows.push(parsedRow);
      }
    }

    setIsImporting(false);

    if (failedRows.length > 0) {
      setImportPreview({
        ...importPreview,
        validRows: remainingRows,
        errors: [...importPreview.errors, ...failedRows],
      });
      setImportStatus({
        tone: importedCount > 0 ? "info" : "error",
        message:
          importedCount > 0
            ? `${importedCount.toLocaleString()} imported. ${failedRows.length.toLocaleString()} still need attention.`
            : "No customers were imported. Review the errors and try again.",
      });
      return;
    }

    setImportPreview(null);
    setImportStatus({
      tone: "success",
      message: `${importedCount.toLocaleString()} customer${
        importedCount === 1 ? "" : "s"
      } imported successfully.`,
    });
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
                Search, filter, manage, add, and edit customer records.
              </p>
              {Number.isFinite(customerLimit) ? (
                  <p className="mt-2 text-xs font-semibold text-white/70">
                    {customers.length.toLocaleString()} of {customerLimit.toLocaleString()} customer records used.
                  </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                  type="button"
                  onClick={downloadCustomerImportTemplate}
                  className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Download Template
              </button>

              <button
                  type="button"
                  onClick={openImportModal}
                  disabled={customerLimitReached}
                  className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Import Customers
              </button>

              <button
                  onClick={openAddCustomerModal}
                  disabled={customerLimitReached}
                  data-tour="add-customer-button"
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Add Customer
              </button>

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
                data-tour="customer-search"
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
                          <td className="px-4 py-4">
                            <button
                                type="button"
                                data-tour="customer-row-name"
                                onClick={() => onOpenCustomer(customer.id)}
                                className="text-left font-semibold text-slate-900 underline-offset-4 transition hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                            >
                              {customer.name}
                            </button>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {getCustomerDisplayAddress(customer) || "—"}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {getCustomerPhone(customer) || "—"}
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
                editCollaboration={getCustomerEditCollaboration?.(
                    editingCustomer ?? undefined
                )}
                onClose={closeCustomerModal}
                onSave={saveCustomerModal}
            />
        )}

        {isImportModalOpen && (
            <CustomerImportModal
                preview={importPreview}
                status={importStatus}
                isImporting={isImporting}
                onClose={closeImportModal}
                onFileChange={handleCustomerImportFileChange}
                onImport={importCustomersFromPreview}
            />
        )}

      </div>
  );
}
