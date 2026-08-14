import { notFound } from "next/navigation";
import { requireTenantSession } from "@/lib/session";
import { labNav } from "@/app/lab/nav";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeading } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/icons";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { IconTile } from "@/components/ui/icon-tile";
import { StatusBadge } from "@/components/ui/badge";
import { formatGHS } from "@/lib/format";

// FR16 (docs/SRS.md §5): lab staff can view a single patient's appointment
// detail, within their own lab only. `db` is the tenant-scoped client from
// requireTenantSession() — findUnique here can never return another lab's
// appointment (src/lib/tenant-scope.ts forces the labId filter).
export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, db } = await requireTenantSession();
  const { id } = await params;

  const appointment = await db.appointment.findUnique({
    where: { id },
    include: {
      patient: { select: { name: true, email: true } },
      offering: { include: { test: true } },
      sample: true,
    },
  });

  if (!appointment) notFound();

  const { links, profileLinks } = labNav(session.user.role);

  return (
    <DashboardShell links={links} profileLinks={profileLinks}>
          <AppHeader
            title={appointment.offering.test.name}
            role={session.user.role}
            navLinks={links}
            profileLinks={profileLinks}
            hideNavAtLg
          />

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_0.75fr]">
            <Card className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <IconTile icon={<CategoryIcon category={appointment.offering.test.category} width={20} height={20} />} />
                  <div>
                    <CardHeading>Appointment details</CardHeading>
                    <p className="mt-1 font-bold text-foreground">{appointment.patient.name}</p>
                    <p className="text-[12.5px] text-ink-faint">{appointment.patient.email}</p>
                  </div>
                </div>
                <StatusBadge status={appointment.status} />
              </div>

              <dl className="grid grid-cols-1 gap-3 rounded-lg bg-background p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">Test</dt>
                  <dd className="mt-1 font-bold text-foreground">{appointment.offering.test.name}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">Category</dt>
                  <dd className="mt-1 font-medium text-foreground">{appointment.offering.test.category}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">Slot</dt>
                  <dd className="mt-1 font-medium text-foreground">{appointment.slotDatetime.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">Price</dt>
                  <dd className="mt-1 font-medium text-foreground">{formatGHS(appointment.offering.price)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">Turnaround</dt>
                  <dd className="mt-1 font-medium text-foreground">{appointment.offering.turnaroundHours}h</dd>
                </div>
                {appointment.offering.prepInstructions && (
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">Prep</dt>
                    <dd className="mt-1 font-medium text-foreground">{appointment.offering.prepInstructions}</dd>
                  </div>
                )}
              </dl>
            </Card>

            <Card className="flex flex-col gap-4">
              <CardHeading>Sample</CardHeading>
              {appointment.sample ? (
                <dl className="grid grid-cols-1 gap-3 text-sm">
                  <dt className="text-ink-faint">Collected at</dt>
                  <dd className="font-medium text-foreground">
                    {appointment.sample.collectedAt?.toLocaleString() ?? "—"}
                  </dd>
                  {appointment.sample.notes && (
                    <>
                      <dt className="text-ink-faint">Notes</dt>
                      <dd className="font-medium text-foreground">{appointment.sample.notes}</dd>
                    </>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-ink-faint">No sample has been collected yet.</p>
              )}
            </Card>
          </div>
    </DashboardShell>
  );
}
