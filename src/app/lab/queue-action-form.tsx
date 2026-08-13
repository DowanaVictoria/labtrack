"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";

type QueueAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function QueueActionForm({
  action,
  appointmentId,
  label,
}: {
  action: QueueAction;
  appointmentId: string;
  label: string;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <Button disabled={pending} type="submit" size="sm" variant="secondary" className="shrink-0">
          {pending ? "Working..." : label}
        </Button>
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
