"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenantSession } from "@/lib/session";
import { parseForm } from "@/lib/validation";

// description/operatingHours are additive, nullable fields (UI_REDESIGN_PLAN.md
// §0.3/§6) — both optional; an empty submission clears the field (stored as
// null) rather than rejecting the form.
const labProfileSchema = z.object({
  name: z.string().trim().min(2, "Lab name must be at least 2 characters.").max(200),
  address: z.string().trim().min(3, "Enter a valid address.").max(300),
  city: z.string().trim().min(2, "Enter a valid city.").max(100),
  contactEmail: z.email("Enter a valid contact email.").trim(),
  description: z.string().trim().max(500, "Description must be under 500 characters.").optional(),
  operatingHours: z.string().trim().max(200, "Operating hours must be under 200 characters.").optional(),
});

// FR18 (docs/SRS.md §5): lab admin can manage their lab's profile.
// LAB_ADMIN only — requireTenantSession() lets LAB_STAFF through too (they
// need the dashboard), but staff shouldn't be able to change the lab's
// identity/contact info, so that's checked here rather than at the page
// gate. db.lab.update() already goes through tenant-scope.ts's scopeLab,
// which forces the update to the caller's own lab regardless.
export async function updateLabProfile(_prevState: string | undefined, formData: FormData) {
  const { session, db } = await requireTenantSession();
  if (session.user.role !== "LAB_ADMIN") {
    return "Only a lab admin can edit the lab profile.";
  }

  const parsed = parseForm(labProfileSchema, formData);
  if (!parsed.ok) return parsed.error;

  await db.lab.update({
    where: { id: session.user.labId! },
    data: {
      ...parsed.data,
      description: parsed.data.description || null,
      operatingHours: parsed.data.operatingHours || null,
    },
  });

  revalidatePath("/lab");
  return undefined;
}
