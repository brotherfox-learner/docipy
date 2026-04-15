"use client";

import { useLayoutEffect } from "react";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";

/**
 * Re-applies `dark` on <html> immediately after locale navigations. Server-rendered
 * layout has no theme class, so a client transition can briefly drop `dark` and flash
 * light backgrounds (especially with body { transition-colors }).
 */
export function ThemeClassSync() {
  const locale = useLocale();
  const { resolvedTheme } = useTheme();

  useLayoutEffect(() => {
    if (resolvedTheme === undefined) return;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [locale, resolvedTheme]);

  return null;
}
