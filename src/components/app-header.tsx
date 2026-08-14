import { AccountMenu } from "@/components/ui/account-menu";
import { AppNav, type NavItem } from "@/components/ui/app-nav";

export function AppHeader({
  title,
  role,
  navLinks = [],
  profileLinks = [],
  hideNavAtLg = false,
}: {
  title: string;
  role: string;
  navLinks?: NavItem[];
  profileLinks?: NavItem[];
  /**
   * When a page also renders `SidebarNav` at `lg:` and up (the wide-viewport
   * dashboard nav, UI_REDESIGN_PLAN.md §3/§4.1), this hides the pill-row
   * `AppNav` below at that same breakpoint so the two don't compete —
   * `AppNav` itself stays completely unchanged and is still the mobile nav
   * below `lg:` (UI_REDESIGN_PLAN.md §12's SidebarNav mitigation). Defaults
   * to false: every existing caller's rendering is unaffected.
   */
  hideNavAtLg?: boolean;
}) {
  const initial = title.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col gap-3">
      <header className="relative z-30 rounded-lg border border-border bg-surface shadow-sm shadow-foreground/5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-[#08251f] px-4 py-4 text-white sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-brand-dark shadow-sm">
            {initial}
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-wide text-white/60 uppercase">{role.replaceAll("_", " ")}</p>
              <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
            </div>
          </div>
          <AccountMenu profileLinks={profileLinks} />
        </div>
        <div className="px-4 py-3 sm:px-5">
          <p className="text-sm text-ink-faint">
            Monitor today&apos;s work, review operational status, and manage the next actions from one workspace.
          </p>
        </div>
      </header>
      <div className={hideNavAtLg ? "hidden" : undefined}>
        <AppNav links={navLinks} />
      </div>
    </div>
  );
}
