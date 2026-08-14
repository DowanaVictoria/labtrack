import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";

// Rendered whenever src/lib/session.ts calls forbidden() — an authenticated
// session with the wrong role for the page/action it just tried to reach
// (e.g. a lab_admin hitting /admin). Next.js returns a real 403 for this.
export default function Forbidden() {
  return (
    <PageShell maxWidth="max-w-3xl" centered>
      <div className="w-full overflow-hidden rounded-lg border border-border bg-surface shadow-xl shadow-foreground/10">
        <div className="bg-[#08251f] px-6 py-8 text-white">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide uppercase text-white/75">
            403 Forbidden
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">Access denied</h1>
          <p className="mt-2 text-sm leading-6 text-white/72">Your account does not have permission to view this workspace.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-left">
          <p className="text-sm text-ink-faint">Use the account menu to sign into the correct MediLab role.</p>
          <Link href="/" className={buttonClasses("secondary")}>
            Back to home
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
