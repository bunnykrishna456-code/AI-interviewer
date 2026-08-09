import { NextRequest, NextResponse } from "next/server"

/**
 * Edge middleware — route protection.
 *
 * Protected routes (require __session cookie):
 *   /dashboard, /manager, /interview/*, /report/*, /resume
 *
 * Auth route (redirect away if already authenticated):
 *   /login
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/manager",
  "/interview",
  "/report",
  "/resume",
]

const AUTH_ROUTE = "/login"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = req.cookies.get("__session")?.value

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  const isAuthRoute  = pathname.startsWith(AUTH_ROUTE)

  // Unauthenticated → protected page: redirect to /login
  if (isProtected && !session) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  // Already authenticated → /login: redirect to /dashboard
  if (isAuthRoute && session) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    url.searchParams.delete("from")
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/manager/:path*",
    "/interview/:path*",
    "/report/:path*",
    "/resume/:path*",
    "/login",
  ],
}
