"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { changePassword } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { labelClasses } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";

export function ChangePasswordForm() {
  const [error, action, pending] = useActionState(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  const [justChanged, setJustChanged] = useState(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setJustChanged(true);
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form ref={formRef} action={action} onSubmit={() => setJustChanged(false)} className="flex flex-col gap-3">
      <label className={labelClasses}>
        Current password
        <PasswordField name="currentPassword" required />
      </label>
      <label className={labelClasses}>
        New password
        <PasswordField name="newPassword" required minLength={8} />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      {justChanged && <p className="text-sm font-bold text-ok">Password updated.</p>}
      <Button disabled={pending} type="submit" size="sm" className="self-start">
        {pending ? "Updating..." : "Change password"}
      </Button>
    </form>
  );
}
