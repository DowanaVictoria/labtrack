"use client";

import { useActionState } from "react";
import { updateLabProfile } from "@/app/actions/lab-profile";
import { Button } from "@/components/ui/button";
import { fieldClasses, labelClasses } from "@/components/ui/field";

export function EditLabProfileForm({
  name,
  address,
  city,
  contactEmail,
}: {
  name: string;
  address: string;
  city: string;
  contactEmail: string;
}) {
  const [error, action, pending] = useActionState(updateLabProfile, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClasses}>
          Lab name
          <input name="name" defaultValue={name} required className={fieldClasses} />
        </label>
        <label className={labelClasses}>
          Contact email
          <input name="contactEmail" type="email" defaultValue={contactEmail} required className={fieldClasses} />
        </label>
        <label className={labelClasses}>
          Address
          <input name="address" defaultValue={address} required className={fieldClasses} />
        </label>
        <label className={labelClasses}>
          City
          <input name="city" defaultValue={city} required className={fieldClasses} />
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button disabled={pending} type="submit" size="sm" className="self-start">
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
