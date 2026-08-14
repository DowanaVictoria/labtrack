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
  description,
  operatingHours,
}: {
  name: string;
  address: string;
  city: string;
  contactEmail: string;
  description?: string | null;
  operatingHours?: string | null;
}) {
  const [error, action, pending] = useActionState(updateLabProfile, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
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
        <label className={labelClasses}>
          Operating hours
          <input
            name="operatingHours"
            defaultValue={operatingHours ?? ""}
            placeholder="e.g. Mon–Sat, 8:00am–6:00pm"
            className={fieldClasses}
          />
        </label>
      </div>
      <label className={labelClasses}>
        About / tagline
        <textarea
          name="description"
          defaultValue={description ?? ""}
          placeholder="A short description patients see on your marketplace listing (max 500 characters)."
          rows={3}
          maxLength={500}
          className={`${fieldClasses} resize-y`}
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button disabled={pending} type="submit" size="sm" className="self-start">
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
