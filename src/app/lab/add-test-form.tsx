"use client";

import { useActionState, useRef, useEffect } from "react";
import { createTest } from "@/app/actions/tests";
import { Button } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/field";

const compactLabel = "flex flex-col gap-1 text-[10.5px] font-bold tracking-widest text-ink-faint uppercase";

export function AddTestForm() {
  const [error, action, pending] = useActionState(createTest, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <details className="rounded-xl border border-dashed border-border p-3">
      <summary className="cursor-pointer text-sm font-bold text-ink-soft">
        Can&apos;t find your test? Add a new test to the catalog
      </summary>
      <form ref={formRef} action={action} className="mt-3 flex flex-wrap items-end gap-3">
        <label className={compactLabel}>
          Test name
          <input name="name" required className={`${fieldClasses} min-w-[160px]`} />
        </label>
        <label className={compactLabel}>
          Category
          <input name="category" required className={`${fieldClasses} w-32`} />
        </label>
        <label className={compactLabel}>
          Sample type
          <input name="sampleType" required className={`${fieldClasses} w-32`} />
        </label>
        <label className={`${compactLabel} min-w-[160px] flex-1`}>
          Description (optional)
          <input name="description" className={fieldClasses} />
        </label>
        <Button disabled={pending} type="submit" variant="secondary" size="sm">
          {pending ? "Adding..." : "Add test to catalog"}
        </Button>
        {error && <p className="basis-full text-xs text-danger">{error}</p>}
      </form>
    </details>
  );
}
