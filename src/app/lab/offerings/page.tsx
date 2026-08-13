import { requireTenantSession } from "@/lib/session";
import { labNav } from "@/app/lab/nav";
import { AddOfferingForm } from "@/app/lab/add-offering-form";
import { AddTestForm } from "@/app/lab/add-test-form";
import { EditOfferingForm } from "@/app/lab/edit-offering-form";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeading } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export default async function LabOfferingsPage() {
  const { session, db } = await requireTenantSession();

  const [offerings, allTests] = await Promise.all([
    db.labTestOffering.findMany({ include: { test: true }, orderBy: { test: { name: "asc" } } }),
    db.test.findMany({ orderBy: { name: "asc" } }),
  ]);

  const offeredTestIds = new Set(offerings.map((o) => o.testId));
  const availableTests = allTests.filter((t) => !offeredTestIds.has(t.id));
  const { links, profileLinks } = labNav(session.user.role);

  return (
    <PageShell maxWidth="max-w-3xl">
      <AppHeader
        title="Test offerings"
        role={session.user.role}
        navLinks={links}
        profileLinks={profileLinks}
      />

      <Card className="flex flex-col gap-4">
        <CardHeading>Your offerings</CardHeading>
        <ul className="flex flex-col divide-y divide-border">
          {offerings.map((o) => (
            <EditOfferingForm
              key={o.id}
              offeringId={o.id}
              testName={o.test.name}
              price={o.price.toString()}
              turnaroundHours={o.turnaroundHours}
              prepInstructions={o.prepInstructions ?? ""}
              active={o.active}
            />
          ))}
          {offerings.length === 0 && <li className="py-2 text-sm text-ink-faint">No offerings yet.</li>}
        </ul>
        <div className="border-t border-border pt-4">
          <AddOfferingForm availableTests={availableTests} />
        </div>
        {session.user.role === "LAB_ADMIN" && (
          <div className="border-t border-border pt-4">
            <AddTestForm />
          </div>
        )}
      </Card>
    </PageShell>
  );
}
