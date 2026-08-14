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

// LAB_ADMIN only (SRS.md FR28) — writes to this lab's OWN test catalog.
// Unlike the original shared-catalog version of this feature, Test is fully
// tenant-scoped (src/lib/tenant-scope.ts), so db.test.create() below is
// already forced to this session's labId — nothing here can reach or
// collide with another lab's tests.
//
// Duplicate-name check is a best-effort, application-level safeguard within
// this lab's own catalog (a lab could otherwise create "Lipid Panel" twice).
// The (labId, name) unique constraint in prisma/schema.prisma is the
// database-level backstop; this check exists mainly to give a friendly error
// instead of a raw constraint-violation, and to catch case-insensitive
// duplicates the constraint alone wouldn't (e.g. "lipid panel" vs "Lipid Panel").
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
    return `You already have a test named "${existing.name}" in your catalog. Select it instead of creating a duplicate.`;
  }

  await db.test.create({
    data: { name, category, sampleType, description: description || null } as never,
  });

  revalidatePath("/lab/offerings");
  return undefined;
}
