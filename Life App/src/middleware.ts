import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { isAuthDisabled } from "@/lib/auth-disabled";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (isAuthDisabled()) {
    if (req.nextUrl.pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/cron");

  if (!req.auth && !isPublic) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
