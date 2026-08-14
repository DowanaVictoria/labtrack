import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { requirePatientSession } from "@/lib/session";
import { CancelAppointmentForm } from "@/app/patient/cancel-appointment-form";
import { MarketplaceHeader } from "@/components/marketplace-header";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeading } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildingIcon, CalendarIcon, CategoryIcon } from "@/components/ui/icons";
import { IconTile } from "@/components/ui/icon-tile";
import { PageShell } from "@/components/ui/page-shell";
import { StatusBadge } from "@/components/ui/badge";
import { formatGHS, formatTurnaround } from "@/lib/format";

/**
 * The "My appointments" dashboard, moved out of the now-public `/patient`
 * (UI_REDESIGN_PLAN.md §3/§4.4) — gated, unchanged in substance from what
 * used to live on `/patient` before the split, restyled with a StatTile row.
 */
export default async function PatientAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string }>;
}) {
  const { session, db } = await requirePatientSession();
  const { booked } = await searchParams;

  const appointments = await db.appointment.findMany({
    include: { lab: true, offering: { include: { test: true } } },
    orderBy: { slotDatetime: "desc" },
  });

  const now = new Date();
  const upcomingAppointments = appointments
    .filter((a) => a.status === "BOOKED" && a.slotDatetime >= now)
    .sort((a, b) => a.slotDatetime.getTime() - b.slotDatetime.getTime());
  const historyAppointments = appointments.filter((a) => !upcomingAppointments.some((upcoming) => upcoming.id === a.id));
  const upcomingCount = upcomingAppointments.length;
  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;
  const cancelledCount = appointments.filter((a) => a.status === "CANCELLED").length;

  return (
    <div className="flex min-h-full flex-col">
      <MarketplaceHeader session={session} />

      <section className="bg-[#08251f] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 sm:px-8">
          <div>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide uppercase text-white/80">
              Patient workspace
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-balance">My appointments</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Track upcoming bookings, review past visits, and cancel appointments that are still open.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/15 bg-white/10 p-4">
              <p className="text-2xl font-bold">{upcomingCount}</p>
              <p className="text-[11px] font-bold tracking-wide text-white/60 uppercase">Upcoming</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-4">
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-[11px] font-bold tracking-wide text-white/60 uppercase">Completed</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-4">
              <p className="text-2xl font-bold">{cancelledCount}</p>
              <p className="text-[11px] font-bold tracking-wide text-white/60 uppercase">Cancelled</p>
            </div>
          </div>
        </div>
      </section>

      <PageShell maxWidth="max-w-6xl">
        {booked && (
          <div className="rounded-lg border border-ok bg-ok-tint px-4 py-3 text-sm font-medium text-ok">Appointment booked.</div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_0.8fr]">
          <AppointmentsPanel
            title="Upcoming bookings"
            appointments={upcomingAppointments}
            emptyMessage="No upcoming appointments."
            showCancel
          />
          <AppointmentsPanel
            title="History"
            appointments={historyAppointments}
            emptyMessage="No appointment history yet."
          />
        </div>

        {appointments.length === 0 && (
          <EmptyState
            icon={<CalendarIcon width={24} height={24} />}
            message="No appointments yet."
            cta={
              <Link href="/" className={buttonClasses("secondary", "sm")}>
                Find a test
              </Link>
            }
          />
        )}
      </PageShell>
    </div>
  );
}

type AppointmentItem = Prisma.AppointmentGetPayload<{
  include: { lab: true; offering: { include: { test: true } } };
}>;

function AppointmentsPanel({
  title,
  appointments,
  emptyMessage,
  showCancel = false,
}: {
  title: string;
  appointments: AppointmentItem[];
  emptyMessage: string;
  showCancel?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeading>{title}</CardHeading>
      <ul className="flex flex-col divide-y divide-border">
        {appointments.map((a) => (
          <li key={a.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3.5">
              <IconTile icon={<CategoryIcon category={a.offering.test.category} width={20} height={20} />} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-foreground">{a.offering.test.name}</span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-0.5 text-[12.5px] text-ink-faint">{a.slotDatetime.toLocaleString()}</p>
              </div>
              {showCancel && a.status === "BOOKED" && <CancelAppointmentForm appointmentId={a.id} />}
            </div>

            <div className="grid grid-cols-1 gap-2 rounded-lg bg-background p-3 text-[12.5px] sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <BuildingIcon width={15} height={15} className="text-brand" />
                <span className="truncate font-medium text-foreground">{a.lab.name}</span>
              </div>
              <span className="font-medium text-ink-soft">{formatGHS(a.offering.price)}</span>
              <span className="font-medium text-ink-soft">{formatTurnaround(a.offering.turnaroundHours)} turnaround</span>
            </div>
          </li>
        ))}
        {appointments.length === 0 && <EmptyState icon={<CalendarIcon width={22} height={22} />} message={emptyMessage} />}
      </ul>
    </Card>
  );
}
