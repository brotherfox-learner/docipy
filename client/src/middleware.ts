import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import {
  getLocaleFromPathnameOrDefault,
  isAuthProtectedPath,
  isAuthPublicPath,
  stripLocaleFromPathname,
} from "@/lib/routes";

const REFRESH_COOKIE = "refresh_token";

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale = stripLocaleFromPathname(pathname);
  const locale = getLocaleFromPathnameOrDefault(pathname);
  const hasRefreshCookie = request.cookies.has(REFRESH_COOKIE);

  const isProtected = isAuthProtectedPath(pathWithoutLocale);
  const isPublic = isAuthPublicPath(pathWithoutLocale);

  if (isProtected && !hasRefreshCookie) {
    const login = new URL(`/${locale}/login`, request.url);
    login.searchParams.set("from", pathWithoutLocale);
    return NextResponse.redirect(login);
  }

  if (isPublic && hasRefreshCookie && request.nextUrl.searchParams.get("reauth") !== "1") {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
