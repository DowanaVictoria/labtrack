"use client";

import { useActionState, useState } from "react";
import { updateOffering } from "@/app/actions/offerings";
import { Button } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/field";

const compactLabel = "flex flex-col gap-1.5 text-[11px] font-bold tracking-wide text-ink-faint uppercase";

export function EditOfferingForm({
  offeringId,
  price,
  turnaroundHours,
  prepInstructions,
  active,
}: {
  offeringId: string;
  price: string;
  turnaroundHours: number;
  prepInstructions: string;
  active: boolean;
}) {
  const [error, action, pending] = useActionState(updateOffering, undefined);
  const [isActive, setIsActive] = useState(active);

  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="grid grid-cols-1 items-end gap-3 lg:grid-cols-[118px_132px_minmax(180px,1fr)_154px_auto]">
        <input type="hidden" name="offeringId" value={offeringId} />
        <label className={compactLabel}>
          Price (GHS)
          <input
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={price}
            className={fieldClasses}
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
            className={fieldClasses}
          />
        </label>
        <label className={compactLabel}>
          Prep instructions
          <input name="prepInstructions" defaultValue={prepInstructions} className={fieldClasses} />
        </label>
        <label className="group flex cursor-pointer flex-col gap-1.5 text-[11px] font-bold tracking-wide text-ink-faint uppercase">
          Status
          <input
            type="checkbox"
            name="active"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="peer sr-only"
          />
          <span
            className={`flex min-h-10 items-center justify-between gap-3 rounded-lg border-2 px-3 py-2 text-[12px] font-bold normal-case tracking-normal shadow-sm transition group-hover:border-brand/55 ${
              isActive ? "border-ok/50 bg-ok-tint text-ok" : "border-brand/30 bg-background text-ink-soft"
            }`}
          >
            <span>{isActive ? "Published" : "Paused"}</span>
            <span className={`relative h-5 w-9 rounded-full transition ${isActive ? "bg-ok" : "bg-ink-faint/25"}`}>
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                  isActive ? "translate-x-4" : ""
                }`}
              />
            </span>
          </span>
        </label>
        <Button disabled={pending} type="submit" size="sm">
          {pending ? "Saving..." : "Save"}
        </Button>
        {error && <p className="basis-full text-xs text-danger">{error}</p>}
      </form>
    </div>
  );
}
