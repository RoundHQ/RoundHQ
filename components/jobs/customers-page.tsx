"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import CustomerForm from "./customer-form";
import {
  getCustomerDisplayAddress,
  getCustomerEmailAddresses,
  getCustomerTotals,
} from "./helpers";
import {
  DEFAULT_ROTATION_WEEKS,
  normalizeRotationWeeks,
} from "./rotation";
import type { EditFormCollaboration } from "./edit-collaboration";
import type {
  Customer,
  MonthlyPayment,
  RotationWeeks,
  VisitLog,
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
  autoOpenAddCustomerRequestId?: number;
  onAdd: (customer: Customer) => void;
  onUpdate: (customer: Customer) => void;
  onDelete: (customerId: number) => void;
  onOpenCustomer: (customerId: number) => void;
  getCustomerEditCollaboration?: (
    customer: Customer | undefined
  ) => EditFormCollaboration<Customer> | undefined;
};

type CustomerTypeFilter = "All" | "Residential" | "Commercial";

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

      </div>
  );
}
