"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdminSession } from "@/lib/session";
import type { LabStatus } from "@/generated/prisma/enums";

// Sequence diagram: docs/System_Design.md §6 (Lab Onboarding). Rejection sets
// status rather than deleting the row, so the registration stays visible for
// audit — a rejected lab admin can be told why, and the decision isn't lost.
//
// NFR10 (docs/SRS.md §5): every transition here is written to AuditLog in
// the same request — there's no code path that changes a lab's status
// without also logging who did it and when.
async function setLabStatus(labId: string, from: LabStatus[], to: LabStatus, action: string) {
  const { session, db } = await requirePlatformAdminSession();

  const lab = await db.lab.findUnique({ where: { id: labId } });
  if (!lab || !from.includes(lab.status)) {
    return `Lab must be ${from.join(" or ")} for this action — the page may be out of date.`;
  }

  await db.lab.update({ where: { id: labId }, data: { status: to } });
  await db.auditLog.create({
    data: { actorId: session.user.id, action, targetLabId: labId, detail: `${lab.status} -> ${to}` },
  });
  revalidatePath("/admin");
  return undefined;
}

function getLabId(formData: FormData): string {
  const labId = formData.get("labId");
  return typeof labId === "string" ? labId : "";
}

export async function approveLab(_prevState: string | undefined, formData: FormData) {
  const labId = getLabId(formData);
  if (!labId) return "Missing lab.";
  return setLabStatus(labId, ["PENDING"], "APPROVED", "APPROVE_LAB");
}

export async function rejectLab(_prevState: string | undefined, formData: FormData) {
  const labId = getLabId(formData);
  if (!labId) return "Missing lab.";
  return setLabStatus(labId, ["PENDING"], "REJECTED", "REJECT_LAB");
}

// FR24 (docs/SRS.md §5): platform admin can suspend or reinstate a lab.
export async function suspendLab(_prevState: string | undefined, formData: FormData) {
  const labId = getLabId(formData);
  if (!labId) return "Missing lab.";
  return setLabStatus(labId, ["APPROVED"], "SUSPENDED", "SUSPEND_LAB");
}

export async function reinstateLab(_prevState: string | undefined, formData: FormData) {
  const labId = getLabId(formData);
  if (!labId) return "Missing lab.";
  return setLabStatus(labId, ["SUSPENDED"], "APPROVED", "REINSTATE_LAB");
}
