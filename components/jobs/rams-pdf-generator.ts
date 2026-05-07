import jsPDF from "jspdf";
import type { CommercialRamsDocument } from "./types";
import {
  formatRamsDate,
  getDocumentSiteLines,
  getRamsCompanyName,
  getRamsEmergencyInfo,
  getRamsMethodStatement,
  getRamsRequiredPpe,
  getRamsRiskMatrix,
  getRamsScope,
  getRamsSiteConditionRows,
  type RamsBusinessDetails,
} from "./rams-utils";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 12;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_Y = PAGE_HEIGHT - 14;

type LogoAsset = {
  dataUrl: string;
  width: number;
  height: number;
};

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  const candidate = value?.trim();

  if (!candidate) {
    return fallback;
  }

  const normalized = candidate.startsWith("#") ? candidate : `#${candidate}`;
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

  if (!match) {
    return fallback;
  }

  if (match[1].length === 3) {
    const [r, g, b] = match[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return normalized.toLowerCase();
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex, "#000000").replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function setFillColor(doc: jsPDF, hex: string) {
  const { r, g, b } = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

function setDrawColor(doc: jsPDF, hex: string) {
  const { r, g, b } = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}

function setTextColor(doc: jsPDF, hex: string) {
  const { r, g, b } = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

function resolveLogoUrl(logoUrl?: string) {
  const candidate = logoUrl?.trim() || "/logo.png";

  if (/^(https?:|data:)/i.test(candidate)) {
    return candidate;
  }

  if (typeof window === "undefined") {
    return candidate;
  }

  return new URL(candidate, window.location.origin).toString();
}

async function loadLogoAsset(logoUrl?: string): Promise<LogoAsset | null> {
  if (typeof window === "undefined") {
    return null;
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        resolve(null);
        return;
      }

      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      resolve({
        dataUrl: canvas.toDataURL("image/png"),
        width,
        height,
      });
    };

    image.onerror = () => resolve(null);
    image.src = resolveLogoUrl(logoUrl);
  });
}

function ensurePageSpace(doc: jsPDF, y: number, requiredHeight: number) {
  if (y + requiredHeight <= BOTTOM_Y) {
    return y;
  }

  doc.addPage();
  return MARGIN;
}

function getWrappedHeight(
  doc: jsPDF,
  text: string,
  width: number,
  lineHeight: number
) {
  const lines = doc.splitTextToSize(text || "-", Math.max(10, width));
  return Math.max(lineHeight, lines.length * lineHeight);
}

function drawSectionTitle(
  doc: jsPDF,
  y: number,
  title: string,
  secondaryColor: string,
  lightBorder: string
) {
  y = ensurePageSpace(doc, y, 10);
  setFillColor(doc, secondaryColor);
  setDrawColor(doc, lightBorder);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setTextColor(doc, "#ffffff");
  doc.text(title, MARGIN + 3, y + 5.4);
  return y + 8;
}

function drawParagraphBox(
  doc: jsPDF,
  y: number,
  text: string,
  borderColor: string
) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, "#102128");
  setDrawColor(doc, borderColor);
  const lineHeight = 4.4;
  const lines = doc.splitTextToSize(text || "-", CONTENT_WIDTH - 8);
  const height = Math.max(16, lines.length * lineHeight + 8);
  y = ensurePageSpace(doc, y, height);
  doc.rect(MARGIN, y, CONTENT_WIDTH, height);
  doc.text(lines, MARGIN + 4, y + 6);
  return y + height;
}

