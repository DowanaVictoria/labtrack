import { requireTenantSession } from "@/lib/session";
import { labNav } from "@/app/lab/nav";
import { EditLabProfileForm } from "@/app/lab/edit-lab-profile-form";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeading } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { StatusBadge } from "@/components/ui/badge";

export default async function LabProfilePage() {
  const { session, db } = await requireTenantSession();
  const lab = await db.lab.findUnique({ where: { id: session.user.labId! } });
  const { links, profileLinks } = labNav(session.user.role);

  return (
    <PageShell maxWidth="max-w-lg">
      <AppHeader
        title="Lab profile"
        role={session.user.role}
        navLinks={links}
        profileLinks={profileLinks}
      />

      <Card className="flex flex-col gap-4">
        {session.user.role === "LAB_ADMIN" && lab ? (
          <>
            <CardHeading>Edit lab profile</CardHeading>
            <EditLabProfileForm name={lab.name} address={lab.address} city={lab.city} contactEmail={lab.contactEmail} />
          </>
        ) : (
          lab && (
            <>
              <div className="flex items-center justify-between">
                <CardHeading>Lab details</CardHeading>
                <StatusBadge status={lab.status} />
              </div>
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                <dt className="text-ink-faint">Name</dt>
                <dd className="text-right font-bold text-foreground">{lab.name}</dd>
                <dt className="text-ink-faint">Address</dt>
                <dd className="text-right font-medium text-foreground">{lab.address}</dd>
                <dt className="text-ink-faint">City</dt>
                <dd className="text-right font-medium text-foreground">{lab.city}</dd>
                <dt className="text-ink-faint">Contact email</dt>
                <dd className="text-right font-medium text-foreground">{lab.contactEmail}</dd>
              </dl>
              <p className="text-[12px] text-ink-faint">Only a lab admin can edit this profile.</p>
            </>
          )
        )}
      </Card>
    </PageShell>
  );
}
