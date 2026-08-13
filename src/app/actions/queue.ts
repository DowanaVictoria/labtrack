"use server";

import { revalidatePath } from "next/cache";
import { requireTenantSession } from "@/lib/session";
import type { AppointmentStatus } from "@/generated/prisma/enums";

// Status pipeline (docs/System_Design.md §7, NFR6: only the defined
// sequence, no invalid jumps): BOOKED -> SAMPLE_COLLECTED -> IN_PROGRESS ->
// COMPLETED. markSampleCollected is the BOOKED -> SAMPLE_COLLECTED step and
// also creates the Sample row (sequence diagram: "Create Sample, update
// Appointment.status"); advanceStatus covers the two steps after that.
const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  SAMPLE_COLLECTED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
};

export async function markSampleCollected(_prevState: string | undefined, formData: FormData) {
  const { session, db } = await requireTenantSession();
  const appointmentId = getAppointmentId(formData);
  if (!appointmentId) return "Missing appointment.";

  const appointment = await db.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.status !== "BOOKED") {
    return "Appointment is not awaiting sample collection — the page may be out of date.";
  }

  // A nested write instead of an explicit $transaction: Prisma sends this as
  // one query, atomic by construction, and the nested `sample.create` gets
  // its appointmentId from the relation automatically — no separate create
  // call that would need its own tenant-scope validation pass.
  await db.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "SAMPLE_COLLECTED",
      sample: { create: { collectedAt: new Date(), collectedByStaffId: session.user.id } },
    } as never,
  });

  revalidatePath("/lab");
  return undefined;
}

export async function advanceStatus(_prevState: string | undefined, formData: FormData) {
  const { db } = await requireTenantSession();
  const appointmentId = getAppointmentId(formData);
  if (!appointmentId) return "Missing appointment.";

  const appointment = await db.appointment.findUnique({ where: { id: appointmentId } });
  const next = appointment ? NEXT_STATUS[appointment.status] : undefined;
  if (!next) {
    return "Appointment cannot be advanced from its current status — the page may be out of date.";
  }

  await db.appointment.update({ where: { id: appointmentId }, data: { status: next } });
  revalidatePath("/lab");
  return undefined;
}

function getAppointmentId(formData: FormData): string {
  const value = formData.get("appointmentId");
  return typeof value === "string" ? value : "";
}
