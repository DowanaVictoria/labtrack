import { requireTenantSession } from "@/lib/session";
import { labNav } from "@/app/lab/nav";
import { AppHeader } from "@/components/app-header";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Card, CardHeading } from "@/components/ui/card";
import { DashboardShell } from "@/components/ui/dashboard-shell";

export default async function LabAccountPage() {
  const { session, db } = await requireTenantSession();
  const [user, lab] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id } }),
    db.lab.findUnique({ where: { id: session.user.labId! } }),
  ]);
  const { links, profileLinks } = labNav(session.user.role);

  return (
    <DashboardShell links={links} profileLinks={profileLinks}>
          <AppHeader title="Your profile" role={session.user.role} navLinks={links} profileLinks={profileLinks} hideNavAtLg />

          <Card className="flex flex-col gap-4">
            <CardHeading>Account details</CardHeading>
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-ink-faint">Name</dt>
              <dd className="text-right font-bold text-foreground">{user?.name}</dd>
              <dt className="text-ink-faint">Email</dt>
              <dd className="text-right font-medium text-foreground">{user?.email}</dd>
              <dt className="text-ink-faint">Role</dt>
              <dd className="text-right font-medium text-foreground">{session.user.role.replaceAll("_", " ")}</dd>
              <dt className="text-ink-faint">Lab</dt>
              <dd className="text-right font-medium text-foreground">{lab?.name}</dd>
            </dl>
          </Card>

          <Card className="flex flex-col gap-4">
            <CardHeading>Change password</CardHeading>
            <ChangePasswordForm />
          </Card>
    </DashboardShell>
  );
}
