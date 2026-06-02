"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    type StaffMember,
    type WeekNumber,
} from "./types";
import AddressAutocompleteInput from "./address-autocomplete-input";
import type { EditFormCollaboration } from "./edit-collaboration";

type Props = {
    existing?: Customer;
    initialName?: string;
    customers?: Customer[];
    defaultRotationWeeks?: RotationWeeks;
    allowCommercialTools?: boolean;
    staffMembers?: StaffMember[];
    defaultAssignedStaffId?: number | null;
    editCollaboration?: EditFormCollaboration<Customer>;
    onSave: (customer: Customer) => void | Promise<void>;
    onCancel: () => void;
};

const ROUND_DAY_OPTIONS: DayName[] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

function buildInitialCustomer(
    existing: Customer | undefined,
    defaultRotationWeeks: RotationWeeks,
    initialName = "",
    defaultAssignedStaffId: number | null = null
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
            assignedStaffId: existing.assignedStaffId ?? null,
        };
    }

    const normalizedDefaultRotationWeeks =
        normalizeRotationWeeks(defaultRotationWeeks);

    return {
        id: Date.now(),
        name: initialName.trim(),
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
        assignedStaffId: defaultAssignedStaffId,
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

function normalizeLocationText(value: string | null | undefined) {
    return (value ?? "").trim().toLowerCase();
}

function normalizePostcode(value: string | null | undefined) {
    return (value ?? "").toUpperCase().replace(/\s+/g, " ").trim();
}

function getPostcodeParts(value: string | null | undefined) {
    const normalized = normalizePostcode(value);
    const [outward = "", inward = ""] = normalized.split(" ");
    const sectorDigit = inward.match(/^\d/)?.[0] ?? "";

    return {
        normalized,
        outward,
        sector: outward && sectorDigit ? `${outward} ${sectorDigit}` : "",
    };
}

function getDistanceKm(
    leftLatitude?: number | null,
    leftLongitude?: number | null,
    rightLatitude?: number | null,
    rightLongitude?: number | null
) {
    if (
        typeof leftLatitude !== "number" ||
        typeof leftLongitude !== "number" ||
        typeof rightLatitude !== "number" ||
        typeof rightLongitude !== "number"
    ) {
        return null;
    }

    const earthRadiusKm = 6371;
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const latitudeDelta = toRadians(rightLatitude - leftLatitude);
    const longitudeDelta = toRadians(rightLongitude - leftLongitude);
    const leftLat = toRadians(leftLatitude);
    const rightLat = toRadians(rightLatitude);
    const haversine =
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(longitudeDelta / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getRoundPlacementFromCustomers(
    customers: Customer[],
    effectiveRotationWeeks: RotationWeeks
) {
    const counts = new Map<string, { week: WeekNumber; day: DayName; count: number }>();

    customers.forEach((customer) => {
        if (!customer.isGrassCuttingCustomer) {
            return;
        }

        const week = normalizeWeekNumber(customer.week, effectiveRotationWeeks);
        const day = customer.day;
        const key = `${week}|${day}`;
        const current = counts.get(key);

        counts.set(key, {
            week,
            day,
            count: (current?.count ?? 0) + 1,
        });
    });

    return Array.from(counts.values()).sort((left, right) => {
        if (right.count !== left.count) {
            return right.count - left.count;
        }

        if (left.week !== right.week) {
            return left.week.localeCompare(right.week);
        }

        return ROUND_DAY_OPTIONS.indexOf(left.day) - ROUND_DAY_OPTIONS.indexOf(right.day);
    })[0] ?? null;
}

function getLightestRoundPlacement(
    customers: Customer[],
    weekOptions: WeekNumber[],
    effectiveRotationWeeks: RotationWeeks
) {
    const counts = new Map<string, number>();

    customers.forEach((customer) => {
        if (!customer.isGrassCuttingCustomer) {
            return;
        }

        const week = normalizeWeekNumber(customer.week, effectiveRotationWeeks);
        const key = `${week}|${customer.day}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return weekOptions
        .flatMap((week) =>
            ROUND_DAY_OPTIONS.map((day) => ({
                week,
                day,
                count: counts.get(`${week}|${day}`) ?? 0,
            }))
        )
        .sort((left, right) => {
            if (left.count !== right.count) {
                return left.count - right.count;
            }

            if (left.week !== right.week) {
                return left.week.localeCompare(right.week);
            }

            return ROUND_DAY_OPTIONS.indexOf(left.day) - ROUND_DAY_OPTIONS.indexOf(right.day);
        })[0];
}

function getRoundPlacementSuggestion({
    form,
    customers,
    existingCustomerId,
    weekOptions,
    effectiveRotationWeeks,
}: {
    form: Customer;
    customers: Customer[];
    existingCustomerId?: number;
    weekOptions: WeekNumber[];
    effectiveRotationWeeks: RotationWeeks;
}) {
    if (!form.isGrassCuttingCustomer) {
        return null;
    }

    const comparableCustomers = customers.filter(
        (customer) =>
            customer.id !== existingCustomerId && customer.isGrassCuttingCustomer
    );
    const targetPostcode = getPostcodeParts(form.postcode);
    const targetTown = normalizeLocationText(form.town);
    const mappedMatches = comparableCustomers
        .map((customer) => ({
            customer,
            distanceKm: getDistanceKm(
                form.latitude,
                form.longitude,
                customer.latitude,
                customer.longitude
            ),
        }))
        .filter((entry): entry is { customer: Customer; distanceKm: number } =>
            typeof entry.distanceKm === "number"
        )
        .sort((left, right) => left.distanceKm - right.distanceKm);
    const nearbyMappedMatches = mappedMatches
        .filter((entry) => entry.distanceKm <= 5)
        .slice(0, 8)
        .map((entry) => entry.customer);

    const postcodeSectorMatches = targetPostcode.sector
        ? comparableCustomers.filter(
              (customer) => getPostcodeParts(customer.postcode).sector === targetPostcode.sector
          )
        : [];
    const postcodeOutwardMatches =
        targetPostcode.outward && postcodeSectorMatches.length === 0
            ? comparableCustomers.filter(
                  (customer) =>
                      getPostcodeParts(customer.postcode).outward === targetPostcode.outward
              )
            : [];
    const townMatches =
        targetTown && postcodeSectorMatches.length === 0 && postcodeOutwardMatches.length === 0
            ? comparableCustomers.filter(
                  (customer) => normalizeLocationText(customer.town) === targetTown
              )
            : [];

    const matchGroups = [
        { customers: nearbyMappedMatches, basis: "nearby mapped customers" },
        { customers: postcodeSectorMatches, basis: `postcode sector ${targetPostcode.sector}` },
        { customers: postcodeOutwardMatches, basis: `postcode area ${targetPostcode.outward}` },
        { customers: townMatches, basis: `${form.town} customers` },
    ];
    const matchedGroup = matchGroups.find((group) => group.customers.length > 0);

    if (matchedGroup) {
        const placement = getRoundPlacementFromCustomers(
            matchedGroup.customers,
            effectiveRotationWeeks
        );

        if (placement) {
            return {
                week: placement.week,
                day: placement.day,
                basis: matchedGroup.basis,
                matchCount: matchedGroup.customers.length,
                isFallback: false,
            };
        }
    }

    const fallbackPlacement = getLightestRoundPlacement(
        comparableCustomers,
        weekOptions,
        effectiveRotationWeeks
    );

    return fallbackPlacement
        ? {
              week: fallbackPlacement.week,
              day: fallbackPlacement.day,
              basis: "current round workload",
              matchCount: comparableCustomers.length,
              isFallback: true,
          }
        : null;
}

export default function CustomerForm({
    existing,
    initialName = "",
    customers = [],
    defaultRotationWeeks = DEFAULT_ROTATION_WEEKS,
    allowCommercialTools = true,
    staffMembers = [],
    defaultAssignedStaffId = null,
    editCollaboration,
    onSave,
    onCancel,
}: Props) {
    const normalizedDefaultRotationWeeks =
        normalizeRotationWeeks(defaultRotationWeeks);
    const [form, setForm] = useState<Customer>(() =>
        buildInitialCustomer(
            existing,
            normalizedDefaultRotationWeeks,
            initialName,
            defaultAssignedStaffId
        )
    );
    const [isGrassCutAmountFocused, setIsGrassCutAmountFocused] = useState(false);
    const initialDraftRef = useRef("");
    const handledSaveRequestRef = useRef(0);
    const handledDiscardRequestRef = useRef(0);
    const editCollaborationRef = useRef(editCollaboration);

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
            assignedStaffId:
                isGrassCuttingCustomer && prev.assignedStaffId == null
                    ? defaultAssignedStaffId
                    : prev.assignedStaffId,
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
    const activeStaffMembers = staffMembers.filter((staffMember) => staffMember.isActive);
    const roundPlacementSuggestion = useMemo(
        () =>
            getRoundPlacementSuggestion({
                form,
                customers,
                existingCustomerId: existing?.id,
                weekOptions,
                effectiveRotationWeeks,
            }),
        [customers, effectiveRotationWeeks, existing?.id, form, weekOptions]
    );
    const isUsingRoundPlacementSuggestion =
        roundPlacementSuggestion != null &&
        form.week === roundPlacementSuggestion.week &&
        form.day === roundPlacementSuggestion.day;

    function applyRoundPlacementSuggestion() {
        if (!roundPlacementSuggestion) {
            return;
        }

        setForm((prev) => ({
            ...prev,
            week: roundPlacementSuggestion.week,
            day: roundPlacementSuggestion.day,
        }));
    }

    const getCleanCustomerDraft = useCallback((): Customer => {
        const draftEffectiveRotationWeeks = getEffectiveRotationWeeks(
            form,
            normalizedDefaultRotationWeeks
        );
        const cleanedPrimaryEmail = form.email?.trim() || "";
        const cleanedContactEmails = showCommercialTools
            ? normalizeContactEmails(form.contactEmails)
            : [];

        return {
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
            cutFrequency: getCutFrequencyFromRotationWeeks(draftEffectiveRotationWeeks),
            week: normalizeWeekNumber(form.week, draftEffectiveRotationWeeks),
            grassCutAreas: form.isGrassCuttingCustomer
                ? normalizeGrassCutAreas(form.grassCutAreas, true)
                : [],
            siteName: form.siteName?.trim() || undefined,
            siteAddress: form.siteAddress?.trim() || undefined,
            siteTown: form.siteTown?.trim() || undefined,
            sitePostcode: form.sitePostcode?.trim() || undefined,
            notes: form.notes?.trim() || undefined,
            accessNotes: form.accessNotes?.trim() || undefined,
            assignedStaffId: form.isGrassCuttingCustomer
                ? form.assignedStaffId ?? null
                : null,
        };
    }, [form, normalizedDefaultRotationWeeks, showCommercialTools]);

    useEffect(() => {
        editCollaborationRef.current = editCollaboration;
    }, [editCollaboration]);

    useEffect(() => {
        if (!editCollaborationRef.current || initialDraftRef.current) {
            return;
        }

        initialDraftRef.current = JSON.stringify(getCleanCustomerDraft());
    }, [getCleanCustomerDraft]);

    useEffect(() => {
        const collaboration = editCollaborationRef.current;

        if (!collaboration) {
            return;
        }

        const draft = getCleanCustomerDraft();
        const draftJson = JSON.stringify(draft);
        const isDirty = initialDraftRef.current
            ? draftJson !== initialDraftRef.current
            : false;

        collaboration.onDraftChange(draft, isDirty);
    }, [getCleanCustomerDraft]);

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

    const handleSave = useCallback(async () => {
        await Promise.resolve(onSave(getCleanCustomerDraft()));
        editCollaboration?.onSaveComplete();
    }, [editCollaboration, getCleanCustomerDraft, onSave]);

    useEffect(() => {
        if (
            !editCollaboration?.saveRequestId ||
            handledSaveRequestRef.current === editCollaboration.saveRequestId
        ) {
            return;
        }

        handledSaveRequestRef.current = editCollaboration.saveRequestId;
        void handleSave();
    }, [editCollaboration?.saveRequestId, handleSave]);

    useEffect(() => {
        if (
            !editCollaboration?.discardRequestId ||
            handledDiscardRequestRef.current === editCollaboration.discardRequestId
        ) {
            return;
        }

        handledDiscardRequestRef.current = editCollaboration.discardRequestId;
        editCollaboration.onDiscardComplete();
        onCancel();
    }, [editCollaboration, onCancel]);

    const handleCancel = useCallback(() => {
        editCollaborationRef.current?.onDiscardComplete();
        onCancel();
    }, [onCancel]);

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
                            <label
                                data-tour="customer-service-round"
                                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                            >
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
                                data-tour="customer-name-input"
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
                                dataTour="customer-address-input"
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

                        {roundPlacementSuggestion ? (
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-900">
                                            Suggested round:{" "}
                                            {getRotationCycleLabel(
                                                roundPlacementSuggestion.week,
                                                effectiveRotationWeeks
                                            )}
                                            , {roundPlacementSuggestion.day}
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                                            Based on {roundPlacementSuggestion.basis}
                                            {roundPlacementSuggestion.matchCount > 0
                                                ? ` (${roundPlacementSuggestion.matchCount} customer${
                                                      roundPlacementSuggestion.matchCount === 1
                                                          ? ""
                                                          : "s"
                                                  })`
                                                : ""}
                                            .
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={applyRoundPlacementSuggestion}
                                        disabled={isUsingRoundPlacementSuggestion}
                                        className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-100 disabled:text-emerald-700"
                                    >
                                        {isUsingRoundPlacementSuggestion
                                            ? "Suggestion applied"
                                            : "Use suggestion"}
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Service rotation
                                </label>
                                <select
                                    data-tour="customer-service-rotation"
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
                                    data-tour="customer-service-amount"
                                    type="number"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    placeholder="Price per visit"
                                    value={
                                        isGrassCutAmountFocused &&
                                        Number(form.grassCutAmount ?? 0) === 0
                                            ? ""
                                            : form.grassCutAmount ?? ""
                                    }
                                    onFocus={() => setIsGrassCutAmountFocused(true)}
                                    onBlur={() => setIsGrassCutAmountFocused(false)}
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
                                    data-tour="customer-service-week"
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
                                    data-tour="customer-service-day"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    value={form.day}
                                    onChange={(e) => update("day", e.target.value as DayName)}
                                >
                                    <option value="Monday">Monday</option>
                                    <option value="Tuesday">Tuesday</option>
                                    <option value="Wednesday">Wednesday</option>
                                    <option value="Thursday">Thursday</option>
                                    <option value="Friday">Friday</option>
                                    <option value="Saturday">Saturday</option>
                                    <option value="Sunday">Sunday</option>
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

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Round Staff
                                </label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                                    value={form.assignedStaffId ?? ""}
                                    onChange={(e) =>
                                        update(
                                            "assignedStaffId",
                                            e.target.value ? Number(e.target.value) : null
                                        )
                                    }
                                >
                                    <option value="">Unassigned round</option>
                                    {activeStaffMembers.map((staffMember) => (
                                        <option key={staffMember.id} value={staffMember.id}>
                                            {staffMember.fullName}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-xs text-slate-400">
                                    This only assigns the service round, not the customer record.
                                </p>
                            </div>

                            <div className="md:col-span-2 lg:col-span-3">
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Service Areas
                                </label>
                                <div
                                    data-tour="customer-service-areas"
                                    className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                                >
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
                                data-tour="customer-notes"
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
                                data-tour="customer-access-notes"
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
                    data-tour="customer-save-button"
                    onClick={handleSave}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                    Save Customer
                </button>

                <button
                    onClick={handleCancel}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
