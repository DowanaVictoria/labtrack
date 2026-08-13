import type { ReactNode } from "react";

export function IconTile({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-tint text-[9px] font-bold text-brand-dark ${className}`}
    >
      {children}
    </div>
  );
}
