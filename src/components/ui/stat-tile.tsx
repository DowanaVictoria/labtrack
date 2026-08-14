import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import type { IconTileTone } from "@/components/ui/icon-tile";

const TONE_TEXT: Record<IconTileTone, string> = {
  brand: "text-brand",
  gold: "text-gold",
  ok: "text-ok",
  danger: "text-danger",
  purple: "text-purple",
};

/**
 * Extracts the stat-tile `<Card>` markup duplicated across `/lab`, `/admin`
 * (and now `/patient/appointments`) into one component: icon + value +
 * label + optional tone (UI_REDESIGN_PLAN.md §3/§4.1).
 */
export function StatTile({
  icon,
  value,
  label,
  tone = "brand",
}: {
  icon?: ReactNode;
  value: ReactNode;
  label: string;
  tone?: IconTileTone;
}) {
  return (
    <Card className="relative flex min-h-[126px] overflow-hidden p-0">
      <div className={`absolute inset-x-0 top-0 h-1 ${tone === "brand" ? "bg-brand" : tone === "gold" ? "bg-gold" : tone === "ok" ? "bg-ok" : tone === "danger" ? "bg-danger" : "bg-purple"}`} />
      <div className="flex w-full flex-col justify-between gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10.5px] font-bold tracking-wide text-ink-faint uppercase">{label}</span>
          {icon && <div className={`${TONE_TEXT[tone]}`}>{icon}</div>}
        </div>
        <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
      </div>
    </Card>
  );
}
