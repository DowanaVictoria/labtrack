import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`min-w-0 rounded-lg border border-border bg-surface p-5 shadow-sm shadow-foreground/5 ${className}`} {...props} />;
}

export function CardHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">{children}</h2>;
}
