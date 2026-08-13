"use client";

import { useActionState } from "react";
import { removeStaff } from "@/app/actions/staff";

export function RemoveStaffForm({ staffId }: { staffId: string }) {
  const [error, action, pending] = useActionState(removeStaff, undefined);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <input type="hidden" name="staffId" value={staffId} />
        <button
          disabled={pending}
          type="submit"
          className="text-sm font-bold text-danger hover:underline disabled:opacity-50"
        >
          {pending ? "Removing..." : "Remove"}
        </button>
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
