"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, MessageSquare, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  method: "email" | "text";
  title: string;
  recipientOptions: string[];
  initialRecipient?: string;
  initialSubject?: string;
  initialMessage: string;
  onClose: () => void;
  onSend: (payload: {
    recipient: string;
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

export default function DocumentSendDialog({
  isOpen,
  method,
  title,
  recipientOptions,
  initialRecipient,
  initialSubject = "",
  initialMessage,
  onClose,
  onSend,
}: Props) {
  const defaultRecipient = useMemo(() => {
    if (initialRecipient?.trim()) {
      return initialRecipient.trim();
    }

    return recipientOptions[0] ?? "";
  }, [initialRecipient, recipientOptions]);
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState(initialMessage);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setRecipient(defaultRecipient);
    setSubject(initialSubject);
    setMessage(initialMessage);
    setIsSending(false);
    setErrorMessage("");
  }, [defaultRecipient, initialMessage, initialSubject, isOpen]);

  if (!isOpen) {
    return null;
  }

  const hasRecipientOptions = recipientOptions.length > 0;
  const helperText =
    method === "email"
      ? "The email will be sent directly from the website and the PDF will be attached for the customer to download."
      : "The PDF will be prepared first. If your browser cannot attach files directly, it will download the PDF and open your text app with the message filled in.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-500">
              {method === "email" ? <Mail size={16} /> : <MessageSquare size={16} />}
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                {method === "email" ? "Email Document" : "Text Document"}
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
              {method === "email" ? "Send To" : "Text To"}
            </label>
            {hasRecipientOptions ? (
              <select
                value={recipient}
                onChange={(event) => {
                  setRecipient(event.target.value);
                  setErrorMessage("");
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
              >
                {recipientOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={recipient}
                onChange={(event) => {
                  setRecipient(event.target.value);
                  setErrorMessage("");
                }}
                placeholder={method === "email" ? "customer@example.com" : "07123456789"}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
              />
            )}
          </div>

          {method === "email" ? (
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
          ) : null}

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
                return;
              }

              setIsSending(true);
              setErrorMessage("");

              try {
                await onSend({
                  recipient: recipient.trim(),
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
            disabled={!recipient.trim() || isSending}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending
              ? method === "email"
                ? "Sending..."
                : "Preparing..."
              : method === "email"
                ? "Send Email"
                : "Send Text"}
          </button>
        </div>
      </div>
    </div>
  );
}
