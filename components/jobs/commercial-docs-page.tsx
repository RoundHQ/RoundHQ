"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  ClipboardList,
  Download,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { generateCommercialRamsPDF } from "./rams-pdf-generator";
import {
  RAMS_YES_NO_OPTIONS,
  applyCustomerToCommercialRamsDocument,
  buildLocationLine,
  createDefaultCommercialRamsDocument,
  formatRamsDate,
  getRamsCompanyName,
  getRamsEquipment,
  getRamsPreset,
  type RamsBusinessDetails,
} from "./rams-utils";
import type {
  CommercialRamsDocument,
  Customer,
  RamsWorkType,
  RamsYesNo,
} from "./types";
import { RAMS_WORK_TYPE_OPTIONS as RAMS_WORK_TYPES } from "./types";

type Props = {
  customers: Customer[];
  documents: CommercialRamsDocument[];
  documentsReady: boolean;
  loggedInStaffName: string;
  businessDetails: RamsBusinessDetails;
  onCreate: (
    document: CommercialRamsDocument
  ) => Promise<CommercialRamsDocument | null>;
  onUpdate: (
    document: CommercialRamsDocument
  ) => Promise<CommercialRamsDocument | null>;
  onDelete: (documentId: string) => Promise<boolean> | boolean;
};

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildDocumentSearchText(document: CommercialRamsDocument) {
  return [
    document.customerName,
    document.jobTitle,
    document.referenceNumber,
    document.workType,
    document.siteName,
    document.siteAddress,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-black tracking-tight text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function CommercialDocsPage({
  customers,
  documents,
  documentsReady,
  loggedInStaffName,
  businessDetails,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const commercialCustomers = useMemo(
    () =>
      customers
        .filter((customer) => customer.customerType === "Commercial")
        .sort((left, right) => left.name.localeCompare(right.name)),
    [customers]
  );
  const [query, setQuery] = useState("");
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CommercialRamsDocument>(() =>
    createDefaultCommercialRamsDocument(loggedInStaffName)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return documents;
    }

    return documents.filter((document) =>
      buildDocumentSearchText(document).includes(normalizedQuery)
    );
  }, [documents, query]);

  const activeDocument = useMemo(
    () => documents.find((document) => document.id === activeDocumentId) ?? null,
    [activeDocumentId, documents]
  );
  const isEditingExistingDocument = Boolean(
    activeDocument && activeDocument.id === draft.id
  );
  const currentCustomer = useMemo(
    () =>
      commercialCustomers.find((customer) => customer.id === draft.customerId) ?? null,
    [commercialCustomers, draft.customerId]
  );

  useEffect(() => {
    if (activeDocument) {
      setDraft({ ...activeDocument });
      return;
    }

    setDraft((previous) => {
      if (!activeDocumentId && !documents.some((document) => document.id === previous.id)) {
        return previous;
      }

      return createDefaultCommercialRamsDocument(loggedInStaffName);
    });
  }, [activeDocument, activeDocumentId, documents, loggedInStaffName]);

  function updateDraft<K extends keyof CommercialRamsDocument>(
    key: K,
    value: CommercialRamsDocument[K]
  ) {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function handleNewDocument() {
    setActiveDocumentId(null);
    setMessage(null);
    setDraft(createDefaultCommercialRamsDocument(loggedInStaffName));
  }

  function handleSelectDocument(documentId: string) {
    setActiveDocumentId(documentId);
    setMessage(null);
  }

  function handleCustomerSelect(value: string) {
    const customerId = Number(value);

    if (!Number.isFinite(customerId)) {
      setDraft((previous) => ({
        ...previous,
        customerId: null,
        customerName: "",
        customerAddress: "",
        customerTown: "",
        customerPostcode: "",
        siteName: "",
        siteAddress: "",
        siteTown: "",
        sitePostcode: "",
        siteContact: "",
        siteContactNumber: "",
      }));
      return;
    }

    const customer = commercialCustomers.find((entry) => entry.id === customerId);

    if (!customer) {
      return;
    }

    setDraft((previous) => applyCustomerToCommercialRamsDocument(previous, customer));
  }

  async function handleSave() {
    if (!normalizeOptionalText(draft.customerName) || !draft.customerId) {
      setMessage("Choose a commercial customer before saving this RAMS document.");
      return;
    }

    if (!normalizeOptionalText(draft.jobTitle)) {
      setMessage("Add a work description or job title before saving.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const payload: CommercialRamsDocument = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };

    try {
      const savedDocument = isEditingExistingDocument
        ? await onUpdate(payload)
        : await onCreate(payload);

      if (!savedDocument) {
        setMessage("Unable to save this RAMS document right now.");
        return;
      }

      setDraft(savedDocument);
      setActiveDocumentId(savedDocument.id);
      setMessage(
        documentsReady
          ? "RAMS document saved to the customer file."
          : "RAMS document saved in the app for now. Run the SQL script so it persists in Supabase."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!draft.id || !isEditingExistingDocument) {
      handleNewDocument();
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const deleted = await onDelete(draft.id);

      if (!deleted) {
        setMessage("Unable to delete this RAMS document.");
        return;
      }

      setActiveDocumentId(null);
      setDraft(createDefaultCommercialRamsDocument(loggedInStaffName));
      setMessage("RAMS document removed from the customer file.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleExportPdf() {
    if (!normalizeOptionalText(draft.customerName)) {
      setMessage("Choose a customer first so the RAMS PDF has the correct site details.");
      return;
    }

    if (!normalizeOptionalText(draft.jobTitle)) {
      setMessage("Add a job title before exporting the RAMS PDF.");
      return;
    }

    await generateCommercialRamsPDF(draft, businessDetails);
  }

  const preset = getRamsPreset(draft.workType);
  const companyName = getRamsCompanyName(businessDetails);

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-gradient-to-r from-[#153c3f] to-[#244d51] px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
              Commercial Documents
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">RAMS & Documents</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/75">
              Build editable RAMS documents from your commercial customer records, then
              save them to the customer file and export them as PDFs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleNewDocument}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              <Plus size={16} />
              New RAMS
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <Download size={16} />
              Export PDF
            </button>
          </div>
        </div>
      </section>

      {!documentsReady && (
        <section className="rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
          The commercial RAMS table is not set up in Supabase yet, so these documents will
          only stay in the app until you refresh. Run the RAMS SQL setup script to make
          them save permanently.
        </section>
      )}

      {message ? (
        <section className="rounded-[20px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm">
          {message}
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <Section
          title="Saved RAMS"
          description="Open an existing RAMS document or start a new one."
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customer, site, work type or reference..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={handleNewDocument}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus size={16} />
              New
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {documents.length} saved RAMS document{documents.length === 1 ? "" : "s"}.
            {commercialCustomers.length
              ? ` ${commercialCustomers.length} commercial customer${
                  commercialCustomers.length === 1 ? "" : "s"
                } available for autofill.`
              : " Add a commercial customer first to use the autofill dropdown."}
          </div>

          <div className="space-y-3">
            {filteredDocuments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No RAMS documents match this search yet.
              </div>
            ) : (
              filteredDocuments.map((document) => {
                const isActive = document.id === draft.id && isEditingExistingDocument;
                const location = buildLocationLine(
                  document.siteTown ?? document.customerTown,
                  document.sitePostcode ?? document.customerPostcode
                );

                return (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => handleSelectDocument(document.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-[#153c3f] bg-[#153c3f] text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black tracking-tight">
                          {document.customerName}
                        </p>
                        <p
                          className={`mt-1 text-sm ${
                            isActive ? "text-white/80" : "text-slate-500"
                          }`}
                        >
                          {document.jobTitle || document.workType}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          isActive
                            ? "bg-white/10 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {document.workType}
                      </span>
                    </div>

                    <div
                      className={`mt-3 grid gap-2 text-xs ${
                        isActive ? "text-white/80" : "text-slate-500"
                      }`}
                    >
                      <p>
                        Ref: {document.referenceNumber || "Not set"} | Start:{" "}
                        {formatRamsDate(document.startDate)}
                      </p>
                      <p>{document.siteName || document.siteAddress || document.customerAddress || "No site details saved"}</p>
                      {location ? <p>{location}</p> : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Section>

        <div className="space-y-6">
          <Section
            title="RAMS Generator"
            description="Choose a commercial customer to auto-fill the site details, then adjust anything you need before saving."
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {isEditingExistingDocument ? "Editing saved RAMS" : "New RAMS draft"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {draft.workType}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={16} />
                  {isSaving ? "Saving..." : "Save to Customer File"}
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Download size={16} />
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  {isDeleting ? "Deleting..." : isEditingExistingDocument ? "Delete" : "Clear Draft"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-slate-500" />
                  <p className="font-semibold text-slate-900">Company Details</p>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>{companyName}</p>
                  {businessDetails.businessPhone ? <p>{businessDetails.businessPhone}</p> : null}
                  {businessDetails.businessEmail ? <p>{businessDetails.businessEmail}</p> : null}
                  {businessDetails.website ? <p>{businessDetails.website}</p> : null}
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  These details are pulled from Settings and shown on the RAMS PDF.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <ClipboardList size={18} className="text-slate-500" />
                  <p className="font-semibold text-slate-900">Work Type Preset</p>
                </div>
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Scope
                    </p>
                    <p className="mt-1">{preset.scope}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Equipment
                    </p>
                    <p className="mt-1">{getRamsEquipment(draft)}</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section
            title="Project & Client Information"
            description="Selecting a commercial customer will auto-fill the customer and site details below."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Commercial Customer"
                hint="Choosing a customer will copy their name, address, site details, and contact number into this RAMS."
              >
                <select
                  value={draft.customerId ?? ""}
                  onChange={(event) => handleCustomerSelect(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                >
                  <option value="">Select a commercial customer...</option>
                  {commercialCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Work Type">
                <select
                  value={draft.workType}
                  onChange={(event) =>
                    updateDraft("workType", event.target.value as RamsWorkType)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                >
                  {RAMS_WORK_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Client / Company Name">
                <input
                  value={draft.customerName}
                  onChange={(event) => updateDraft("customerName", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Work Description / Job Title">
                <input
                  value={draft.jobTitle}
                  onChange={(event) => updateDraft("jobTitle", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Customer Address">
                <input
                  value={draft.customerAddress ?? ""}
                  onChange={(event) => updateDraft("customerAddress", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Site Name">
                <input
                  value={draft.siteName ?? ""}
                  onChange={(event) => updateDraft("siteName", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Customer Town">
                <input
                  value={draft.customerTown ?? ""}
                  onChange={(event) => updateDraft("customerTown", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Customer Postcode">
                <input
                  value={draft.customerPostcode ?? ""}
                  onChange={(event) => updateDraft("customerPostcode", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Site Address">
                <input
                  value={draft.siteAddress ?? ""}
                  onChange={(event) => updateDraft("siteAddress", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Site Town">
                <input
                  value={draft.siteTown ?? ""}
                  onChange={(event) => updateDraft("siteTown", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Site Postcode">
                <input
                  value={draft.sitePostcode ?? ""}
                  onChange={(event) => updateDraft("sitePostcode", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Reference No.">
                <input
                  value={draft.referenceNumber ?? ""}
                  onChange={(event) => updateDraft("referenceNumber", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Revision">
                <input
                  value={draft.revision ?? ""}
                  onChange={(event) => updateDraft("revision", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Start Date">
                <input
                  type="date"
                  value={draft.startDate ?? ""}
                  onChange={(event) => updateDraft("startDate", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Estimated Duration">
                <input
                  value={draft.estimatedDuration ?? ""}
                  onChange={(event) => updateDraft("estimatedDuration", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Prepared By">
                <input
                  value={draft.preparedBy ?? ""}
                  onChange={(event) => updateDraft("preparedBy", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Operatives">
                <input
                  value={draft.operatives ?? ""}
                  onChange={(event) => updateDraft("operatives", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Site Supervisor">
                <input
                  value={draft.siteSupervisor ?? ""}
                  onChange={(event) => updateDraft("siteSupervisor", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Emergency Contact">
                <input
                  value={draft.emergencyContact ?? ""}
                  onChange={(event) => updateDraft("emergencyContact", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Scope of Works"
            description="Leave the custom scope blank to use the standard scope from the selected work type."
          >
            <Field
              label="Optional Custom Scope Override"
              hint="If you leave this empty, the RAMS will use the standard wording for the work type you selected."
            >
              <textarea
                value={draft.customScope ?? ""}
                onChange={(event) => updateDraft("customScope", event.target.value)}
                className="min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              />
            </Field>
          </Section>

          <Section
            title="Site Conditions & Job Specific Considerations"
            description="These answers drive the site-condition text, risk matrix, and method statement in the PDF."
          >
            <div className="grid gap-4">
              {[
                ["publicAccess", "Public access area?", "publicAccessNotes"],
                ["workingAtHeight", "Working at height?", "workingAtHeightNotes"],
                ["chemicals", "Chemicals / COSHH?", "chemicalsNotes"],
                ["vehicleMovement", "Vehicle / traffic movement?", "vehicleMovementNotes"],
                ["poweredMachinery", "Powered machinery?", "poweredMachineryNotes"],
                ["services", "Underground / overhead services?", "servicesNotes"],
              ].map(([valueKey, label, notesKey]) => (
                <div
                  key={valueKey}
                  className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[0.28fr_0.18fr_1fr]"
                >
                  <div className="flex items-center">
                    <p className="text-sm font-semibold text-slate-900">{label}</p>
                  </div>

                  <select
                    value={draft[valueKey as keyof CommercialRamsDocument] as RamsYesNo}
                    onChange={(event) =>
                      updateDraft(
                        valueKey as keyof CommercialRamsDocument,
                        event.target.value as CommercialRamsDocument[keyof CommercialRamsDocument]
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  >
                    {RAMS_YES_NO_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <input
                    value={String(
                      draft[notesKey as keyof CommercialRamsDocument] ?? ""
                    )}
                    onChange={(event) =>
                      updateDraft(
                        notesKey as keyof CommercialRamsDocument,
                        event.target.value as CommercialRamsDocument[keyof CommercialRamsDocument]
                      )
                    }
                    placeholder="Optional site-specific notes"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Job Notes"
            description="These notes feed straight into the method statement and additional hazards sections of the RAMS output."
          >
            <div className="grid gap-4">
              <Field label="Task-specific method statement notes">
                <textarea
                  value={draft.methodNotes ?? ""}
                  onChange={(event) => updateDraft("methodNotes", event.target.value)}
                  className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Additional hazards / client requirements">
                <textarea
                  value={draft.additionalHazards ?? ""}
                  onChange={(event) => updateDraft("additionalHazards", event.target.value)}
                  className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Emergency & Sign-off Inputs"
            description="These details appear in the emergency information and sign-off section of the PDF."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Site Contact">
                <input
                  value={draft.siteContact ?? ""}
                  onChange={(event) => updateDraft("siteContact", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Site Contact Number">
                <input
                  value={draft.siteContactNumber ?? ""}
                  onChange={(event) => updateDraft("siteContactNumber", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Nearest Hospital">
                <input
                  value={draft.nearestHospital ?? ""}
                  onChange={(event) => updateDraft("nearestHospital", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Client Approval Name">
                <input
                  value={draft.clientApprovalName ?? ""}
                  onChange={(event) => updateDraft("clientApprovalName", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <Field label="Approval Role">
                <input
                  value={draft.approvalRole ?? ""}
                  onChange={(event) => updateDraft("approvalRole", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </Field>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Live Summary
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-900">Customer:</span>{" "}
                    {draft.customerName || "Not selected"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Work Type:</span>{" "}
                    {draft.workType}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Start Date:</span>{" "}
                    {formatRamsDate(draft.startDate)}
                  </p>
                  {currentCustomer ? (
                    <p>
                      <span className="font-semibold text-slate-900">Autofill Source:</span>{" "}
                      {currentCustomer.name}
                    </p>
                  ) : null}
                </div>
              </div>

              <Field label="Emergency procedure / assembly point / first aid notes">
                <textarea
                  value={draft.emergencyProcedure ?? ""}
                  onChange={(event) => updateDraft("emergencyProcedure", event.target.value)}
                  className="min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 md:col-span-2"
                />
              </Field>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
