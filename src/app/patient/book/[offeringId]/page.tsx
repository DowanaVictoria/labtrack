import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePatientSession } from "@/lib/session";
import { BookForm } from "@/app/patient/book/[offeringId]/book-form";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export default async function BookOfferingPage({
  params,
}: {
  params: Promise<{ offeringId: string }>;
}) {
  await requirePatientSession();
  const { offeringId } = await params;

  const offering = await prisma.labTestOffering.findUnique({
    where: { id: offeringId },
    include: { lab: true, test: true },
  });

  if (!offering) notFound();

  const available = offering.active && offering.lab.status === "APPROVED";

  return (
    <PageShell maxWidth="max-w-sm" centered>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-bold tracking-widest text-brand uppercase">{offering.lab.name}</span>
        <h1 className="text-xl font-bold tracking-tight text-foreground">{offering.test.name}</h1>
      </div>

      <Card className="w-full text-left">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-ink-faint">Price</dt>
          <dd className="text-right font-bold text-foreground">GHS {offering.price.toString()}</dd>
          <dt className="text-ink-faint">Turnaround</dt>
          <dd className="text-right font-bold text-foreground">{offering.turnaroundHours}h</dd>
          {offering.prepInstructions && (
            <>
              <dt className="text-ink-faint">Prep</dt>
              <dd className="text-right font-medium text-foreground">{offering.prepInstructions}</dd>
            </>
          )}
        </dl>

        {available ? (
          <div className="mt-5 border-t border-border pt-5">
            <BookForm offeringId={offering.id} />
          </div>
        ) : (
          <p className="mt-5 border-t border-border pt-5 text-sm text-danger">This offering is no longer available.</p>
        )}
      </Card>

      <Link href="/patient" className="text-sm font-bold text-brand hover:underline">
        ← Back to search
      </Link>
    </PageShell>
  );
}
