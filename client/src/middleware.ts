import { NextRequest, NextResponse } from 'next/server'
import { isAuthProtectedPath, isAuthPublicPath } from '@/lib/routes'

const REFRESH_COOKIE = 'refresh_token'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isProtected = isAuthProtectedPath(pathname)
  const isPublic = isAuthPublicPath(pathname)

  const hasRefreshCookie = request.cookies.has(REFRESH_COOKIE)

  if (isProtected && !hasRefreshCookie) {
    const login = new URL('/login', request.url)
    login.searchParams.set('from', pathname)
    return NextResponse.redirect(login)
  }

  if (isPublic && hasRefreshCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
