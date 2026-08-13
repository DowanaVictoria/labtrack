"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenantSession } from "@/lib/session";
import { parseForm } from "@/lib/validation";

const priceField = z.coerce
  .number("Price must be a number.")
  .positive("Price must be a positive number.")
  .max(1_000_000, "Price is too large.");
const turnaroundField = z.coerce
  .number("Turnaround hours must be a number.")
  .int("Turnaround hours must be a whole number.")
  .positive("Turnaround hours must be positive.")
  .max(2000, "Turnaround hours is too large.");
const prepInstructionsField = z.string().trim().max(500, "Prep instructions must be under 500 characters.");

const createOfferingSchema = z.object({
  testId: z.string().min(1, "Choose a test to offer."),
  price: priceField,
  turnaroundHours: turnaroundField,
  prepInstructions: prepInstructionsField,
});

const updateOfferingSchema = z.object({
  offeringId: z.string().min(1, "Missing offering."),
  price: priceField,
  turnaroundHours: turnaroundField,
  prepInstructions: prepInstructionsField,
});

// LAB_TEST_OFFERING is lab-scoped (docs/System_Design.md §2/§8): db comes
// from requireTenantSession(), so labId is forced by tenant-scope.ts on both
// the create and every read/update below — this action never sees, and
// can't be tricked into using, another lab's labId.
export async function createOffering(_prevState: string | undefined, formData: FormData) {
  const { db } = await requireTenantSession();

  const parsed = parseForm(createOfferingSchema, formData);
  if (!parsed.ok) return parsed.error;
  const { testId, price, turnaroundHours, prepInstructions } = parsed.data;

  try {
    await db.labTestOffering.create({
      data: {
        testId,
        price,
        turnaroundHours,
        prepInstructions: prepInstructions || null,
      } as never,
    });
  } catch {
    // Most likely the (labId, testId) unique constraint — this lab already offers that test.
    return "This lab already offers that test — edit the existing offering instead.";
  }

  revalidatePath("/lab");
}

export async function updateOffering(_prevState: string | undefined, formData: FormData) {
  const { db } = await requireTenantSession();

  const parsed = parseForm(updateOfferingSchema, formData);
  if (!parsed.ok) return parsed.error;
  const { offeringId, price, turnaroundHours, prepInstructions } = parsed.data;
  const active = formData.get("active") === "on";

  try {
    await db.labTestOffering.update({
      where: { id: offeringId },
      data: { price, turnaroundHours, prepInstructions: prepInstructions || null, active },
    });
  } catch {
    return "Could not save — this offering may no longer exist.";
  }

  revalidatePath("/lab");
  return undefined;
}
