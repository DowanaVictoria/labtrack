import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { MarketplaceHeader } from "@/components/marketplace-header";
import { HeroSearchBar } from "@/components/marketplace/hero-search-bar";
import { CategoryPillRow } from "@/components/marketplace/category-pill-row";
import { LabDirectoryCard, type ViewerRole } from "@/components/marketplace/lab-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/field";
import { FlaskIcon } from "@/components/ui/icons";

const STEPS = [
  {
    n: "1",
    title: "Browse labs",
    body: "Start with verified providers.",
  },
  {
    n: "2",
    title: "Compare",
    body: "Check prices and turnaround.",
  },
  {
    n: "3",
    title: "Book",
    body: "Sign in only when booking.",
  },
];

const SORT_OPTIONS = {
  price_asc: { label: "Price: low to high", orderBy: { price: "asc" as const } },
  price_desc: { label: "Price: high to low", orderBy: { price: "desc" as const } },
  turnaround_asc: { label: "Turnaround: fastest first", orderBy: { turnaroundHours: "asc" as const } },
  turnaround_desc: { label: "Turnaround: slowest first", orderBy: { turnaroundHours: "desc" as const } },
};
type SortKey = keyof typeof SORT_OPTIONS;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; category?: string; sort?: string }>;
}) {
  const session = await auth();
  const { q, city, category, sort: sortParam } = await searchParams;
  const sort: SortKey = sortParam && sortParam in SORT_OPTIONS ? (sortParam as SortKey) : "price_asc";

  const testFilter: Prisma.TestWhereInput = {};
  if (q) {
    testFilter.OR = [{ name: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }];
  }
  if (category) {
    testFilter.category = category;
  }

  const offeringFilter: Prisma.LabTestOfferingWhereInput = {
    active: true,
    ...(Object.keys(testFilter).length > 0 ? { test: testFilter } : {}),
  };

  const [labs, approvedLabCount, testCount, categoryRows] = await Promise.all([
    prisma.lab.findMany({
      where: {
        status: "APPROVED",
        ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
        offerings: { some: offeringFilter },
      },
      include: {
        offerings: {
          where: offeringFilter,
          include: { test: { select: { name: true, category: true } } },
          orderBy: SORT_OPTIONS[sort].orderBy,
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.lab.count({ where: { status: "APPROVED", offerings: { some: { active: true } } } }),
    prisma.test.count(),
    prisma.test.findMany({ distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
  ]);
  const categories = categoryRows.map((r) => r.category);
  const viewerRole = session?.user?.role as ViewerRole;
  const offeringCount = labs.reduce((count, lab) => count + lab.offerings.length, 0);
  const isFiltering = Boolean(q || city || category);

  return (
    <div className="flex min-h-full flex-col">
      <MarketplaceHeader session={session} />

      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden bg-[#08251f] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(15,143,114,0.5),transparent_32%),linear-gradient(135deg,rgba(8,37,31,1),rgba(10,77,64,1))]" />
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 px-3 py-10 sm:px-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-12 xl:px-6">
            <div className="flex flex-col items-start gap-6 text-left">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide uppercase text-white/80">
                MediLab marketplace
              </span>
              <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                Browse trusted labs before you book a test.
            </h1>
              <p className="max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                See approved diagnostic labs first, compare the tests under each provider, and move to booking only when
                you have picked the right lab.
            </p>

              <HeroSearchBar action="/" defaultQuery={q} defaultCity={city} variant="light" />

              {!session?.user && (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link href="/signup" className={`${buttonClasses("primary")} !bg-white !text-brand-dark hover:!bg-white/90`}>
                    Sign up as a patient
                </Link>
                  <Link href="/register" className="rounded-lg border border-white/35 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">
                    Register your lab
                </Link>
                </div>
              )}

              <div className="flex gap-8 border-t border-white/15 pt-5">
                <div>
                  <div className="text-3xl font-bold">{approvedLabCount}</div>
                  <div className="text-[11px] font-bold tracking-wide text-white/60 uppercase">Verified labs</div>
              </div>
                <div>
                  <div className="text-3xl font-bold">{testCount}</div>
                  <div className="text-[11px] font-bold tracking-wide text-white/60 uppercase">Catalog tests</div>
                </div>
              </div>
            </div>

            {labs[0] && (
              <div className="rounded-lg border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/20 backdrop-blur">
                <LabDirectoryCard
                  labId={labs[0].id}
                  labName={labs[0].name}
                  city={labs[0].city}
                  address={labs[0].address}
                  description={labs[0].description}
                  operatingHours={labs[0].operatingHours}
                  offerings={labs[0].offerings}
                  viewerRole={viewerRole}
                  previewLimit={3}
                  source="home"
                />
              </div>
            )}
          </div>
        </section>

        <section className="sticky top-0 z-20 border-b border-border bg-background/95 shadow-sm shadow-foreground/5 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between xl:px-6">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:items-center">
              {STEPS.map((step) => (
                <div key={step.n} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                    {step.n}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-foreground">{step.title}</p>
                    <p className="truncate text-[11.5px] text-ink-faint">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {!session?.user && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:w-[360px]">
                <Link
                  href="/signup"
                  className="rounded-lg border border-brand bg-brand-tint px-3 py-2 text-[12.5px] font-bold text-brand-dark hover:bg-brand hover:text-white"
                >
                  Looking for a test?
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] font-bold text-ink-soft hover:border-brand hover:text-brand-dark"
                >
                  Run a diagnostic lab?
                </Link>
              </div>
            )}
          </div>
        </section>

        <section id="labs" className="mx-auto w-full max-w-7xl px-3 py-8 sm:px-5 xl:px-6">
          <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-4 shadow-sm shadow-foreground/5 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {isFiltering ? "Matching labs" : "Browse all labs"}
                </h2>
                <p className="mt-1 text-sm text-ink-faint">
                  {labs.length} {labs.length === 1 ? "lab" : "labs"} · {offeringCount} {isFiltering ? "matching" : "available"}{" "}
                  {offeringCount === 1 ? "test" : "tests"}
                  {q && <> for &ldquo;{q}&rdquo;</>}
                </p>
              </div>

              <form method="GET" className="flex items-center gap-2">
                {q && <input type="hidden" name="q" value={q} />}
                {city && <input type="hidden" name="city" value={city} />}
                {category && <input type="hidden" name="category" value={category} />}
                <select name="sort" defaultValue={sort} className={`${fieldClasses} text-[12.5px]`}>
                  {Object.entries(SORT_OPTIONS).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <button type="submit" className={buttonClasses("ghost", "sm")}>
                  Sort
                </button>
              </form>
            </div>

            <Suspense fallback={<div className="h-9" />}>
              <CategoryPillRow categories={categories} />
            </Suspense>
          </div>

          {labs.length > 0 ? (
            <div className="mt-5 columns-1 gap-4 md:columns-2 xl:columns-3">
              {labs.map((lab) => (
                <div key={lab.id} className="mb-4 [break-inside:avoid]">
                  <LabDirectoryCard
                    labId={lab.id}
                    labName={lab.name}
                    city={lab.city}
                    address={lab.address}
                    description={lab.description}
                    operatingHours={lab.operatingHours}
                    offerings={lab.offerings}
                    viewerRole={viewerRole}
                    previewLimit={isFiltering ? 5 : 3}
                    source="home"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                as="div"
                icon={<FlaskIcon width={28} height={28} />}
                message="No labs match that search yet. Try a different test, city, or category."
              />
            </div>
          )}
        </section>

      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-3 py-6 text-[12.5px] text-ink-faint sm:flex-row sm:px-5 xl:px-6">
          <span className="font-bold text-ink-soft">MediLab</span>
          <span>Verified lab marketplace &amp; appointment platform.</span>
        </div>
      </footer>
    </div>
  );
}
