// Smoke test for docs/System_Design.md §2's core promise: a lab_staff/lab_admin
// session can never read or write another lab's data. Run with:
//   npm run verify:tenant-isolation
import { prisma } from "@/lib/prisma";
import { forPatient, forTenant, TenantIsolationError } from "@/lib/tenant-scope";

async function main() {
  const test = await prisma.test.create({
    data: { name: "Lipid Panel", category: "Blood", sampleType: "Serum" },
  });

  const labA = await prisma.lab.create({
    data: { name: "CityLab Diagnostics", address: "1 Main St", city: "Osu", contactEmail: "a@citylab.test", status: "APPROVED" },
  });
  const labB = await prisma.lab.create({
    data: { name: "QuickTest Labs", address: "2 High St", city: "Tema", contactEmail: "b@quicktest.test", status: "APPROVED" },
  });
  const patient = await prisma.user.create({
    data: { name: "Ama Owusu", email: `patient-${Date.now()}@test.local`, passwordHash: "x", role: "PATIENT" },
  });
  const patientB = await prisma.user.create({
    data: { name: "Kofi Mensah", email: `patient-b-${Date.now()}@test.local`, passwordHash: "x", role: "PATIENT" },
  });
  const staffB = await prisma.user.create({
    data: { name: "QuickTest Staff", email: `staff-b-${Date.now()}@test.local`, passwordHash: "x", role: "LAB_STAFF", labId: labB.id },
  });

  try {
    await runChecks(test.id, labA.id, labB.id, patient.id, patientB.id, staffB.id);
    console.log("All tenant-isolation checks passed.");
  } finally {
    // Runs even when an assertion throws — a failed check must never leave
    // stray rows in the dev database for the next run to trip over.
    await prisma.sample.deleteMany({ where: { appointment: { labId: { in: [labA.id, labB.id] } } } });
    await prisma.appointment.deleteMany({ where: { labId: { in: [labA.id, labB.id] } } });
    await prisma.labTestOffering.deleteMany({ where: { testId: test.id } });
    // Covers patient/patientB/staffB by id, plus any staff/admin the user.*
    // checks created mid-test (staffA/adminA) in case an earlier assertion
    // threw before runChecks reached its own cleanup line for those.
    await prisma.user.deleteMany({
      where: { OR: [{ id: { in: [patient.id, patientB.id, staffB.id] } }, { labId: { in: [labA.id, labB.id] } }] },
    });
    await prisma.lab.deleteMany({ where: { id: { in: [labA.id, labB.id] } } });
    await prisma.test.delete({ where: { id: test.id } });
  }
}

