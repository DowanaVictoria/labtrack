import { AccountMenu } from "@/components/ui/account-menu";
import { AppNav, type NavItem } from "@/components/ui/app-nav";

export function AppHeader({
  title,
  role,
  navLinks = [],
  profileLinks = [],
}: {
  title: string;
  role: string;
  navLinks?: NavItem[];
  profileLinks?: NavItem[];
}) {
  const initial = title.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-brand-tint text-sm font-bold text-brand-dark">
            {initial}
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-[11px] font-medium text-ink-soft">{role.replaceAll("_", " ")}</p>
          </div>
        </div>
        <AccountMenu profileLinks={profileLinks} />
      </header>
      <AppNav links={navLinks} />
    </div>
  );
}
