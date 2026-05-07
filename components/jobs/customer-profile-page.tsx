"use client";

import { useState } from "react";
import {
  buildLocationLine,
  formatStoredDate,
  getCustomerDisplayAddress,
  getCustomerEmailAddresses,
  getEstimatedCustomerMonthlyValue,
  getEstimatedCustomerYearlyValue,
  formatGrassCutAreas,
} from "./helpers";
import type { CommercialRamsDocument, Customer, VisitLog } from "./types";
import CustomerForm from "./customer-form";
import { ArrowLeft, Building2, FileText, Receipt, User, MapPin, Phone, Mail, PencilLine, Scissors } from "lucide-react";

type Props = {
  customer: Customer;
  visits: VisitLog[];
  commercialRamsDocuments: CommercialRamsDocument[];
  lastVisit: Date | null;
  totalSpent: number;
  outstanding: number;
  grassCutSeasonStart: string;
  grassCutSeasonEnd: string;
  onBack: () => void;
  onOpenPayments: () => void;
  onTogglePaid: (visitId: number | string) => void;
  onUpdateCustomer: (customer: Customer) => Promise<void>;
  onCreateQuote: (customerId: number) => void;
  onCreateInvoice: (customerId: number) => void;
};

function formatMoney(value: number | null | undefined) {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

function getCustomerContactNumber(customer: Customer) {
  const customerWithLegacyContact = customer as Customer & {
    contactNumber?: string | null;
  };

  return customerWithLegacyContact.contactNumber ?? customer.phone;
}

function getNextVisit(customer: Customer, visits: VisitLog[]) {
  if (!customer.isGrassCuttingCustomer || !visits.length) return null;

  const sorted = [...visits].sort(
      (a, b) =>
          new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
  );

  const last = sorted[0];
  const next = new Date(last.visitDate);

  if (customer.cutFrequency === "Fortnightly") next.setDate(next.getDate() + 14);
  else if (customer.cutFrequency === "3 Weekly") next.setDate(next.getDate() + 21);
  else next.setDate(next.getDate() + 30);

  return next;
}

export default function CustomerProfilePage({
                                              customer,
                                              visits,
                                              commercialRamsDocuments,
                                              lastVisit,
  totalSpent,
  outstanding,
  grassCutSeasonStart,
  grassCutSeasonEnd,
  onBack,
  onOpenPayments,
  onTogglePaid,
  onUpdateCustomer,
                                              onCreateQuote,
                                              onCreateInvoice,
}: Props)  {
  const [isEditing, setIsEditing] = useState(false);
  const nextVisit = getNextVisit(customer, visits);
  const customerEmails = getCustomerEmailAddresses(customer);
  const hasCommercialSiteDetails =
      customer.customerType === "Commercial" &&
      Boolean(
          customer.siteName ||
          customer.siteAddress ||
          customer.siteTown ||
          customer.sitePostcode
      );
  const showCommercialRams = customer.customerType === "Commercial";

  // Placeholder linked docs for now until your quote/invoice system is wired in
  const linkedQuotes: string[] = [];
  const linkedInvoices: string[] = [];

  async function saveProfileEdits(updatedCustomer: Customer) {
    try {
      await onUpdateCustomer(updatedCustomer);
      setIsEditing(false);
    } catch {
      // Keep the editor open so the shared error banner can guide the retry.
    }
  }

  return (
      <div className="space-y-6">
        <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <button
                  onClick={onBack}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <h1 className="mt-4 text-3xl font-black tracking-tight">{customer.name}</h1>
              <p className="mt-2 text-sm text-white/75">
                {customer.isGrassCuttingCustomer
                    ? `${customer.customerType} · Grass Cutting Customer`
                    : `${customer.customerType} · Non-Grass-Cutting Customer`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
              >
                <PencilLine size={16} />
                Edit Profile
              </button>

            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              {customer.customerType}
            </span>

              {customer.isGrassCuttingCustomer && (
                  <>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  {customer.cutFrequency}
                </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  {customer.paymentMethod ?? "Monthly"}
                </span>
                  </>
              )}
            </div>
          </div>
        </section>

        {isEditing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[24px] bg-white shadow-2xl">
                <CustomerForm
                    existing={customer}
                    onSave={saveProfileEdits}
                    onCancel={() => setIsEditing(false)}
                />
              </div>
            </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                Customer Details
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="mt-0.5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Address</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {getCustomerDisplayAddress(customer) || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {hasCommercialSiteDetails && (
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <Building2 size={18} className="mt-0.5 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Site Details</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {customer.siteName || customer.siteAddress || "Commercial site"}
                          </p>
                          {customer.siteAddress && customer.siteName && (
                              <p className="mt-1 text-sm text-slate-500">
                                {customer.siteAddress}
                              </p>
                          )}
                          {buildLocationLine(customer.siteTown, customer.sitePostcode) && (
                              <p className="mt-1 text-sm text-slate-500">
                                {buildLocationLine(customer.siteTown, customer.sitePostcode)}
                              </p>
                          )}
                        </div>
                      </div>
                    </div>
                )}

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="mt-0.5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Contact Number</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {getCustomerContactNumber(customer) ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Mail size={18} className="mt-0.5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      {customerEmails.length > 0 ? (
                          <div className="mt-1 space-y-1">
                            {customerEmails.map((emailAddress) => (
                                <p
                                    key={emailAddress}
                                    className="font-semibold text-slate-900"
                                >
                                  {emailAddress}
                                </p>
                            ))}
                          </div>
                      ) : (
                          <p className="mt-1 font-semibold text-slate-900">—</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <User size={18} className="mt-0.5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Service Setup</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {customer.isGrassCuttingCustomer
                            ? `${customer.cutFrequency} · ${customer.paymentMethod ?? "Monthly"}`
                            : "Not on grass cutting round"}
                      </p>
                    </div>
                  </div>
                </div>

                {customer.isGrassCuttingCustomer && (
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <Scissors size={18} className="mt-0.5 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Grass Areas</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {formatGrassCutAreas(customer)}
                          </p>
                        </div>
                      </div>
                    </div>
                )}

                {customer.notes && (
                    <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                      <p className="text-xs text-slate-500">Notes</p>
                      <p className="mt-1 text-sm text-slate-700">{customer.notes}</p>
                    </div>
                )}

                {customer.accessNotes && (
                    <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                      <p className="text-xs text-slate-500">Access Notes</p>
                      <p className="mt-1 text-sm text-slate-700">{customer.accessNotes}</p>
                    </div>
                )}
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-slate-500" />
                  <h2 className="text-lg font-black tracking-tight text-slate-900">
                    Linked Documents
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                      onClick={onOpenPayments}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Open Payments
                  </button>

                  <button
                      onClick={() => onCreateQuote(customer.id)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Create Quote
                  </button>

                  <button
                      onClick={() => onCreateInvoice(customer.id)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Create Invoice
                  </button>
                </div>
              </div>

              <div
                  className={`mt-4 grid gap-4 ${
                      showCommercialRams ? "xl:grid-cols-3" : "md:grid-cols-2"
                  }`}
              >
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-500" />
                    <p className="font-semibold text-slate-900">Quotes</p>
                  </div>

                  {linkedQuotes.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {linkedQuotes.map((quoteId) => (
                            <div
                                key={quoteId}
                                className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                            >
                              Quote #{quoteId}
                            </div>
                        ))}
                      </div>
                  ) : (
                      <p className="mt-3 text-sm text-slate-500">No quotes linked yet.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <Receipt size={16} className="text-slate-500" />
                    <p className="font-semibold text-slate-900">Invoices</p>
                  </div>

                  {linkedInvoices.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {linkedInvoices.map((invoiceId) => (
                            <div
                                key={invoiceId}
                                className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                            >
                              Invoice #{invoiceId}
                            </div>
                        ))}
                      </div>
                  ) : (
                      <p className="mt-3 text-sm text-slate-500">No invoices linked yet.</p>
                  )}
                </div>

                {showCommercialRams && (
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-slate-500" />
                        <p className="font-semibold text-slate-900">RAMS</p>
                      </div>

                      {commercialRamsDocuments.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {commercialRamsDocuments.map((document) => {
                              const documentDate = document.updatedAt ?? document.createdAt;
                              const documentLocation = buildLocationLine(
                                  document.siteTown,
                                  document.sitePostcode
                              );

                              return (
                                  <div
                                      key={document.id}
                                      className="rounded-xl bg-slate-50 px-3 py-3"
                                  >
                                    <p className="text-sm font-semibold text-slate-900">
                                      {document.jobTitle || document.workType}
                                    </p>

                                    <div className="mt-1 space-y-1 text-xs text-slate-500">
                                      {document.referenceNumber && (
                                          <p>Ref {document.referenceNumber}</p>
                                      )}
                                      <p>Updated {formatStoredDate(documentDate)}</p>
                                      {(document.siteName || document.siteAddress) && (
                                          <p>
                                            {document.siteName || document.siteAddress}
                                          </p>
                                      )}
                                      {documentLocation && <p>{documentLocation}</p>}
                                    </div>
                                  </div>
                              );
                            })}
                          </div>
                      ) : (
                          <p className="mt-3 text-sm text-slate-500">No RAMS linked yet.</p>
                      )}
                    </div>
                )}
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                Visit History
              </h2>

              {visits.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No visits recorded yet.</p>
              ) : (
                  <div className="mt-4 space-y-3">
                    {visits.map((visit) => {
                      const isPaid =
                          visit.paid === true || visit.paymentStatus === "Paid";
                      const notCutReason = visit.notCutReason;
                      const visitPrice =
                          visit.priceAtVisit ?? customer.grassCutAmount ?? 0;

                      return (
                          <div
                              key={visit.id}
                              className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">
                                {new Date(visit.visitDate).toLocaleDateString()}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {visit.status === "completed"
                                    ? "Cut"
                                    : visit.status === "not_cut"
                                        ? `Not Cut${notCutReason ? ` - ${notCutReason}` : ""}`
                                        : visit.status}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {customer.paymentMethod === "Monthly"
                                    ? "Payment tracked from the Payments page"
                                    : visit.paidAt
                                        ? `Payment date ${formatStoredDate(visit.paidAt)}`
                                        : "Payment date not recorded yet"}
                              </p>
                              {visit.notes && (
                                  <p className="mt-1 text-sm text-slate-600">{visit.notes}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <p className="text-sm font-semibold text-slate-900">
                                {formatMoney(visitPrice)}
                              </p>

                              {customer.paymentMethod === "Monthly" ? (
                                  <button
                                      onClick={onOpenPayments}
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                  >
                                    Open Payments
                                  </button>
                              ) : (
                                  <button
                                      onClick={() => onTogglePaid(visit.id)}
                                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                          isPaid
                                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                      }`}
                                  >
                                    {isPaid ? "Paid" : "Mark Paid"}
                                  </button>
                              )}
                            </div>
                          </div>
                      );
                    })}
                  </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                Customer Summary
              </h2>

              <div className="mt-4 grid gap-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">Season Spent</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">
                    {formatMoney(totalSpent)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">Season Outstanding</p>
                  <p className="mt-2 text-3xl font-black text-rose-600">
                    {formatMoney(outstanding)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">Last Visit</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {lastVisit ? lastVisit.toLocaleDateString() : "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">Next Visit</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {nextVisit ? nextVisit.toLocaleDateString() : "—"}
                  </p>
                </div>

                {customer.isGrassCuttingCustomer && (
                    <>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs text-slate-400">Monthly Value</p>
                        <p className="mt-2 text-2xl font-black text-emerald-600">
                          {formatMoney(getEstimatedCustomerMonthlyValue(customer))}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs text-slate-400">Yearly Value</p>
                        <p className="mt-2 text-2xl font-black text-blue-600">
                          {formatMoney(
                            getEstimatedCustomerYearlyValue(
                              customer,
                              grassCutSeasonStart,
                              grassCutSeasonEnd
                            )
                          )}
                        </p>
                      </div>
                    </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
  );
}
