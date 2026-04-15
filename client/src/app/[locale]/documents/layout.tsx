import type { ReactNode } from "react";
import { RequireClientSession } from "@/components/RequireClientSession";

export default function DocumentsBranchLayout({ children }: { children: ReactNode }) {
  return <RequireClientSession>{children}</RequireClientSession>;
}
