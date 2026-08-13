import { requirePatientSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Card, CardHeading } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export default async function PatientAccountPage() {
  const { session } = await requirePatientSession();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  return (
    <PageShell maxWidth="max-w-lg">
      <AppHeader
        title="Your profile"
        role={session.user.role}
        navLinks={[{ href: "/patient", label: "Find a test" }]}
        profileLinks={[{ href: "/patient/account", label: "Your profile" }]}
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
    </PageShell>
  );
}
