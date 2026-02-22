import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "access_token";

export function middleware(req: NextRequest) {
  const hasToken = req.cookies.has(COOKIE_NAME);

  const path = req.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login") || path.startsWith("/register");
  const isAppRoute = path.startsWith("/jobs") || path.startsWith("/settings");

  if (!hasToken && isAppRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (hasToken && isAuthPage) {
    return NextResponse.redirect(new URL("/jobs", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/jobs/:path*", "/settings/:path*", "/login", "/register"],
};
