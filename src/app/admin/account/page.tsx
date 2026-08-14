import { requirePlatformAdminSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Card, CardHeading } from "@/components/ui/card";
import { DashboardShell } from "@/components/ui/dashboard-shell";

const ADMIN_NAV = [{ href: "/admin", label: "Dashboard" }];
const ADMIN_PROFILE_NAV = [{ href: "/admin/account", label: "Your profile" }];

export default async function AdminAccountPage() {
  const { session, db } = await requirePlatformAdminSession();
  const user = await db.user.findUnique({ where: { id: session.user.id } });

  return (
    <DashboardShell links={ADMIN_NAV} profileLinks={ADMIN_PROFILE_NAV}>
          <AppHeader
            title="Your profile"
            role={session.user.role}
            navLinks={ADMIN_NAV}
            profileLinks={ADMIN_PROFILE_NAV}
            hideNavAtLg
          />

          <Card className="flex flex-col gap-4">
            <CardHeading>Account details</CardHeading>
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-ink-faint">Name</dt>
              <dd className="text-right font-bold text-foreground">{user?.name}</dd>
              <dt className="text-ink-faint">Email</dt>
              <dd className="text-right font-medium text-foreground">{user?.email}</dd>
              <dt className="text-ink-faint">Role</dt>
              <dd className="text-right font-medium text-foreground">{session.user.role.replaceAll("_", " ")}</dd>
            </dl>
          </Card>

          <Card className="flex flex-col gap-4">
            <CardHeading>Change password</CardHeading>
            <ChangePasswordForm />
          </Card>
    </DashboardShell>
  );
}
