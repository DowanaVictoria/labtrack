"use client";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";

// Safety net for anything unhandled that reaches here — expected,
// communicable failures (invalid state transition, validation) are handled
// inline via useActionState in the relevant forms instead, so this is for
// genuine surprises, not routine "you can't do that right now" cases.
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <PageShell maxWidth="max-w-3xl" centered>
      <div className="w-full overflow-hidden rounded-lg border border-border bg-surface shadow-xl shadow-foreground/10">
        <div className="bg-[#08251f] px-6 py-8 text-white">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide uppercase text-white/75">
            Unexpected error
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">Something went wrong</h1>
          <p className="mt-2 text-sm leading-6 text-white/72">The page could not finish loading. Try again once.</p>
        </div>
        <div className="flex justify-end p-5">
          <Button onClick={() => retry()} variant="secondary">
            Try again
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
