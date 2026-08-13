"use client";

import { useActionState } from "react";
import { registerLab } from "@/app/actions/register";
import { Button } from "@/components/ui/button";
import { fieldClasses, labelClasses } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";

export function RegisterLabForm() {
  const [error, action, pending] = useActionState(registerLab, undefined);

  return (
    <form action={action} className="flex w-full flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-[10.5px] font-bold tracking-widest text-ink-faint uppercase">
          Lab profile
        </legend>
        <label className={labelClasses}>
          Lab name
          <input name="labName" required className={fieldClasses} />
        </label>
        <label className={labelClasses}>
          Address
          <input name="address" required className={fieldClasses} />
        </label>
        <label className={labelClasses}>
          City
          <input name="city" required className={fieldClasses} />
        </label>
        <label className={labelClasses}>
          Contact email
          <input name="contactEmail" type="email" required className={fieldClasses} />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-[10.5px] font-bold tracking-widest text-ink-faint uppercase">
          Your lab admin account
        </legend>
        <label className={labelClasses}>
          Your name
          <input name="adminName" required className={fieldClasses} />
        </label>
        <label className={labelClasses}>
          Login email
          <input name="adminEmail" type="email" required className={fieldClasses} />
        </label>
        <label className={labelClasses}>
          Password
          <PasswordField name="password" required minLength={8} />
        </label>
      </fieldset>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button disabled={pending} type="submit" className="w-full">
        {pending ? "Submitting..." : "Submit for approval"}
      </Button>
    </form>
  );
}
