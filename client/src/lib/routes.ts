/**
 * Single source of truth for auth-related path rules (middleware + docs).
 * Prefix match: pathname.startsWith(prefix)
 */
export const AUTH_PROTECTED_PREFIXES = [
  '/dashboard',
  '/documents',
  '/settings',
  '/admin',
  '/flashcards',
  '/collections',
  '/insights',
] as const

export const AUTH_PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
] as const

export function isAuthProtectedPath(pathname: string): boolean {
  return AUTH_PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function isAuthPublicPath(pathname: string): boolean {
  return AUTH_PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Landing + auth pages: do not block on session bootstrap (no full-screen “Restoring session”). */
export function shouldSkipSessionBootstrapGate(pathname: string): boolean {
  if (pathname === '/' || pathname === '/pricing') return true
  return isAuthPublicPath(pathname)
}
