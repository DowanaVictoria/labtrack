"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import type { NavItem } from "@/components/ui/app-nav";

/**
 * Wide-viewport (`lg:` and up) vertical nav for authenticated dashboard
 * shells (`/lab/*`, `/admin/*`, `/patient/appointments`, `/patient/account`)
 * — collapses away below that breakpoint, where the existing `AppNav`
 * horizontal pill row (unchanged, still rendered by `AppHeader`) is the
 * mobile fallback (UI_REDESIGN_PLAN.md §3/§4.1/§12). Hidden entirely below
 * `lg`, so it never competes with `AppNav` on narrow viewports.
 */
export function SidebarNav({ links, profileLinks }: { links: NavItem[]; profileLinks: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden min-h-[calc(100vh-4rem)] shrink-0 flex-col gap-6 rounded-lg border border-white/10 bg-[#08251f] p-3 text-white shadow-xl shadow-foreground/10 lg:sticky lg:top-8 lg:flex lg:w-60">
      <span className="flex items-center gap-2 px-3 text-lg font-bold tracking-tight text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm">M</span>
        MediLab
      </span>

      {links.length > 0 && (
        <div className="flex flex-col gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                  active ? "bg-white text-brand-dark shadow-sm" : "text-white/62 hover:bg-white/10 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      )}

      {profileLinks.length > 0 && (
        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
          {profileLinks.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-white/15 text-white" : "text-white/62 hover:bg-white/10 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/62 transition-colors hover:bg-danger hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </nav>
  );
}
