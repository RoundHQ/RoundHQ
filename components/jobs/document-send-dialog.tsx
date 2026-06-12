"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  method: "email";
  title: string;
  recipientOptions: string[];
  initialRecipients?: string[];
  initialRecipient?: string;
  initialSubject?: string;
  initialMessage: string;
  onClose: () => void;
  onSend: (payload: {
    recipient: string;
    recipients: string[];
    subject: string;
    message: string;
  }) => Promise<void> | void;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to send the document right now.";
}

function normalizeRecipients(values: Array<string | null | undefined>) {
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

export default function DocumentSendDialog({
  isOpen,
  title,
  recipientOptions,
  initialRecipients,
  initialRecipient,
  initialSubject = "",
  initialMessage,
  onClose,
  onSend,
}: Props) {
  const normalizedRecipientOptions = useMemo(
    () => normalizeRecipients(recipientOptions),
    [recipientOptions]
  );
  const defaultRecipient = useMemo(() => {
    if (initialRecipient?.trim()) {
      return initialRecipient.trim();
    }

    return normalizedRecipientOptions[0] ?? "";
  }, [initialRecipient, normalizedRecipientOptions]);
  const defaultRecipients = useMemo(() => {
    const preferredRecipients = normalizeRecipients([
      ...(initialRecipients ?? []),
      defaultRecipient,
    ]);

    if (normalizedRecipientOptions.length === 0) {
      return preferredRecipients.slice(0, 1);
    }

    const availableRecipients = new Set(
      normalizedRecipientOptions.map((option) => option.toLowerCase())
    );
    const selectedRecipients = preferredRecipients.filter((recipient) =>
      availableRecipients.has(recipient.toLowerCase())
    );

    return selectedRecipients.length > 0
      ? selectedRecipients
      : normalizedRecipientOptions.slice(0, 1);
  }, [defaultRecipient, initialRecipients, normalizedRecipientOptions]);
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [selectedRecipients, setSelectedRecipients] = useState(defaultRecipients);
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState(initialMessage);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setRecipient(defaultRecipient);
    setSelectedRecipients(defaultRecipients);
    setSubject(initialSubject);
    setMessage(initialMessage);
    setIsSending(false);
    setErrorMessage("");
  }, [defaultRecipient, defaultRecipients, initialMessage, initialSubject, isOpen]);

  if (!isOpen) {
    return null;
  }

  const hasRecipientOptions = normalizedRecipientOptions.length > 0;
  const resolvedRecipients = hasRecipientOptions
    ? selectedRecipients
    : normalizeRecipients([recipient]);
  const helperText =
    hasRecipientOptions && normalizedRecipientOptions.length > 1
      ? "Choose one or more customer profile email addresses. The PDF will be attached for each recipient."
      : "The email will be sent directly from the website and the PDF will be attached for the customer to download.";

  function toggleRecipient(option: string) {
    setSelectedRecipients((currentRecipients) => {
      const optionKey = option.toLowerCase();

      if (
        currentRecipients.some(
          (currentRecipient) => currentRecipient.toLowerCase() === optionKey
        )
      ) {
        return currentRecipients.filter(
          (currentRecipient) => currentRecipient.toLowerCase() !== optionKey
        );
      }

      return [...currentRecipients, option];
    });
    setErrorMessage("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 sm:p-4">
      <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-[22px] bg-white p-5 shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:rounded-[28px] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-500">
              <Mail size={16} />
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                Email Document
              </p>
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="mt-2 text-sm text-slate-500">{helperText}</p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Send To
            </label>
            {hasRecipientOptions ? (
              <div className="rounded-xl border border-slate-200 p-2">
                {normalizedRecipientOptions.length > 1 ? (
                  <div className="mb-2 flex flex-wrap gap-2 border-b border-slate-100 pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecipients(normalizedRecipientOptions);
                        setErrorMessage("");
                      }}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecipients([]);
                        setErrorMessage("");
                      }}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
                    >
                      Clear
                    </button>
                  </div>
                ) : null}

                <div className="grid gap-2">
                  {normalizedRecipientOptions.map((option) => (
                    <label
                      key={option}
                      className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRecipients.some(
                          (selectedRecipient) =>
                            selectedRecipient.toLowerCase() === option.toLowerCase()
                        )}
                        onChange={() => toggleRecipient(option)}
                        className="size-4 rounded border-slate-300 text-slate-900"
                      />
                      <span className="min-w-0 break-all">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <input
                value={recipient}
                onChange={(event) => {
                  setRecipient(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="customer@example.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
              />
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Subject
            </label>
            <input
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                setErrorMessage("");
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Message
            </label>
            <textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setErrorMessage("");
              }}
              className="min-h-[160px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            onClick={async () => {
              if (!recipient.trim()) {
                setErrorMessage("Choose at least one email address.");
                return;
              }

              const recipients = hasRecipientOptions
                ? selectedRecipients
                : normalizeRecipients([recipient]);

              if (recipients.length === 0) {
                setErrorMessage("Choose at least one email address.");
                return;
              }

              setIsSending(true);
              setErrorMessage("");

              try {
                await onSend({
                  recipient: recipients.join(", "),
                  recipients,
                  subject: subject.trim(),
                  message: message.trim(),
                });
                onClose();
              } catch (error) {
                setErrorMessage(getErrorMessage(error));
              } finally {
                setIsSending(false);
              }
            }}
            disabled={resolvedRecipients.length === 0 || isSending}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending
              ? "Sending..."
              : resolvedRecipients.length > 1
                ? `Send to ${resolvedRecipients.length}`
                : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
