import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/actions/auth";
import { Button, buttonClasses } from "@/components/ui/button";

const STEPS = [
  {
    n: "1",
    title: "Search",
    body: "Look up a test by name or category and see it laid out across every participating lab.",
  },
  {
    n: "2",
    title: "Compare",
    body: "Weigh price, location, and turnaround time side by side — pick whichever fits you best.",
  },
  {
    n: "3",
    title: "Book",
    body: "Reserve a slot directly with that lab, see prep instructions up front, then track status to results.",
  },
];

export default async function Home() {
  const session = await auth();

  const [approvedLabCount, tests] = await Promise.all([
    prisma.lab.count({ where: { status: "APPROVED" } }),
    prisma.test.findMany({
      include: {
        offerings: {
          where: { active: true, lab: { status: "APPROVED" } },
          select: { price: true },
          orderBy: { price: "asc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  const testCount = tests.length;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <span className="text-lg font-bold tracking-tight text-foreground">LabTrack</span>
          {session?.user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-[12.5px] text-ink-faint sm:inline">
                {session.user.email} · <span className="font-bold text-ink-soft">{session.user.role.replaceAll("_", " ")}</span>
              </span>
              <form action={logout}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className={buttonClasses("ghost", "sm")}>
                Sign in
              </Link>
              <Link href="/signup" className={buttonClasses("primary", "sm")}>
                Get started
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="bg-gradient-to-br from-brand to-brand-dark text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-8 sm:py-20">
            <span className="text-[11px] font-bold tracking-widest uppercase opacity-80">Multi-tenant lab marketplace</span>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Compare diagnostic labs. Book in minutes.
            </h1>
            <p className="max-w-lg text-sm opacity-85 sm:text-base">
              Search a test, see every participating lab&apos;s price, location, and turnaround side by side, then
              book directly — no phone calls.
            </p>

            {session?.user ? (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {(session.user.role === "LAB_STAFF" || session.user.role === "LAB_ADMIN") && (
                  <Link href="/lab" className={`${buttonClasses("primary")} !bg-white !text-brand-dark hover:!bg-white/90`}>
                    Go to lab dashboard
                  </Link>
                )}
                {session.user.role === "PLATFORM_ADMIN" && (
                  <Link href="/admin" className={`${buttonClasses("primary")} !bg-white !text-brand-dark hover:!bg-white/90`}>
                    Go to platform admin
                  </Link>
                )}
                {session.user.role === "PATIENT" && (
                  <Link href="/patient" className={`${buttonClasses("primary")} !bg-white !text-brand-dark hover:!bg-white/90`}>
                    Find a test
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link href="/signup" className={`${buttonClasses("primary")} !bg-white !text-brand-dark hover:!bg-white/90`}>
                  Sign up as a patient
                </Link>
                <Link href="/register" className="rounded-xl border-[1.5px] border-white/40 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">
                  Register your lab
                </Link>
              </div>
            )}

            <div className="mt-6 flex gap-10 border-t border-white/20 pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{approvedLabCount}</div>
                <div className="text-[10.5px] font-bold tracking-wide opacity-70 uppercase">Partner labs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{testCount}</div>
                <div className="text-[10.5px] font-bold tracking-wide opacity-70 uppercase">Tests listed</div>
              </div>
            </div>
          </div>
        </section>

        {testCount > 0 && (
          <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Tests you can book today</h2>
            <p className="mt-1 text-sm text-ink-faint">Pulled live from the current catalog — prices are the lowest active offering across approved labs.</p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {tests.map((t) => {
                const lowest = t.offerings[0]?.price;
                return (
                  <div key={t.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
                    <span className="w-fit rounded-full bg-brand-tint px-2.5 py-1 text-[10px] font-bold tracking-wide text-brand-dark uppercase">
                      {t.category}
                    </span>
                    <p className="text-base font-bold text-foreground">{t.name}</p>
                    <p className="text-sm text-ink-faint">{lowest ? <>from <span className="font-bold text-foreground">GHS {lowest.toString()}</span></> : "Price varies by lab"}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="bg-background">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
            <h2 className="text-xl font-bold tracking-tight text-foreground">How it works</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="flex flex-col gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">
                    {s.n}
                  </div>
                  <p className="font-bold text-foreground">{s.title}</p>
                  <p className="text-sm text-ink-faint">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {!session?.user && (
          <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-7">
                <p className="text-lg font-bold text-foreground">Looking for a test?</p>
                <p className="text-sm text-ink-faint">
                  Create a patient account to search, compare prices across labs, and book an appointment.
                </p>
                <Link href="/signup" className={`${buttonClasses("primary")} mt-1 w-fit`}>
                  Sign up as a patient
                </Link>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-7">
                <p className="text-lg font-bold text-foreground">Run a diagnostic lab?</p>
                <p className="text-sm text-ink-faint">
                  Register your lab to list your test offerings and reach patients searching the marketplace. A
                  platform admin reviews every new registration.
                </p>
                <Link href="/register" className={`${buttonClasses("secondary")} mt-1 w-fit`}>
                  Register your lab
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-[12.5px] text-ink-faint sm:flex-row sm:px-8">
          <span className="font-bold text-ink-soft">LabTrack</span>
          <span>Multi-tenant diagnostic lab marketplace &amp; appointment platform.</span>
        </div>
      </footer>
    </div>
  );
}
