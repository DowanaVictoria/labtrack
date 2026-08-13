"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseForm } from "@/lib/validation";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(8, "New password must be at least 8 characters.").max(200),
});

// Every role owns exactly one password, so this deliberately doesn't go
// through requireTenantSession()/requirePatientSession()/
// requirePlatformAdminSession() — each of those assumes one specific role.
// Changing your own password isn't tenant data; it just needs "is there a
// session at all", checked directly against the base `prisma` client (same
// identity-resolution exception as src/auth.ts).
export async function changePassword(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user) return "You must be signed in.";

  const parsed = parseForm(changePasswordSchema, formData);
  if (!parsed.ok) return parsed.error;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return "Account not found.";

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return "Current password is incorrect.";

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return undefined;
}
