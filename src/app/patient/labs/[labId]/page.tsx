import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MarketplaceHeader } from "@/components/marketplace-header";
import { TestCatalogList } from "@/components/marketplace/test-catalog-list";
import type { ViewerRole } from "@/components/marketplace/lab-card";
import { Card, CardHeading } from "@/components/ui/card";
import { BuildingIcon } from "@/components/ui/icons";
import { IconTile } from "@/components/ui/icon-tile";
import { PageShell } from "@/components/ui/page-shell";

// FR6 (docs/SRS.md §5): patient can view a lab's profile. Only APPROVED
// labs are visible here — same business-rule filtering as the search page.
// Public per UI_REDESIGN_PLAN.md §9.3 — no requirePatientSession() gate;
// this was never tenant-scoped to begin with (patients aren't tenant-scoped
// and this reads the base `prisma` client, not tenant-scope.ts).
export default async function LabProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ labId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await auth();
  const { labId } = await params;
  const { from } = await searchParams;
  const backHref = "/";
  const backLabel = from === "home" ? "Back to home" : "Back to lab directory";

  const lab = await prisma.lab.findFirst({
    where: { id: labId, status: "APPROVED" },
    include: { offerings: { where: { active: true }, include: { test: true }, orderBy: { price: "asc" } } },
  });

  if (!lab) notFound();

  // "Specialties" are derived, not stored (UI_REDESIGN_PLAN.md §0.3) — the
  // distinct Test.category values across this lab's active offerings, so
  // they can never drift out of sync with what the lab actually offers.
  const specialties = Array.from(new Set(lab.offerings.map((o) => o.test.category))).sort();

  return (
    <div className="flex min-h-full flex-col">
      <MarketplaceHeader session={session} />

      <PageShell maxWidth="max-w-4xl">
        <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm shadow-foreground/5">
          <div className="bg-[#08251f] px-5 py-7 text-white sm:px-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-4">
                <IconTile icon={<BuildingIcon width={22} height={22} />} className="bg-white text-brand-dark" />
                <div>
                  <span className="text-[11px] font-bold tracking-wide text-white/65 uppercase">Verified lab profile</span>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight text-balance">{lab.name}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                    {lab.address}, {lab.city} · {lab.contactEmail}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-2xl font-bold">{lab.offerings.length}</p>
                <p className="text-[11px] font-bold tracking-wide text-white/65 uppercase">Active tests</p>
              </div>
            </div>

            {(lab.description || lab.operatingHours || specialties.length > 0) && (
              <div className="mt-6 grid grid-cols-1 gap-4 border-t border-white/15 pt-5 md:grid-cols-[1fr_0.8fr]">
                <div>
                  <p className="text-[11px] font-bold tracking-wide text-white/55 uppercase">About</p>
                  <p className="mt-1 text-sm leading-6 text-white/78">
                    {lab.description ?? "This approved provider is accepting patient bookings through MediLab."}
                  </p>
                </div>
                <div>
                  {lab.operatingHours && (
                    <>
                      <p className="text-[11px] font-bold tracking-wide text-white/55 uppercase">Hours</p>
                      <p className="mt-1 text-sm font-medium text-white/85">{lab.operatingHours}</p>
                    </>
                  )}
                  {specialties.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {specialties.map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10.5px] font-bold tracking-wide text-white/80 uppercase"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <CardHeading>Tests offered</CardHeading>
              <p className="mt-1 text-sm text-ink-faint">Guests can browse every test. Booking starts account sign-in when needed.</p>
            </div>
          </div>
          <TestCatalogList offerings={lab.offerings} viewerRole={session?.user?.role as ViewerRole} />
        </Card>

        <Link href={backHref} className="text-sm font-bold text-brand hover:underline">
          {backLabel}
        </Link>
      </PageShell>
    </div>
  );
}
