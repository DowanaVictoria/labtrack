import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Optimistic check only (cookie-derived session, no DB round trip) — this is
// a fast redirect layer, not the security boundary. The real enforcement is
// requireTenantSession()/requirePlatformAdminSession()/requirePatientSession()
// in src/lib/session.ts, called by every route handler and Server Action.
//
// /patient and /patient/labs/[labId] are deliberately NOT listed here — they
// became public marketplace pages (UI_REDESIGN_PLAN.md §9.3) and no longer
// call requirePatientSession() at all, so a blanket "/patient" prefix match
// here would have silently re-imposed the auth gate the redesign explicitly
// removed. Only the sub-routes that stay gated are listed explicitly.
const protectedPrefixes = ["/lab", "/admin", "/patient/book", "/patient/appointments", "/patient/account"];

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
