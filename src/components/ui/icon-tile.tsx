import type { ReactNode } from "react";

export type IconTileTone = "brand" | "gold" | "ok" | "danger" | "purple";

const TONE_CLASSES: Record<IconTileTone, string> = {
  brand: "bg-brand-tint text-brand-dark",
  gold: "bg-gold-tint text-gold",
  ok: "bg-ok-tint text-ok",
  danger: "bg-danger-tint text-danger",
  purple: "bg-purple-tint text-purple",
};

/**
 * `icon`/`tone` are optional and additive — every existing call site
 * (`initials(name)` as `children`, for people: staff/patients/lab admins)
 * keeps working unchanged, defaulting to the original brand-tinted initials
 * look. Only test/category-facing tiles adopt `icon`/`tone`; people stay as
 * initials, deliberately (UI_REDESIGN_PLAN.md §4.2) — a generic "person"
 * icon is less informative than initials for a staff/patient list.
 */
export function IconTile({
  children,
  icon,
  tone = "brand",
  className = "",
}: {
  children?: ReactNode;
  icon?: ReactNode;
  tone?: IconTileTone;
  className?: string;
}) {
  return (
    <div
      className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg text-[9px] font-bold ${TONE_CLASSES[tone]} ${className}`}
    >
      {icon ?? children}
    </div>
  );
}
