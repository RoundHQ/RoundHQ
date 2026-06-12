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
  getDocumentEmailAttachmentTooLargeMessage,
  hasConfiguredDocumentEmailSettings,
  MAX_DOCUMENT_EMAIL_ATTACHMENT_BYTES,
  normalizeDocumentEmailSettings,
  type DocumentEmailSettings,
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

async function getEmailResponseError(response: Response, fallback: string) {
  if (response.status === 413) {
    return getDocumentEmailAttachmentTooLargeMessage();
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.toLowerCase().includes("application/json")) {
    const responseBody = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    const message = responseBody?.error?.trim();

    if (message) {
      return message;
    }
  }

  const statusDetail = response.status
    ? ` (${response.status}${response.statusText ? ` ${response.statusText}` : ""})`
    : "";

  return `${fallback}${statusDetail}`;
}

async function sendDocumentEmail(options: {
  blob: Blob;
  filename: string;
  recipient?: string;
  recipients?: string[];
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

  if (options.blob.size > MAX_DOCUMENT_EMAIL_ATTACHMENT_BYTES) {
    throw new Error(getDocumentEmailAttachmentTooLargeMessage());
  }

  const recipients = normalizeDocumentRecipients(
    options.recipients ?? [options.recipient ?? ""]
  );

  if (recipients.length === 0) {
    throw new Error("Choose at least one email address.");
  }

  const formData = new FormData();
  formData.set("recipient", recipients[0]);
  formData.set("recipients", JSON.stringify(recipients));
  formData.set("subject", options.subject);
  formData.set("message", options.message);
  formData.set("filename", options.filename);
  formData.set("settings", JSON.stringify(settings));
  formData.set("pdf", options.blob, options.filename || "document.pdf");

  const response = await fetch("/api/send-document-email", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(
      await getEmailResponseError(
        response,
        "Unable to send the email from the website."
      )
    );
  }

  return "sent";
}

function normalizeDocumentRecipients(values: Array<string | null | undefined>) {
  const recipientMap = new Map<string, string>();

  for (const value of values) {
    const trimmedValue = value?.trim();

    if (!trimmedValue) {
      continue;
    }

    recipientMap.set(trimmedValue.toLowerCase(), trimmedValue);
  }

  return Array.from(recipientMap.values());
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

  if (!response.ok) {
    throw new Error(
      await getEmailResponseError(
        response,
        "Unable to send the email from the website."
      )
    );
  }

  return "sent";
}

export async function sendQuoteDocument(options: {
  quote: QuoteDocument;
  businessDetails: DeliveryBusinessDetails;
  method: "email";
  recipient?: string;
  recipients?: string[];
  subject: string;
  message: string;
}) {
  const filename = `${options.quote.quoteNumber || options.quote.id}.pdf`;
  const blob = await getQuotePdfBlob(options.quote, options.businessDetails);

  return sendDocumentEmail({
    blob,
    filename,
    recipient: options.recipient,
    recipients: options.recipients,
    subject: options.subject,
    message: options.message,
    businessDetails: options.businessDetails,
  });
}

export async function sendInvoiceDocument(options: {
  invoice: InvoiceDocument;
  businessDetails: DeliveryBusinessDetails;
  method: "email";
  recipient?: string;
  recipients?: string[];
  subject: string;
  message: string;
}) {
  const filename = `${options.invoice.invoiceNumber || options.invoice.id}.pdf`;
  const blob = await getInvoicePdfBlob(options.invoice, options.businessDetails);

  return sendDocumentEmail({
    blob,
    filename,
    recipient: options.recipient,
    recipients: options.recipients,
    subject: options.subject,
    message: options.message,
    businessDetails: options.businessDetails,
  });
}
