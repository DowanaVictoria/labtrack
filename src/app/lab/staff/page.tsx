import { forbidden } from "next/navigation";
import { requireTenantSession } from "@/lib/session";
import { labNav } from "@/app/lab/nav";
import { AddStaffForm } from "@/app/lab/staff/add-staff-form";
import { RemoveStaffForm } from "@/app/lab/staff/remove-staff-form";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeading } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTile } from "@/components/ui/icon-tile";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { StatusBadge } from "@/components/ui/badge";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

// FR19 (docs/SRS.md §5) — LAB_ADMIN only.
export default async function StaffPage() {
  const { session, db } = await requireTenantSession();
  if (session.user.role !== "LAB_ADMIN") forbidden();

  const staff = await db.user.findMany({
    where: { role: "LAB_STAFF" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const { links, profileLinks } = labNav(session.user.role);

  return (
    <DashboardShell links={links} profileLinks={profileLinks}>
          <AppHeader title="Staff accounts" role={session.user.role} navLinks={links} profileLinks={profileLinks} hideNavAtLg />

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardHeading>Current staff</CardHeading>
                  <p className="mt-1 text-sm text-ink-faint">People who can access your lab queue and update appointments.</p>
                </div>
                <span className="rounded-full bg-brand-tint px-3 py-1 text-[11px] font-bold text-brand-dark">
                  {staff.length} staff
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {staff.map((s) => (
                  <li key={s.id} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-start gap-3.5">
                      <IconTile>{initials(s.name)}</IconTile>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-foreground">{s.name}</p>
                          <StatusBadge status="LAB_STAFF" />
                        </div>
                        <p className="text-[12.5px] text-ink-faint">{s.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end border-t border-border pt-3">
                      <RemoveStaffForm staffId={s.id} />
                    </div>
                  </li>
                ))}
                {staff.length === 0 && <EmptyState message="No staff accounts yet." />}
              </ul>
            </Card>

            <Card className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-5">
              <div>
                <CardHeading>Add staff</CardHeading>
                <p className="mt-1 text-sm text-ink-faint">Create a staff login for queue and appointment operations.</p>
              </div>
              <AddStaffForm />
            </Card>
          </div>
    </DashboardShell>
  );
}
