"use client";

import { useActionState } from "react";
import { registerPatient } from "@/app/actions/register";
import { Button } from "@/components/ui/button";
import { fieldClasses, labelClasses } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";

export function SignupForm() {
  const [error, action, pending] = useActionState(registerPatient, undefined);

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <label className={labelClasses}>
        Your name
        <input name="name" required className={fieldClasses} />
      </label>
      <label className={labelClasses}>
        Email
        <input name="email" type="email" required className={fieldClasses} />
      </label>
      <label className={labelClasses}>
        Password
        <PasswordField name="password" required minLength={8} />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button disabled={pending} type="submit" className="w-full">
        {pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
