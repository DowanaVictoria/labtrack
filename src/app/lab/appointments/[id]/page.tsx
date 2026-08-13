import { notFound } from "next/navigation";
import { requireTenantSession } from "@/lib/session";
import { labNav } from "@/app/lab/nav";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { StatusBadge } from "@/components/ui/badge";

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
    <PageShell maxWidth="max-w-lg">
      <AppHeader
        title={appointment.offering.test.name}
        role={session.user.role}
        navLinks={links}
        profileLinks={profileLinks}
      />

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-bold tracking-widest text-ink-faint uppercase">Status</span>
          <StatusBadge status={appointment.status} />
        </div>
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-ink-faint">Patient</dt>
          <dd className="text-right font-bold text-foreground">{appointment.patient.name}</dd>
          <dt className="text-ink-faint">Patient email</dt>
          <dd className="text-right font-medium text-foreground">{appointment.patient.email}</dd>
          <dt className="text-ink-faint">Slot</dt>
          <dd className="text-right font-medium text-foreground">{appointment.slotDatetime.toLocaleString()}</dd>
          <dt className="text-ink-faint">Price</dt>
          <dd className="text-right font-medium text-foreground">GHS {appointment.offering.price.toString()}</dd>
          <dt className="text-ink-faint">Turnaround</dt>
          <dd className="text-right font-medium text-foreground">{appointment.offering.turnaroundHours}h</dd>
          {appointment.offering.prepInstructions && (
            <>
              <dt className="text-ink-faint">Prep instructions</dt>
              <dd className="text-right font-medium text-foreground">{appointment.offering.prepInstructions}</dd>
            </>
          )}
        </dl>

        {appointment.sample && (
          <div className="border-t border-border pt-4 text-sm">
            <h2 className="mb-2 text-[10.5px] font-bold tracking-widest text-ink-faint uppercase">Sample</h2>
            <dl className="grid grid-cols-2 gap-y-2">
              <dt className="text-ink-faint">Collected at</dt>
              <dd className="text-right font-medium text-foreground">
                {appointment.sample.collectedAt?.toLocaleString() ?? "—"}
              </dd>
              {appointment.sample.notes && (
                <>
                  <dt className="text-ink-faint">Notes</dt>
                  <dd className="text-right font-medium text-foreground">{appointment.sample.notes}</dd>
                </>
              )}
            </dl>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
