// Functional/integration tests for the core booking flow (todo.md Phase 4:
// "booking", "slot availability check"). bookAppointment redirects on
// success (throws NEXT_REDIRECT) rather than returning — see
// docs/System_Design.md §7's sequence diagram.
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { mockAuth } from "@/test/setup";
import { expectRedirect, fd, sessionAs } from "@/test/helpers";

const { bookAppointment } = await import("@/app/actions/booking");

let testId: string;
let testId2: string;
let testId3: string;
let approvedLab: { id: string };
let pendingLab: { id: string };
let activeOffering: { id: string };
let inactiveOffering: { id: string };
let pendingLabOffering: { id: string };
let patient: { id: string };

beforeAll(async () => {
  approvedLab = await prisma.lab.create({
    data: { name: "Booking-Test Lab", address: "1 Main St", city: "Osu", contactEmail: "bk@lab.test", status: "APPROVED" },
  });
  pendingLab = await prisma.lab.create({
    data: { name: "Booking-Test Pending Lab", address: "2 Side St", city: "Osu", contactEmail: "bkp@lab.test", status: "PENDING" },
  });

  // Test is now per-lab (SRS.md FR28 change note) — three separate rows,
  // since LabTestOffering has a (labId, testId) unique constraint and
  // pendingLabOffering lives on a different lab than the other two.
  const [test, test2, test3] = await Promise.all([
    prisma.test.create({ data: { labId: approvedLab.id, name: `Booking Test ${Date.now()}`, category: "Blood", sampleType: "Serum" } }),
    prisma.test.create({ data: { labId: approvedLab.id, name: `Booking Test Inactive ${Date.now()}`, category: "Blood", sampleType: "Serum" } }),
    prisma.test.create({ data: { labId: pendingLab.id, name: `Booking Test Pending Lab ${Date.now()}`, category: "Blood", sampleType: "Serum" } }),
  ]);
  testId = test.id;
  testId2 = test2.id;
  testId3 = test3.id;

  patient = await prisma.user.create({
    data: { name: "Patient", email: `booking-patient-${Date.now()}@test.local`, passwordHash: "x", role: "PATIENT" },
  });

  [activeOffering, inactiveOffering, pendingLabOffering] = await Promise.all([
    prisma.labTestOffering.create({ data: { labId: approvedLab.id, testId, price: 50, turnaroundHours: 24, active: true } }),
    prisma.labTestOffering.create({
      data: { labId: approvedLab.id, testId: testId2, price: 55, turnaroundHours: 24, active: false },
    }),
    prisma.labTestOffering.create({ data: { labId: pendingLab.id, testId: testId3, price: 60, turnaroundHours: 24, active: true } }),
  ]);

  mockAuth.mockResolvedValue(sessionAs({ id: patient.id, role: "PATIENT" }));
});

afterEach(async () => {
  // Each test may leave a booking behind; keep the table clean between
  // cases so the (labId, offeringId, slotDatetime) uniqueness check in the
  // double-booking test always starts from a known state.
  await prisma.appointment.deleteMany({ where: { patientId: patient.id } });
});

afterAll(async () => {
  // Test now has a FK to Lab, so offerings and tests must be torn down
  // before the labs they belong to.
  await prisma.labTestOffering.deleteMany({ where: { testId: { in: [testId, testId2, testId3] } } });
  await prisma.test.deleteMany({ where: { id: { in: [testId, testId2, testId3] } } });
  await prisma.user.delete({ where: { id: patient.id } });
  await prisma.lab.deleteMany({ where: { id: { in: [approvedLab.id, pendingLab.id] } } });
});

describe("bookAppointment — happy path", () => {
  it("books a future slot on an active offering at an approved lab", async () => {
    const slot = new Date(Date.now() + 86_400_000).toISOString();
    await expectRedirect(
      bookAppointment(undefined, fd({ offeringId: activeOffering.id, slotDatetime: slot })),
      "/patient",
    );

    const created = await prisma.appointment.findFirst({ where: { patientId: patient.id, offeringId: activeOffering.id } });
    expect(created).not.toBeNull();
    expect(created?.labId).toBe(approvedLab.id); // derived server-side from the offering, not client-supplied
    expect(created?.status).toBe("BOOKED");
  });
});

describe("bookAppointment — rejections, none of which should write a row", () => {
  it("rejects a slot in the past", async () => {
    const pastSlot = new Date(Date.now() - 86_400_000).toISOString();
    const result = await bookAppointment(undefined, fd({ offeringId: activeOffering.id, slotDatetime: pastSlot }));
    expect(result).toBeTruthy();
    expect(await prisma.appointment.count({ where: { patientId: patient.id } })).toBe(0);
  });

  it("rejects booking an inactive offering", async () => {
    const slot = new Date(Date.now() + 86_400_000).toISOString();
    const result = await bookAppointment(undefined, fd({ offeringId: inactiveOffering.id, slotDatetime: slot }));
    expect(result).toBe("This offering is no longer available.");
    expect(await prisma.appointment.count({ where: { patientId: patient.id } })).toBe(0);
  });

  it("rejects booking an offering at a not-yet-approved lab", async () => {
    const slot = new Date(Date.now() + 86_400_000).toISOString();
    const result = await bookAppointment(undefined, fd({ offeringId: pendingLabOffering.id, slotDatetime: slot }));
    expect(result).toBe("This offering is no longer available.");
    expect(await prisma.appointment.count({ where: { patientId: patient.id } })).toBe(0);
  });

  it("rejects a second booking for the exact same lab/offering/slot (double-booking)", async () => {
    const slot = new Date(Date.now() + 86_400_000).toISOString();
    await expectRedirect(bookAppointment(undefined, fd({ offeringId: activeOffering.id, slotDatetime: slot })), "/patient");

    const secondAttempt = await bookAppointment(undefined, fd({ offeringId: activeOffering.id, slotDatetime: slot }));
    expect(secondAttempt).toBe("That slot was just taken — choose another time.");
    expect(await prisma.appointment.count({ where: { offeringId: activeOffering.id, slotDatetime: new Date(slot) } })).toBe(1);
  });
});
