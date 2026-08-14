import "server-only";
import { forbidden, redirect } from "next/navigation";
import { auth } from "@/auth";
import { forPatient, forTenant, unscopedForPlatformAdmin } from "@/lib/tenant-scope";

/**
 * Data Access Layer (Next.js App Router convention): the one place request
 * handlers, Server Actions, and Server Components resolve "who is this and
 * what can they touch" before hitting the database. Each function below
 * requires a specific role and hands back a client already scoped for it —
 * callers cannot accidentally reach the database unscoped, and which scope
 * applies is visible at the call site (docs/System_Design.md §2).
 *
 * Wrong role (authenticated but not allowed here) renders a real 403 via
 * next/navigation's forbidden() (src/app/forbidden.tsx) — in a Server
 * Component that's a whole-page 403; in a Server Action it aborts the
 * mutation the same way. No session at all still redirects to /login.
 */

export async function requireTenantSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role, labId } = session.user;
  if (role !== "LAB_STAFF" && role !== "LAB_ADMIN") {
    forbidden();
  }
  if (!labId) {
    forbidden();
  }
  return { session, db: forTenant(labId) };
}

export async function requirePlatformAdminSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") {
    forbidden();
  }
  return { session, db: unscopedForPlatformAdmin() };
}

/**
 * `callbackUrl`, when provided, must be built by the caller from a known
 * internal route template (e.g. its own dynamic segment) — never echoed
 * verbatim from arbitrary query input — to avoid introducing an
 * open-redirect surface (UI_REDESIGN_PLAN.md §6/§8). Omitted, this
 * preserves the exact previous behavior (`redirect("/login")`).
 */
export async function requirePatientSession(callbackUrl?: string) {
  const session = await auth();
  if (!session?.user) {
    redirect(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login");
  }
  if (session.user.role !== "PATIENT") {
    forbidden();
  }
  return { session, db: forPatient(session.user.id) };
}
