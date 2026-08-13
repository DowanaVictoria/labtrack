"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { forbidden } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/session";
import { parseForm } from "@/lib/validation";
import { sendStaffAccountCreatedEmail } from "@/lib/email";

const addStaffSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(200),
  email: z.email("Enter a valid email.").trim(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

// FR19 (docs/SRS.md §5): lab admin manages staff accounts for their lab.
// LAB_ADMIN only — this whole surface is a dedicated page (unlike FR18,
// which lives on the shared /lab dashboard), so forbidden() at both the
// page and the action is the more consistent gate here.
//
// db.user.create() forces role=LAB_STAFF and labId=caller's own lab
// (src/lib/tenant-scope.ts's scopeUser) regardless of what's requested —
// this action can't be used to create an admin account or one for another
// lab even if the form were tampered with.
export async function addStaff(_prevState: string | undefined, formData: FormData) {
  const { session, db } = await requireTenantSession();
  if (session.user.role !== "LAB_ADMIN") forbidden();

  const parsed = parseForm(addStaffSchema, formData);
  if (!parsed.ok) return parsed.error;

  // Email uniqueness is platform-wide, not per-lab, so this check has to
  // run on the base client — the tenant-scoped client would only ever see
  // this lab's own users and could miss a collision with another lab.
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return "An account with that email already exists.";
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    await db.user.create({
      data: { name: parsed.data.name, email: parsed.data.email, passwordHash } as never,
    });
  } catch {
    return "An account with that email already exists.";
  }

  // Best-effort — a notification email failing to send is never a reason
  // to fail account creation itself. The UI's "share these details" recap
  // banner is the reliable fallback regardless of whether this succeeds.
  const lab = await db.lab.findUnique({ where: { id: session.user.labId! } });
  await sendStaffAccountCreatedEmail({
    to: parsed.data.email,
    staffName: parsed.data.name,
    labName: lab?.name ?? "your lab",
    loginEmail: parsed.data.email,
    temporaryPassword: parsed.data.password,
  });

  revalidatePath("/lab/staff");
  return undefined;
}

export async function removeStaff(_prevState: string | undefined, formData: FormData) {
  const { session, db } = await requireTenantSession();
  if (session.user.role !== "LAB_ADMIN") forbidden();

  const staffId = formData.get("staffId");
  if (typeof staffId !== "string" || !staffId) return "Missing staff account.";

  try {
    await db.user.delete({ where: { id: staffId } });
  } catch {
    // Most likely Sample.collectedByStaffId's FK restriction — this staff
    // member has samples on record and can't be removed outright.
    return "This staff account has activity on record and can't be removed.";
  }

  revalidatePath("/lab/staff");
  return undefined;
}
