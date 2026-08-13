// Unit tests for the status pipeline rules in queue.ts (todo.md Phase 4:
// "status transition rules"). Single lab/staff — cross-tenant behavior is
// tenant-isolation.test.ts's concern; this is about the state machine itself:
// BOOKED -> SAMPLE_COLLECTED -> IN_PROGRESS -> COMPLETED, no skipped or
// backward jumps, and no action on a CANCELLED appointment.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { mockAuth } from "@/test/setup";
import { fd, sessionAs } from "@/test/helpers";

const { markSampleCollected, advanceStatus } = await import("@/app/actions/queue");

let testId: string;
let lab: { id: string };
let staff: { id: string };
let patient: { id: string };
let offering: { id: string };

beforeAll(async () => {
  const test = await prisma.test.create({
    data: { name: `Queue Test ${Date.now()}`, category: "Blood", sampleType: "Serum" },
  });
  testId = test.id;
  lab = await prisma.lab.create({
    data: { name: "Queue-Test Lab", address: "1 Main St", city: "Osu", contactEmail: "q@lab.test", status: "APPROVED" },
  });
  staff = await prisma.user.create({
    data: { name: "Staff", email: `queue-staff-${Date.now()}@test.local`, passwordHash: "x", role: "LAB_STAFF", labId: lab.id },
  });
  patient = await prisma.user.create({
    data: { name: "Patient", email: `queue-patient-${Date.now()}@test.local`, passwordHash: "x", role: "PATIENT" },
  });
  offering = await prisma.labTestOffering.create({ data: { labId: lab.id, testId, price: 50, turnaroundHours: 24 } });

  mockAuth.mockResolvedValue(sessionAs({ id: staff.id, role: "LAB_STAFF", labId: lab.id }));
});

afterAll(async () => {
  await prisma.sample.deleteMany({ where: { appointment: { labId: lab.id } } });
  await prisma.appointment.deleteMany({ where: { labId: lab.id } });
  await prisma.labTestOffering.deleteMany({ where: { testId } });
  await prisma.user.deleteMany({ where: { id: { in: [staff.id, patient.id] } } });
  await prisma.lab.delete({ where: { id: lab.id } });
  await prisma.test.delete({ where: { id: testId } });
});

function newAppointment(status: "BOOKED" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" = "BOOKED") {
  return prisma.appointment.create({
    data: { patientId: patient.id, labId: lab.id, offeringId: offering.id, slotDatetime: new Date(), status },
  });
}

describe("markSampleCollected — BOOKED -> SAMPLE_COLLECTED", () => {
  it("succeeds from BOOKED and creates the Sample row", async () => {
    const appointment = await newAppointment("BOOKED");
    expect(await markSampleCollected(undefined, fd({ appointmentId: appointment.id }))).toBeUndefined();

    const after = await prisma.appointment.findUnique({ where: { id: appointment.id }, include: { sample: true } });
    expect(after?.status).toBe("SAMPLE_COLLECTED");
    expect(after?.sample?.collectedByStaffId).toBe(staff.id);
    expect(after?.sample?.collectedAt).not.toBeNull();
  });

  it.each(["SAMPLE_COLLECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const)(
    "rejects re-marking an appointment already in %s",
    async (status) => {
      const appointment = await newAppointment(status);
      const result = await markSampleCollected(undefined, fd({ appointmentId: appointment.id }));
      expect(result).toBeTruthy();
      expect((await prisma.appointment.findUnique({ where: { id: appointment.id } }))?.status).toBe(status);
      expect(await prisma.sample.findUnique({ where: { appointmentId: appointment.id } })).toBeNull();
    },
  );

  it("rejects a missing appointmentId without touching the DB", async () => {
    expect(await markSampleCollected(undefined, fd({}))).toBe("Missing appointment.");
  });
});

describe("advanceStatus — SAMPLE_COLLECTED -> IN_PROGRESS -> COMPLETED", () => {
  it("walks the full pipeline in order, refusing to skip or reverse a step", async () => {
    const appointment = await newAppointment("SAMPLE_COLLECTED");

    expect(await advanceStatus(undefined, fd({ appointmentId: appointment.id }))).toBeUndefined();
    expect((await prisma.appointment.findUnique({ where: { id: appointment.id } }))?.status).toBe("IN_PROGRESS");

    expect(await advanceStatus(undefined, fd({ appointmentId: appointment.id }))).toBeUndefined();
    expect((await prisma.appointment.findUnique({ where: { id: appointment.id } }))?.status).toBe("COMPLETED");

    // No step past COMPLETED.
    const pastEnd = await advanceStatus(undefined, fd({ appointmentId: appointment.id }));
    expect(pastEnd).toBeTruthy();
    expect((await prisma.appointment.findUnique({ where: { id: appointment.id } }))?.status).toBe("COMPLETED");
  });

  it.each(["BOOKED", "CANCELLED"] as const)("rejects advancing from %s (not a valid source state)", async (status) => {
    const appointment = await newAppointment(status);
    const result = await advanceStatus(undefined, fd({ appointmentId: appointment.id }));
    expect(result).toBeTruthy();
    expect((await prisma.appointment.findUnique({ where: { id: appointment.id } }))?.status).toBe(status);
  });
});