function drawHeader(
  doc: jsPDF,
  logoAsset: LogoAsset | null,
  secondaryColor: string
) {
  const headerHeight = 40;
  const headerPaddingX = 6;
  const headerPaddingY = 6;
  const titleLines = ["Risk Assessment", "& Method Statement"];
  const titleX = MARGIN + CONTENT_WIDTH - headerPaddingX;

  setFillColor(doc, secondaryColor);
  doc.roundedRect(MARGIN, MARGIN, CONTENT_WIDTH, headerHeight, 4, 4, "F");

  if (logoAsset) {
    const maxWidth = Math.min(88, CONTENT_WIDTH * 0.38);
    const maxHeight = headerHeight - headerPaddingY * 2;
    const scale = Math.min(
      maxWidth / logoAsset.width,
      maxHeight / logoAsset.height
    );
    const drawWidth = logoAsset.width * scale;
    const drawHeight = logoAsset.height * scale;
    const drawX = MARGIN + headerPaddingX;
    const drawY = MARGIN + (headerHeight - drawHeight) / 2;

    doc.addImage(logoAsset.dataUrl, "PNG", drawX, drawY, drawWidth, drawHeight);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  setTextColor(doc, "#ffffff");
  const titleLineHeight = 5.6;
  const totalTitleHeight = titleLines.length * titleLineHeight;
  const titleY = MARGIN + (headerHeight - totalTitleHeight) / 2 + 4.2;
  doc.text(titleLines, titleX, titleY, { align: "right" });

  return MARGIN + headerHeight + 5;
}

function drawInfoGrid(
  doc: jsPDF,
  startY: number,
  rows: Array<{
    leftLabel: string;
    leftValue: string;
    rightLabel: string;
    rightValue: string;
  }>,
  borderColor: string,
  mutedText: string
) {
  const gap = 4;
  const columnWidth = (CONTENT_WIDTH - gap) / 2;
  let y = startY;

  rows.forEach((row) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const leftLabelHeight = getWrappedHeight(doc, row.leftLabel, columnWidth - 8, 3.2);
    const rightLabelHeight = getWrappedHeight(
      doc,
      row.rightLabel,
      columnWidth - 8,
      3.2
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const leftValueHeight = getWrappedHeight(doc, row.leftValue, columnWidth - 8, 4.2);
    const rightValueHeight = getWrappedHeight(
      doc,
      row.rightValue,
      columnWidth - 8,
      4.2
    );

    const rowHeight =
      Math.max(leftLabelHeight + leftValueHeight, rightLabelHeight + rightValueHeight) + 8;

    y = ensurePageSpace(doc, y, rowHeight);
    setDrawColor(doc, borderColor);
    doc.rect(MARGIN, y, columnWidth, rowHeight);
    doc.rect(MARGIN + columnWidth + gap, y, columnWidth, rowHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setTextColor(doc, mutedText);
    doc.text(
      doc.splitTextToSize(row.leftLabel, columnWidth - 8),
      MARGIN + 4,
      y + 4.2
    );
    doc.text(
      doc.splitTextToSize(row.rightLabel, columnWidth - 8),
      MARGIN + columnWidth + gap + 4,
      y + 4.2
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setTextColor(doc, "#102128");
    doc.text(
      doc.splitTextToSize(row.leftValue || "-", columnWidth - 8),
      MARGIN + 4,
      y + leftLabelHeight + 6
    );
    doc.text(
      doc.splitTextToSize(row.rightValue || "-", columnWidth - 8),
      MARGIN + columnWidth + gap + 4,
      y + rightLabelHeight + 6
    );

    y += rowHeight + 3;
  });

  return y;
}

function drawConditionsTable(
  doc: jsPDF,
  y: number,
  document: CommercialRamsDocument,
  secondaryColor: string,
  borderColor: string
) {
  const rows = getRamsSiteConditionRows(document);
  const labelWidth = 50;
  const detailWidth = CONTENT_WIDTH - labelWidth;

  y = drawSectionTitle(
    doc,
    y,
    "Site Conditions & Job Specific Considerations",
    secondaryColor,
    borderColor
  );

  rows.forEach((row) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const labelHeight = getWrappedHeight(doc, row.label, labelWidth - 8, 3.8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const detailHeight = getWrappedHeight(doc, row.fullText, detailWidth - 8, 4);
    const rowHeight = Math.max(11, Math.max(labelHeight, detailHeight) + 6);
    y = ensurePageSpace(doc, y, rowHeight);

    setDrawColor(doc, borderColor);
    doc.rect(MARGIN, y, labelWidth, rowHeight);
    doc.rect(MARGIN + labelWidth, y, detailWidth, rowHeight);

    doc.setFont("helvetica", "bold");
    setTextColor(doc, "#102128");
    doc.text(doc.splitTextToSize(row.label, labelWidth - 8), MARGIN + 4, y + 5);

    doc.setFont("helvetica", "normal");
    doc.text(
      doc.splitTextToSize(row.fullText, detailWidth - 8),
      MARGIN + labelWidth + 4,
      y + 5
    );
    y += rowHeight;
  });

  if (normalizeOptionalText(document.additionalHazards)) {
    y = drawParagraphBox(
      doc,
      y,
      `Additional client / site notes: ${document.additionalHazards}`,
      borderColor
    );
  }

  return y + 3;
}

function drawRiskMatrix(
  doc: jsPDF,
  y: number,
  document: CommercialRamsDocument,
  secondaryColor: string,
  borderColor: string,
  primaryColor: string
) {
  const headers = ["No.", "Hazard", "Potential Harm / Risk", "Who Might Be Harmed", "Control Measures", "Risk"];
  const widths = [12, 30, 46, 35, 52, 11];
  const rows = getRamsRiskMatrix(document);

  y = drawSectionTitle(doc, y, "Risk Assessment Matrix", secondaryColor, borderColor);

  const drawHeaderRow = (headerY: number) => {
    let x = MARGIN;
    headers.forEach((header, index) => {
      setFillColor(doc, primaryColor);
      setDrawColor(doc, borderColor);
      doc.rect(x, headerY, widths[index], 9, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      setTextColor(doc, "#ffffff");
      doc.text(doc.splitTextToSize(header, widths[index] - 3), x + 1.5, headerY + 4);
      x += widths[index];
    });
  };

  y = ensurePageSpace(doc, y, 12);
  drawHeaderRow(y);
  y += 9;

  rows.forEach((row) => {
    const values = [
      String(row.number),
      row.hazard,
      row.harm,
      row.harmed,
      row.controls,
      row.risk,
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    const height =
      Math.max(
        ...values.map((value, index) =>
          getWrappedHeight(doc, value, widths[index] - 3, 3.6)
        )
      ) + 4;

    y = ensurePageSpace(doc, y, height);
    if (y === MARGIN) {
      y = drawSectionTitle(doc, y, "Risk Assessment Matrix", secondaryColor, borderColor);
      drawHeaderRow(y);
      y += 9;
    }

    let x = MARGIN;
    values.forEach((value, index) => {
      setDrawColor(doc, borderColor);
      doc.rect(x, y, widths[index], height);
      setTextColor(doc, "#102128");
      doc.text(doc.splitTextToSize(value || "-", widths[index] - 3), x + 1.5, y + 4);
      x += widths[index];
    });
    y += height;
  });

  return y + 3;
}

function drawMethodStatement(
  doc: jsPDF,
  y: number,
  document: CommercialRamsDocument,
  secondaryColor: string,
  borderColor: string,
  primaryColor: string
) {
  const headers = ["Step", "Description", "Safe method of work"];
  const widths = [14, 36, CONTENT_WIDTH - 50];
  const rows = getRamsMethodStatement(document);

  y = drawSectionTitle(doc, y, "Method Statement", secondaryColor, borderColor);

  const drawHeaderRow = (headerY: number) => {
    let x = MARGIN;
    headers.forEach((header, index) => {
      setFillColor(doc, primaryColor);
      setDrawColor(doc, borderColor);
      doc.rect(x, headerY, widths[index], 9, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      setTextColor(doc, "#ffffff");
      doc.text(doc.splitTextToSize(header, widths[index] - 3), x + 1.5, headerY + 4);
      x += widths[index];
    });
  };

  y = ensurePageSpace(doc, y, 12);
  drawHeaderRow(y);
  y += 9;

  rows.forEach((row) => {
    const values = [row.step, row.description, row.method];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);
    const height =
      Math.max(
        ...values.map((value, index) =>
          getWrappedHeight(doc, value, widths[index] - 3, 3.8)
        )
      ) + 4;

    y = ensurePageSpace(doc, y, height);
    if (y === MARGIN) {
      y = drawSectionTitle(doc, y, "Method Statement", secondaryColor, borderColor);
      drawHeaderRow(y);
      y += 9;
    }

    let x = MARGIN;
    values.forEach((value, index) => {
      setDrawColor(doc, borderColor);
      doc.rect(x, y, widths[index], height);
      setTextColor(doc, "#102128");
      doc.text(doc.splitTextToSize(value || "-", widths[index] - 3), x + 1.5, y + 4);
      x += widths[index];
    });
    y += height;
  });

  return y + 3;
}

function drawTwoColumnNotes(
  doc: jsPDF,
  y: number,
  leftTitle: string,
  leftText: string,
  rightTitle: string,
  rightText: string,
  secondaryColor: string,
  borderColor: string
) {
  y = drawSectionTitle(
    doc,
    y,
    "PPE & Emergency Information",
    secondaryColor,
    borderColor
  );

  const gap = 4;
  const boxWidth = (CONTENT_WIDTH - gap) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  const leftTitleHeight = getWrappedHeight(doc, leftTitle, boxWidth - 8, 3.8);
  const rightTitleHeight = getWrappedHeight(doc, rightTitle, boxWidth - 8, 3.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  const leftBodyHeight = getWrappedHeight(doc, leftText, boxWidth - 8, 4);
  const rightBodyHeight = getWrappedHeight(doc, rightText, boxWidth - 8, 4);
  const height =
    Math.max(leftTitleHeight + leftBodyHeight, rightTitleHeight + rightBodyHeight) + 8;

  y = ensurePageSpace(doc, y, height);
  setDrawColor(doc, borderColor);
  doc.rect(MARGIN, y, boxWidth, height);
  doc.rect(MARGIN + boxWidth + gap, y, boxWidth, height);

  doc.setFont("helvetica", "bold");
  setTextColor(doc, "#102128");
  doc.text(doc.splitTextToSize(leftTitle, boxWidth - 8), MARGIN + 4, y + 5);
  doc.text(
    doc.splitTextToSize(rightTitle, boxWidth - 8),
    MARGIN + boxWidth + gap + 4,
    y + 5
  );

  doc.setFont("helvetica", "normal");
  doc.text(
    doc.splitTextToSize(leftText || "-", boxWidth - 8),
    MARGIN + 4,
    y + leftTitleHeight + 7
  );
  doc.text(
    doc.splitTextToSize(rightText || "-", boxWidth - 8),
    MARGIN + boxWidth + gap + 4,
    y + rightTitleHeight + 7
  );

  return y + height + 3;
}

function drawSignOff(
  doc: jsPDF,
  y: number,
  document: CommercialRamsDocument,
  businessDetails: RamsBusinessDetails,
  secondaryColor: string,
  borderColor: string
) {
  y = drawSectionTitle(doc, y, "Sign-off", secondaryColor, borderColor);

  return drawInfoGrid(
    doc,
    y,
    [
      {
        leftLabel: "Prepared by",
        leftValue: document.preparedBy || "-",
        rightLabel: "Client approval",
        rightValue: document.clientApprovalName || "-",
      },
      {
        leftLabel: "Role / company",
        leftValue: getRamsCompanyName(businessDetails),
        rightLabel: "Role",
        rightValue: document.approvalRole || "-",
      },
      {
        leftLabel: "Date",
        leftValue: new Date().toLocaleDateString("en-GB"),
        rightLabel: "Signature",
        rightValue: "",
      },
    ],
    borderColor,
    "#49606d"
  );
}

export async function generateCommercialRamsPDF(
  document: CommercialRamsDocument,
  businessDetails: RamsBusinessDetails
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoAsset = await loadLogoAsset("/Logo-bg.jpg");
  const primaryColor = normalizeHexColor(businessDetails.primaryColor, "#d7ff00");
  const secondaryColor = normalizeHexColor(
    businessDetails.secondaryColor,
    "#153c3f"
  );
  const borderColor = "#d7e3e6";
  const companyContact = [
    getRamsCompanyName(businessDetails),
    normalizeOptionalText(businessDetails.businessPhone),
  ]
    .filter(Boolean)
    .join(" | ");

  const referenceAndRevision = [
    normalizeOptionalText(document.referenceNumber),
    normalizeOptionalText(document.revision)
      ? `Rev ${document.revision}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" / ");

  const operativesAndSupervisor = [
    normalizeOptionalText(document.operatives),
    normalizeOptionalText(document.siteSupervisor),
  ]
    .filter(Boolean)
    .join(" / ");

  let y = drawHeader(
    doc,
    logoAsset,
    secondaryColor
  );

  y = drawInfoGrid(
    doc,
    y,
    [
      {
        leftLabel: "Client / Company Name",
        leftValue: document.customerName || "-",
        rightLabel: "Site Address",
        rightValue: getDocumentSiteLines(document).join("\n") || "-",
      },
      {
        leftLabel: "Work Description / Job Title",
        leftValue: document.jobTitle || "-",
        rightLabel: "Reference / Revision",
        rightValue: referenceAndRevision || "-",
      },
      {
        leftLabel: "Work Type",
        leftValue: document.workType,
        rightLabel: "Estimated Duration",
        rightValue: document.estimatedDuration || "-",
      },
      {
        leftLabel: "Start Date",
        leftValue: formatRamsDate(document.startDate),
        rightLabel: "Operatives / Supervisor",
        rightValue: operativesAndSupervisor || "-",
      },
      {
        leftLabel: "Prepared By",
        leftValue: document.preparedBy || "-",
        rightLabel: "Company Contact",
        rightValue: companyContact || "-",
      },
    ],
    borderColor,
    "#49606d"
  );

  y = drawSectionTitle(doc, y, "Scope of Works", secondaryColor, borderColor);
  y = drawParagraphBox(doc, y, getRamsScope(document), borderColor) + 3;

  y = drawConditionsTable(doc, y, document, secondaryColor, borderColor);
  y = drawRiskMatrix(doc, y, document, secondaryColor, borderColor, primaryColor);
  y = drawMethodStatement(doc, y, document, secondaryColor, borderColor, primaryColor);
  y = drawTwoColumnNotes(
    doc,
    y,
    "Required PPE",
    getRamsRequiredPpe(document),
    "Emergency information",
    getRamsEmergencyInfo(document),
    secondaryColor,
    borderColor
  );
  drawSignOff(doc, y, document, businessDetails, secondaryColor, borderColor);

  const safeReference = normalizeOptionalText(document.referenceNumber)?.replace(
    /[^a-z0-9-_]+/gi,
    "-"
  );
  const safeCustomer = normalizeOptionalText(document.customerName)?.replace(
    /[^a-z0-9-_]+/gi,
    "-"
  );
  const filename = safeReference || safeCustomer || document.id;

  doc.save(`${filename}.pdf`);
}
