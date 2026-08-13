"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePatientSession } from "@/lib/session";
import { parseForm } from "@/lib/validation";
import { sendAppointmentBookedEmail } from "@/lib/email";

const bookingSchema = z.object({
  offeringId: z.string().min(1, "Choose a slot to book."),
  slotDatetime: z.coerce
    .date("Choose a valid date and time.")
    .refine((d) => d.getTime() > Date.now(), "Choose a time in the future."),
});

// Sequence diagram: docs/System_Design.md §7 — check availability, create if
// free, else "slot unavailable". The (labId, offeringId, slotDatetime)
// unique constraint (schema.prisma) is the actual concurrency backstop; this
// re-checks active/approved server-side too, since the search page's
// filtering is only a display-time convenience, not something to trust.
export async function bookAppointment(_prevState: string | undefined, formData: FormData) {
  const { session, db } = await requirePatientSession();

  const parsed = parseForm(bookingSchema, formData);
  if (!parsed.ok) return parsed.error;
  const { offeringId, slotDatetime } = parsed.data;

  const offering = await prisma.labTestOffering.findUnique({
    where: { id: offeringId },
    include: { lab: true, test: true },
  });
  if (!offering || !offering.active || offering.lab.status !== "APPROVED") {
    return "This offering is no longer available.";
  }

  try {
    await db.appointment.create({ data: { offeringId, slotDatetime } as never });
  } catch {
    // Most likely the (labId, offeringId, slotDatetime) unique constraint.
    return "That slot was just taken — choose another time.";
  }

  // Best-effort — a notification failing to send is never a reason to
  // fail a booking that already succeeded.
  if (session.user.email) {
    await sendAppointmentBookedEmail({
      to: session.user.email,
      patientName: session.user.name ?? "there",
      labName: offering.lab.name,
      testName: offering.test.name,
      slotDatetime,
      price: offering.price.toString(),
      prepInstructions: offering.prepInstructions,
    });
  }

  revalidatePath("/patient");
  redirect("/patient?booked=1");
}
