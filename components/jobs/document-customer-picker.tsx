"use client";

import { useMemo, useState } from "react";
import { MapPin, UserRound } from "lucide-react";
import type { Customer } from "./types";

type Props = {
    value: string;
    customers: Customer[];
    selectedCustomerId?: number | null;
    placeholder?: string;
    onChange: (value: string) => void;
    onSelect: (customer: Customer) => void;
};

function normalizeSearchText(value: string | null | undefined) {
    return value?.trim().toLowerCase() ?? "";
}

function getCustomerSearchValue(customer: Customer) {
    return [
        customer.name,
        customer.siteName,
        customer.address,
        customer.siteAddress,
        customer.town,
        customer.siteTown,
        customer.postcode,
        customer.sitePostcode,
    ]
        .map(normalizeSearchText)
        .filter(Boolean)
        .join(" ");
}

function getCustomerLocation(customer: Customer) {
    const primaryAddress =
        customer.customerType === "Commercial"
            ? customer.siteAddress || customer.address
            : customer.address;
    const town =
        customer.customerType === "Commercial"
            ? customer.siteTown || customer.town
            : customer.town;
    const postcode =
        customer.customerType === "Commercial"
            ? customer.sitePostcode || customer.postcode
            : customer.postcode;

    return [primaryAddress, town, postcode].filter(Boolean).join(", ");
}

export default function DocumentCustomerPicker({
    value,
    customers,
    selectedCustomerId,
    placeholder = "Customer name",
    onChange,
    onSelect,
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const query = normalizeSearchText(value);

    const matches = useMemo(() => {
        const scoredMatches = customers
            .filter((customer) => {
                if (!query) {
                    return true;
                }

                return getCustomerSearchValue(customer).includes(query);
            })
            .map((customer) => {
                const normalizedName = normalizeSearchText(customer.name);
                const score =
                    selectedCustomerId === customer.id
                        ? 0
                        : normalizedName.startsWith(query)
                          ? 1
                          : getCustomerSearchValue(customer).startsWith(query)
                            ? 2
                            : 3;

                return { customer, score };
            })
            .sort((left, right) => {
                if (left.score !== right.score) {
                    return left.score - right.score;
                }

                return left.customer.name.localeCompare(right.customer.name);
            });

        return scoredMatches.slice(0, 8).map((entry) => entry.customer);
    }, [customers, query, selectedCustomerId]);

    function handleSelect(customer: Customer) {
        onSelect(customer);
        setIsOpen(false);
    }

    return (
        <div className="relative">
            <input
                value={value}
                onChange={(event) => {
                    onChange(event.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
            />

            {isOpen && customers.length > 0 ? (
                <div className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                    {matches.length > 0 ? (
                        matches.map((customer) => {
                            const location = getCustomerLocation(customer);
                            const isSelected = selectedCustomerId === customer.id;

                            return (
                                <button
                                    key={customer.id}
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => handleSelect(customer)}
                                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                                        isSelected
                                            ? "bg-teal-50 text-teal-950"
                                            : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    <span
                                        className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                            isSelected
                                                ? "bg-teal-100 text-teal-700"
                                                : "bg-slate-100 text-slate-500"
                                        }`}
                                    >
                                        <UserRound size={16} />
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-2">
                                            <span className="truncate text-sm font-semibold">
                                                {customer.name}
                                            </span>
                                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                                {customer.customerType}
                                            </span>
                                        </span>

                                        {customer.customerType === "Commercial" && customer.siteName ? (
                                            <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                                                {customer.siteName}
                                            </span>
                                        ) : null}

                                        {location ? (
                                            <span className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                                                <MapPin size={12} />
                                                <span className="truncate">{location}</span>
                                            </span>
                                        ) : null}
                                    </span>
                                </button>
                            );
                        })
                    ) : (
                        <div className="px-3 py-3 text-sm text-slate-500">
                            No matching customers
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
