// Functional tests for lab approval/rejection/suspension (todo.md Phase 4:
// "lab approval") and NFR10 (docs/SRS.md §5): every status change must be
// audit-logged with who did it. Cross-role access control (a LAB_ADMIN
// session calling these) is already covered in tenant-isolation.test.ts —
// this is the state machine and audit trail for a legitimate PLATFORM_ADMIN.
import { afterAll, beforeAll, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { mockAuth } from "@/test/setup";
import { fd, sessionAs } from "@/test/helpers";

const { approveLab, rejectLab, suspendLab, reinstateLab } = await import("@/app/actions/labs");

let platformAdmin: { id: string };
const labIds: string[] = [];

beforeAll(async () => {
  platformAdmin = await prisma.user.create({
    data: { name: "Platform Admin", email: `lifecycle-admin-${Date.now()}@test.local`, passwordHash: "x", role: "PLATFORM_ADMIN" },
  });
  mockAuth.mockResolvedValue(sessionAs({ id: platformAdmin.id, role: "PLATFORM_ADMIN" }));
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorId: platformAdmin.id } });
  await prisma.lab.deleteMany({ where: { id: { in: labIds } } });
  await prisma.user.delete({ where: { id: platformAdmin.id } });
});

async function newPendingLab(name: string) {
  const lab = await prisma.lab.create({
    data: { name, address: "1 Main St", city: "Osu", contactEmail: `${name}@test.local`, status: "PENDING" },
  });
  labIds.push(lab.id);
  return lab;
}

it("approves a PENDING lab and logs it", async () => {
  const lab = await newPendingLab(`Approve-Me ${Date.now()}`);
  expect(await approveLab(undefined, fd({ labId: lab.id }))).toBeUndefined();

  const after = await prisma.lab.findUnique({ where: { id: lab.id } });
  expect(after?.status).toBe("APPROVED");

  const log = await prisma.auditLog.findFirst({ where: { targetLabId: lab.id, action: "APPROVE_LAB" } });
  expect(log?.actorId).toBe(platformAdmin.id);
});

it("rejects a PENDING lab and logs it", async () => {
  const lab = await newPendingLab(`Reject-Me ${Date.now()}`);
  expect(await rejectLab(undefined, fd({ labId: lab.id }))).toBeUndefined();

  const after = await prisma.lab.findUnique({ where: { id: lab.id } });
  expect(after?.status).toBe("REJECTED");
  expect(await prisma.auditLog.findFirst({ where: { targetLabId: lab.id, action: "REJECT_LAB" } })).not.toBeNull();
});

it("refuses to approve a lab that isn't PENDING (e.g. already APPROVED)", async () => {
  const lab = await newPendingLab(`Already-Approved ${Date.now()}`);
  await approveLab(undefined, fd({ labId: lab.id }));

  const result = await approveLab(undefined, fd({ labId: lab.id }));
  expect(result).toBeTruthy();
  expect((await prisma.lab.findUnique({ where: { id: lab.id } }))?.status).toBe("APPROVED");
  // Exactly one APPROVE_LAB log — the rejected second call didn't log again.
  expect(await prisma.auditLog.count({ where: { targetLabId: lab.id, action: "APPROVE_LAB" } })).toBe(1);
});

it("suspends an APPROVED lab, then reinstates it", async () => {
  const lab = await newPendingLab(`Suspend-Cycle ${Date.now()}`);
  await approveLab(undefined, fd({ labId: lab.id }));

  expect(await suspendLab(undefined, fd({ labId: lab.id }))).toBeUndefined();
  expect((await prisma.lab.findUnique({ where: { id: lab.id } }))?.status).toBe("SUSPENDED");

  // Can't suspend an already-suspended lab.
  const doubleSuspend = await suspendLab(undefined, fd({ labId: lab.id }));
  expect(doubleSuspend).toBeTruthy();

  expect(await reinstateLab(undefined, fd({ labId: lab.id }))).toBeUndefined();
  expect((await prisma.lab.findUnique({ where: { id: lab.id } }))?.status).toBe("APPROVED");
});

it("refuses to suspend a PENDING lab (must be APPROVED first)", async () => {
  const lab = await newPendingLab(`Not-Yet-Approved ${Date.now()}`);
  const result = await suspendLab(undefined, fd({ labId: lab.id }));
  expect(result).toBeTruthy();
  expect((await prisma.lab.findUnique({ where: { id: lab.id } }))?.status).toBe("PENDING");
});
