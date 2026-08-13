"use client";

import { useActionState } from "react";
import { cancelAppointment } from "@/app/actions/appointments";

export function CancelAppointmentForm({ appointmentId }: { appointmentId: string }) {
  const [error, action, pending] = useActionState(cancelAppointment, undefined);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <button
          disabled={pending}
          type="submit"
          className="shrink-0 text-[12.5px] font-bold text-danger hover:underline disabled:opacity-50"
        >
          {pending ? "Cancelling..." : "Cancel"}
        </button>
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
