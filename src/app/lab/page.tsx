import Link from "next/link";
import { requireTenantSession } from "@/lib/session";
import { markSampleCollected, advanceStatus } from "@/app/actions/queue";
import { labNav } from "@/app/lab/nav";
import { QueueActionForm } from "@/app/lab/queue-action-form";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeading } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarIcon, CategoryIcon, FlaskIcon } from "@/components/ui/icons";
import { IconTile } from "@/components/ui/icon-tile";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusBadge } from "@/components/ui/badge";

const STATUS_BANNER: Record<string, { text: string; className: string }> = {
  PENDING: {
    text: "This lab is pending platform admin approval — it won't appear in patient search yet.",
    className: "border-gold bg-gold-tint text-gold",
  },
  REJECTED: {
    text: "This lab's registration was rejected.",
    className: "border-danger bg-danger-tint text-danger",
  },
  SUSPENDED: {
    text: "This lab is currently suspended.",
    className: "border-border bg-background text-ink-soft",
  },
};

// Demonstrates the wiring described in docs/System_Design.md §2: this page
// never touches `prisma` directly, only the client requireTenantSession()
// hands back — every query here is already forced to session.user.labId.
export default async function LabDashboardPage() {
  const { session, db } = await requireTenantSession();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const [lab, todaysAppointments, upcomingAppointments, activeOfferingCount, totalAppointmentCount, completedCount] =
    await Promise.all([
      db.lab.findUnique({ where: { id: session.user.labId! } }),
      db.appointment.findMany({
        where: { slotDatetime: { gte: startOfDay, lt: endOfDay } },
        include: { patient: { select: { name: true } }, offering: { include: { test: true } } },
        orderBy: { slotDatetime: "asc" },
      }),
      db.appointment.findMany({
        where: { slotDatetime: { gte: endOfDay } },
        include: { patient: { select: { name: true } }, offering: { include: { test: true } } },
        orderBy: { slotDatetime: "asc" },
      }),
      // FR21 (docs/SRS.md §5): basic operational stats for this lab.
      db.labTestOffering.count({ where: { active: true } }),
      db.appointment.count(),
      db.appointment.count({ where: { status: "COMPLETED" } }),
    ]);

  const banner = lab && lab.status !== "APPROVED" ? STATUS_BANNER[lab.status] : undefined;
  const { links, profileLinks } = labNav(session.user.role);

  return (
    <DashboardShell links={links} profileLinks={profileLinks}>
          <AppHeader
            title={`${lab?.name ?? "Lab"} — Dashboard`}
            role={session.user.role}
            navLinks={links}
            profileLinks={profileLinks}
            hideNavAtLg
          />

          {banner && <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${banner.className}`}>{banner.text}</div>}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatTile icon={<FlaskIcon width={20} height={20} />} value={activeOfferingCount} label="Active offerings" />
            <StatTile
              icon={<CalendarIcon width={20} height={20} />}
              value={todaysAppointments.length}
              label="Today's appointments"
              tone="gold"
            />
            <StatTile value={totalAppointmentCount} label="Total appointments" tone="purple" />
            <StatTile value={completedCount} label="Completed" tone="ok" />
          </div>

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <Card className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardHeading>Today&apos;s queue</CardHeading>
                  <p className="mt-1 text-sm text-ink-faint">Sample collection and status movement for appointments scheduled today.</p>
                </div>
                <span className="rounded-full bg-brand-tint px-3 py-1 text-[11px] font-bold text-brand-dark">
                  {todaysAppointments.length} today
                </span>
              </div>
              <ul className="flex flex-col gap-3">
                {todaysAppointments.map((a) => (
                  <li key={a.id} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-start gap-3.5">
                      <IconTile icon={<CategoryIcon category={a.offering.test.category} width={20} height={20} />} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/lab/appointments/${a.id}`} className="font-bold text-brand hover:underline">
                            {a.patient.name}
                          </Link>
                          <StatusBadge status={a.status} />
                        </div>
                        <p className="text-[12.5px] text-ink-faint">
                          {a.offering.test.name} · {a.slotDatetime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    {(a.status === "BOOKED" || a.status === "SAMPLE_COLLECTED" || a.status === "IN_PROGRESS") && (
                      <div className="mt-3 flex justify-end border-t border-border pt-3">
                        {a.status === "BOOKED" && (
                          <QueueActionForm action={markSampleCollected} appointmentId={a.id} label="Mark collected" />
                        )}
                        {a.status === "SAMPLE_COLLECTED" && (
                          <QueueActionForm action={advanceStatus} appointmentId={a.id} label="Advance" />
                        )}
                        {a.status === "IN_PROGRESS" && (
                          <QueueActionForm action={advanceStatus} appointmentId={a.id} label="Complete" />
                        )}
                      </div>
                    )}
                  </li>
                ))}
                {todaysAppointments.length === 0 && (
                  <EmptyState icon={<CalendarIcon width={22} height={22} />} message="No appointments today." />
                )}
              </ul>
            </Card>

            <Card className="flex flex-col gap-3">
              <CardHeading>Upcoming later</CardHeading>
              <ul className="flex flex-col divide-y divide-border">
                {upcomingAppointments.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
                    <IconTile icon={<CategoryIcon category={a.offering.test.category} width={20} height={20} />} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/lab/appointments/${a.id}`} className="font-bold text-brand hover:underline">
                          {a.patient.name}
                        </Link>
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="text-[12px] text-ink-faint">
                        {a.offering.test.name} · {a.slotDatetime.toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
                {upcomingAppointments.length === 0 && (
                  <EmptyState icon={<CalendarIcon width={22} height={22} />} message="Nothing scheduled beyond today." />
                )}
              </ul>
              {upcomingAppointments.length > 8 && (
                <p className="text-[12px] font-medium text-ink-faint">Showing next 8 of {upcomingAppointments.length} upcoming appointments.</p>
              )}
            </Card>
          </div>
    </DashboardShell>
  );
}
