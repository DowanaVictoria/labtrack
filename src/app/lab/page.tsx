import Link from "next/link";
import { requireTenantSession } from "@/lib/session";
import { markSampleCollected, advanceStatus } from "@/app/actions/queue";
import { labNav } from "@/app/lab/nav";
import { QueueActionForm } from "@/app/lab/queue-action-form";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeading } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { PageShell } from "@/components/ui/page-shell";
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

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
    <PageShell maxWidth="max-w-3xl">
      <AppHeader
        title={`${lab?.name ?? "Lab"} — Dashboard`}
        role={session.user.role}
        navLinks={links}
        profileLinks={profileLinks}
      />

      {banner && <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${banner.className}`}>{banner.text}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Active offerings", value: activeOfferingCount },
          { label: "Today's appointments", value: todaysAppointments.length },
          { label: "Total appointments", value: totalAppointmentCount },
          { label: "Completed", value: completedCount },
        ].map((stat) => (
          <Card key={stat.label} className="flex flex-col gap-1 p-4">
            <span className="text-2xl font-bold text-foreground">{stat.value}</span>
            <span className="text-[10px] font-bold tracking-widest text-ink-faint uppercase">{stat.label}</span>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-3">
        <CardHeading>Today&apos;s queue</CardHeading>
        <ul className="flex flex-col divide-y divide-border">
          {todaysAppointments.map((a) => (
            <li key={a.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
              <IconTile>{initials(a.offering.test.name)}</IconTile>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/lab/appointments/${a.id}`} className="font-bold text-brand hover:underline">
                    {a.patient.name}
                  </Link>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-[12px] text-ink-faint">
                  {a.offering.test.name} · {a.slotDatetime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {a.status === "BOOKED" && (
                <QueueActionForm action={markSampleCollected} appointmentId={a.id} label="Mark collected" />
              )}
              {a.status === "SAMPLE_COLLECTED" && <QueueActionForm action={advanceStatus} appointmentId={a.id} label="Advance" />}
              {a.status === "IN_PROGRESS" && <QueueActionForm action={advanceStatus} appointmentId={a.id} label="Complete" />}
            </li>
          ))}
          {todaysAppointments.length === 0 && <li className="py-4 text-center text-sm text-ink-faint">No appointments today.</li>}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardHeading>Upcoming (later)</CardHeading>
        <ul className="flex flex-col divide-y divide-border">
          {upcomingAppointments.map((a) => (
            <li key={a.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
              <IconTile>{initials(a.offering.test.name)}</IconTile>
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
            <li className="py-4 text-center text-sm text-ink-faint">Nothing scheduled beyond today.</li>
          )}
        </ul>
      </Card>
    </PageShell>
  );
}
