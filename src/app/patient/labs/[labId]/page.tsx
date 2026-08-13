import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePatientSession } from "@/lib/session";
import { Card, CardHeading } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { PageShell } from "@/components/ui/page-shell";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

// FR6 (docs/SRS.md §5): patient can view a lab's profile. Only APPROVED
// labs are visible here — same business-rule filtering as the search page,
// not a tenant-scoping concern (patients aren't tenant-scoped).
export default async function LabProfilePage({ params }: { params: Promise<{ labId: string }> }) {
  await requirePatientSession();
  const { labId } = await params;

  const lab = await prisma.lab.findFirst({
    where: { id: labId, status: "APPROVED" },
    include: { offerings: { where: { active: true }, include: { test: true }, orderBy: { price: "asc" } } },
  });

  if (!lab) notFound();

  return (
    <PageShell maxWidth="max-w-2xl">
      <div>
        <span className="text-[11px] font-bold tracking-widest text-brand uppercase">Lab profile</span>
        <h1 className="text-xl font-bold tracking-tight text-foreground">{lab.name}</h1>
        <p className="mt-1 text-[13px] text-ink-faint">
          {lab.address}, {lab.city} · {lab.contactEmail}
        </p>
      </div>

      <Card className="flex flex-col gap-3">
        <CardHeading>Tests offered</CardHeading>
        <ul className="flex flex-col divide-y divide-border">
          {lab.offerings.map((o) => (
            <li key={o.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
              <IconTile>{initials(o.test.name)}</IconTile>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">{o.test.name}</p>
                <p className="text-[12px] text-ink-faint">{o.turnaroundHours}h turnaround</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="font-bold text-foreground">GHS {o.price.toString()}</span>
                <Link href={`/patient/book/${o.id}`} className={buttonClasses("secondary", "sm")}>
                  Book
                </Link>
              </div>
            </li>
          ))}
          {lab.offerings.length === 0 && (
            <li className="py-4 text-center text-sm text-ink-faint">No tests currently offered.</li>
          )}
        </ul>
      </Card>

      <Link href="/patient" className="text-sm font-bold text-brand hover:underline">
        ← Back to search
      </Link>
    </PageShell>
  );
}
