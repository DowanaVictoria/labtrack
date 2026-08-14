import { requirePlatformAdminSession } from "@/lib/session";
import { approveLab, rejectLab, suspendLab, reinstateLab } from "@/app/actions/labs";
import { LabActionForm } from "@/app/admin/lab-action-form";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeading } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildingIcon, CalendarIcon, FlaskIcon } from "@/components/ui/icons";
import { IconTile, type IconTileTone } from "@/components/ui/icon-tile";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusBadge } from "@/components/ui/badge";

const ACTIVITY_TONE: Record<string, IconTileTone> = {
  APPROVE_LAB: "ok",
  REJECT_LAB: "danger",
  SUSPEND_LAB: "danger",
  REINSTATE_LAB: "ok",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

const ADMIN_NAV = [{ href: "/admin", label: "Dashboard" }];
const ADMIN_PROFILE_NAV = [{ href: "/admin/account", label: "Your profile" }];

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
      // Test is now per-lab (SRS.md FR28 change note) — this counts every lab's
      // own private catalog entries combined, not one shared catalog's size.
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
    <DashboardShell links={ADMIN_NAV} profileLinks={ADMIN_PROFILE_NAV}>
          <AppHeader
            title="Platform Admin"
            role={session.user.role}
            navLinks={ADMIN_NAV}
            profileLinks={ADMIN_PROFILE_NAV}
            hideNavAtLg
          />

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <StatTile icon={<BuildingIcon width={20} height={20} />} value={approvedLabCount} label="Approved labs" />
            <StatTile value={pendingLabs.length} label="Pending review" tone="gold" />
            <StatTile
              icon={<CalendarIcon width={20} height={20} />}
              value={totalAppointmentCount}
              label="Total bookings"
              tone="purple"
            />
            <StatTile value={completedAppointmentCount} label="Completed bookings" tone="ok" />
            <StatTile icon={<FlaskIcon width={20} height={20} />} value={testCount} label="Tests across all labs" />
          </div>

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardHeading>Pending lab registrations</CardHeading>
                  <p className="mt-1 text-sm text-ink-faint">Review provider applications before they become visible to patients.</p>
                </div>
                <span className="rounded-full bg-gold-tint px-3 py-1 text-[11px] font-bold text-gold">
                  {pendingLabs.length} waiting
                </span>
              </div>
              <ul className="flex flex-col gap-3">
                {pendingLabs.map((lab) => (
                  <li key={lab.id} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-start gap-3.5">
                      <IconTile icon={<BuildingIcon width={20} height={20} />} tone="gold" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground">{lab.name}</p>
                        <p className="text-[12.5px] text-ink-faint">
                          {lab.city} · {lab.contactEmail}
                        </p>
                        <p className="mt-1 text-[11.5px] text-ink-faint">Submitted {lab.createdAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                      <LabActionForm action={approveLab} labId={lab.id} label="Approve" />
                      <LabActionForm action={rejectLab} labId={lab.id} label="Reject" variant="danger" />
                    </div>
                  </li>
                ))}
                {pendingLabs.length === 0 && <EmptyState message="No pending labs." />}
              </ul>
            </Card>

            <Card className="flex flex-col gap-3">
              <CardHeading>Recent activity</CardHeading>
              <ul className="flex flex-col divide-y divide-border">
                {auditLogs.slice(0, 8).map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
                    <IconTile tone={ACTIVITY_TONE[entry.action] ?? "brand"}>
                      {entry.action.startsWith("APPROVE") || entry.action.startsWith("REINSTATE") ? "OK" : "!"}
                    </IconTile>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-bold text-foreground">{ACTION_LABELS[entry.action] ?? entry.action}</span>{" "}
                        <span className="text-ink-soft">{entry.targetLab.name}</span>
                      </p>
                      <p className="text-[11.5px] text-ink-faint">
                        {entry.actor.name} · {entry.createdAt.toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
                {auditLogs.length === 0 && <EmptyState message="No admin actions logged yet." />}
              </ul>
            </Card>
          </div>

          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardHeading>Reviewed labs</CardHeading>
                <p className="mt-1 text-sm text-ink-faint">Approved, rejected, and suspended providers across the marketplace.</p>
              </div>
              <span className="text-[12px] font-bold text-ink-faint">{reviewedLabs.length} reviewed</span>
            </div>
            <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {reviewedLabs.map((lab) => (
                <li key={lab.id} className="flex items-center gap-3.5 rounded-lg border border-border bg-background p-3">
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
              {reviewedLabs.length === 0 && <EmptyState message="No reviewed labs yet." />}
            </ul>
          </Card>
    </DashboardShell>
  );
}

const ACTION_LABELS: Record<string, string> = {
  APPROVE_LAB: "Approved",
  REJECT_LAB: "Rejected",
  SUSPEND_LAB: "Suspended",
  REINSTATE_LAB: "Reinstated",
};
