import { requireTenantSession } from "@/lib/session";
import { labNav } from "@/app/lab/nav";
import { EditLabProfileForm } from "@/app/lab/edit-lab-profile-form";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeading } from "@/components/ui/card";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { StatusBadge } from "@/components/ui/badge";
import { BuildingIcon } from "@/components/ui/icons";
import { IconTile } from "@/components/ui/icon-tile";

export default async function LabProfilePage() {
  const { session, db } = await requireTenantSession();
  const lab = await db.lab.findUnique({
    where: { id: session.user.labId! },
    include: { offerings: { where: { active: true }, include: { test: true } } },
  });
  const { links, profileLinks } = labNav(session.user.role);

  // "Specialties" are derived, not stored (UI_REDESIGN_PLAN.md §0.3) — the
  // distinct Test.category values across this lab's active offerings.
  const specialties = lab ? Array.from(new Set(lab.offerings.map((o) => o.test.category))).sort() : [];

  return (
    <DashboardShell links={links} profileLinks={profileLinks}>
          <AppHeader title="Lab profile" role={session.user.role} navLinks={links} profileLinks={profileLinks} hideNavAtLg />

          {lab && (
            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[0.75fr_1.25fr]">
              <Card className="overflow-hidden p-0">
                <div className="bg-[#08251f] p-5 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <IconTile icon={<BuildingIcon width={22} height={22} />} className="bg-white text-brand-dark" />
                    <StatusBadge status={lab.status} />
                  </div>
                  <h2 className="mt-5 text-2xl font-bold tracking-tight text-balance">{lab.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    {lab.address}, {lab.city}
                  </p>
                </div>
                <div className="flex flex-col gap-4 p-5">
                  <div>
                    <CardHeading>Public listing</CardHeading>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      {lab.description ?? "Add a short description so patients understand what this lab offers."}
                    </p>
                  </div>
                  <dl className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">Contact</dt>
                      <dd className="mt-1 font-medium text-foreground">{lab.contactEmail}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">Hours</dt>
                      <dd className="mt-1 font-medium text-foreground">{lab.operatingHours ?? "Not listed"}</dd>
                    </div>
                  </dl>
                  {specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-t border-border pt-4">
                      {specialties.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-brand-tint px-2.5 py-1 text-[10px] font-bold tracking-wide text-brand-dark uppercase"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="flex flex-col gap-4">
                {session.user.role === "LAB_ADMIN" ? (
                  <>
                    <div>
                      <CardHeading>Edit lab profile</CardHeading>
                      <p className="mt-1 text-sm text-ink-faint">
                        These details appear on your public MediLab profile and search cards.
                      </p>
                    </div>
                    <EditLabProfileForm
                      name={lab.name}
                      address={lab.address}
                      city={lab.city}
                      contactEmail={lab.contactEmail}
                      description={lab.description}
                      operatingHours={lab.operatingHours}
                    />
                  </>
                ) : (
                  <>
                    <CardHeading>Profile editing</CardHeading>
                    <p className="text-sm text-ink-faint">Only a lab admin can edit this profile.</p>
                  </>
                )}
              </Card>
              </div>
          )}
    </DashboardShell>
  );
}
