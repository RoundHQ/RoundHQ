"use client";

import {
  getInvoicePdfBlob,
  getQuotePdfBlob,
  type DocumentBrandDetails,
} from "./pdf-generator";
import type {
  InvoiceStatus,
  QuoteStatus,
  StripeInvoicePaymentStatus,
} from "./types";
import {
  hasConfiguredDocumentEmailSettings,
  normalizeDocumentEmailSettings,
  type DocumentEmailSettings,
  type SendDocumentEmailPayload,
  type SendTestEmailPayload,
} from "@/lib/email/document-email";

type CustomerType = "Residential" | "Commercial";
type LineItem = {
  id: string;
  description: string;
  quantity: number;
  price: number;
};

type QuoteDocument = {
  id: string;
  quoteNumber: string;
  customerId: number | null;
  customerName: string;
  customerType?: CustomerType;
  customerAddress?: string;
  customerTown?: string;
  customerPostcode?: string;
  siteName?: string;
  siteAddress?: string;
  siteTown?: string;
  sitePostcode?: string;
  date: string;
  status: QuoteStatus;
  items: LineItem[];
  notes?: string;
  total: number;
};

type InvoiceDocument = {
  id: string;
  invoiceNumber: string;
  customerId: number | null;
  customerName: string;
  customerType?: CustomerType;
  customerAddress?: string;
  customerTown?: string;
  customerPostcode?: string;
  siteName?: string;
  siteAddress?: string;
  siteTown?: string;
  sitePostcode?: string;
  date: string;
  dueDate?: string;
  status: InvoiceStatus;
  items: LineItem[];
  notes?: string;
  terms?: string;
  vatRate?: number;
  vatAmount?: number;
  total: number;
  linkedQuoteId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentLinkUrl?: string;
  stripePaymentStatus?: StripeInvoicePaymentStatus;
  stripePaymentIntentId?: string;
  stripePaymentCompletedAt?: string;
};

type DeliveryBusinessDetails = DocumentBrandDetails & DocumentEmailSettings;

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function createPdfFile(blob: Blob, filename: string) {
  return new File([blob], filename, { type: "application/pdf" });
}

function canSharePdfFile(file: File) {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }

  if (typeof navigator.canShare !== "function") {
    return true;
  }

  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

async function shareOrDownloadFile(options: {
  blob: Blob;
  filename: string;
  title: string;
  text: string;
}) {
  const file = createPdfFile(options.blob, options.filename);

  if (canSharePdfFile(file)) {
    await navigator.share({
      title: options.title,
      text: options.text,
      files: [file],
    });
    return "shared";
  }

  downloadBlob(options.blob, options.filename);
  return "downloaded";
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function getEmailSettings(businessDetails: DeliveryBusinessDetails) {
  return normalizeDocumentEmailSettings({
    emailFromName: businessDetails.emailFromName,
    emailFromAddress: businessDetails.emailFromAddress,
    emailReplyTo: businessDetails.emailReplyTo,
    smtpHost: businessDetails.smtpHost,
    smtpPort: businessDetails.smtpPort,
    smtpSecure: businessDetails.smtpSecure,
    smtpUsername: businessDetails.smtpUsername,
    smtpPassword: businessDetails.smtpPassword,
  });
}

async function sendDocumentEmail(options: {
  blob: Blob;
  filename: string;
  recipient: string;
  subject: string;
  message: string;
  businessDetails: DeliveryBusinessDetails;
}) {
  const settings = getEmailSettings(options.businessDetails);

  if (!hasConfiguredDocumentEmailSettings(settings)) {
    throw new Error(
      "Add your SMTP email settings in Settings > Email before sending emails from the website."
    );
  }

  const payload: SendDocumentEmailPayload = {
    recipient: options.recipient,
    subject: options.subject,
    message: options.message,
    filename: options.filename,
    pdfBase64: await blobToBase64(options.blob),
    settings,
  };

  const response = await fetch("/api/send-document-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      responseBody?.error?.trim() || "Unable to send the email from the website."
    );
  }

  return "sent";
}

export async function sendCustomerEmailMessage(options: {
  recipient: string;
  subject: string;
  message: string;
  businessDetails: DeliveryBusinessDetails;
}) {
  const settings = getEmailSettings(options.businessDetails);

  if (!hasConfiguredDocumentEmailSettings(settings)) {
    throw new Error(
      "Add your SMTP email settings in Settings > Email before sending emails from the website."
    );
  }

  const payload: SendTestEmailPayload = {
    recipient: options.recipient,
    subject: options.subject,
    message: options.message,
    settings,
  };

  const response = await fetch("/api/send-customer-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      responseBody?.error?.trim() || "Unable to send the email from the website."
    );
  }

  return "sent";
}

export async function sendQuoteDocument(options: {
  quote: QuoteDocument;
  businessDetails: DeliveryBusinessDetails;
  method: "email";
  recipient: string;
  subject: string;
  message: string;
}) {
  const filename = `${options.quote.quoteNumber || options.quote.id}.pdf`;
  const blob = await getQuotePdfBlob(options.quote, options.businessDetails);

  return sendDocumentEmail({
    blob,
    filename,
    recipient: options.recipient,
    subject: options.subject,
    message: options.message,
    businessDetails: options.businessDetails,
  });
}

export async function sendInvoiceDocument(options: {
  invoice: InvoiceDocument;
  businessDetails: DeliveryBusinessDetails;
  method: "email";
  recipient: string;
  subject: string;
  message: string;
}) {
  const filename = `${options.invoice.invoiceNumber || options.invoice.id}.pdf`;
  const blob = await getInvoicePdfBlob(options.invoice, options.businessDetails);

  return sendDocumentEmail({
    blob,
    filename,
    recipient: options.recipient,
    subject: options.subject,
    message: options.message,
    businessDetails: options.businessDetails,
  });
}
