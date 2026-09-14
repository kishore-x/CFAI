import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/api/auth");
  // Cron-triggered routes authenticate themselves via a CRON_SECRET bearer
  // token (see src/app/api/cron/*), not a user session — never redirect them.
  const isCronRoute = req.nextUrl.pathname.startsWith("/api/cron");

  if (isAuthRoute || isCronRoute) return NextResponse.next();

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (req.auth?.user?.mustChangePassword && req.nextUrl.pathname !== "/account/change-password") {
    return NextResponse.redirect(new URL("/account/change-password", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
