"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addStaff } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { fieldClasses, labelClasses } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";

type Draft = { name: string; email: string; password: string };

export function AddStaffForm() {
  const [error, action, pending] = useActionState(addStaff, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const draftRef = useRef<Draft | null>(null);
  const wasPending = useRef(false);
  const [created, setCreated] = useState<Draft | null>(null);

  useEffect(() => {
    if (wasPending.current && !pending && !error && draftRef.current) {
      setCreated(draftRef.current);
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, error]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
    draftRef.current = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    };
    setCreated(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {created && (
        <div className="rounded-xl border border-ok bg-ok-tint p-4 text-sm">
          <p className="font-bold text-ok">Staff account created — MediLab has emailed {created.name} these details:</p>
          <p className="mt-2 font-mono text-foreground">
            {created.email} / {created.password}
          </p>
          <p className="mt-2 text-[12px] text-ink-soft">
            If they don&apos;t receive it, share these details with them directly — they can change this password
            from their own account page after signing in.
          </p>
        </div>
      )}
      <form ref={formRef} action={action} onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={labelClasses}>
            Name
            <input name="name" required className={fieldClasses} />
          </label>
          <label className={labelClasses}>
            Email
            <input name="email" type="email" required className={fieldClasses} />
          </label>
          <label className={labelClasses}>
            Temporary password
            <PasswordField name="password" required minLength={8} />
          </label>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button disabled={pending} type="submit" size="sm" className="self-start">
          {pending ? "Adding..." : "Add staff account"}
        </Button>
      </form>
    </div>
  );
}
