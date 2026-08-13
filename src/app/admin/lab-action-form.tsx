"use client";

import { useActionState } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";

type LabAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>;

export function LabActionForm({
  action,
  labId,
  label,
  variant = "primary",
}: {
  action: LabAction;
  labId: string;
  label: string;
  variant?: ButtonVariant;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="labId" value={labId} />
        <Button type="submit" size="sm" variant={variant} disabled={pending}>
          {pending ? "Working..." : label}
        </Button>
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
