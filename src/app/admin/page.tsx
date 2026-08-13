import { requirePlatformAdminSession } from "@/lib/session";
import { approveLab, rejectLab, suspendLab, reinstateLab } from "@/app/actions/labs";
import { LabActionForm } from "@/app/admin/lab-action-form";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeading } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { PageShell } from "@/components/ui/page-shell";
import { StatusBadge } from "@/components/ui/badge";

const ACTIVITY_STYLES: Record<string, string> = {
  APPROVE_LAB: "bg-ok-tint text-ok",
  REJECT_LAB: "bg-danger-tint text-danger",
  SUSPEND_LAB: "bg-danger-tint text-danger",
  REINSTATE_LAB: "bg-ok-tint text-ok",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

// unscopedForPlatformAdmin() inside requirePlatformAdminSession() is the one
// deliberate, greppable bypass of tenant-scoping (docs/System_Design.md §2)
// — appropriate here because platform-wide lab approval is inherently
// cross-tenant, not an accidental default.
export default async function PlatformAdminPage() {
  const { session, db } = await requirePlatformAdminSession();

  const [pendingLabs, reviewedLabs, testCount, approvedLabCount, totalAppointmentCount, completedAppointmentCount, auditLogs] =
    await Promise.all([
      db.lab.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
      db.lab.findMany({ where: { status: { in: ["APPROVED", "REJECTED", "SUSPENDED"] } }, orderBy: { createdAt: "desc" } }),
      // FR25 (docs/SRS.md §5): platform-wide operational stats (labs, bookings, tests).
      // Test itself is fixed seeded platform data (SRS.md §5 FR23 change note) —
      // this is a read-only count for visibility, not catalog management.
      db.test.count(),
      db.lab.count({ where: { status: "APPROVED" } }),
      db.appointment.count(),
      db.appointment.count({ where: { status: "COMPLETED" } }),
      // NFR10 (docs/SRS.md §5): recent platform-admin actions, auditable.
      db.auditLog.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true } }, targetLab: { select: { name: true } } },
      }),
    ]);

  return (
    <PageShell maxWidth="max-w-3xl">
      <AppHeader
        title="Platform Admin"
        role={session.user.role}
        navLinks={[{ href: "/admin", label: "Dashboard" }]}
        profileLinks={[{ href: "/admin/account", label: "Your profile" }]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Approved labs", value: approvedLabCount },
          { label: "Pending review", value: pendingLabs.length },
          { label: "Total bookings", value: totalAppointmentCount },
          { label: "Completed bookings", value: completedAppointmentCount },
          { label: "Tests in catalog", value: testCount },
        ].map((stat) => (
          <Card key={stat.label} className="flex flex-col gap-1 p-4">
            <span className="text-xl font-bold text-foreground">{stat.value}</span>
            <span className="text-[10px] font-bold tracking-widest text-ink-faint uppercase">{stat.label}</span>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-3">
        <CardHeading>Pending lab registrations</CardHeading>
        <ul className="flex flex-col divide-y divide-border">
          {pendingLabs.map((lab) => (
            <li key={lab.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
              <IconTile>Lab</IconTile>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">{lab.name}</p>
                <p className="text-[12px] text-ink-faint">{lab.city}</p>
              </div>
              <div className="flex gap-2">
                <LabActionForm action={approveLab} labId={lab.id} label="Approve" />
                <LabActionForm action={rejectLab} labId={lab.id} label="Reject" variant="danger" />
              </div>
            </li>
          ))}
          {pendingLabs.length === 0 && <li className="py-4 text-center text-sm text-ink-faint">No pending labs.</li>}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardHeading>Reviewed labs</CardHeading>
        <ul className="flex flex-col divide-y divide-border">
          {reviewedLabs.map((lab) => (
            <li key={lab.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
              <IconTile>{initials(lab.name)}</IconTile>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-foreground">{lab.name}</span>
                  <StatusBadge status={lab.status} />
                </div>
                <p className="text-[12px] text-ink-faint">{lab.city}</p>
              </div>
              {lab.status === "APPROVED" && (
                <LabActionForm action={suspendLab} labId={lab.id} label="Suspend" variant="danger" />
              )}
              {lab.status === "SUSPENDED" && <LabActionForm action={reinstateLab} labId={lab.id} label="Reinstate" />}
            </li>
          ))}
          {reviewedLabs.length === 0 && <li className="py-4 text-center text-sm text-ink-faint">No reviewed labs yet.</li>}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardHeading>Recent activity</CardHeading>
        <ul className="flex flex-col divide-y divide-border">
          {auditLogs.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
              <IconTile className={ACTIVITY_STYLES[entry.action] ?? "bg-brand-tint text-brand-dark"}>
                {entry.action.startsWith("APPROVE") || entry.action.startsWith("REINSTATE") ? "OK" : "!"}
              </IconTile>
              <div className="min-w-0 flex-1">
                <p>
                  <span className="font-bold text-foreground">{ACTION_LABELS[entry.action] ?? entry.action}</span>{" "}
                  <span className="text-ink-soft">{entry.targetLab.name}</span>
                </p>
                <p className="text-[11.5px] text-ink-faint">
                  {entry.actor.name} · {entry.createdAt.toLocaleString()}
                </p>
              </div>
            </li>
          ))}
          {auditLogs.length === 0 && <li className="py-4 text-center text-sm text-ink-faint">No admin actions logged yet.</li>}
        </ul>
      </Card>
    </PageShell>
  );
}

const ACTION_LABELS: Record<string, string> = {
  APPROVE_LAB: "Approved",
  REJECT_LAB: "Rejected",
  SUSPEND_LAB: "Suspended",
  REINSTATE_LAB: "Reinstated",
};
