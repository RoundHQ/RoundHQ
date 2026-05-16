"use client";

import { useContext } from "react";

import { InAppHelpContext } from "@/components/help/HelpProvider";

export function useInAppHelp() {
  const context = useContext(InAppHelpContext);

  if (!context) {
    throw new Error("useInAppHelp must be used within HelpProvider");
  }

  return context;
}
