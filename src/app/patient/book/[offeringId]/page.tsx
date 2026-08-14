import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePatientSession } from "@/lib/session";
import { BookForm } from "@/app/patient/book/[offeringId]/book-form";
import { Card, CardHeading } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { BuildingIcon, CalendarIcon, CategoryIcon } from "@/components/ui/icons";
import { IconTile } from "@/components/ui/icon-tile";
import { formatGHS, formatTurnaround } from "@/lib/format";

export default async function BookOfferingPage({
  params,
}: {
  params: Promise<{ offeringId: string }>;
}) {
  const { offeringId } = await params;
  // Callback URL is built from this page's own dynamic segment — never
  // echoed from arbitrary query input — so it can't be used as an
  // open-redirect surface (UI_REDESIGN_PLAN.md §6/§8). This is the only
  // requirePatientSession() call site that passes one; every other call
  // site is unaffected by the new optional parameter.
  await requirePatientSession(`/patient/book/${offeringId}`);

  const offering = await prisma.labTestOffering.findUnique({
    where: { id: offeringId },
    include: { lab: true, test: true },
  });

  if (!offering) notFound();

  const available = offering.active && offering.lab.status === "APPROVED";

  return (
    <PageShell maxWidth="max-w-6xl">
      <Link href="/" className="w-fit text-sm font-bold text-brand hover:underline">
        Back to labs
      </Link>

      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-xl shadow-foreground/10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.82fr]">
          <div className="bg-[#08251f] p-6 text-white sm:p-8">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide uppercase text-white/75">
              Confirm appointment
            </span>
            <div className="mt-7 flex items-start gap-4">
              <IconTile icon={<CategoryIcon category={offering.test.category} width={22} height={22} />} className="bg-white text-brand-dark" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-balance">{offering.test.name}</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/72">
                  Review the lab, price, turnaround, and prep notes before choosing your appointment slot.
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/15 bg-white/10 p-4">
                <p className="text-[11px] font-bold tracking-wide text-white/55 uppercase">Price</p>
                <p className="mt-1 text-xl font-bold">{formatGHS(offering.price)}</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-4">
                <p className="text-[11px] font-bold tracking-wide text-white/55 uppercase">Turnaround</p>
                <p className="mt-1 text-xl font-bold">{formatTurnaround(offering.turnaroundHours)}</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-4">
                <p className="text-[11px] font-bold tracking-wide text-white/55 uppercase">Category</p>
                <p className="mt-1 text-xl font-bold">{offering.test.category}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 p-6 sm:p-8">
            <Card className="shadow-none">
              <div className="flex items-start gap-3">
                <IconTile icon={<BuildingIcon width={20} height={20} />} />
                <div>
                  <CardHeading>Selected lab</CardHeading>
                  <p className="mt-1 font-bold text-foreground">{offering.lab.name}</p>
                  <p className="text-[12.5px] text-ink-faint">
                    {offering.lab.address}, {offering.lab.city}
                  </p>
                </div>
              </div>
            </Card>

            {offering.prepInstructions ? (
              <Card className="border-gold bg-gold-tint shadow-none">
                <CardHeading>Prep required</CardHeading>
                <p className="mt-2 text-sm font-medium text-foreground">{offering.prepInstructions}</p>
              </Card>
            ) : (
              <Card className="border-ok bg-ok-tint shadow-none">
                <CardHeading>Prep</CardHeading>
                <p className="mt-2 text-sm font-medium text-foreground">No prep instructions are listed for this test.</p>
              </Card>
            )}

            <Card className="shadow-none">
              <div className="mb-4 flex items-start gap-3">
                <IconTile icon={<CalendarIcon width={20} height={20} />} />
                <div>
                  <CardHeading>Choose slot</CardHeading>
                  <p className="mt-1 text-sm text-ink-faint">Pick a future date and time that works for you.</p>
                </div>
              </div>
              {available ? (
                <BookForm offeringId={offering.id} />
              ) : (
                <p className="text-sm text-danger">This offering is no longer available.</p>
              )}
            </Card>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
