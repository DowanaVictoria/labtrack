// Regression coverage for FR28 (docs/SRS.md §5): a lab admin can add a new
// test to the shared platform catalog. Covers the access-control gate
// (LAB_ADMIN only, LAB_STAFF forbidden, no session redirects) and the
// case-insensitive duplicate-name safeguard added because tenant-scope.ts's
// Test model has no other gate against catalog fragmentation.
import { afterAll, beforeAll, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { mockAuth } from "@/test/setup";
import { expectForbidden, expectRedirect, fd, sessionAs } from "@/test/helpers";

const { createTest } = await import("@/app/actions/tests");

let lab: { id: string };
let labAdmin: { id: string };
let labStaff: { id: string };
const testIds: string[] = [];

beforeAll(async () => {
  lab = await prisma.lab.create({
    data: { name: `Catalog Test Lab ${Date.now()}`, address: "1 Main St", city: "Osu", contactEmail: `catalog-${Date.now()}@test.local`, status: "APPROVED" },
  });
  labAdmin = await prisma.user.create({
    data: { name: "Lab Admin", email: `catalog-admin-${Date.now()}@test.local`, passwordHash: "x", role: "LAB_ADMIN", labId: lab.id },
  });
  labStaff = await prisma.user.create({
    data: { name: "Lab Staff", email: `catalog-staff-${Date.now()}@test.local`, passwordHash: "x", role: "LAB_STAFF", labId: lab.id },
  });
});

afterAll(async () => {
  await prisma.test.deleteMany({ where: { id: { in: testIds } } });
  await prisma.user.deleteMany({ where: { id: { in: [labAdmin.id, labStaff.id] } } });
  await prisma.lab.delete({ where: { id: lab.id } });
});

it("lets a LAB_ADMIN create a new test in the shared catalog", async () => {
  mockAuth.mockResolvedValue(sessionAs({ id: labAdmin.id, role: "LAB_ADMIN", labId: lab.id }));

  const name = `Vitamin D Panel ${Date.now()}`;
  const result = await createTest(undefined, fd({ name, category: "Blood", sampleType: "Serum", description: "" }));
  expect(result).toBeUndefined();

  const created = await prisma.test.findFirst({ where: { name } });
  expect(created).not.toBeNull();
  expect(created?.category).toBe("Blood");
  expect(created?.sampleType).toBe("Serum");
  if (created) testIds.push(created.id);
});

it("rejects a case-insensitive duplicate name instead of creating a second entry", async () => {
  mockAuth.mockResolvedValue(sessionAs({ id: labAdmin.id, role: "LAB_ADMIN", labId: lab.id }));

  const name = `Thyroid Panel ${Date.now()}`;
  const first = await createTest(undefined, fd({ name, category: "Blood", sampleType: "Serum", description: "" }));
  expect(first).toBeUndefined();
  const created = await prisma.test.findFirst({ where: { name } });
  if (created) testIds.push(created.id);

  const dupe = await createTest(undefined, fd({ name: name.toUpperCase(), category: "Blood", sampleType: "Serum", description: "" }));
  expect(dupe).toContain("already exists");
  expect(await prisma.test.count({ where: { name: { equals: name, mode: "insensitive" } } })).toBe(1);
});

it("forbids a LAB_STAFF session from creating a catalog test", async () => {
  mockAuth.mockResolvedValue(sessionAs({ id: labStaff.id, role: "LAB_STAFF", labId: lab.id }));

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
