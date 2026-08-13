"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { parseForm } from "@/lib/validation";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function login(_prevState: string | undefined, formData: FormData) {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return parsed.error;

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: (formData.get("callbackUrl") as string) || "/",
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
