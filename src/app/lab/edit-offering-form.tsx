"use client";

import { useActionState } from "react";
import { updateOffering } from "@/app/actions/offerings";
import { Button } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/field";

const compactLabel = "flex flex-col gap-1 text-[10.5px] font-bold tracking-widest text-ink-faint uppercase";

export function EditOfferingForm({
  offeringId,
  testName,
  price,
  turnaroundHours,
  prepInstructions,
  active,
}: {
  offeringId: string;
  testName: string;
  price: string;
  turnaroundHours: number;
  prepInstructions: string;
  active: boolean;
}) {
  const [error, action, pending] = useActionState(updateOffering, undefined);

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="offeringId" value={offeringId} />
        <span className="min-w-[120px] text-sm font-bold text-foreground">
          {testName}
          {!active && (
            <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold tracking-wider text-ink-faint uppercase">
              Inactive
            </span>
          )}
        </span>
        <label className={compactLabel}>
          Price (GHS)
          <input
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={price}
            className={`${fieldClasses} w-24`}
          />
        </label>
        <label className={compactLabel}>
          Turnaround (h)
          <input
            name="turnaroundHours"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={turnaroundHours}
            className={`${fieldClasses} w-24`}
          />
        </label>
        <label className={`${compactLabel} min-w-[160px] flex-1`}>
          Prep instructions
          <input name="prepInstructions" defaultValue={prepInstructions} className={fieldClasses} />
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-[10.5px] font-bold tracking-widest text-ink-faint uppercase">
          <input
            type="checkbox"
            name="active"
            defaultChecked={active}
            className="h-4 w-4 rounded border-border text-brand focus:ring-brand-tint"
          />
          Active
        </label>
        <Button disabled={pending} type="submit" size="sm">
          {pending ? "Saving..." : "Save"}
        </Button>
        {error && <p className="basis-full text-xs text-danger">{error}</p>}
      </form>
    </li>
  );
}
