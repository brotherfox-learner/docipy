"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { SessionLoadingScreen } from "@/components/SessionLoadingScreen";
import { shouldSkipSessionBootstrapGate } from "@/lib/routes";

export function SessionGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const { isLoadingSession } = useAuth();
  const skipBootstrapUi = shouldSkipSessionBootstrapGate(pathname);

  if (!skipBootstrapUi && isLoadingSession) {
    return <SessionLoadingScreen />;
  }

  return children;
}
