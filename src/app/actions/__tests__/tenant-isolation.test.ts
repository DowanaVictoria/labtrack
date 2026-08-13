// Endpoint-level tenant-isolation tests (docs/System_Design.md §2, todo.md
// Phase 4's highest-priority item): call the real Server Actions directly —
// not scripts/verify-tenant-isolation.ts's tenant-scope.ts DAL calls — with a
// forged session, and confirm a lab/patient can never read or write another
// tenant's data through any lab-scoped or patient-scoped action. This is the
// layer that would catch a future action that forgets to route through
// requireTenantSession()/requirePatientSession() and reaches the base
// `prisma` client instead — the DAL itself is already covered by the script.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { mockAuth } from "@/test/setup";
import { expectForbidden, fd, sessionAs } from "@/test/helpers";

const { createOffering, updateOffering } = await import("@/app/actions/offerings");
const { markSampleCollected, advanceStatus } = await import("@/app/actions/queue");
const { addStaff, removeStaff } = await import("@/app/actions/staff");
const { updateLabProfile } = await import("@/app/actions/lab-profile");
const { cancelAppointment } = await import("@/app/actions/appointments");
const { approveLab } = await import("@/app/actions/labs");

let testId: string;
let labA: { id: string }, labB: { id: string };
let adminA: { id: string }, staffA: { id: string }, adminB: { id: string }, staffB: { id: string };
let offeringA: { id: string }, offeringB: { id: string };
let patientA: { id: string }, patientB: { id: string };

beforeAll(async () => {
  const test = await prisma.test.create({
    data: { name: `Isolation Test ${Date.now()}`, category: "Blood", sampleType: "Serum" },
  });
  testId = test.id;

  labA = await prisma.lab.create({
    data: { name: "Action-Test LabA", address: "1 Main St", city: "Osu", contactEmail: "a@labA.test", status: "APPROVED" },
  });
  labB = await prisma.lab.create({
    data: { name: "Action-Test LabB", address: "2 High St", city: "Tema", contactEmail: "b@labB.test", status: "APPROVED" },
  });

  const mkUser = (name: string, role: "LAB_ADMIN" | "LAB_STAFF" | "PATIENT", labId: string | null) =>
    prisma.user.create({
      data: { name, email: `${name}-${Date.now()}-${Math.random()}@test.local`, passwordHash: "x", role, labId },
    });

  [adminA, staffA, adminB, staffB, patientA, patientB] = await Promise.all([
    mkUser("AdminA", "LAB_ADMIN", labA.id),
    mkUser("StaffA", "LAB_STAFF", labA.id),
    mkUser("AdminB", "LAB_ADMIN", labB.id),
    mkUser("StaffB", "LAB_STAFF", labB.id),
    mkUser("PatientA", "PATIENT", null),
    mkUser("PatientB", "PATIENT", null),
  ]);

  offeringA = await prisma.labTestOffering.create({
    data: { labId: labA.id, testId, price: 80, turnaroundHours: 24 },
  });
  offeringB = await prisma.labTestOffering.create({
    data: { labId: labB.id, testId, price: 65, turnaroundHours: 48 },
  });
});

