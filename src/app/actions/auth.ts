"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseForm } from "@/lib/validation";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  callbackUrl: z.string().optional(),
});

const ROLE_HOME: Record<string, string> = {
  PATIENT: "/patient/appointments",
  LAB_STAFF: "/lab",
  LAB_ADMIN: "/lab",
  PLATFORM_ADMIN: "/admin",
};

function isSafeInternalPath(path: string | undefined): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

function callbackAllowedForRole(path: string | undefined, role: string) {
  if (!isSafeInternalPath(path)) return false;
  if (role === "PATIENT") {
    return (
      path === "/" ||
      path.startsWith("/patient/book") ||
      path.startsWith("/patient/appointments") ||
      path.startsWith("/patient/account")
    );
  }
  if (role === "LAB_STAFF" || role === "LAB_ADMIN") return path.startsWith("/lab");
  if (role === "PLATFORM_ADMIN") return path.startsWith("/admin");
  return false;
}

export async function login(_prevState: string | undefined, formData: FormData) {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return parsed.error;
  const { email, password, callbackUrl } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { role: true } });
    const fallback = user ? ROLE_HOME[user.role] : "/";
    const redirectTo = user && callbackAllowedForRole(callbackUrl, user.role) ? callbackUrl! : fallback;

    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw error; // signIn's internal redirect() rethrows as a non-AuthError — let it propagate
  }
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
