import { CategoryIcon } from "@/components/ui/icons";
import { IconTile } from "@/components/ui/icon-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { formatGHS, formatTurnaround } from "@/lib/format";
import { BookCta, type ViewerRole } from "@/components/marketplace/lab-card";

export type CatalogOffering = {
  id: string;
  price: { toString(): string } | number;
  turnaroundHours: number;
  prepInstructions: string | null;
  test: { name: string; category: string; description: string | null };
};

/**
 * Richer per-lab catalog row for `/patient/labs/[labId]`: test name,
 * category badge/icon, `test.description`, price (`formatGHS`), turnaround
 * (`formatTurnaround`), and a clearly flagged prep-instructions state (vs.
 * "no prep needed") — UI_REDESIGN_PLAN.md §3/§4.1. Long `prepInstructions`
 * text wraps rather than blowing out the row layout (§8).
 */
export function TestCatalogList({ offerings, viewerRole }: { offerings: CatalogOffering[]; viewerRole?: ViewerRole }) {
  if (offerings.length === 0) {
    return <EmptyState as="div" message="No tests currently offered." />;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {offerings.map((o) => (
        <li key={o.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
          <div className="flex items-start gap-3.5">
            <IconTile icon={<CategoryIcon category={o.test.category} width={20} height={20} />} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-foreground">{o.test.name}</p>
                <span className="w-fit rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand-dark uppercase">
                  {o.test.category}
                </span>
              </div>
              {o.test.description && <p className="mt-0.5 text-[12.5px] text-ink-faint">{o.test.description}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="font-bold text-foreground">{formatGHS(o.price)}</span>
              <BookCta href={`/patient/book/${o.id}`} viewerRole={viewerRole} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-[54px] text-[12px]">
            <span className="text-ink-faint">{formatTurnaround(o.turnaroundHours)} turnaround</span>
            {o.prepInstructions ? (
              <span className="inline-flex items-center gap-1 font-medium text-gold">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Prep required: {o.prepInstructions}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-ok">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ok" />
                No prep needed
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