afterAll(async () => {
  await prisma.sample.deleteMany({ where: { appointment: { labId: { in: [labA.id, labB.id] } } } });
  await prisma.appointment.deleteMany({ where: { labId: { in: [labA.id, labB.id] } } });
  await prisma.labTestOffering.deleteMany({ where: { testId } });
  await prisma.user.deleteMany({ where: { labId: { in: [labA.id, labB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [patientA.id, patientB.id] } } });
  await prisma.lab.deleteMany({ where: { id: { in: [labA.id, labB.id] } } });
  await prisma.test.delete({ where: { id: testId } });
});

describe("offerings.ts — lab-scoped", () => {
  it("blocks lab B from updating lab A's offering, and leaves it unchanged", async () => {
    mockAuth.mockResolvedValue(sessionAs({ id: staffB.id, role: "LAB_STAFF", labId: labB.id }));

    const result = await updateOffering(
      undefined,
      fd({ offeringId: offeringA.id, price: "1", turnaroundHours: "1", prepInstructions: "" }),
    );

    expect(result).toBeTruthy(); // returned an error string, not undefined
    const stillOriginal = await prisma.labTestOffering.findUnique({ where: { id: offeringA.id } });
    expect(stillOriginal?.price.toFixed(2)).toBe("80.00");
  });

  it("lets lab A update its own offering", async () => {
    mockAuth.mockResolvedValue(sessionAs({ id: adminA.id, role: "LAB_ADMIN", labId: labA.id }));

    const result = await updateOffering(
      undefined,
      fd({ offeringId: offeringA.id, price: "90", turnaroundHours: "12", prepInstructions: "Fast 8h" }),
    );

    expect(result).toBeUndefined();
    const updated = await prisma.labTestOffering.findUnique({ where: { id: offeringA.id } });
    expect(updated?.price.toFixed(2)).toBe("90.00");
  });

  it("blocks lab B from creating an offering against lab A's test in a way that writes into lab A", async () => {
    mockAuth.mockResolvedValue(sessionAs({ id: staffB.id, role: "LAB_STAFF", labId: labB.id }));

    // labB already offers `testId` (offeringB) — the (labId, testId) unique
    // constraint is the same one createOffering's catch block handles, so
    // this exercises the tenant-scoped labId being forced server-side (a
    // duplicate against labB, not a new row silently created against labA).
    const result = await createOffering(undefined, fd({ testId, price: "50", turnaroundHours: "10", prepInstructions: "" }));

    expect(result).toBe("This lab already offers that test — edit the existing offering instead.");
    expect((await prisma.labTestOffering.findUnique({ where: { id: offeringB.id } }))?.price.toFixed(2)).toBe("65.00");
    const offeringsForA = await prisma.labTestOffering.count({ where: { labId: labA.id } });
    expect(offeringsForA).toBe(1);
  });
});

describe("queue.ts — lab-scoped", () => {
  it("blocks lab B from marking lab A's appointment as sample-collected", async () => {
    const appointment = await prisma.appointment.create({
      data: { patientId: patientA.id, labId: labA.id, offeringId: offeringA.id, slotDatetime: new Date() },
    });

    mockAuth.mockResolvedValue(sessionAs({ id: staffB.id, role: "LAB_STAFF", labId: labB.id }));
    const result = await markSampleCollected(undefined, fd({ appointmentId: appointment.id }));

    expect(result).toBeTruthy();
    const stillBooked = await prisma.appointment.findUnique({ where: { id: appointment.id } });
    expect(stillBooked?.status).toBe("BOOKED");
    expect(await prisma.sample.findUnique({ where: { appointmentId: appointment.id } })).toBeNull();
  });

  it("lets lab A mark its own appointment as sample-collected, then advance it", async () => {
    const appointment = await prisma.appointment.create({
      data: { patientId: patientA.id, labId: labA.id, offeringId: offeringA.id, slotDatetime: new Date() },
    });

    mockAuth.mockResolvedValue(sessionAs({ id: staffA.id, role: "LAB_STAFF", labId: labA.id }));
    expect(await markSampleCollected(undefined, fd({ appointmentId: appointment.id }))).toBeUndefined();
    expect((await prisma.appointment.findUnique({ where: { id: appointment.id } }))?.status).toBe("SAMPLE_COLLECTED");

    // Cross-tenant block on the next pipeline step too, not just the first.
    mockAuth.mockResolvedValue(sessionAs({ id: staffB.id, role: "LAB_STAFF", labId: labB.id }));
    const blocked = await advanceStatus(undefined, fd({ appointmentId: appointment.id }));
    expect(blocked).toBeTruthy();
    expect((await prisma.appointment.findUnique({ where: { id: appointment.id } }))?.status).toBe("SAMPLE_COLLECTED");

    mockAuth.mockResolvedValue(sessionAs({ id: staffA.id, role: "LAB_STAFF", labId: labA.id }));
    expect(await advanceStatus(undefined, fd({ appointmentId: appointment.id }))).toBeUndefined();
    expect((await prisma.appointment.findUnique({ where: { id: appointment.id } }))?.status).toBe("IN_PROGRESS");
  });
});

describe("staff.ts — lab-scoped, LAB_ADMIN only", () => {
  it("blocks a LAB_STAFF session outright (role gate, not just tenant gate)", async () => {
    mockAuth.mockResolvedValue(sessionAs({ id: staffA.id, role: "LAB_STAFF", labId: labA.id }));
    await expectForbidden(addStaff(undefined, fd({ name: "X", email: `x-${Date.now()}@test.local`, password: "password1" })));
  });

  it("blocks lab B's admin from removing lab A's staff account", async () => {
    mockAuth.mockResolvedValue(sessionAs({ id: adminB.id, role: "LAB_ADMIN", labId: labB.id }));
    const result = await removeStaff(undefined, fd({ staffId: staffA.id }));

    expect(result).toBeTruthy();
    expect(await prisma.user.findUnique({ where: { id: staffA.id } })).not.toBeNull();
  });

  it("lets lab A's admin add and remove its own staff", async () => {
    mockAuth.mockResolvedValue(sessionAs({ id: adminA.id, role: "LAB_ADMIN", labId: labA.id }));
    const email = `new-staff-${Date.now()}@test.local`;
    expect(await addStaff(undefined, fd({ name: "New Staff", email, password: "password1" }))).toBeUndefined();

    const created = await prisma.user.findUnique({ where: { email } });
    expect(created?.labId).toBe(labA.id);
    expect(created?.role).toBe("LAB_STAFF");

    expect(await removeStaff(undefined, fd({ staffId: created!.id }))).toBeUndefined();
    expect(await prisma.user.findUnique({ where: { id: created!.id } })).toBeNull();
  });
});

describe("lab-profile.ts — lab-scoped, LAB_ADMIN only", () => {
  it("lab B's admin editing their own profile never touches lab A's row", async () => {
    const before = await prisma.lab.findUnique({ where: { id: labA.id } });

    mockAuth.mockResolvedValue(sessionAs({ id: adminB.id, role: "LAB_ADMIN", labId: labB.id }));
    const result = await updateLabProfile(
      undefined,
      fd({ name: "QuickTest Renamed", address: "9 New Rd", city: "Tema", contactEmail: "renamed@labB.test" }),
    );

    expect(result).toBeUndefined();
    const labAAfter = await prisma.lab.findUnique({ where: { id: labA.id } });
    expect(labAAfter).toEqual(before);
    const labBAfter = await prisma.lab.findUnique({ where: { id: labB.id } });
    expect(labBAfter?.name).toBe("QuickTest Renamed");
  });

  it("blocks a LAB_STAFF session (role gate)", async () => {
    mockAuth.mockResolvedValue(sessionAs({ id: staffA.id, role: "LAB_STAFF", labId: labA.id }));
    const result = await updateLabProfile(
      undefined,
      fd({ name: "Hijacked", address: "x", city: "x", contactEmail: "x@x.test" }),
    );
    expect(result).toBe("Only a lab admin can edit the lab profile.");
  });
});

describe("labs.ts — platform-admin only (role, not tenant, boundary)", () => {
  it("blocks a LAB_ADMIN session from approving labs", async () => {
    mockAuth.mockResolvedValue(sessionAs({ id: adminA.id, role: "LAB_ADMIN", labId: labA.id }));
    await expectForbidden(approveLab(undefined, fd({ labId: labB.id })));
  });
});

describe("appointments.ts — patient-scoped", () => {
  it("blocks patient B from cancelling patient A's appointment", async () => {
    const appointment = await prisma.appointment.create({
      data: { patientId: patientA.id, labId: labA.id, offeringId: offeringA.id, slotDatetime: new Date() },
    });

    mockAuth.mockResolvedValue(sessionAs({ id: patientB.id, role: "PATIENT" }));
    const result = await cancelAppointment(undefined, fd({ appointmentId: appointment.id }));

    expect(result).toBeTruthy();
    expect((await prisma.appointment.findUnique({ where: { id: appointment.id } }))?.status).toBe("BOOKED");
  });

  it("lets patient A cancel their own appointment", async () => {
    const appointment = await prisma.appointment.create({
      data: { patientId: patientA.id, labId: labA.id, offeringId: offeringA.id, slotDatetime: new Date() },
    });

    mockAuth.mockResolvedValue(sessionAs({ id: patientA.id, role: "PATIENT" }));
    expect(await cancelAppointment(undefined, fd({ appointmentId: appointment.id }))).toBeUndefined();
    expect((await prisma.appointment.findUnique({ where: { id: appointment.id } }))?.status).toBe("CANCELLED");
  });
});
