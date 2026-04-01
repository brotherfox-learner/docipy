"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SessionLoadingScreen } from "@/components/SessionLoadingScreen";

/**
 * Workspace routes: after bootstrap, if there is still no user (e.g. cookie invalid),
 * redirect to login instead of showing a broken header / UserMenu.
 */
export function RequireClientSession({ children }: { children: ReactNode }) {
  const { user, isLoadingSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "";

  useEffect(() => {
    if (isLoadingSession) return;
    if (user) return;
    router.replace(`/login?from=${encodeURIComponent(pathname || "/dashboard")}`);
  }, [user, isLoadingSession, pathname, router]);

  if (isLoadingSession) {
    return <SessionLoadingScreen />;
  }

  if (!user) {
    return (
      <SessionLoadingScreen
        message="Redirecting to sign in…"
        ariaLabel="Redirecting to sign in"
      />
    );
  }

  return children;
}
