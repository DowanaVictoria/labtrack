import type { ReactNode } from "react";

/**
 * Extracts the repeated `"py-4 text-center text-sm text-ink-faint"`
 * empty-list row into one component with icon + message + optional CTA
 * (UI_REDESIGN_PLAN.md §3). Renders as a `<li>` by default so it drops
 * straight into the `<ul>` lists this pattern already lives in; pass
 * `as="div"` for non-list contexts (e.g. the marketplace results grid).
 */
export function EmptyState({
  icon,
  message,
  cta,
  as = "li",
}: {
  icon?: ReactNode;
  message: ReactNode;
  cta?: ReactNode;
  as?: "li" | "div";
}) {
  const Tag = as;
  return (
    <Tag className="flex flex-col items-center gap-2 py-8 text-center text-sm text-ink-faint">
      {icon && <div className="text-ink-faint/70">{icon}</div>}
      <p>{message}</p>
      {cta}
    </Tag>
  );
}
