"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

export function AppNav({ links }: { links: NavItem[] }) {
  const pathname = usePathname();

  if (links.length === 0) return null;

  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2 shadow-sm shadow-foreground/5">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3.5 py-2 text-sm font-bold transition-colors ${
              active ? "bg-brand text-white shadow-sm" : "text-ink-soft hover:bg-background hover:text-foreground"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
