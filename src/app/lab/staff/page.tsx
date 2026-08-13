import { forbidden } from "next/navigation";
import { requireTenantSession } from "@/lib/session";
import { labNav } from "@/app/lab/nav";
import { AddStaffForm } from "@/app/lab/staff/add-staff-form";
import { RemoveStaffForm } from "@/app/lab/staff/remove-staff-form";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeading } from "@/components/ui/card";
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
    <PageShell maxWidth="max-w-2xl">
      <AppHeader
        title="Staff accounts"
        role={session.user.role}
        navLinks={links}
        profileLinks={profileLinks}
      />

      <Card className="flex flex-col gap-4">
        <CardHeading>Current staff</CardHeading>
        <ul className="flex flex-col divide-y divide-border">
          {staff.map((s) => (
            <li key={s.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
              <IconTile>{initials(s.name)}</IconTile>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">{s.name}</p>
                <p className="text-[12px] text-ink-faint">{s.email}</p>
              </div>
              <RemoveStaffForm staffId={s.id} />
            </li>
          ))}
          {staff.length === 0 && <li className="py-4 text-center text-sm text-ink-faint">No staff accounts yet.</li>}
        </ul>
        <div className="border-t border-border pt-4">
          <AddStaffForm />
        </div>
      </Card>
    </PageShell>
  );
}
