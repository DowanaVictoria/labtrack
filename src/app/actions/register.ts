"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseForm } from "@/lib/validation";

const registerLabSchema = z.object({
  labName: z.string().trim().min(2, "Lab name must be at least 2 characters.").max(200),
  address: z.string().trim().min(3, "Enter a valid address.").max(300),
  city: z.string().trim().min(2, "Enter a valid city.").max(100),
  contactEmail: z.email("Enter a valid contact email.").trim(),
  adminName: z.string().trim().min(2, "Enter your name.").max(200),
  adminEmail: z.email("Enter a valid login email.").trim(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

const registerPatientSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(200),
  email: z.email("Enter a valid email address.").trim(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

// Public, unauthenticated entry point — there's no session/tenant yet, so
// this legitimately uses the base `prisma` client rather than tenant-scope.ts
// (same reasoning as the credential lookup in src/auth.ts). Sequence diagram:
// docs/System_Design.md §6 — Lab Admin submits profile → Lab created PENDING.
export async function registerLab(_prevState: string | undefined, formData: FormData) {
  const parsed = parseForm(registerLabSchema, formData);
  if (!parsed.ok) return parsed.error;
  const { labName, address, city, contactEmail, adminName, adminEmail, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    return "An account with that admin email already exists.";
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.$transaction(async (tx) => {
      const lab = await tx.lab.create({
        data: { name: labName, address, city, contactEmail, status: "PENDING" },
      });
      await tx.user.create({
        data: { name: adminName, email: adminEmail, passwordHash, role: "LAB_ADMIN", labId: lab.id },
      });
    });
  } catch {
    // Most likely the User.email unique constraint — two registrations for
    // the same email raced past the findUnique check above.
    return "An account with that admin email already exists.";
  }

  redirect("/login?registered=lab");
}

// FR1 (docs/SRS.md §5): patient can register an account. Same
// no-session-yet reasoning as registerLab — base `prisma` client, not
// tenant-scope.ts.
export async function registerPatient(_prevState: string | undefined, formData: FormData) {
  const parsed = parseForm(registerPatientSchema, formData);
  if (!parsed.ok) return parsed.error;
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return "An account with that email already exists.";
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: { name, email, passwordHash, role: "PATIENT" },
    });
  } catch {
    return "An account with that email already exists.";
  }

  redirect("/login?registered=patient");
}
