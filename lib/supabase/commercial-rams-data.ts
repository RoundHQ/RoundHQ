import type {
  CommercialRamsDocument,
  RamsWorkType,
  RamsYesNo,
} from "@/components/jobs/types";

export const COMMERCIAL_RAMS_SELECT_FIELDS = [
  "id",
  "customer_id",
  "customer_name",
  "customer_address",
  "customer_town",
  "customer_postcode",
  "site_name",
  "site_address",
  "site_town",
  "site_postcode",
  "job_title",
  "reference_number",
  "revision",
  "start_date",
  "estimated_duration",
  "prepared_by",
  "work_type",
  "operatives",
  "site_supervisor",
  "emergency_contact",
  "custom_scope",
  "public_access",
  "public_access_notes",
  "working_at_height",
  "working_at_height_notes",
  "chemicals",
  "chemicals_notes",
  "vehicle_movement",
  "vehicle_movement_notes",
  "powered_machinery",
  "powered_machinery_notes",
  "services",
  "services_notes",
  "method_notes",
  "additional_hazards",
  "site_contact",
  "site_contact_number",
  "nearest_hospital",
  "emergency_procedure",
  "client_approval_name",
  "approval_role",
  "created_at",
  "updated_at",
].join(",");

export type CommercialRamsRow = {
  id: string;
  customer_id: number | null;
  customer_name: string;
  customer_address: string | null;
  customer_town: string | null;
  customer_postcode: string | null;
  site_name: string | null;
  site_address: string | null;
  site_town: string | null;
  site_postcode: string | null;
  job_title: string | null;
  reference_number: string | null;
  revision: string | null;
  start_date: string | null;
  estimated_duration: string | null;
  prepared_by: string | null;
  work_type: string | null;
  operatives: string | null;
  site_supervisor: string | null;
  emergency_contact: string | null;
  custom_scope: string | null;
  public_access: string | null;
  public_access_notes: string | null;
  working_at_height: string | null;
  working_at_height_notes: string | null;
  chemicals: string | null;
  chemicals_notes: string | null;
  vehicle_movement: string | null;
  vehicle_movement_notes: string | null;
  powered_machinery: string | null;
  powered_machinery_notes: string | null;
  services: string | null;
  services_notes: string | null;
  method_notes: string | null;
  additional_hazards: string | null;
  site_contact: string | null;
  site_contact_number: string | null;
  nearest_hospital: string | null;
  emergency_procedure: string | null;
  client_approval_name: string | null;
  approval_role: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type CommercialRamsWriteRow = {
  id: string;
  customer_id: number | null;
  customer_name: string;
  customer_address: string | null;
  customer_town: string | null;
  customer_postcode: string | null;
  site_name: string | null;
  site_address: string | null;
  site_town: string | null;
  site_postcode: string | null;
  job_title: string | null;
  reference_number: string | null;
  revision: string | null;
  start_date: string | null;
  estimated_duration: string | null;
  prepared_by: string | null;
  work_type: RamsWorkType;
  operatives: string | null;
  site_supervisor: string | null;
  emergency_contact: string | null;
  custom_scope: string | null;
  public_access: RamsYesNo;
  public_access_notes: string | null;
  working_at_height: RamsYesNo;
  working_at_height_notes: string | null;
  chemicals: RamsYesNo;
  chemicals_notes: string | null;
  vehicle_movement: RamsYesNo;
  vehicle_movement_notes: string | null;
  powered_machinery: RamsYesNo;
  powered_machinery_notes: string | null;
  services: RamsYesNo;
  services_notes: string | null;
  method_notes: string | null;
  additional_hazards: string | null;
  site_contact: string | null;
  site_contact_number: string | null;
  nearest_hospital: string | null;
  emergency_procedure: string | null;
  client_approval_name: string | null;
  approval_role: string | null;
  created_at: string;
  updated_at: string | null;
};

const WORK_TYPES: RamsWorkType[] = [
  "Grounds Maintenance",
  "Hedge Trimming",
  "Pressure Washing",
  "Gutter Cleaning",
  "Grounds Maintenance",
  "Other",
];

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeWorkType(value: string | null | undefined): RamsWorkType {
  return WORK_TYPES.includes(value as RamsWorkType)
    ? (value as RamsWorkType)
    : "Grounds Maintenance";
}

function normalizeYesNo(value: string | null | undefined): RamsYesNo {
  return value === "Yes" ? "Yes" : "No";
}

export function mapCommercialRamsRowToDocument(
  row: CommercialRamsRow
): CommercialRamsDocument {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerAddress: normalizeOptionalText(row.customer_address),
    customerTown: normalizeOptionalText(row.customer_town),
    customerPostcode: normalizeOptionalText(row.customer_postcode),
    siteName: normalizeOptionalText(row.site_name),
    siteAddress: normalizeOptionalText(row.site_address),
    siteTown: normalizeOptionalText(row.site_town),
    sitePostcode: normalizeOptionalText(row.site_postcode),
    jobTitle: normalizeOptionalText(row.job_title) ?? "",
    referenceNumber: normalizeOptionalText(row.reference_number),
    revision: normalizeOptionalText(row.revision),
    startDate: normalizeOptionalText(row.start_date),
    estimatedDuration: normalizeOptionalText(row.estimated_duration),
    preparedBy: normalizeOptionalText(row.prepared_by),
    workType: normalizeWorkType(row.work_type),
    operatives: normalizeOptionalText(row.operatives),
    siteSupervisor: normalizeOptionalText(row.site_supervisor),
    emergencyContact: normalizeOptionalText(row.emergency_contact),
    customScope: normalizeOptionalText(row.custom_scope),
    publicAccess: normalizeYesNo(row.public_access),
    publicAccessNotes: normalizeOptionalText(row.public_access_notes),
    workingAtHeight: normalizeYesNo(row.working_at_height),
    workingAtHeightNotes: normalizeOptionalText(row.working_at_height_notes),
    chemicals: normalizeYesNo(row.chemicals),
    chemicalsNotes: normalizeOptionalText(row.chemicals_notes),
    vehicleMovement: normalizeYesNo(row.vehicle_movement),
    vehicleMovementNotes: normalizeOptionalText(row.vehicle_movement_notes),
    poweredMachinery: normalizeYesNo(row.powered_machinery),
    poweredMachineryNotes: normalizeOptionalText(row.powered_machinery_notes),
    services: normalizeYesNo(row.services),
    servicesNotes: normalizeOptionalText(row.services_notes),
    methodNotes: normalizeOptionalText(row.method_notes),
    additionalHazards: normalizeOptionalText(row.additional_hazards),
    siteContact: normalizeOptionalText(row.site_contact),
    siteContactNumber: normalizeOptionalText(row.site_contact_number),
    nearestHospital: normalizeOptionalText(row.nearest_hospital),
    emergencyProcedure: normalizeOptionalText(row.emergency_procedure),
    clientApprovalName: normalizeOptionalText(row.client_approval_name),
    approvalRole: normalizeOptionalText(row.approval_role),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? undefined,
  };
}

