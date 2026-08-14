import Link from "next/link";
import type { Session } from "next-auth";
import { patientNav } from "@/app/patient/nav";
import { AccountMenu } from "@/components/ui/account-menu";
import { AppNav } from "@/components/ui/app-nav";
import { buttonClasses } from "@/components/ui/button";
import { BackToTopButton, SmartHeaderFrame } from "@/components/marketplace-scroll-controls";

const DASHBOARD_PATH: Record<string, string> = {
  LAB_STAFF: "/lab",
  LAB_ADMIN: "/lab",
  PLATFORM_ADMIN: "/admin",
};

const TRUST_BADGES = ["Verified labs", "Transparent pricing", "No booking fees"];

/**
 * Session-aware header for public marketplace pages (`/`, `/patient`,
 * `/patient/labs/[labId]`) — UI_REDESIGN_PLAN.md §3/§0.4.
 *
 * `session` is read by the page itself via `auth()` (already-established
 * read-only pattern, `src/app/page.tsx`) and passed in — `auth()`'s result
 * must never gate query filtering on these pages, only what this header
 * renders (UI_REDESIGN_PLAN.md §5).
 *
 * Three states: signed out (Sign in / Get started), signed in as PATIENT
 * (patient nav + account menu), signed in as LAB_STAFF/LAB_ADMIN/
 * PLATFORM_ADMIN (a "back to your dashboard" affordance — required per
 * §0.4 so these sessions aren't left with a "Book" CTA that silently 403s;
 * the CTA-level guard itself lives in `BookCta`,
 * src/components/marketplace/lab-card.tsx).
 */
export function MarketplaceHeader({ session }: { session: Session | null }) {
  const role = session?.user?.role;
  const { links: patientLinks, profileLinks: patientProfileLinks } = patientNav();

  return (
    <>
      <SmartHeaderFrame>
        <div className="border-b border-brand/20 bg-[#08251f] text-white shadow-sm shadow-foreground/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-3 py-2 text-[11.5px] font-bold sm:px-5 xl:px-6">
            {TRUST_BADGES.map((badge) => (
              <span key={badge} className="inline-flex items-center gap-1.5 text-white/78">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {badge}
              </span>
            ))}
          </div>
        </div>

        <header className={`border-b border-border bg-surface/95 shadow-sm shadow-foreground/5 backdrop-blur`}>
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-5 xl:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm text-white shadow-sm shadow-brand/20">
                  M
                </span>
                <span>MediLab</span>
              </Link>

              {!session?.user && (
                <div className="flex items-center gap-2">
                  <Link href="/login" className={buttonClasses("ghost", "sm")}>
                    Sign in
                  </Link>
                  <Link href="/signup" className={buttonClasses("primary", "sm")}>
                    Get started
                  </Link>
                </div>
              )}

              {role === "PATIENT" && <AccountMenu profileLinks={patientProfileLinks} />}

              {role && role !== "PATIENT" && (
                <div className="flex items-center gap-3">
                  <span className="hidden text-[12px] text-ink-faint sm:inline">
                    Signed in as <span className="font-bold text-ink-soft">{role.replaceAll("_", " ")}</span>
                  </span>
                  <Link href={DASHBOARD_PATH[role] ?? "/"} className={buttonClasses("secondary", "sm")}>
                    Back to your dashboard
                  </Link>
                  <AccountMenu profileLinks={[]} />
                </div>
              )}
            </div>

            {role === "PATIENT" && <AppNav links={patientLinks} />}
          </div>
        </header>
      </SmartHeaderFrame>
      <BackToTopButton />
    </>
  );
}
