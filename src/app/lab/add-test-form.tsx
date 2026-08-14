"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createTest } from "@/app/actions/tests";
import { Button } from "@/components/ui/button";
import { fieldClasses, labelClasses } from "@/components/ui/field";
import { FlaskIcon } from "@/components/ui/icons";

export function AddTestForm() {
  const [error, action, pending] = useActionState(createTest, undefined);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      formRef.current?.reset();
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-brand/35 bg-brand-tint/30 px-3.5 py-2.5 text-left text-[12.5px] font-bold text-brand-dark transition hover:border-brand hover:bg-brand-tint/50"
      >
        <FlaskIcon width={16} height={16} />
        Can&apos;t find your test? Add it to your lab&apos;s catalog
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="grid grid-cols-1 gap-3 rounded-lg border border-brand/35 bg-brand-tint/20 p-3.5">
      <p className="text-[12px] text-ink-faint">
        This adds a new test to your own lab&apos;s catalog only — other labs won&apos;t see it, and you can offer it right away below.
      </p>
      <label className={labelClasses}>
        Test name
        <input name="name" required placeholder="e.g. Vitamin D Panel" className={fieldClasses} />
      </label>
      <label className={labelClasses}>
        Category
        <input name="category" required placeholder="e.g. Blood" className={fieldClasses} />
      </label>
      <label className={labelClasses}>
        Sample type
        <input name="sampleType" required placeholder="e.g. Serum" className={fieldClasses} />
      </label>
      <label className={labelClasses}>
        Description (optional)
        <input name="description" className={fieldClasses} />
      </label>
      <div className="flex gap-2">
        <Button disabled={pending} type="submit" variant="secondary" size="sm">
          {pending ? "Adding..." : "Add to my catalog"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
