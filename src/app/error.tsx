"use client";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";

// Safety net for anything unhandled that reaches here — expected,
// communicable failures (invalid state transition, validation) are handled
// inline via useActionState in the relevant forms instead, so this is for
// genuine surprises, not routine "you can't do that right now" cases.
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <PageShell maxWidth="max-w-sm" centered>
      <div className="flex flex-col items-center gap-2">
        <span className="text-[11px] font-bold tracking-widest text-gold uppercase">Unexpected error</span>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Something went wrong</h1>
        <p className="text-sm text-ink-faint">An unexpected error occurred. You can try again.</p>
      </div>
      <Button onClick={() => retry()} variant="secondary">
        Try again
      </Button>
    </PageShell>
  );
}
