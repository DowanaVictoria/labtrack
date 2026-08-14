"use client";

import { useActionState } from "react";
import { bookAppointment } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { fieldClasses, labelClasses } from "@/components/ui/field";

export function BookForm({ offeringId }: { offeringId: string }) {
  const [error, action, pending] = useActionState(bookAppointment, undefined);

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <input type="hidden" name="offeringId" value={offeringId} />
      <label className={labelClasses}>
        Appointment slot
        <input name="slotDatetime" type="datetime-local" required className={fieldClasses} />
      </label>
      <p className="-mt-2 text-[12px] text-ink-faint">The lab will see this booking immediately in their queue.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button disabled={pending} type="submit" className="w-full">
        {pending ? "Booking..." : "Confirm booking"}
      </Button>
    </form>
  );
}
