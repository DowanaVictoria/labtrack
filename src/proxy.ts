import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Optimistic check only (cookie-derived session, no DB round trip) — this is
// a fast redirect layer, not the security boundary. The real enforcement is
// requireTenantSession()/requirePlatformAdminSession()/requirePatientSession()
// in src/lib/session.ts, called by every route handler and Server Action.
const protectedPrefixes = ["/lab", "/admin", "/patient"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
