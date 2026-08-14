import { requirePatientSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MarketplaceHeader } from "@/components/marketplace-header";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Card, CardHeading } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export default async function PatientAccountPage() {
  const { session } = await requirePatientSession();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  return (
    <div className="flex min-h-full flex-col">
      <MarketplaceHeader session={session} />

      <section className="bg-[#08251f] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide uppercase text-white/80">
            Patient workspace
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Your profile</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
            Manage your MediLab account details and password.
          </p>
        </div>
      </section>

      <PageShell maxWidth="max-w-4xl">
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[0.8fr_1fr]">
          <Card className="flex flex-col gap-4">
            <CardHeading>Account details</CardHeading>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">Name</dt>
                <dd className="mt-1 font-bold text-foreground">{user?.name}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">Email</dt>
                <dd className="mt-1 font-medium text-foreground">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">Role</dt>
                <dd className="mt-1 font-medium text-foreground">{session.user.role.replaceAll("_", " ")}</dd>
              </div>
            </dl>
          </Card>

          <Card className="flex flex-col gap-4">
            <CardHeading>Change password</CardHeading>
            <ChangePasswordForm />
          </Card>
        </div>
      </PageShell>
    </div>
  );
}
