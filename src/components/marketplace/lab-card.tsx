import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { BuildingIcon, CategoryIcon } from "@/components/ui/icons";
import { IconTile } from "@/components/ui/icon-tile";
import { formatGHS, formatTurnaround } from "@/lib/format";

export type ViewerRole = "PATIENT" | "LAB_STAFF" | "LAB_ADMIN" | "PLATFORM_ADMIN" | undefined;
export type LabCardOffering = {
  id: string;
  price: { toString(): string } | number;
  turnaroundHours: number;
  test: { name: string; category: string };
};

/**
 * A "Book" CTA that never silently 403s for a logged-in non-patient session
 * (UI_REDESIGN_PLAN.md §0.4 — required scope, not optional). `undefined`
 * (guest) and `"PATIENT"` both get the real link — a guest clicking through
 * hits `requirePatientSession()`'s login-with-callback gate exactly as
 * intended (the "land, browse, then sign up to book" funnel). Any other
 * role sees contextual messaging instead of a CTA that would forbidden().
 */
export function BookCta({ href, viewerRole, size = "sm" }: { href: string; viewerRole: ViewerRole; size?: "sm" | "default" }) {
  if (viewerRole && viewerRole !== "PATIENT") {
    return <span className="shrink-0 text-right text-[11px] font-medium text-ink-faint">Sign in as a patient to book</span>;
  }
  return (
    <Link href={href} className={buttonClasses("secondary", size)}>
      Book appointment
    </Link>
  );
}

/**
 * Marketplace result card: icon tile, lab name, city/area, `description`
 * tagline (graceful when null — UI_REDESIGN_PLAN.md §8), matched test +
 * price + turnaround, CTA.
 */
export function LabCard({
  labId,
  labName,
  city,
  description,
  category,
  testName,
  offeringId,
  price,
  turnaroundHours,
  viewerRole,
}: {
  labId: string;
  labName: string;
  city: string;
  description?: string | null;
  category: string;
  testName: string;
  offeringId: string;
  price: { toString(): string } | number;
  turnaroundHours: number;
  viewerRole?: ViewerRole;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm shadow-foreground/5">
      <div className="flex items-start gap-3.5">
        <IconTile icon={<CategoryIcon category={category} width={20} height={20} />} />
        <div className="min-w-0 flex-1">
          <Link href={`/patient/labs/${labId}`} className="font-bold text-foreground hover:text-brand hover:underline">
            {labName}
          </Link>
          <p className="text-[12px] text-ink-faint">{city}</p>
        </div>
      </div>

      {description && <p className="line-clamp-2 text-[13px] text-ink-soft">{description}</p>}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{testName}</p>
          <p className="text-[12px] text-ink-faint">
            {formatGHS(price)} · {formatTurnaround(turnaroundHours)} turnaround
          </p>
        </div>
        <BookCta href={`/patient/book/${offeringId}`} viewerRole={viewerRole} />
      </div>
    </div>
  );
}

export function LabDirectoryCard({
  labId,
  labName,
  city,
  address,
  description,
  operatingHours,
  offerings,
  viewerRole,
  previewLimit = 4,
  source = "search",
}: {
  labId: string;
  labName: string;
  city: string;
  address: string;
  description?: string | null;
  operatingHours?: string | null;
  offerings: LabCardOffering[];
  viewerRole?: ViewerRole;
  previewLimit?: number;
  source?: "home" | "search";
}) {
  const preview = offerings.slice(0, previewLimit);
  const categories = Array.from(new Set(offerings.map((o) => o.test.category))).slice(0, 3);
  const remainingCount = offerings.length - preview.length;
  const profileHref = `/patient/labs/${labId}?from=${source}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm shadow-foreground/5 transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/10">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3.5">
          <IconTile icon={<BuildingIcon width={21} height={21} />} className="bg-brand text-white" />
          <div className="min-w-0 flex-1">
            <Link href={profileHref} className="text-lg font-bold text-foreground hover:text-brand hover:underline">
              {labName}
            </Link>
            <p className="mt-0.5 text-[12.5px] text-ink-faint">
              {city} · {address}
            </p>
          </div>
          <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[10.5px] font-bold text-brand-dark">
            {offerings.length} {offerings.length === 1 ? "test" : "tests"}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={profileHref} className={buttonClasses("primary", "sm")}>
            View lab
          </Link>
          {remainingCount > 0 && (
            <span className="text-[12px] font-medium text-ink-faint">
              Showing {preview.length} of {offerings.length} tests
            </span>
          )}
        </div>

        {description ? (
          <p className="line-clamp-2 text-sm text-ink-soft">{description}</p>
        ) : (
          <p className="text-sm text-ink-faint">Verified diagnostic provider with active appointment booking.</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {categories.map((category) => (
            <span
              key={category}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-[10.5px] font-bold text-ink-soft"
            >
              {category}
            </span>
          ))}
          {operatingHours && (
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10.5px] font-bold text-ink-soft">
              {operatingHours}
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-background/60 p-3">
        <ul className="flex flex-col gap-2">
          {preview.map((offering) => (
            <li key={offering.id} className="rounded-lg bg-surface p-3 shadow-sm shadow-foreground/5">
              <div className="flex items-start gap-3">
                <IconTile
                  icon={<CategoryIcon category={offering.test.category} width={18} height={18} />}
                  className="h-9 w-9"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{offering.test.name}</p>
                  <p className="text-[12px] text-ink-faint">
                    {formatGHS(offering.price)} · {formatTurnaround(offering.turnaroundHours)}
                  </p>
                </div>
                <BookCta href={`/patient/book/${offering.id}`} viewerRole={viewerRole} />
              </div>
            </li>
          ))}
        </ul>

        {remainingCount > 0 && (
          <Link href={profileHref} className="mt-3 block text-sm font-bold text-brand hover:underline">
            View {remainingCount} more {remainingCount === 1 ? "test" : "tests"}
          </Link>
        )}
      </div>
    </article>
  );
}
