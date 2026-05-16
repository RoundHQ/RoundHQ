"use client";

import type {
  CommercialRamsDocument,
  Customer,
  RamsWorkType,
  RamsYesNo,
} from "./types";

export type RamsBusinessDetails = {
  businessName?: string;
  tradingName?: string;
  businessEmail?: string;
  businessPhone?: string;
  website?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  pdfHeaderStyle?: "banner" | "letterhead";
  pdfLogoBackground?: "none" | "dark" | "light";
  pdfLogoScale?: number;
  pdfShowLogo?: boolean;
  pdfShowFooter?: boolean;
  pdfShowBusinessDetails?: boolean;
  pdfFooterText?: string;
};

type WorkTypePreset = {
  scope: string;
  equipment: string;
  method: string;
};

type RamsMatrixRow = {
  number: number;
  hazard: string;
  harm: string;
  harmed: string;
  controls: string;
  risk: string;
};

type RamsMethodRow = {
  step: string;
  description: string;
  method: string;
};

export const RAMS_YES_NO_OPTIONS: RamsYesNo[] = ["Yes", "No"];

export const RAMS_WORK_TYPE_PRESETS: Record<RamsWorkType, WorkTypePreset> = {
  "Hedge Trimming": {
    scope:
      "Hedge trimming, shaping and removal of green waste from the working area.",
    equipment:
      "Hedge trimmer, hand shears, blower, tarps and hand tools.",
    method:
      "Inspect for obstructions, trim in controlled sections, prevent falling debris onto access routes and clear arisings.",
  },
  "Pressure Washing": {
    scope:
      "Pressure washing of hard surfaces including pre-treatment where required and final rinse / tidy.",
    equipment:
      "Pressure washer, hoses, lance, surface cleaner and chemical sprayer if required.",
    method:
      "Set up water supply safely, cordon the wet area, apply treatment if required, wash methodically and manage runoff.",
  },
  "Gutter Cleaning": {
    scope:
      "Cleaning gutters and downpipes and removing debris from the working area.",
    equipment:
      "Ladder, gutter vacuum or hand tools, buckets and warning signage.",
    method:
      "Inspect access, secure equipment, clean sections carefully, control falling debris and check downpipe flow.",
  },
  "Grounds Maintenance": {
    scope:
      "General grounds maintenance including borders, weeds, pruning and seasonal external upkeep.",
    equipment:
      "Mixed grounds maintenance kit including mower, strimmer, hedge tools and hand tools.",
    method:
      "Sequence tasks to minimise disruption, keep work zones tidy and complete all maintenance with suitable controls.",
  },
  Other: {
    scope:
      "General external maintenance works as described in the work description and scope.",
    equipment: "Tools and equipment appropriate to the task.",
    method:
      "Follow the agreed task sequence, isolate hazards, use suitable tools and maintain safe housekeeping.",
  },
};

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function createDraftId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `rams-${Date.now()}`;
}

export function getRamsCompanyName(details: RamsBusinessDetails) {
  return (
    normalizeOptionalText(details.tradingName) ||
    normalizeOptionalText(details.businessName) ||
    "Your Business"
  );
}

export function getRamsPreset(workType: RamsWorkType) {
  return RAMS_WORK_TYPE_PRESETS[workType];
}

export function formatRamsDate(value: string | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB");
}

export function buildLocationLine(town?: string, postcode?: string) {
  return [normalizeOptionalText(town), normalizeOptionalText(postcode)]
    .filter(Boolean)
    .join(", ");
}

export function buildCustomerAddressLines(
  document: Pick<
    CommercialRamsDocument,
    "customerName" | "customerAddress" | "customerTown" | "customerPostcode"
  >
) {
  const location = buildLocationLine(document.customerTown, document.customerPostcode);

  return [
    normalizeOptionalText(document.customerName),
    normalizeOptionalText(document.customerAddress),
    location || undefined,
  ].filter(Boolean) as string[];
}

