"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
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
  const t = useTranslations("session");

  useEffect(() => {
    if (isLoadingSession) return;
    if (user) return;
    router.replace(
      `/login?from=${encodeURIComponent(pathname || "/dashboard")}&reauth=1`
    );
  }, [user, isLoadingSession, pathname, router]);

  if (isLoadingSession) {
    return <SessionLoadingScreen />;
  }

  if (!user) {
    return (
      <SessionLoadingScreen message={t("redirectingMessage")} ariaLabel={t("redirectingAria")} />
    );
  }

  return children;
}
