// Regression coverage for FR28 (docs/SRS.md): a lab admin can add a new test
// to their OWN lab's private catalog. Unlike the original shared-catalog
// version of this feature, Test is now fully tenant-scoped, so this also
// covers the isolation boundary directly: two different labs must be able to
// create a test with the identical name without colliding, and neither lab
// can see the other's tests at all.
import { afterAll, beforeAll, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { mockAuth } from "@/test/setup";
import { expectForbidden, expectRedirect, fd, sessionAs } from "@/test/helpers";

const { createTest } = await import("@/app/actions/tests");

let labA: { id: string };
let labB: { id: string };
let labAdminA: { id: string };
let labAdminB: { id: string };
let labStaffA: { id: string };
const testIds: string[] = [];

beforeAll(async () => {
  labA = await prisma.lab.create({
    data: { name: `Catalog Test Lab A ${Date.now()}`, address: "1 Main St", city: "Osu", contactEmail: `catalog-a-${Date.now()}@test.local`, status: "APPROVED" },
  });
  labB = await prisma.lab.create({
    data: { name: `Catalog Test Lab B ${Date.now()}`, address: "2 High St", city: "Tema", contactEmail: `catalog-b-${Date.now()}@test.local`, status: "APPROVED" },
  });
  labAdminA = await prisma.user.create({
    data: { name: "Lab Admin A", email: `catalog-admin-a-${Date.now()}@test.local`, passwordHash: "x", role: "LAB_ADMIN", labId: labA.id },
  });
  labAdminB = await prisma.user.create({
    data: { name: "Lab Admin B", email: `catalog-admin-b-${Date.now()}@test.local`, passwordHash: "x", role: "LAB_ADMIN", labId: labB.id },
  });
  labStaffA = await prisma.user.create({
    data: { name: "Lab Staff A", email: `catalog-staff-a-${Date.now()}@test.local`, passwordHash: "x", role: "LAB_STAFF", labId: labA.id },
  });
});

afterAll(async () => {
  await prisma.test.deleteMany({ where: { id: { in: testIds } } });
  await prisma.user.deleteMany({ where: { id: { in: [labAdminA.id, labAdminB.id, labStaffA.id] } } });
  await prisma.lab.deleteMany({ where: { id: { in: [labA.id, labB.id] } } });
});

it("lets a LAB_ADMIN create a new test in their own lab's catalog", async () => {
  mockAuth.mockResolvedValue(sessionAs({ id: labAdminA.id, role: "LAB_ADMIN", labId: labA.id }));

  const name = `Vitamin D Panel ${Date.now()}`;
  const result = await createTest(undefined, fd({ name, category: "Blood", sampleType: "Serum", description: "" }));
  expect(result).toBeUndefined();

  const created = await prisma.test.findFirst({ where: { name } });
  expect(created).not.toBeNull();
  expect(created?.labId).toBe(labA.id);
  expect(created?.category).toBe("Blood");
  expect(created?.sampleType).toBe("Serum");
  if (created) testIds.push(created.id);
});

it("rejects a case-insensitive duplicate name within the SAME lab's catalog", async () => {
  mockAuth.mockResolvedValue(sessionAs({ id: labAdminA.id, role: "LAB_ADMIN", labId: labA.id }));

  const name = `Thyroid Panel ${Date.now()}`;
  const first = await createTest(undefined, fd({ name, category: "Blood", sampleType: "Serum", description: "" }));
  expect(first).toBeUndefined();
  const created = await prisma.test.findFirst({ where: { name, labId: labA.id } });
  if (created) testIds.push(created.id);

  const dupe = await createTest(undefined, fd({ name: name.toUpperCase(), category: "Blood", sampleType: "Serum", description: "" }));
  expect(dupe).toContain("already have a test");
  expect(await prisma.test.count({ where: { labId: labA.id, name: { equals: name, mode: "insensitive" } } })).toBe(1);
});

it("lets a DIFFERENT lab create a test with the identical name, no collision", async () => {
  const name = `Malaria RDT ${Date.now()}`;

  mockAuth.mockResolvedValue(sessionAs({ id: labAdminA.id, role: "LAB_ADMIN", labId: labA.id }));
  const resultA = await createTest(undefined, fd({ name, category: "Blood", sampleType: "Whole blood", description: "" }));
  expect(resultA).toBeUndefined();

  mockAuth.mockResolvedValue(sessionAs({ id: labAdminB.id, role: "LAB_ADMIN", labId: labB.id }));
  const resultB = await createTest(undefined, fd({ name, category: "Blood", sampleType: "Whole blood", description: "" }));
  expect(resultB).toBeUndefined();

  const rows = await prisma.test.findMany({ where: { name } });
  expect(rows).toHaveLength(2);
  expect(new Set(rows.map((r) => r.labId))).toEqual(new Set([labA.id, labB.id]));
  for (const r of rows) testIds.push(r.id);
});

it("never lets lab B see or read lab A's tests", async () => {
  mockAuth.mockResolvedValue(sessionAs({ id: labAdminA.id, role: "LAB_ADMIN", labId: labA.id }));
  const name = `Private To Lab A ${Date.now()}`;
  await createTest(undefined, fd({ name, category: "Hormone", sampleType: "Serum", description: "" }));
  const created = await prisma.test.findFirst({ where: { name } });
  if (created) testIds.push(created.id);
  expect(created).not.toBeNull();

  mockAuth.mockResolvedValue(sessionAs({ id: labAdminB.id, role: "LAB_ADMIN", labId: labB.id }));
  const visibleToB = await createTest(undefined, fd({ name, category: "Hormone", sampleType: "Serum", description: "" }));
  // Lab B has no visibility into lab A's test at all, so creating the same
  // name from lab B must succeed (not be rejected as a "duplicate") — there
  // is nothing in lab B's own catalog to collide with.
  expect(visibleToB).toBeUndefined();
  const bothRows = await prisma.test.findMany({ where: { name } });
  expect(bothRows).toHaveLength(2);
  for (const r of bothRows) testIds.push(r.id);
});

it("forbids a LAB_STAFF session from creating a catalog test", async () => {
  mockAuth.mockResolvedValue(sessionAs({ id: labStaffA.id, role: "LAB_STAFF", labId: labA.id }));

  await expectForbidden(
    createTest(undefined, fd({ name: `Should Not Exist ${Date.now()}`, category: "Blood", sampleType: "Serum", description: "" })),
  );
});

it("redirects to /login when there is no session at all", async () => {
  mockAuth.mockResolvedValue(null);

  await expectRedirect(
    createTest(undefined, fd({ name: `Should Not Exist ${Date.now()}`, category: "Blood", sampleType: "Serum", description: "" })),
    "/login",
  );
});
