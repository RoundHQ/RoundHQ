"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Phone, Send, X } from "lucide-react";

type WorkflowMessageMethod = "email" | "text";

type Props = {
  isOpen: boolean;
  title: string;
  description: string;
  defaultMethod: WorkflowMessageMethod;
  emailRecipients: string[];
  textRecipients: string[];
  initialEmailSubject: string;
  initialEmailMessage: string;
  initialTextMessage: string;
  allowedMethods?: WorkflowMessageMethod[];
  onClose: () => void;
  onSend: (payload: {
    method: WorkflowMessageMethod;
    emailRecipient: string;
    textRecipient: string;
    emailSubject: string;
    emailMessage: string;
    textMessage: string;
  }) => Promise<void> | void;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to send the message right now.";
}

export default function WorkflowMessageDialog({
  isOpen,
  title,
  description,
  defaultMethod,
  emailRecipients,
  textRecipients,
  initialEmailSubject,
  initialEmailMessage,
  initialTextMessage,
  allowedMethods = ["email", "text"],
  onClose,
  onSend,
}: Props) {
  const defaultEmailRecipient = useMemo(
    () => emailRecipients[0] ?? "",
    [emailRecipients]
  );
  const defaultTextRecipient = useMemo(
    () => textRecipients[0] ?? "",
    [textRecipients]
  );
  const [method, setMethod] = useState<WorkflowMessageMethod>(defaultMethod);
  const [emailRecipient, setEmailRecipient] = useState(defaultEmailRecipient);
  const [textRecipient, setTextRecipient] = useState(defaultTextRecipient);
  const [emailSubject, setEmailSubject] = useState(initialEmailSubject);
  const [emailMessage, setEmailMessage] = useState(initialEmailMessage);
  const [textMessage, setTextMessage] = useState(initialTextMessage);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setMethod(defaultMethod);
    setEmailRecipient(defaultEmailRecipient);
    setTextRecipient(defaultTextRecipient);
    setEmailSubject(initialEmailSubject);
    setEmailMessage(initialEmailMessage);
    setTextMessage(initialTextMessage);
    setIsSending(false);
    setErrorMessage("");
  }, [
    defaultMethod,
    defaultEmailRecipient,
    defaultTextRecipient,
    initialEmailMessage,
    initialEmailSubject,
    initialTextMessage,
    isOpen,
  ]);

  if (!isOpen) {
    return null;
  }

  const requiresEmail = method === "email";
  const requiresText = method === "text";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-3xl rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-500">
              <Send size={16} />
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                Workflow Message
              </p>
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>

          <button
            type="button"
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

        <div className="mt-6">
          <div className="inline-flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">
            {allowedMethods.map((option) => {
              const isActive = method === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setMethod(option);
                    setErrorMessage("");
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:bg-white/70"
                  }`}
                >
                  {option === "email" ? "Email" : "Text message"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {requiresEmail ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Mail size={16} />
                <p className="text-sm font-semibold">Email</p>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Send To
                  </label>
                  {emailRecipients.length > 0 ? (
                    <select
                      value={emailRecipient}
                      onChange={(event) => {
                        setEmailRecipient(event.target.value);
                        setErrorMessage("");
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    >
                      {emailRecipients.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={emailRecipient}
                      onChange={(event) => {
                        setEmailRecipient(event.target.value);
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
                    value={emailSubject}
                    onChange={(event) => {
                      setEmailSubject(event.target.value);
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
                    value={emailMessage}
                    onChange={(event) => {
                      setEmailMessage(event.target.value);
                      setErrorMessage("");
                    }}
                    className="min-h-[180px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>
              </div>
            </section>
          ) : null}

          {requiresText ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:col-span-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone size={16} />
                <p className="text-sm font-semibold">Text message</p>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Send To
                  </label>
                  <input
                    type="tel"
                    list="workflow-text-recipients"
                    value={textRecipient}
                    onChange={(event) => {
                      setTextRecipient(event.target.value);
                      setErrorMessage("");
                    }}
                    placeholder="07..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                  />
                  <datalist id="workflow-text-recipients">
                    {textRecipients.map((option) => <option key={option} value={option} />)}
                  </datalist>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Message preview
                  </label>
                  <textarea
                    value={textMessage}
                    maxLength={1600}
                    onChange={(event) => {
                      setTextMessage(event.target.value);
                      setErrorMessage("");
                    }}
                    className="min-h-[150px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                  />
                  <p className="mt-2 text-right text-xs text-slate-500">{textMessage.length}/1600 characters</p>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={async () => {
              if (requiresEmail && (!emailRecipient.trim() || !emailSubject.trim())) {
                setErrorMessage("Add an email recipient and subject before sending.");
                return;
              }
              if (requiresText && (!textRecipient.trim() || !textMessage.trim())) {
                setErrorMessage("Add a mobile number and message before sending.");
                return;
              }


              setIsSending(true);
              setErrorMessage("");

              try {
                await onSend({
                  method,
                  emailRecipient: emailRecipient.trim(),
                  textRecipient: textRecipient.trim(),
                  emailSubject: emailSubject.trim(),
                  emailMessage: emailMessage.trim(),
                  textMessage: textMessage.trim(),
                });
                onClose();
              } catch (error) {
                setErrorMessage(getErrorMessage(error));
              } finally {
                setIsSending(false);
              }
            }}
            disabled={
              isSending ||
              (requiresEmail && (!emailRecipient.trim() || !emailSubject.trim())) ||
              (requiresText && (!textRecipient.trim() || !textMessage.trim()))
            }
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
}
