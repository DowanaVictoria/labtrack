import { requireTenantSession } from "@/lib/session";
import { labNav } from "@/app/lab/nav";
import { AddOfferingForm } from "@/app/lab/add-offering-form";
import { AddTestForm } from "@/app/lab/add-test-form";
import { EditOfferingForm } from "@/app/lab/edit-offering-form";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeading } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryIcon, FlaskIcon } from "@/components/ui/icons";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { IconTile } from "@/components/ui/icon-tile";

export default async function LabOfferingsPage() {
  const { session, db } = await requireTenantSession();

  const [offerings, allTests] = await Promise.all([
    db.labTestOffering.findMany({ include: { test: true }, orderBy: { test: { name: "asc" } } }),
    db.test.findMany({ orderBy: { name: "asc" } }),
  ]);

  const offeredTestIds = new Set(offerings.map((o) => o.testId));
  const availableTests = allTests.filter((t) => !offeredTestIds.has(t.id));
  const activeCount = offerings.filter((offering) => offering.active).length;
  const inactiveCount = offerings.length - activeCount;
  const offeringGroups = Array.from(
    offerings
      .reduce((groups, offering) => {
        const group = groups.get(offering.test.category) ?? [];
        group.push(offering);
        groups.set(offering.test.category, group);
        return groups;
      }, new Map<string, typeof offerings>())
      .entries(),
  ).sort(([categoryA], [categoryB]) => categoryA.localeCompare(categoryB));
  const { links, profileLinks } = labNav(session.user.role);

  return (
    <DashboardShell links={links} profileLinks={profileLinks}>
      <AppHeader title="Test offerings" role={session.user.role} navLinks={links} profileLinks={profileLinks} hideNavAtLg />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[0.78fr_1.22fr]">
        <Card className="flex flex-col gap-4 xl:sticky xl:top-24">
          <div>
            <CardHeading>Add a test</CardHeading>
            <p className="mt-1 text-sm text-ink-faint">Search your lab&apos;s own test catalog, filter by category, then publish price and turnaround.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">Available</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{availableTests.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">Listed</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{offerings.length}</p>
            </div>
          </div>
          <AddOfferingForm availableTests={availableTests} />
          {session.user.role === "LAB_ADMIN" && <AddTestForm />}
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardHeading>Your offerings</CardHeading>
              <p className="mt-1 text-sm text-ink-faint">Keep patient-facing test pricing, timing, prep instructions, and visibility current.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-ok-tint px-3 py-1 text-[11px] font-bold text-ok">{activeCount} published</span>
              <span className="rounded-full bg-background px-3 py-1 text-[11px] font-bold text-ink-soft ring-1 ring-border">
                {inactiveCount} paused
              </span>
            </div>
          </div>

          {offerings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-brand/35 bg-brand-tint/35 px-4 py-8">
              <EmptyState
                as="div"
                icon={<FlaskIcon width={22} height={22} />}
                message={
                  <span>
                    No test offerings yet. Add your first catalog test with pricing and turnaround so patients can book this lab.
                  </span>
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {offeringGroups.map(([category, categoryOfferings]) => {
                const categoryActiveCount = categoryOfferings.filter((offering) => offering.active).length;

                return (
                  <section key={category} className="overflow-hidden rounded-lg border border-border bg-background">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <IconTile
                          icon={<CategoryIcon category={category} width={19} height={19} />}
                          className="h-9 w-9"
                          tone={categoryActiveCount > 0 ? "brand" : "gold"}
                        />
                        <div className="min-w-0">
                          <h2 className="truncate text-sm font-bold text-foreground">{category}</h2>
                          <p className="text-[12px] text-ink-faint">
                            {categoryOfferings.length} tests / {categoryActiveCount} published
                          </p>
                        </div>
                      </div>
                      {categoryActiveCount === 0 && (
                        <span className="rounded-full bg-gold-tint px-3 py-1 text-[11px] font-bold text-gold">All paused</span>
                      )}
                    </div>
                    <ul className="divide-y divide-border">
                      {categoryOfferings.map((offering) => (
                        <li key={offering.id} className="p-3 transition hover:bg-surface/70">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-foreground">{offering.test.name}</p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                                    offering.active
                                      ? "bg-ok-tint text-ok"
                                      : "border border-border bg-surface text-ink-faint"
                                  }`}
                                >
                                  {offering.active ? "Published" : "Paused"}
                                </span>
                              </div>
                              <p className="text-[12px] text-ink-faint">
                                {offering.test.sampleType}
                                {offering.test.description ? ` / ${offering.test.description}` : ""}
                              </p>
                            </div>
                          </div>
                          <EditOfferingForm
                            offeringId={offering.id}
                            price={offering.price.toString()}
                            turnaroundHours={offering.turnaroundHours}
                            prepInstructions={offering.prepInstructions ?? ""}
                            active={offering.active}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
