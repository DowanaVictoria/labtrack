import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";

// Rendered whenever src/lib/session.ts calls forbidden() — an authenticated
// session with the wrong role for the page/action it just tried to reach
// (e.g. a lab_admin hitting /admin). Next.js returns a real 403 for this.
export default function Forbidden() {
  return (
    <PageShell maxWidth="max-w-sm" centered>
      <div className="flex flex-col items-center gap-2">
        <span className="text-[11px] font-bold tracking-widest text-danger uppercase">403 — Forbidden</span>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Access denied</h1>
        <p className="text-sm text-ink-faint">Your account doesn&apos;t have access to this page.</p>
      </div>
      <Link href="/" className={buttonClasses("secondary")}>
        Back to home
      </Link>
    </PageShell>
  );
}
