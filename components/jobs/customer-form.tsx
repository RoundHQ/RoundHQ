"use client";

import { useMemo, useState } from "react";
import { getCustomerEmailAddresses, normalizeGrassCutAreas } from "./helpers";
import {
    DEFAULT_ROTATION_WEEKS,
    ROTATION_WEEK_OPTIONS,
    getCutFrequencyFromRotationWeeks,
    getEffectiveRotationWeeks,
    getRotationCycleLabel,
    getRotationLabel,
    getWeekOptions,
    normalizeNullableRotationWeeks,
    normalizeRotationWeeks,
    normalizeWeekNumber,
} from "./rotation";
import {
    GRASS_CUT_AREA_OPTIONS,
    type Customer,
    type CustomerType,
    type DayName,
    type GrassCutArea,
    type PaymentMethod,
    type RotationWeeks,
    type WeekNumber,
} from "./types";
import AddressAutocompleteInput from "./address-autocomplete-input";

type Props = {
    existing?: Customer;
    defaultRotationWeeks?: RotationWeeks;
    allowCommercialTools?: boolean;
    onSave: (customer: Customer) => void;
    onCancel: () => void;
};

function buildInitialCustomer(
    existing: Customer | undefined,
    defaultRotationWeeks: RotationWeeks
): Customer {
    if (existing) {
        const effectiveRotationWeeks = getEffectiveRotationWeeks(
            existing,
            defaultRotationWeeks
        );

        return {
            ...existing,
            contactEmails: getCustomerEmailAddresses(existing),
            rotationWeeksOverride: normalizeNullableRotationWeeks(
                existing.rotationWeeksOverride
            ),
            cutFrequency: getCutFrequencyFromRotationWeeks(effectiveRotationWeeks),
            week: normalizeWeekNumber(existing.week, effectiveRotationWeeks),
            grassCutAreas: normalizeGrassCutAreas(
                existing.grassCutAreas,
                existing.isGrassCuttingCustomer
            ),
        };
    }

    const normalizedDefaultRotationWeeks =
        normalizeRotationWeeks(defaultRotationWeeks);

    return {
        id: Date.now(),
        name: "",
        address: "",
        postcode: "",
        town: "",
        phone: "",
        email: "",
        contactEmails: [],
        customerType: "Residential",
        cutFrequency: getCutFrequencyFromRotationWeeks(normalizedDefaultRotationWeeks),
        rotationWeeksOverride: null,
        isGrassCuttingCustomer: true,
        grassCutAreas: ["All"],
        grassCutAmount: 0,
        siteName: "",
        siteAddress: "",
        siteTown: "",
        sitePostcode: "",
        week: normalizeWeekNumber("Week 1", normalizedDefaultRotationWeeks),
        day: "Monday",
        notes: "",
        accessNotes: "",
        latitude: null,
        longitude: null,
        createdAt: new Date().toISOString(),
    };
}

function normalizeContactEmails(emails: string[] | undefined) {
    return Array.from(
        new Map(
            (emails ?? [])
                .map((entry) => entry.trim())
                .filter(Boolean)
                .map((entry) => [entry.toLowerCase(), entry])
        ).values()
    );
}

