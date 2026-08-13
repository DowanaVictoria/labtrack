"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { fieldClasses, labelClasses } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label className={labelClasses}>
        Email
        <input name="email" type="email" required className={fieldClasses} />
      </label>
      <label className={labelClasses}>
        Password
        <PasswordField name="password" required />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button disabled={pending} type="submit" className="w-full">
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
