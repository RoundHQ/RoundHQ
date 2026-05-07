import nodemailer from "nodemailer";
import { normalizeDocumentEmailSettings } from "./document-email";

export function buildEmailHtmlBody(message: string) {
  return message
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      if (!line) {
        return "<p>&nbsp;</p>";
      }

      const escapedLine = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      return `<p>${escapedLine}</p>`;
    })
    .join("");
}

function getErrorText(error: unknown) {
  return error instanceof Error ? error.message.trim() : "";
}

function isSslModeMismatchError(error: unknown) {
  const message = getErrorText(error).toLowerCase();

  return (
    message.includes("wrong version number") ||
    message.includes("ssl routines") ||
    message.includes("ssl3_get_record") ||
    message.includes("tlsv1 alert") ||
    message.includes("ssl alert")
  );
}

export function getFriendlySmtpErrorMessage(
  error: unknown,
  port: number,
  secure: boolean
) {
  const message = getErrorText(error);
  const lowercaseMessage = message.toLowerCase();

  if (isSslModeMismatchError(error)) {
    if (port === 587 || (!secure && port !== 465)) {
      return "Your email provider is rejecting the SSL/TLS setting for this SMTP port. For port 587, leave 'Use SSL / TLS' turned off. For port 465, turn it on.";
    }

    return "Your email provider is rejecting the SSL/TLS setting for this SMTP port. Try port 587 with 'Use SSL / TLS' off, or port 465 with it on.";
  }

  if (
    lowercaseMessage.includes("invalid login") ||
    lowercaseMessage.includes("authentication failed") ||
    lowercaseMessage.includes("bad credentials") ||
    lowercaseMessage.includes("username and password not accepted")
  ) {
    return "Your SMTP username or password was rejected. Double-check the email address, password, and whether your provider requires an app password.";
  }

  return message || "Unable to send the email right now.";
}

function createTransport(
  settings: ReturnType<typeof normalizeDocumentEmailSettings>,
  secure: boolean
) {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure,
    auth: {
      user: settings.smtpUsername,
      pass: settings.smtpPassword,
    },
    requireTLS: !secure && settings.smtpPort === 587,
  });
}

export async function sendEmailWithFallback(options: {
  settings: ReturnType<typeof normalizeDocumentEmailSettings>;
  mailOptions: Parameters<ReturnType<typeof nodemailer.createTransport>["sendMail"]>[0];
}) {
  const secureModes: boolean[] = [Boolean(options.settings.smtpSecure)];

  if (
    (options.settings.smtpPort === 465 || options.settings.smtpPort === 587) &&
    !secureModes.includes(!Boolean(options.settings.smtpSecure))
  ) {
    secureModes.push(!Boolean(options.settings.smtpSecure));
  }

  let lastError: unknown = null;

  for (let index = 0; index < secureModes.length; index += 1) {
    const secure = secureModes[index];

    try {
      const transporter = createTransport(options.settings, secure);
      await transporter.sendMail(options.mailOptions);
      return;
    } catch (error) {
      lastError = error;

      const hasAnotherAttempt = index < secureModes.length - 1;
      if (!hasAnotherAttempt || !isSslModeMismatchError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}
