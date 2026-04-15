import { defaultLocale, isLocale, type Locale } from "@/i18n/config";

/**
 * Single source of truth for auth-related path rules (middleware + docs).
 * Prefix match: pathname.startsWith(prefix)
 * Always pass pathnames **without** a locale prefix (e.g. `/dashboard`, not `/en/dashboard`).
 */
export const AUTH_PROTECTED_PREFIXES = [
  "/dashboard",
  "/documents",
  "/settings",
  "/admin",
  "/flashcards",
  "/collections",
  "/insights",
] as const;

export const AUTH_PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
] as const;

/** Strip `/en` or `/th` (etc.) from the start of a pathname. */
export function stripLocaleFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "/";
  }
  const first = segments[0];
  if (isLocale(first)) {
    const rest = segments.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname;
}

export function getLocaleFromPathnameOrDefault(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  if (first && isLocale(first)) {
    return first;
  }
  return defaultLocale;
}

export function isAuthProtectedPath(pathname: string): boolean {
  return AUTH_PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isAuthPublicPath(pathname: string): boolean {
  return AUTH_PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Landing + auth pages: do not block on session bootstrap (no full-screen “Restoring session”). */
export function shouldSkipSessionBootstrapGate(pathname: string): boolean {
  if (pathname === "/" || pathname === "/pricing") {
    return true;
  }
  return isAuthPublicPath(pathname);
}