async function runChecks(
  testId: string,
  labAId: string,
  labBId: string,
  patientId: string,
  patientBId: string,
  staffBId: string,
) {
  const asA = forTenant(labAId);
  const asB = forTenant(labBId);

  const offeringA = await asA.labTestOffering.create({
    data: { testId, price: 80, turnaroundHours: 24 } as never,
  });
  const offeringB = await asB.labTestOffering.create({
    data: { testId, price: 65, turnaroundHours: 48 } as never,
  });

  // The bug that slipped past the first version of this script: findMany()
  // called with NO where at all — a completely normal call shape — must
  // still come back scoped, not silently return every tenant's rows.
  const allViaB = await asB.labTestOffering.findMany();
  assert(
    allViaB.length === 1 && allViaB[0].labId === labBId,
    "FAIL: labTestOffering.findMany() with no `where` leaked across tenants",
  );

  const leaked = await asB.labTestOffering.findUnique({ where: { id: offeringA.id } });
  assert(leaked === null, "FAIL: lab B read lab A's offering by id");

  let blocked = false;
  try {
    await asB.labTestOffering.update({ where: { id: offeringA.id }, data: { price: 1 } });
  } catch {
    blocked = true;
  }
  const stillOriginal = await prisma.labTestOffering.findUnique({ where: { id: offeringA.id } });
  assert(blocked || stillOriginal?.price.toString() === "80", "FAIL: lab B updated lab A's offering");

  const ownRead = await asA.labTestOffering.findUnique({ where: { id: offeringA.id } });
  assert(ownRead !== null, "FAIL: lab A could not read its own offering");

  // Appointment: create, cross-tenant read/count leakage, no-where findMany.
  const appointmentA = await asA.appointment.create({
    data: {
      patientId,
      offeringId: offeringA.id,
      slotDatetime: new Date(),
    } as never,
  });
  assert(
    (await asB.appointment.findMany()).length === 0,
    "FAIL: lab B's no-where appointment.findMany() saw lab A's appointment",
  );
  assert(
    (await asB.appointment.count()) === 0,
    "FAIL: lab B's appointment.count() (no where) counted lab A's appointment",
  );

  // An Appointment's offeringId has a real FK to LabTestOffering, but that
  // FK alone doesn't guarantee the offering belongs to the same lab — that
  // invariant is app-level, so it needs its own check on create AND update.
  let crossLabOfferingBlocked = false;
  try {
    await asB.appointment.create({
      data: { patientId, offeringId: offeringA.id, slotDatetime: new Date() } as never,
    });
  } catch (e) {
    crossLabOfferingBlocked = e instanceof TenantIsolationError;
  }
  assert(crossLabOfferingBlocked, "FAIL: lab B created an Appointment pointing at lab A's offering");

  let reassignBlocked = false;
  try {
    await asA.appointment.update({ where: { id: appointmentA.id }, data: { offeringId: offeringB.id } });
  } catch (e) {
    reassignBlocked = e instanceof TenantIsolationError;
  }
  assert(reassignBlocked, "FAIL: lab A reassigned its own appointment to lab B's offering");

  // Sample: scoped transitively through Appointment. Creating a sample
  // against another lab's appointment must be refused outright.
  let sampleBlocked = false;
  try {
    await asB.sample.create({ data: { appointmentId: appointmentA.id } });
  } catch (e) {
    sampleBlocked = e instanceof TenantIsolationError;
  }
  assert(sampleBlocked, "FAIL: lab B created a Sample against lab A's appointment");

  // collectedByStaffId has a real FK to User, but that alone doesn't say
  // which lab the staff member belongs to — must be checked explicitly,
  // same class of gap as offeringId/appointmentId above.
  let staffMismatchBlocked = false;
  try {
    await asA.sample.create({ data: { appointmentId: appointmentA.id, collectedByStaffId: staffBId } });
  } catch (e) {
    staffMismatchBlocked = e instanceof TenantIsolationError;
  }
  assert(staffMismatchBlocked, "FAIL: lab A created a Sample crediting lab B's staff member");

  const sampleA = await asA.sample.create({ data: { appointmentId: appointmentA.id } });
  assert(
    (await asB.sample.findUnique({ where: { id: sampleA.id } })) === null,
    "FAIL: lab B read lab A's sample via its own id",
  );
  assert(
    (await asA.sample.findUnique({ where: { id: sampleA.id } })) !== null,
    "FAIL: lab A could not read its own sample",
  );

  let sampleUpdateBlocked = false;
  try {
    await asB.sample.update({ where: { id: sampleA.id }, data: { notes: "hijacked" } });
  } catch {
    sampleUpdateBlocked = true;
  }
  const sampleStillOriginal = await prisma.sample.findUnique({ where: { id: sampleA.id } });
  assert(sampleUpdateBlocked || sampleStillOriginal?.notes === null, "FAIL: lab B updated lab A's sample");

  let sampleDeleteBlocked = false;
  try {
    await asB.sample.delete({ where: { id: sampleA.id } });
  } catch {
    sampleDeleteBlocked = true;
  }
  assert(sampleDeleteBlocked, "FAIL: lab B deleted lab A's sample");
  assert((await prisma.sample.findUnique({ where: { id: sampleA.id } })) !== null, "FAIL: lab A's sample was deleted by lab B");

  await asA.sample.update({ where: { id: sampleA.id }, data: { notes: "own update ok" } });
  assert(
    (await prisma.sample.findUnique({ where: { id: sampleA.id } }))?.notes === "own update ok",
    "FAIL: lab A could not update its own sample",
  );

  // Lab itself: own-lab reads work, cross-lab reads don't, create/delete refused.
  assert((await asA.lab.findUnique({ where: { id: labAId } })) !== null, "FAIL: lab A could not read its own Lab row");
  assert((await asB.lab.findUnique({ where: { id: labAId } })) === null, "FAIL: lab B read lab A's Lab row");
  assert((await asA.lab.findMany()).length === 1, "FAIL: lab.findMany() with no where returned more than the caller's own lab");

  try {
    await asA.lab.create({ data: { name: "Sneaky Lab", address: "x", city: "x", contactEmail: "x@x.test" } });
    assert(false, "FAIL: tenant-scoped client allowed lab.create");
  } catch (e) {
    assert(e instanceof TenantIsolationError, "FAIL: wrong error type blocking lab.create");
  }

  // Test is the platform-wide catalog, not lab-scoped — reads pass through,
  // but a tenant-scoped client must never be able to write to it.
  assert((await asA.test.findMany()).some((t) => t.id === testId), "FAIL: lab A could not read the platform test catalog");
  try {
    await asA.test.update({ where: { id: testId }, data: { name: "Hijacked" } });
    assert(false, "FAIL: tenant-scoped client allowed test.update");
  } catch (e) {
    assert(e instanceof TenantIsolationError, "FAIL: wrong error type blocking test.update");
  }

  // --- forPatient(): scoped by patientId instead of labId ---
  const asPatientA = forPatient(patientId);
  const asPatientB = forPatient(patientBId);

  // Book with lab A. A caller-supplied labId must be ignored/overridden —
  // labId is always re-derived from offeringId, not trusted from the client.
  const bookingA = await asPatientA.appointment.create({
    data: { offeringId: offeringA.id, slotDatetime: new Date(Date.now() + 86_400_000), labId: labBId } as never,
  });
  assert(bookingA.labId === labAId, "FAIL: forPatient trusted a caller-supplied labId instead of deriving it from offeringId");
  assert(bookingA.patientId === patientId, "FAIL: forPatient did not force patientId on create");

  assert(
    (await asPatientB.appointment.findMany()).length === 0,
    "FAIL: patient B's no-where appointment.findMany() saw patient A's booking",
  );
  assert(
    (await asPatientB.appointment.findUnique({ where: { id: bookingA.id } })) === null,
    "FAIL: patient B read patient A's appointment by id",
  );
  assert(
    (await asPatientA.appointment.findUnique({ where: { id: bookingA.id } })) !== null,
    "FAIL: patient A could not read their own appointment",
  );

  let patientUpdateBlocked = false;
  try {
    await asPatientB.appointment.update({ where: { id: bookingA.id }, data: { status: "CANCELLED" } });
  } catch {
    patientUpdateBlocked = true;
  }
  const bookingStillBooked = await prisma.appointment.findUnique({ where: { id: bookingA.id } });
  assert(patientUpdateBlocked || bookingStillBooked?.status === "BOOKED", "FAIL: patient B updated patient A's appointment");

  // Everything except Appointment must be refused outright through a
  // patient-scoped client — search goes through the base client instead.
  for (const [label, run] of [
    ["lab.findMany", () => asPatientA.lab.findMany()],
    ["labTestOffering.findMany", () => asPatientA.labTestOffering.findMany()],
    ["test.findMany", () => asPatientA.test.findMany()],
    ["sample.findMany", () => asPatientA.sample.findMany()],
  ] as const) {
    let patientBlocked = false;
    try {
      await run();
    } catch (e) {
      patientBlocked = e instanceof TenantIsolationError;
    }
    assert(patientBlocked, `FAIL: patient-scoped client allowed ${label}`);
  }

  // --- User (FR19): lab_admin creates/removes LAB_STAFF for their own lab ---
  const staffA = await asA.user.create({
    data: {
      name: "Sneaky Staff",
      email: `staff-a-${Date.now()}@test.local`,
      passwordHash: "x",
      role: "LAB_ADMIN", // must be forced to LAB_STAFF regardless
      labId: labBId, // must be forced to labAId regardless
    } as never,
  });
  assert(staffA.role === "LAB_STAFF", "FAIL: user.create allowed escalating role to LAB_ADMIN");
  assert(staffA.labId === labAId, "FAIL: user.create trusted a caller-supplied labId instead of forcing the caller's own");

  assert(
    (await asB.user.findMany({ where: { id: staffA.id } })).length === 0,
    "FAIL: lab B's user.findMany() saw lab A's new staff account",
  );

  let crossLabStaffDeleteBlocked = false;
  try {
    await asB.user.delete({ where: { id: staffA.id } });
  } catch {
    crossLabStaffDeleteBlocked = true;
  }
  const staffAStillExists = (await prisma.user.findUnique({ where: { id: staffA.id } })) !== null;
  assert(crossLabStaffDeleteBlocked || staffAStillExists, "FAIL: lab B deleted lab A's staff account");

  // Even an admin-role account within the caller's own lab must not be
  // deletable this way — the role forced into the delete's where means
  // only LAB_STAFF rows can ever match.
  const adminA = await prisma.user.create({
    data: { name: "Lab A Admin", email: `admin-a-${Date.now()}@test.local`, passwordHash: "x", role: "LAB_ADMIN", labId: labAId },
  });
  let ownAdminDeleteBlocked = false;
  try {
    await asA.user.delete({ where: { id: adminA.id } });
  } catch {
    ownAdminDeleteBlocked = true;
  }
  const adminStillExists = (await prisma.user.findUnique({ where: { id: adminA.id } })) !== null;
  assert(ownAdminDeleteBlocked || adminStillExists, "FAIL: tenant-scoped client deleted a LAB_ADMIN account via user.delete");

  await prisma.user.deleteMany({ where: { id: { in: [staffA.id, adminA.id] } } });
}

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
