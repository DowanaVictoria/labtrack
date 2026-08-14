import type { NavItem } from "@/components/ui/app-nav";

/**
 * Mirrors `src/app/lab/nav.ts`'s `labNav()` shape for the authenticated
 * patient dashboard (`/patient/appointments`, `/patient/account`) —
 * UI_REDESIGN_PLAN.md §3. The patient role has no sub-roles the way
 * LAB_STAFF/LAB_ADMIN do, so there's nothing to branch on, but the
 * `{ links, profileLinks }` return shape matches `labNav()` so
 * `AppHeader`/`SidebarNav` consume both nav helpers identically.
 */
export function patientNav(): { links: NavItem[]; profileLinks: NavItem[] } {
  const links: NavItem[] = [
    { href: "/", label: "Find a test" },
    { href: "/patient/appointments", label: "My appointments" },
  ];
  const profileLinks: NavItem[] = [{ href: "/patient/account", label: "Your profile" }];

  return { links, profileLinks };
}
