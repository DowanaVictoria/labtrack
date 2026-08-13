"use client";

import { useActionState } from "react";
import { createOffering } from "@/app/actions/offerings";
import { Button } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/field";

const compactLabel = "flex flex-col gap-1 text-[10.5px] font-bold tracking-widest text-ink-faint uppercase";

export function AddOfferingForm({ availableTests }: { availableTests: { id: string; name: string }[] }) {
  const [error, action, pending] = useActionState(createOffering, undefined);

  if (availableTests.length === 0) {
    return <p className="text-sm text-ink-faint">Every catalog test is already offered by this lab.</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className={compactLabel}>
        Test
        <select name="testId" required className={fieldClasses}>
          {availableTests.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className={compactLabel}>
        Price (GHS)
        <input name="price" type="number" step="0.01" min="0.01" required className={`${fieldClasses} w-24`} />
      </label>
      <label className={compactLabel}>
        Turnaround (h)
        <input name="turnaroundHours" type="number" min="1" step="1" required className={`${fieldClasses} w-24`} />
      </label>
      <label className={`${compactLabel} min-w-[160px] flex-1`}>
        Prep instructions
        <input name="prepInstructions" className={fieldClasses} />
      </label>
      <Button disabled={pending} type="submit" size="sm">
        {pending ? "Adding..." : "Add offering"}
      </Button>
      {error && <p className="basis-full text-xs text-danger">{error}</p>}
    </form>
  );
}