export function buildSiteAddressLines(
  document: Pick<
    CommercialRamsDocument,
    "siteName" | "siteAddress" | "siteTown" | "sitePostcode"
  >
) {
  const location = buildLocationLine(document.siteTown, document.sitePostcode);

  return [
    normalizeOptionalText(document.siteName),
    normalizeOptionalText(document.siteAddress),
    location || undefined,
  ].filter(Boolean) as string[];
}

export function getDocumentSiteLines(document: CommercialRamsDocument) {
  const siteLines = buildSiteAddressLines(document);
  return siteLines.length > 0 ? siteLines : buildCustomerAddressLines(document);
}

export function createDefaultCommercialRamsDocument(
  loggedInStaffName?: string
): CommercialRamsDocument {
  return {
    id: createDraftId(),
    customerId: null,
    customerName: "",
    customerAddress: "",
    customerTown: "",
    customerPostcode: "",
    siteName: "",
    siteAddress: "",
    siteTown: "",
    sitePostcode: "",
    jobTitle: "",
    referenceNumber: "",
    revision: "",
    startDate: "",
    estimatedDuration: "1 Day",
    preparedBy: loggedInStaffName ?? "",
    workType: "Grounds Maintenance",
    operatives: loggedInStaffName ?? "",
    siteSupervisor: loggedInStaffName ?? "",
    emergencyContact: "",
    customScope: "",
    publicAccess: "Yes",
    publicAccessNotes: "",
    workingAtHeight: "No",
    workingAtHeightNotes: "",
    chemicals: "No",
    chemicalsNotes: "",
    vehicleMovement: "Yes",
    vehicleMovementNotes: "",
    poweredMachinery: "Yes",
    poweredMachineryNotes: "",
    services: "No",
    servicesNotes: "",
    methodNotes: "",
    additionalHazards: "",
    siteContact: "",
    siteContactNumber: "",
    nearestHospital: "",
    emergencyProcedure: "",
    clientApprovalName: "",
    approvalRole: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function applyCustomerToCommercialRamsDocument(
  document: CommercialRamsDocument,
  customer: Customer
) {
  return {
    ...document,
    customerId: customer.id,
    customerName: normalizeOptionalText(customer.name) ?? "",
    customerAddress: normalizeOptionalText(customer.address) ?? "",
    customerTown: normalizeOptionalText(customer.town) ?? "",
    customerPostcode: normalizeOptionalText(customer.postcode) ?? "",
    siteName: normalizeOptionalText(customer.siteName) ?? "",
    siteAddress:
      normalizeOptionalText(customer.siteAddress) ??
      normalizeOptionalText(customer.address) ??
      "",
    siteTown:
      normalizeOptionalText(customer.siteTown) ??
      normalizeOptionalText(customer.town) ??
      "",
    sitePostcode:
      normalizeOptionalText(customer.sitePostcode) ??
      normalizeOptionalText(customer.postcode) ??
      "",
    siteContact: normalizeOptionalText(customer.name) ?? document.siteContact ?? "",
    siteContactNumber:
      normalizeOptionalText(customer.phone) ?? document.siteContactNumber ?? "",
  };
}

export function getRamsScope(document: CommercialRamsDocument) {
  return normalizeOptionalText(document.customScope) || getRamsPreset(document.workType).scope;
}

export function getRamsEquipment(document: CommercialRamsDocument) {
  return getRamsPreset(document.workType).equipment;
}

export function getRamsSiteConditionRows(document: CommercialRamsDocument) {
  return [
    {
      label: "Public access area",
      value: document.publicAccess,
      notes: normalizeOptionalText(document.publicAccessNotes),
      description:
        document.publicAccess === "Yes"
          ? "Yes - segregate the work area, display warning signage and manage access during the task."
          : "No public access restriction noted.",
    },
    {
      label: "Working at height",
      value: document.workingAtHeight,
      notes: normalizeOptionalText(document.workingAtHeightNotes),
      description:
        document.workingAtHeight === "Yes"
          ? "Yes - use suitable access equipment, inspect before use and maintain three points of contact."
          : "No work at height planned.",
    },
    {
      label: "Chemicals / COSHH",
      value: document.chemicals,
      notes: normalizeOptionalText(document.chemicalsNotes),
      description:
        document.chemicals === "Yes"
          ? "Yes - use COSHH-assessed products, follow manufacturer guidance and wear suitable PPE."
          : "No chemicals planned.",
    },
    {
      label: "Vehicle / traffic movement",
      value: document.vehicleMovement,
      notes: normalizeOptionalText(document.vehicleMovementNotes),
      description:
        document.vehicleMovement === "Yes"
          ? "Yes - maintain awareness of moving vehicles, use hi-vis clothing and keep equipment clear of traffic routes."
          : "No significant vehicle interface noted.",
    },
    {
      label: "Powered machinery",
      value: document.poweredMachinery,
      notes: normalizeOptionalText(document.poweredMachineryNotes),
      description:
        document.poweredMachinery === "Yes"
          ? "Yes - trained operatives only, pre-use checks completed and exclusion zone maintained."
          : "No powered machinery planned.",
    },
    {
      label: "Underground / overhead services",
      value: document.services,
      notes: normalizeOptionalText(document.servicesNotes),
      description:
        document.services === "Yes"
          ? "Yes - identify service locations before starting work and avoid contact with buried or overhead assets."
          : "No known service concern noted.",
    },
  ].map((entry) => ({
    ...entry,
    fullText: entry.notes ? `${entry.description} Notes: ${entry.notes}` : entry.description,
  }));
}

export function getRamsRiskMatrix(document: CommercialRamsDocument): RamsMatrixRow[] {
  return [
    {
      number: 1,
      hazard: "Slips, trips and falls",
      harm:
        "Minor to serious injury from uneven ground, trailing hoses, debris or wet surfaces.",
      harmed: "Operatives, staff, visitors, public.",
      controls:
        "Good housekeeping, route hoses/leads safely and wear suitable footwear.",
      risk: "Low",
    },
    {
      number: 2,
      hazard: "Manual handling",
      harm: "Sprains or strains from lifting equipment, waste or materials.",
      harmed: "Operatives.",
      controls: "Assess loads, share heavy lifts and use safe lifting technique.",
      risk: "Medium",
    },
    {
      number: 3,
      hazard: "Public interface / unauthorised access",
      harm:
        document.publicAccess === "Yes"
          ? "Injury to public or disruption if the work area is entered during operations."
          : "N/A",
      harmed:
        document.publicAccess === "Yes"
          ? "Public, residents, staff, visitors."
          : "N/A",
      controls:
        document.publicAccess === "Yes"
          ? "Use barriers/signage, keep tools attended and stop work if the public enters the zone."
          : "N/A",
      risk: document.publicAccess === "Yes" ? "Medium" : "N/A",
    },
    {
      number: 4,
      hazard: "Powered machinery / equipment",
      harm:
        document.poweredMachinery === "Yes"
          ? "Flying debris, entanglement, noise or vibration related injury."
          : "Minor abrasions, bruises or pinch injuries.",
      harmed: "Operatives and nearby persons.",
      controls:
        document.poweredMachinery === "Yes"
          ? "Trained operatives only, pre-use checks, PPE and exclusion zone."
          : "Inspect tools before use and store safely when not in use.",
      risk: document.poweredMachinery === "Yes" ? "Medium" : "Low",
    },
    {
      number: 5,
      hazard: "Working at height / ladder use",
      harm:
        document.workingAtHeight === "Yes"
          ? "Falls from height or falling tools / debris."
          : "N/A",
      harmed:
        document.workingAtHeight === "Yes"
          ? "Operatives and persons below the work area."
          : "N/A",
      controls:
        document.workingAtHeight === "Yes"
          ? "Use suitable access equipment, inspect before use and never overreach."
          : "N/A",
      risk: document.workingAtHeight === "Yes" ? "High" : "N/A",
    },
    {
      number: 6,
      hazard: "Chemical handling / COSHH",
      harm:
        document.chemicals === "Yes"
          ? "Skin / eye irritation, inhalation risk or damage to surfaces / environment."
          : "N/A",
      harmed:
        document.chemicals === "Yes"
          ? "Operatives, public and the environment."
          : "N/A",
      controls:
        document.chemicals === "Yes"
          ? "Follow COSHH data, avoid overspray/runoff and wear suitable PPE."
          : "N/A",
      risk: document.chemicals === "Yes" ? "Medium" : "N/A",
    },
    {
      number: 7,
      hazard: "Vehicle / traffic movement",
      harm:
        document.vehicleMovement === "Yes"
          ? "Collision with vehicles or contact with moving plant during loading / unloading."
          : "N/A",
      harmed:
        document.vehicleMovement === "Yes"
          ? "Operatives, drivers, public."
          : "N/A",
      controls:
        document.vehicleMovement === "Yes"
          ? "Park safely, unload in a controlled area and wear hi-vis."
          : "N/A",
      risk: document.vehicleMovement === "Yes" ? "Medium" : "N/A",
    },
    {
      number: 8,
      hazard: "Underground / overhead services",
      harm:
        document.services === "Yes"
          ? "Service strike, electric shock or property damage."
          : "N/A",
      harmed:
        document.services === "Yes"
          ? "Operatives, occupants, property."
          : "N/A",
      controls:
        document.services === "Yes"
          ? "Confirm service locations before work and stop if services are unknown."
          : "N/A",
      risk: document.services === "Yes" ? "High" : "N/A",
    },
  ];
}

export function getRamsMethodStatement(document: CommercialRamsDocument): RamsMethodRow[] {
  const preset = getRamsPreset(document.workType);
  const taskNotes = normalizeOptionalText(document.methodNotes);

  return [
    {
      step: "1",
      description: "Arrival / briefing",
      method:
        "Report to the site contact where required, review the work area, confirm access and identify any immediate hazards before unloading equipment.",
    },
    {
      step: "2",
      description: "Set up work area",
      method:
        document.publicAccess === "Yes"
          ? "Set out signage / barriers, isolate the work area from the public and position equipment to avoid blocking access routes."
          : "Position equipment safely, confirm safe access / egress and complete pre-use checks before starting.",
    },
    {
      step: "3",
      description: "Carry out task",
      method: taskNotes ? `${preset.method} Additional task notes: ${taskNotes}` : preset.method,
    },
    {
      step: "4",
      description: "Waste / environmental controls",
      method:
        "Collect waste as work progresses, prevent debris from entering drains, minimise noise where possible and remove all arisings / rubbish as agreed.",
    },
    {
      step: "5",
      description: "Completion / handover",
      method:
        "Inspect the completed work, remove equipment and signage, leave the area clean and safe and report completion / issues to the client or site contact.",
    },
  ];
}

export function getRamsRequiredPpe(document: CommercialRamsDocument) {
  const items = ["Safety boots", "gloves", "hi-vis clothing"];

  if (document.poweredMachinery === "Yes") {
    items.push("eye protection", "ear protection");
  }

  if (document.chemicals === "Yes") {
    items.push("respiratory protection");
  }

  if (document.workingAtHeight === "Yes") {
    items.push("fall protection / harness if required");
  }

  return items.join(", ");
}

export function getRamsEmergencyInfo(document: CommercialRamsDocument) {
  const lines = [];

  if (normalizeOptionalText(document.siteContact)) {
    const contactNumber = normalizeOptionalText(document.siteContactNumber);
    lines.push(
      `Site contact: ${document.siteContact}${
        contactNumber ? ` (${contactNumber})` : ""
      }`
    );
  }

  if (normalizeOptionalText(document.nearestHospital)) {
    lines.push(`Nearest hospital: ${document.nearestHospital}`);
  }

  lines.push(
    normalizeOptionalText(document.emergencyProcedure) ||
      "Use site first aid arrangements, contact emergency services on 999 where required and record all incidents."
  );

  return lines.join("\n");
}
