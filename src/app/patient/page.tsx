import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePatientSession } from "@/lib/session";
import { CancelAppointmentForm } from "@/app/patient/cancel-appointment-form";
import { AppHeader } from "@/components/app-header";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeading } from "@/components/ui/card";
import { fieldClasses } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon-tile";
import { PageShell } from "@/components/ui/page-shell";
import { StatusBadge } from "@/components/ui/badge";

// docs/SRS.md §8: "Location matching is by city/text field, not real
// geocoding, for the initial release" — the city filter below is a plain
// case-insensitive contains, not a distance/geocoding lookup.
const SORT_OPTIONS = {
  price_asc: { label: "Price: low to high", orderBy: { price: "asc" as const } },
  price_desc: { label: "Price: high to low", orderBy: { price: "desc" as const } },
  turnaround_asc: { label: "Turnaround: fastest first", orderBy: { turnaroundHours: "asc" as const } },
  turnaround_desc: { label: "Turnaround: slowest first", orderBy: { turnaroundHours: "desc" as const } },
};
type SortKey = keyof typeof SORT_OPTIONS;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

// Cross-tenant search is the platform's core feature (docs/System_Design.md
// §2/§7), so this reads the base `prisma` client directly rather than a
// scoped one — filtered by business rules (approved labs, active offerings)
// instead of by a single tenant. Only the Appointment queries below go
// through `db`, the patient-scoped client from requirePatientSession().
export default async function PatientPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; sort?: string; booked?: string }>;
}) {
  const { session, db } = await requirePatientSession();
  const { q, city, sort: sortParam, booked } = await searchParams;
  const sort: SortKey = sortParam && sortParam in SORT_OPTIONS ? (sortParam as SortKey) : "price_asc";

  const offerings = await prisma.labTestOffering.findMany({
    where: {
      active: true,
      lab: {
        status: "APPROVED",
        ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      },
      ...(q
        ? {
            test: {
              OR: [{ name: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }],
            },
          }
        : {}),
    },
    include: { lab: true, test: true },
    orderBy: SORT_OPTIONS[sort].orderBy,
  });

  const appointments = await db.appointment.findMany({
    include: { lab: true, offering: { include: { test: true } } },
    orderBy: { slotDatetime: "desc" },
  });

  return (
    <PageShell maxWidth="max-w-3xl">
      <AppHeader
        title="Find a test"
        role={session.user.role}
        navLinks={[{ href: "/patient", label: "Find a test" }]}
        profileLinks={[{ href: "/patient/account", label: "Your profile" }]}
      />

      {booked && (
        <div className="rounded-xl border border-ok bg-ok-tint px-4 py-3 text-sm font-medium text-ok">Appointment booked.</div>
      )}

      <Card className="flex flex-col gap-4">
        <form method="GET" className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by test name or category (e.g. Lipid Panel, Blood)"
            className={`${fieldClasses} min-w-[200px] flex-1`}
          />
          <input name="city" defaultValue={city ?? ""} placeholder="City" className={`${fieldClasses} w-32`} />
          <select name="sort" defaultValue={sort} className={fieldClasses}>
            {Object.entries(SORT_OPTIONS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClasses("primary")}>
            Search
          </button>
        </form>

        <ul className="flex flex-col divide-y divide-border">
          {offerings.map((o) => (
            <li key={o.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
              <IconTile>{initials(o.test.name)}</IconTile>
              <div className="min-w-0 flex-1">
                <Link href={`/patient/labs/${o.lab.id}`} className="font-bold text-foreground hover:text-brand hover:underline">
                  {o.lab.name}
                </Link>
                <p className="text-[12px] text-ink-faint">
                  {o.test.name} · {o.lab.city} · {o.turnaroundHours}h turnaround
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="font-bold text-foreground">GHS {o.price.toString()}</span>
                <Link href={`/patient/book/${o.id}`} className={buttonClasses("secondary", "sm")}>
                  Book
                </Link>
              </div>
            </li>
          ))}
          {offerings.length === 0 && (
            <li className="py-4 text-center text-sm text-ink-faint">
              {q ? `No results for "${q}".` : "No offerings available."}
            </li>
          )}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardHeading>My appointments</CardHeading>
        <ul className="flex flex-col divide-y divide-border">
          {appointments.map((a) => (
            <li key={a.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
              <IconTile>Cal</IconTile>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-foreground">{a.lab.name}</span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-[12px] text-ink-faint">
                  {a.offering.test.name} · {a.slotDatetime.toLocaleString()}
                </p>
              </div>
              {a.status === "BOOKED" && <CancelAppointmentForm appointmentId={a.id} />}
            </li>
          ))}
          {appointments.length === 0 && <li className="py-4 text-center text-sm text-ink-faint">No appointments yet.</li>}
        </ul>
      </Card>
    </PageShell>
  );
}
