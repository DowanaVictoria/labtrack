import type { ReactNode } from "react";
import { AppNav, type NavItem } from "@/components/ui/app-nav";
import { PageShell } from "@/components/ui/page-shell";

export function DashboardShell({
  links,
  profileLinks,
  children,
}: {
  links: NavItem[];
  profileLinks: NavItem[];
  children: ReactNode;
}) {
  return (
    <PageShell maxWidth="max-w-7xl">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <AppNav links={[...links, ...profileLinks]} />
        {children}
      </div>
    </PageShell>
  );
}
