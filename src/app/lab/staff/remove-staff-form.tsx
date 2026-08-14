"use client";

import { useActionState } from "react";
import { removeStaff } from "@/app/actions/staff";

// Native confirm() is sufficient for pilot scope (UI_REDESIGN_PLAN.md §0.5)
// — removing a staff account is destructive, so it gets a confirmation step
// before submit.
export function RemoveStaffForm({ staffId }: { staffId: string }) {
  const [error, action, pending] = useActionState(removeStaff, undefined);

  return (
    <div className="flex flex-col items-end gap-1">
      <form
        action={action}
        onSubmit={(e) => {
          if (!confirm("Remove this staff account? They will lose access immediately.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="staffId" value={staffId} />
        <button
          disabled={pending}
          type="submit"
          className="rounded-lg border border-danger bg-surface px-3 py-1.5 text-[12.5px] font-bold text-danger transition-colors hover:bg-danger-tint disabled:opacity-50"
        >
          {pending ? "Removing..." : "Remove"}
        </button>
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
