"use client";

import { useActionState } from "react";
import { cancelAppointment } from "@/app/actions/appointments";

// Native confirm() is sufficient for pilot scope (UI_REDESIGN_PLAN.md §0.5)
// — cancelling an appointment is destructive and irreversible from the
// patient's side, so it gets a confirmation step before submit.
export function CancelAppointmentForm({ appointmentId }: { appointmentId: string }) {
  const [error, action, pending] = useActionState(cancelAppointment, undefined);

  return (
    <div className="flex flex-col items-end gap-1">
      <form
        action={action}
        onSubmit={(e) => {
          if (!confirm("Cancel this appointment? This can't be undone.")) {
            e.preventDefault();
          }
        }}
      >
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
