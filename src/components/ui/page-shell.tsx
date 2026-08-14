import type { ReactNode } from "react";

export function PageShell({
  children,
  maxWidth = "max-w-2xl",
  centered = false,
  className = "",
}: {
  children: ReactNode;
  maxWidth?: string;
  centered?: boolean;
  /** Additive passthrough — e.g. the `lg:flex-row` composition dashboard pages use to sit `SidebarNav` beside their content (UI_REDESIGN_PLAN.md §4.1). Defaults to "": every existing caller is unaffected. */
  className?: string;
}) {
  return (
    <main
      className={`mx-auto flex w-full flex-1 flex-col gap-5 p-4 sm:p-8 lg:p-12 ${maxWidth} ${
        centered ? "items-center justify-center text-center" : ""
      } ${className}`}
    >
      {children}
    </main>
  );
}
