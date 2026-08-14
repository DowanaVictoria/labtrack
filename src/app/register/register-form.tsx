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
        <legend className="mb-1 text-[11px] font-bold tracking-wide text-ink-faint uppercase">
          Lab profile
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={`${labelClasses} sm:col-span-2`}>
            Lab name
            <input name="labName" required autoComplete="organization" placeholder="MediCare Diagnostics" className={fieldClasses} />
          </label>
          <label className={labelClasses}>
            City
            <input name="city" required autoComplete="address-level2" placeholder="Accra" className={fieldClasses} />
          </label>
          <label className={labelClasses}>
            Contact email
            <input name="contactEmail" type="email" required autoComplete="email" placeholder="frontdesk@lab.com" className={fieldClasses} />
          </label>
          <label className={`${labelClasses} sm:col-span-2`}>
            Address
            <input name="address" required autoComplete="street-address" placeholder="Street, building, area" className={fieldClasses} />
          </label>
          <label className={labelClasses}>
            Operating hours
            <input name="operatingHours" placeholder="Mon-Sat, 8:00am-6:00pm" className={fieldClasses} />
          </label>
          <label className={`${labelClasses} sm:col-span-2`}>
            Short public description
            <textarea
              name="description"
              rows={3}
              maxLength={500}
              placeholder="Tell patients what your lab is known for."
              className={`${fieldClasses} resize-none`}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-[11px] font-bold tracking-wide text-ink-faint uppercase">
          Your lab admin account
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClasses}>
            Your name
            <input name="adminName" required autoComplete="name" placeholder="Lab admin name" className={fieldClasses} />
          </label>
          <label className={labelClasses}>
            Login email
            <input name="adminEmail" type="email" required autoComplete="email" placeholder="admin@lab.com" className={fieldClasses} />
          </label>
          <label className={`${labelClasses} sm:col-span-2`}>
            Password
            <PasswordField name="password" required minLength={8} autoComplete="new-password" />
          </label>
        </div>
      </fieldset>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button disabled={pending} type="submit" className="w-full">
        {pending ? "Submitting..." : "Submit for approval"}
      </Button>
    </form>
  );
}
