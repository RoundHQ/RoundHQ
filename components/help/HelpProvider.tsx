"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EVENTS,
  Joyride,
  STATUS,
  type Controls,
  type EventData,
  type TooltipRenderProps,
} from "react-joyride";

import HelpLauncherModal from "@/components/help/HelpLauncherModal";
import {
  createHelpTourSteps,
  type HelpTourActions,
  type HelpTourId,
} from "@/components/help/helpTours";

type InAppHelpContextValue = {
  helpEnabled: boolean;
  openHelpLauncher: () => void;
  startHelpTour: (tourId: HelpTourId) => void;
  setHelpEnabled: (enabled: boolean) => void;
};

type Props = {
  children: ReactNode;
  helpEnabled: boolean;
  hasCompletedOnboarding: boolean;
  launcherOpen: boolean;
  onLauncherOpenChange: (open: boolean) => void;
  onHelpEnabledChange: (enabled: boolean) => void;
  onOnboardingCompleted: () => void;
  actions: HelpTourActions;
};

export const InAppHelpContext = createContext<InAppHelpContextValue | null>(
  null
);

export default function HelpProvider({
  children,
  helpEnabled,
  hasCompletedOnboarding,
  launcherOpen,
  onLauncherOpenChange,
  onHelpEnabledChange,
  onOnboardingCompleted,
  actions,
}: Props) {
  const [activeTour, setActiveTour] = useState<HelpTourId | null>(null);
  const [tourRun, setTourRun] = useState(false);
  const autoStartedRef = useRef(false);

  const steps = useMemo(
    () => (activeTour ? createHelpTourSteps(activeTour, actions) : []),
    [actions, activeTour]
  );

  const finishActiveTour = useCallback(() => {
    if (activeTour === "onboarding") {
      onOnboardingCompleted();
    }

    setTourRun(false);
    setActiveTour(null);
  }, [activeTour, onOnboardingCompleted]);

  const startHelpTour = useCallback(
    (tourId: HelpTourId) => {
      onLauncherOpenChange(false);
      setTourRun(false);
      setActiveTour(tourId);
      window.setTimeout(() => setTourRun(true), 0);
    },
    [onLauncherOpenChange]
  );

  const openHelpLauncher = useCallback(() => {
    onLauncherOpenChange(true);
  }, [onLauncherOpenChange]);

  const handleJoyrideEvent = useCallback(
    (data: EventData, controls: Controls) => {
      if (data.type === EVENTS.TARGET_NOT_FOUND) {
        controls.next();
        return;
      }

      if (
        data.status === STATUS.FINISHED ||
        data.status === STATUS.SKIPPED ||
        data.type === EVENTS.TOUR_END
      ) {
        finishActiveTour();
      }
    },
    [finishActiveTour]
  );

  const HelpTooltip = useCallback(
    ({
      backProps,
      closeProps,
      continuous,
      index,
      isLastStep,
      primaryProps,
      size,
      skipProps,
      step,
      tooltipProps,
    }: TooltipRenderProps) => {
      const isOnboarding = activeTour === "onboarding";

      return (
        <div
          {...tooltipProps}
          className="w-[min(92vw,390px)] overflow-hidden rounded-3xl bg-white text-[#071426] shadow-[0_24px_70px_rgba(7,20,38,0.3)] ring-1 ring-[#003c35]/10"
        >
          <div className="bg-[#003c35] px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#20c766]">
                  Step {index + 1} of {size}
                </p>
                {step.title ? (
                  <h2 className="mt-1 text-lg font-black leading-tight">
                    {step.title}
                  </h2>
                ) : null}
              </div>

              <button
                {...closeProps}
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/18 focus:outline-none focus:ring-2 focus:ring-[#20c766]"
              >
                <span aria-hidden="true">x</span>
              </button>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="text-sm leading-6 text-slate-600">{step.content}</div>

            {isOnboarding ? (
              <button
                type="button"
                onClick={finishActiveTour}
                className="text-sm font-semibold text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Don&apos;t show this again
              </button>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <button
                {...skipProps}
                type="button"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Skip
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {index > 0 ? (
                  <button
                    {...backProps}
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    Back
                  </button>
                ) : null}

                {continuous ? (
                  <button
                    {...primaryProps}
                    type="button"
                    className="rounded-xl bg-[#20c766] px-4 py-2 text-sm font-black text-[#003c35] transition hover:bg-[#2ee074] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    {isLastStep ? "Finish" : "Next"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      );
    },
    [activeTour, finishActiveTour]
  );

  useEffect(() => {
    if (!helpEnabled || hasCompletedOnboarding || autoStartedRef.current) {
      return;
    }

    autoStartedRef.current = true;
    const timeoutId = window.setTimeout(() => startHelpTour("onboarding"), 900);

    return () => window.clearTimeout(timeoutId);
  }, [hasCompletedOnboarding, helpEnabled, startHelpTour]);

  const contextValue = useMemo<InAppHelpContextValue>(
    () => ({
      helpEnabled,
      openHelpLauncher,
      startHelpTour,
      setHelpEnabled: onHelpEnabledChange,
    }),
    [helpEnabled, onHelpEnabledChange, openHelpLauncher, startHelpTour]
  );

  return (
    <InAppHelpContext.Provider value={contextValue}>
      {children}

      <Joyride
        continuous
        run={tourRun}
        scrollToFirstStep
        steps={steps}
        onEvent={handleJoyrideEvent}
        tooltipComponent={HelpTooltip}
        locale={{
          back: "Back",
          close: "Close",
          last: "Finish",
          next: "Next",
          skip: "Skip",
        }}
        options={{
          backgroundColor: "#ffffff",
          overlayColor: "rgba(7, 20, 38, 0.56)",
          primaryColor: "#20c766",
          showProgress: true,
          spotlightRadius: 18,
          textColor: "#071426",
          zIndex: 10020,
        }}
      />

      <HelpLauncherModal
        isOpen={launcherOpen}
        helpEnabled={helpEnabled}
        onHelpEnabledChange={onHelpEnabledChange}
        onClose={() => onLauncherOpenChange(false)}
        onSelectTour={startHelpTour}
        onRaiseSupportTicket={actions.raiseSupportTicket}
      />
    </InAppHelpContext.Provider>
  );
}
