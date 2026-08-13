"use server";

import { z } from "zod";
import { forbidden } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTenantSession } from "@/lib/session";
import { parseForm } from "@/lib/validation";

const createTestSchema = z.object({
  name: z.string().trim().min(1, "Test name is required.").max(200, "Test name is too long."),
  category: z.string().trim().min(1, "Category is required.").max(100, "Category is too long."),
  sampleType: z.string().trim().min(1, "Sample type is required.").max(100, "Sample type is too long."),
  description: z.string().trim().max(500, "Description must be under 500 characters."),
});

// LAB_ADMIN only (SRS.md FR28) — this writes to the shared, platform-wide
// Test catalog, a bigger blast radius than a lab's own offerings, so it's
// gated the same way staff.ts gates its LAB_ADMIN-only actions.
//
// Duplicate-name check is a best-effort, application-level safeguard against
// catalog fragmentation (two labs creating near-duplicate entries) — it is
// NOT a database-level unique constraint, so a race between two concurrent
// creates of the same name isn't ruled out. Documented as known debt in
// docs/Technical_Debt_Plan.md rather than left silent.
export async function createTest(_prevState: string | undefined, formData: FormData) {
  const { session, db } = await requireTenantSession();
  if (session.user.role !== "LAB_ADMIN") forbidden();

  const parsed = parseForm(createTestSchema, formData);
  if (!parsed.ok) return parsed.error;
  const { name, category, sampleType, description } = parsed.data;

  const existing = await db.test.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    return `A test named "${existing.name}" already exists in the catalog. Select it instead of creating a duplicate.`;
  }

  await db.test.create({
    data: { name, category, sampleType, description: description || null },
  });

  revalidatePath("/lab/offerings");
  return undefined;
}
