"use client";

import { useActionState } from "react";
import { registerPatient } from "@/app/actions/register";
import { Button } from "@/components/ui/button";
import { fieldClasses, labelClasses } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";

export function SignupForm({ callbackUrl }: { callbackUrl?: string }) {
  const [error, action, pending] = useActionState(registerPatient, undefined);

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      <label className={labelClasses}>
        Full name
        <input name="name" required autoComplete="name" placeholder="Ama Mensah" className={fieldClasses} />
      </label>
      <label className={labelClasses}>
        Email
        <input name="email" type="email" required autoComplete="email" placeholder="ama@example.com" className={fieldClasses} />
      </label>
      <label className={labelClasses}>
        Password
        <PasswordField name="password" required minLength={8} autoComplete="new-password" />
      </label>
      <p className="-mt-2 text-[12px] text-ink-faint">Use at least 8 characters. You will sign in before booking.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button disabled={pending} type="submit" className="w-full">
        {pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
