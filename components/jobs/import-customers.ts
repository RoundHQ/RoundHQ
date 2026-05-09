import * as XLSX from "xlsx";
import {
    getRotationWeeksFromCutFrequency,
    normalizeWeekNumber,
} from "./rotation";
import type { Customer, CutFrequency, WeekNumber } from "./types";

type RawRow = Record<string, unknown>;

function getString(row: RawRow, keys: string[]) {
    for (const key of keys) {
        const value = row[key];
        if (value != null && String(value).trim() !== "") {
            return String(value).trim();
        }
    }
    return "";
}

function getNumber(row: RawRow, keys: string[]) {
    for (const key of keys) {
        const value = row[key];
        if (value != null && String(value).trim() !== "") {
            const parsed = Number(value);
            if (!Number.isNaN(parsed)) return parsed;
        }
    }
    return 0;
}

function getBoolean(row: RawRow, keys: string[], fallback = false) {
    for (const key of keys) {
        const value = row[key];
        if (value == null) continue;

        const normalised = String(value).trim().toLowerCase();

        if (["yes", "true", "1", "y"].includes(normalised)) return true;
        if (["no", "false", "0", "n"].includes(normalised)) return false;
    }
    return fallback;
}

function normaliseCustomerType(value: string): "Residential" | "Commercial" {
    return value.toLowerCase() === "commercial" ? "Commercial" : "Residential";
}

function normaliseFrequency(value: string): CutFrequency {
    const lower = value.toLowerCase();
    if (lower.includes("3")) return "3 Weekly";
    if (lower.includes("month") || lower.includes("4")) return "Monthly";
    if ((lower.includes("weekly") || lower.includes("week")) && !lower.includes("fortnight")) {
        return "Weekly";
    }
    return "Fortnightly";
}

function normalisePaymentType(value: string): "Monthly" | "On Day Transfer" | "Cash" {
    const lower = value.toLowerCase();
    if (lower.includes("cash")) return "Cash";
    if (lower.includes("transfer")) return "On Day Transfer";
    return "Monthly";
}

function normaliseWeek(value: string, rotationWeeks: number): WeekNumber {
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

export async function importCustomersFromFile(file: File): Promise<Customer[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

    const customers: Customer[] = rows
        .map((row, index) => {
            const name = getString(row, ["Name", "Customer Name"]);
            const address = getString(row, ["Address", "Customer Address"]);
            const postcode = getString(row, ["Postcode", "ZIP", "Post Code"]);
            const town = getString(row, ["Town", "City"]);
            const phone = getString(row, ["Phone", "Contact Number", "Mobile"]);
            const email = getString(row, ["Email", "E-mail"]);
            const customerType = normaliseCustomerType(
                getString(row, ["Customer Type", "Type"]) || "Residential"
            );
            const isGrassCuttingCustomer = getBoolean(
                row,
                ["Service Customer", "Grass Customer", "On Grass Round"],
                true
            );
            const cutFrequency = normaliseFrequency(
                getString(row, ["Service Rotation", "Frequency"]) || "Fortnightly"
            );
            const rotationWeeksOverride = getRotationWeeksFromCutFrequency(cutFrequency);
            const grassCutAmount = getNumber(row, ["Service Amount", "Price", "Service Price"]);
            const paymentMethod = normalisePaymentType(
                getString(row, ["Payment Type", "Payment Method"]) || "Monthly"
            );
            const week = normaliseWeek(
                getString(row, ["Week"]) || "Week 1",
                rotationWeeksOverride
            );
            const day = normaliseDay(getString(row, ["Day"]) || "Monday");
            const notes = getString(row, ["Notes"]);
            const accessNotes = getString(row, ["Access Notes"]);

            if (!name || !address) return null;

            return {
                id: Date.now() + index,
                name,
                address,
                postcode,
                town,
                phone,
                email,
                isGrassCuttingCustomer,
                customerType,
                cutFrequency,
                rotationWeeksOverride,
                grassCutAmount,
                paymentMethod,
                week,
                day,
                notes,
                accessNotes,
                latitude: null,
                longitude: null,
                createdAt: new Date().toISOString(),
            } as Customer;
        })
        .filter(Boolean) as Customer[];

    return customers;
}