export function mapCommercialRamsToRow(
  document: CommercialRamsDocument
): CommercialRamsWriteRow {
  return {
    id: document.id,
    customer_id: document.customerId ?? null,
    customer_name: document.customerName.trim(),
    customer_address: normalizeOptionalText(document.customerAddress) ?? null,
    customer_town: normalizeOptionalText(document.customerTown) ?? null,
    customer_postcode: normalizeOptionalText(document.customerPostcode) ?? null,
    site_name: normalizeOptionalText(document.siteName) ?? null,
    site_address: normalizeOptionalText(document.siteAddress) ?? null,
    site_town: normalizeOptionalText(document.siteTown) ?? null,
    site_postcode: normalizeOptionalText(document.sitePostcode) ?? null,
    job_title: normalizeOptionalText(document.jobTitle) ?? null,
    reference_number: normalizeOptionalText(document.referenceNumber) ?? null,
    revision: normalizeOptionalText(document.revision) ?? null,
    start_date: normalizeOptionalText(document.startDate) ?? null,
    estimated_duration: normalizeOptionalText(document.estimatedDuration) ?? null,
    prepared_by: normalizeOptionalText(document.preparedBy) ?? null,
    work_type: document.workType,
    operatives: normalizeOptionalText(document.operatives) ?? null,
    site_supervisor: normalizeOptionalText(document.siteSupervisor) ?? null,
    emergency_contact: normalizeOptionalText(document.emergencyContact) ?? null,
    custom_scope: normalizeOptionalText(document.customScope) ?? null,
    public_access: document.publicAccess,
    public_access_notes: normalizeOptionalText(document.publicAccessNotes) ?? null,
    working_at_height: document.workingAtHeight,
    working_at_height_notes:
      normalizeOptionalText(document.workingAtHeightNotes) ?? null,
    chemicals: document.chemicals,
    chemicals_notes: normalizeOptionalText(document.chemicalsNotes) ?? null,
    vehicle_movement: document.vehicleMovement,
    vehicle_movement_notes:
      normalizeOptionalText(document.vehicleMovementNotes) ?? null,
    powered_machinery: document.poweredMachinery,
    powered_machinery_notes:
      normalizeOptionalText(document.poweredMachineryNotes) ?? null,
    services: document.services,
    services_notes: normalizeOptionalText(document.servicesNotes) ?? null,
    method_notes: normalizeOptionalText(document.methodNotes) ?? null,
    additional_hazards: normalizeOptionalText(document.additionalHazards) ?? null,
    site_contact: normalizeOptionalText(document.siteContact) ?? null,
    site_contact_number: normalizeOptionalText(document.siteContactNumber) ?? null,
    nearest_hospital: normalizeOptionalText(document.nearestHospital) ?? null,
    emergency_procedure: normalizeOptionalText(document.emergencyProcedure) ?? null,
    client_approval_name:
      normalizeOptionalText(document.clientApprovalName) ?? null,
    approval_role: normalizeOptionalText(document.approvalRole) ?? null,
    created_at: document.createdAt,
    updated_at: document.updatedAt ?? new Date().toISOString(),
  };
}
