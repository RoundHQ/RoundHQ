"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { CheckCircle2, HelpCircle, LifeBuoy, Search, X } from "lucide-react";

import {
  FEATURED_HELP_TOPIC_OPTIONS,
  searchHelpTopics,
  type HelpTopicOption,
  type ManualHelpTourId,
} from "@/components/help/helpTours";

type Props = {
  isOpen: boolean;
  helpEnabled: boolean;
  onHelpEnabledChange: (enabled: boolean) => void;
  onClose: () => void;
  onSelectTour: (tourId: ManualHelpTourId) => void;
  onRaiseSupportTicket: (searchTerm: string) => void;
};

export default function HelpLauncherModal({
  isOpen,
  helpEnabled,
  onHelpEnabledChange,
  onClose,
  onSelectTour,
  onRaiseSupportTicket,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const trimmedSearchTerm = searchTerm.trim();
  const isSearching = trimmedSearchTerm.length > 0;
  const searchResults = useMemo(
    () => searchHelpTopics(searchTerm),
    [searchTerm]
  );
  const visibleOptions = isSearching
    ? searchResults
    : FEATURED_HELP_TOPIC_OPTIONS;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusTimeoutId = window.setTimeout(() => {
      setSearchTerm("");
      searchInputRef.current?.focus();
    }, 0);

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimeoutId);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function handleSelect(option: HelpTopicOption) {
    onSelectTour(option.id);
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || searchResults.length !== 1) {
      return;
    }

    event.preventDefault();
    const onlyResult = searchResults[0];

    if (onlyResult) {
      handleSelect(onlyResult);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-[#071426]/55 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="in-app-help-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-emerald-100/20 bg-white shadow-[0_28px_80px_rgba(7,20,38,0.28)]"
      >
        <div className="flex items-start justify-between gap-4 rounded-t-3xl bg-[#003c35] px-5 py-5 text-white sm:px-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#20c766] text-[#003c35]">
              <HelpCircle size={20} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20c766]">
                In App Help
              </p>
              <h2 id="in-app-help-title" className="mt-1 text-xl font-black">
                What do you need help with?
              </h2>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close in app help"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/18 focus:outline-none focus:ring-2 focus:ring-[#20c766]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-[#071426]">
              Search walkthroughs
            </span>
            <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by feature, task, or page..."
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#071426] outline-none placeholder:text-slate-400"
              />
            </span>
          </label>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-[#071426]">
                {isSearching ? "Search results" : "Most-used walkthroughs"}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {isSearching
                  ? `${visibleOptions.length} guide${
                      visibleOptions.length === 1 ? "" : "s"
                    } found`
                  : "Showing 6 guides"}
              </p>
            </div>

            {visibleOptions.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className="group flex min-h-[116px] items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-[#20c766] group-hover:text-[#003c35]">
                      <CheckCircle2 size={17} />
                    </span>
                    <span>
                      <span className="block text-sm font-black text-[#071426]">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-slate-600">
                        {option.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onRaiseSupportTicket(trimmedSearchTerm)}
                className="flex w-full items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-[#003c35] transition hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700">
                  <LifeBuoy size={17} />
                </span>
                <span className="text-sm font-black">
                  No guide found, raise a support ticket?
                </span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#071426]">Show help tips</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Automatic first-time onboarding uses this setting. Manual help is still available here.
              </p>
            </div>

            <button
              type="button"
              aria-pressed={helpEnabled}
              onClick={() => onHelpEnabledChange(!helpEnabled)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                helpEnabled ? "bg-[#20c766]" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                  helpEnabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
