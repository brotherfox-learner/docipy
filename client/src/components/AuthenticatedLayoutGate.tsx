"use client";

import type { ReactNode } from "react";
import { AuthenticatedShell } from "@/components/AuthenticatedShell";
import { RequireClientSession } from "@/components/RequireClientSession";

export function AuthenticatedLayoutGate({ children }: { children: ReactNode }) {
  return (
    <RequireClientSession>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </RequireClientSession>
  );
}
