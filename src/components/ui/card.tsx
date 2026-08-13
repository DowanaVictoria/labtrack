import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-border bg-surface p-5 ${className}`} {...props} />;
}

export function CardHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-[10.5px] font-bold tracking-widest text-ink-faint uppercase">{children}</h2>;
}