export default function CustomerForm({
    existing,
    defaultRotationWeeks = DEFAULT_ROTATION_WEEKS,
    allowCommercialTools = true,
    onSave,
    onCancel,
}: Props) {
    const normalizedDefaultRotationWeeks =
        normalizeRotationWeeks(defaultRotationWeeks);
    const [form, setForm] = useState<Customer>(() =>
        buildInitialCustomer(existing, normalizedDefaultRotationWeeks)
    );

    const [postcodeLocked, setPostcodeLocked] = useState(
        Boolean(existing?.postcode)
    );

    function update<K extends keyof Customer>(key: K, value: Customer[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function updateGrassCuttingCustomer(isGrassCuttingCustomer: boolean) {
        setForm((prev) => ({
            ...prev,
            isGrassCuttingCustomer,
            grassCutAreas: normalizeGrassCutAreas(
                prev.grassCutAreas,
                isGrassCuttingCustomer
            ),
        }));
    }

    function updateGrassCutArea(area: GrassCutArea, checked: boolean) {
        setForm((prev) => {
            if (area === "All") {
                return {
                    ...prev,
                    grassCutAreas: ["All"],
                };
            }

            const currentAreas = normalizeGrassCutAreas(
                prev.grassCutAreas,
                prev.isGrassCuttingCustomer
            ).filter((currentArea) => currentArea !== "All");
            const nextAreas = checked
                ? Array.from(new Set([...currentAreas, area]))
                : currentAreas.filter((currentArea) => currentArea !== area);

            return {
                ...prev,
                grassCutAreas: nextAreas.length > 0 ? nextAreas : ["All"],
            };
        });
    }

    const title = useMemo(
        () => (existing ? "Edit Customer" : "Add Customer"),
        [existing]
    );
    const isCommercialCustomer = form.customerType === "Commercial";
    const showCommercialTools = allowCommercialTools && isCommercialCustomer;
    const selectedGrassCutAreas = normalizeGrassCutAreas(
        form.grassCutAreas,
        form.isGrassCuttingCustomer
    );
    const effectiveRotationWeeks = getEffectiveRotationWeeks(
        form,
        normalizedDefaultRotationWeeks
    );
    const weekOptions = getWeekOptions(effectiveRotationWeeks);
    const businessDefaultLabel = getRotationLabel(normalizedDefaultRotationWeeks);
    const rotationSelectValue =
        form.rotationWeeksOverride == null ? "default" : String(form.rotationWeeksOverride);
    const commercialEmailInputs =
        form.contactEmails && form.contactEmails.length > 0 ? form.contactEmails : [""];

    function updateCustomerType(nextType: CustomerType) {
        setForm((prev) => {
            const nextContactEmails =
                nextType === "Commercial" && allowCommercialTools
                    ? prev.contactEmails && prev.contactEmails.length > 0
                        ? prev.contactEmails
                        : prev.email?.trim()
                            ? [prev.email.trim()]
                            : [""]
                    : prev.contactEmails;

            return {
                ...prev,
                customerType: nextType,
                contactEmails: nextContactEmails,
            };
        });
    }

    function updateCommercialEmail(index: number, value: string) {
        setForm((prev) => {
            const nextEmails =
                prev.contactEmails && prev.contactEmails.length > 0
                    ? [...prev.contactEmails]
                    : [prev.email ?? ""];
            nextEmails[index] = value;

            return {
                ...prev,
                email: nextEmails[0] ?? "",
                contactEmails: nextEmails,
            };
        });
    }

    function addCommercialEmail() {
        setForm((prev) => ({
            ...prev,
            contactEmails: [...(prev.contactEmails ?? []), ""],
        }));
    }

    function removeCommercialEmail(index: number) {
        setForm((prev) => {
            const nextEmails = (prev.contactEmails ?? []).filter(
                (_, emailIndex) => emailIndex !== index
            );

            return {
                ...prev,
                email: nextEmails[0] ?? "",
                contactEmails: nextEmails.length > 0 ? nextEmails : [""],
            };
        });
    }

    function updateServiceRotation(value: string) {
        setForm((prev) => {
            const rotationWeeksOverride =
                value === "default"
                    ? null
                    : normalizeNullableRotationWeeks(value);
            const nextRotationWeeks =
                rotationWeeksOverride ?? normalizedDefaultRotationWeeks;

            return {
                ...prev,
                rotationWeeksOverride,
                cutFrequency: getCutFrequencyFromRotationWeeks(nextRotationWeeks),
                week: normalizeWeekNumber(prev.week, nextRotationWeeks),
            };
        });
    }

    function handleSave() {
        const saveEffectiveRotationWeeks = getEffectiveRotationWeeks(
            form,
            normalizedDefaultRotationWeeks
        );
        const cleanedPrimaryEmail = form.email?.trim() || "";
        const cleanedContactEmails = showCommercialTools
            ? normalizeContactEmails(form.contactEmails)
            : [];
        const nextCustomer: Customer = {
            ...form,
            name: form.name.trim(),
            address: form.address.trim(),
            town: form.town?.trim() || undefined,
            postcode: form.postcode?.trim() || undefined,
            phone: form.phone?.trim() || undefined,
            email: showCommercialTools
                ? cleanedContactEmails[0] ?? undefined
                : cleanedPrimaryEmail || undefined,
            contactEmails: showCommercialTools ? cleanedContactEmails : undefined,
            rotationWeeksOverride: normalizeNullableRotationWeeks(
                form.rotationWeeksOverride
            ),
            cutFrequency: getCutFrequencyFromRotationWeeks(saveEffectiveRotationWeeks),
            week: normalizeWeekNumber(form.week, saveEffectiveRotationWeeks),
            grassCutAreas: form.isGrassCuttingCustomer
                ? normalizeGrassCutAreas(form.grassCutAreas, true)
                : [],
            siteName: form.siteName?.trim() || undefined,
            siteAddress: form.siteAddress?.trim() || undefined,
            siteTown: form.siteTown?.trim() || undefined,
            sitePostcode: form.sitePostcode?.trim() || undefined,
            notes: form.notes?.trim() || undefined,
            accessNotes: form.accessNotes?.trim() || undefined,
        };

        onSave(nextCustomer);
    }

    return (
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Customer Details
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                        {title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Save contact details, round details, site details, and service notes.
                    </p>
                </div>

                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {form.customerType}
                </div>
            </div>

            <div className="mt-6 space-y-6">
                <section className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                        Core Details
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Customer Type
                            </label>
                            <select
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                value={form.customerType}
                                onChange={(e) =>
                                    updateCustomerType(e.target.value as CustomerType)
                                }
                            >
                                <option value="Residential">Residential</option>
                                {allowCommercialTools || isCommercialCustomer ? (
                                    <option value="Commercial">Commercial</option>
                                ) : null}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Service Round
                            </label>
                            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={form.isGrassCuttingCustomer}
                                    onChange={(e) =>
                                        updateGrassCuttingCustomer(e.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                                />
                                This customer is on the service round
                            </label>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Customer Name
                            </label>
                            <input
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Name"
                                value={form.name}
                                onChange={(e) => update("name", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Address
                            </label>
                            <AddressAutocompleteInput
                                value={form.address}
                                onChange={(value) => update("address", value)}
                                onSelectAddress={({
                                    formattedAddress,
                                    postcode,
                                    town,
                                    latitude,
                                    longitude,
                                }) => {
                                    update("address", formattedAddress);
                                    update("postcode", postcode);
                                    update("town", town);
                                    update("latitude", latitude);
                                    update("longitude", longitude);
                                    setPostcodeLocked(Boolean(postcode));
                                }}
                                placeholder="Start typing an address..."
                            />
                            <p className="mt-2 text-xs text-slate-400">
                                Select an address suggestion to auto-fill postcode, town, and map coordinates.
                            </p>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Town
                            </label>
                            <input
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Town"
                                value={form.town ?? ""}
                                onChange={(e) => update("town", e.target.value)}
                            />
                        </div>

                        <div>
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <label className="block text-sm font-medium text-slate-700">
                                    Postcode
                                </label>

                                {postcodeLocked ? (
                                    <button
                                        type="button"
                                        onClick={() => setPostcodeLocked(false)}
                                        className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                                    >
                                        Unlock postcode
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setPostcodeLocked(true)}
                                        className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                                    >
                                        Lock postcode
                                    </button>
                                )}
                            </div>

                            <input
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                                placeholder="Postcode"
                                value={form.postcode ?? ""}
                                disabled={postcodeLocked}
                                onChange={(e) => update("postcode", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Contact Number
                            </label>
                            <input
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Phone"
                                value={form.phone ?? ""}
                                onChange={(e) => update("phone", e.target.value)}
                            />
                        </div>

                        {showCommercialTools ? (
                            <div className="md:col-span-2">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <label className="block text-sm font-medium text-slate-700">
                                        Email Addresses
                                    </label>

                                    <button
                                        type="button"
                                        onClick={addCommercialEmail}
                                        className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                                    >
                                        Add another email
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {commercialEmailInputs.map((emailAddress, index) => (
                                        <div key={`commercial-email-${index}`} className="flex gap-2">
                                            <input
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                                placeholder={
                                                    index === 0
                                                        ? "Primary contact email"
                                                        : "Additional contact email"
                                                }
                                                value={emailAddress}
                                                onChange={(e) =>
                                                    updateCommercialEmail(index, e.target.value)
                                                }
                                            />

                                            {commercialEmailInputs.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeCommercialEmail(index)}
                                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Email
                                </label>
                                <input
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Email"
                                    value={form.email ?? ""}
                                    onChange={(e) => update("email", e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </section>

                {showCommercialTools && (
                    <section className="space-y-4">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                                Site Details
                            </h3>
                            <p className="text-xs text-slate-400">
                                Use this when the work site differs from the main customer address.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Site Name
                                </label>
                                <input
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Site or business location name"
                                    value={form.siteName ?? ""}
                                    onChange={(e) => update("siteName", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Site Address
                                </label>
                                <input
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Site address"
                                    value={form.siteAddress ?? ""}
                                    onChange={(e) => update("siteAddress", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Site Town / City
                                </label>
                                <input
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Town or city"
                                    value={form.siteTown ?? ""}
                                    onChange={(e) => update("siteTown", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Site Postcode
                                </label>
                                <input
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Site postcode"
                                    value={form.sitePostcode ?? ""}
                                    onChange={(e) => update("sitePostcode", e.target.value)}
                                />
                            </div>
                        </div>
                    </section>
                )}

                {form.isGrassCuttingCustomer && (
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                            Service Setup
                        </h3>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Service rotation
                                </label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    value={rotationSelectValue}
                                    onChange={(e) => updateServiceRotation(e.target.value)}
                                >
                                    <option value="default">
                                        Use business default: {businessDefaultLabel}
                                    </option>
                                    {ROTATION_WEEK_OPTIONS.map((rotationWeeks) => (
                                        <option key={rotationWeeks} value={rotationWeeks}>
                                            {getRotationLabel(rotationWeeks)}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-xs text-slate-400">
                                    Uses your business default unless changed for this customer.
                                </p>
                                {form.rotationWeeksOverride != null ? (
                                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                                        Custom rotation for this customer.
                                    </p>
                                ) : null}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Service Amount
                                </label>
                                <input
                                    type="number"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Price per visit"
                                    value={form.grassCutAmount ?? ""}
                                    onChange={(e) =>
                                        update(
                                            "grassCutAmount",
                                            e.target.value === "" ? 0 : Number(e.target.value)
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Week
                                </label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    value={form.week}
                                    onChange={(e) =>
                                        update(
                                            "week",
                                            normalizeWeekNumber(
                                                e.target.value as WeekNumber,
                                                effectiveRotationWeeks
                                            )
                                        )
                                    }
                                >
                                    {weekOptions.map((week) => (
                                        <option key={week} value={week}>
                                            {getRotationCycleLabel(
                                                week,
                                                effectiveRotationWeeks
                                            )}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Day
                                </label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    value={form.day}
                                    onChange={(e) => update("day", e.target.value as DayName)}
                                >
                                    <option value="Monday">Monday</option>
                                    <option value="Tuesday">Tuesday</option>
                                    <option value="Wednesday">Wednesday</option>
                                    <option value="Thursday">Thursday</option>
                                    <option value="Friday">Friday</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Payment Method
                                </label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    value={form.paymentMethod ?? "Monthly"}
                                    onChange={(e) =>
                                        update("paymentMethod", e.target.value as PaymentMethod)
                                    }
                                >
                                    <option value="Monthly">Monthly</option>
                                    <option value="On Day Transfer">On Day Transfer</option>
                                    <option value="Cash">Cash</option>
                                </select>
                            </div>

                            <div className="md:col-span-2 lg:col-span-3">
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Service Areas
                                </label>
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                    {GRASS_CUT_AREA_OPTIONS.map((area) => (
                                        <label
                                            key={area}
                                            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedGrassCutAreas.includes(area)}
                                                onChange={(e) =>
                                                    updateGrassCutArea(area, e.target.checked)
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                                            />
                                            {area}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                <section className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                        Notes
                    </h3>

                    <div className="grid gap-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                General Notes
                            </label>
                            <textarea
                                className="min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Customer notes"
                                value={form.notes ?? ""}
                                onChange={(e) => update("notes", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Access Notes
                            </label>
                            <textarea
                                className="min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Gate codes, side access, pets, bins, etc."
                                value={form.accessNotes ?? ""}
                                onChange={(e) => update("accessNotes", e.target.value)}
                            />
                        </div>
                    </div>
                </section>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                <button
                    onClick={handleSave}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                    Save Customer
                </button>

                <button
                    onClick={onCancel}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
