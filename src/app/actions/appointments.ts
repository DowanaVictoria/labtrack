"use server";

import { revalidatePath } from "next/cache";
import { requirePatientSession } from "@/lib/session";
import { sendAppointmentCancelledEmail } from "@/lib/email";

// FR10 (docs/SRS.md §5): patient can cancel an upcoming appointment. Only
// BOOKED is cancellable — once a lab has collected a sample or started work
// (SAMPLE_COLLECTED/IN_PROGRESS/COMPLETED), that's a lab-side concern, not
// something to undo from the patient side.
//
// Known limitation carried from the schema (docs/System_Design.md §8): the
// (labId, offeringId, slotDatetime) uniqueness constraint doesn't exclude
// CANCELLED rows, so a cancelled slot stays occupied and can't be rebooked
// by anyone. Fine for a pilot release; worth a Phase 4 technical-debt entry.
export async function cancelAppointment(_prevState: string | undefined, formData: FormData) {
  const { session, db } = await requirePatientSession();
  const appointmentId = getAppointmentId(formData);
  if (!appointmentId) return "Missing appointment.";

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: { lab: true, offering: { include: { test: true } } },
  });
  if (!appointment || appointment.status !== "BOOKED") {
    return "Only an upcoming (booked) appointment can be cancelled — the page may be out of date.";
  }

  await db.appointment.update({ where: { id: appointmentId }, data: { status: "CANCELLED" } });

  // Best-effort — a notification failing to send is never a reason to
  // fail a cancellation that already succeeded.
  if (session.user.email) {
    await sendAppointmentCancelledEmail({
      to: session.user.email,
      patientName: session.user.name ?? "there",
      labName: appointment.lab.name,
      testName: appointment.offering.test.name,
      slotDatetime: appointment.slotDatetime,
    });
  }

  // CancelAppointmentForm now lives on /patient/appointments (moved from the
  // now-public /patient, UI_REDESIGN_PLAN.md §3/§6) — that's the path whose
  // cached list needs to reflect the CANCELLED status.
  revalidatePath("/patient/appointments");
  return undefined;
}

function getAppointmentId(formData: FormData): string {
  const value = formData.get("appointmentId");
  return typeof value === "string" ? value : "";
}
