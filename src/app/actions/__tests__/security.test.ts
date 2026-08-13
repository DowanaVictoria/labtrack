// Light security check (todo.md Phase 4): auth bypass attempts, access
// control on routes, and injection safety. Tenant-boundary bypass is
// tenant-isolation.test.ts's dedicated concern.
//
// SQL/NoSQL injection: grepping src/ and scripts/ turns up zero uses of
// $queryRaw/$executeRaw/*Unsafe — every query goes through Prisma's
// generated, parameterized query builder, which structurally rules out
// string-built SQL. There's nothing to "bypass" the way a hand-written
// query could be, so instead of a contrived injection attempt against
// nothing, this proves the actual guarantee: a classic injection payload
// used as ordinary user input survives round-trip as inert data, never as
// executed SQL or a logic bypass.
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { mockAuth } from "@/test/setup";
import { expectRedirect, fd, sessionAs } from "@/test/helpers";

const { updateOffering } = await import("@/app/actions/offerings");
const { updateLabProfile } = await import("@/app/actions/lab-profile");
const { registerPatient } = await import("@/app/actions/register");

const createdEmails: string[] = [];
let lab: { id: string };
let admin: { id: string };
let testId: string;
let offering: { id: string };

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  if (offering) await prisma.labTestOffering.deleteMany({ where: { id: offering.id } });
  if (admin) await prisma.user.delete({ where: { id: admin.id } });
  if (lab) await prisma.lab.delete({ where: { id: lab.id } });
  if (testId) await prisma.test.delete({ where: { id: testId } });
});

describe("auth bypass — no session at all", () => {
  it("redirects to /login instead of running a lab-scoped mutation", async () => {
    mockAuth.mockResolvedValue(null);
    await expectRedirect(
      updateOffering(undefined, fd({ offeringId: "does-not-matter", price: "1", turnaroundHours: "1", prepInstructions: "" })),
      "/login",
    );
  });

  it("redirects to /login instead of running a lab-profile mutation", async () => {
    mockAuth.mockResolvedValue(null);
    await expectRedirect(
      updateLabProfile(undefined, fd({ name: "x", address: "x", city: "x", contactEmail: "x@x.test" })),
      "/login",
    );
  });
});

describe("injection-payload safety", () => {
  it("stores a classic SQLi payload as inert literal text, not executed SQL", async () => {
    const test = await prisma.test.create({
      data: { name: `Security Test ${Date.now()}`, category: "Blood", sampleType: "Serum" },
    });
    testId = test.id;
    lab = await prisma.lab.create({
      data: { name: "Security-Test Lab", address: "1 Main St", city: "Osu", contactEmail: "sec@lab.test", status: "APPROVED" },
    });
    admin = await prisma.user.create({
      data: { name: "Admin", email: `security-admin-${Date.now()}@test.local`, passwordHash: "x", role: "LAB_ADMIN", labId: lab.id },
    });
    offering = await prisma.labTestOffering.create({ data: { labId: lab.id, testId, price: 10, turnaroundHours: 1 } });

    mockAuth.mockResolvedValue(sessionAs({ id: admin.id, role: "LAB_ADMIN", labId: lab.id }));

    const payload = "'; DROP TABLE users; --";
    const result = await updateLabProfile(
      undefined,
      fd({ name: payload, address: payload, city: "Osu", contactEmail: "sec@lab.test" }),
    );
    expect(result).toBeUndefined();

    // The `users` table is still there and unaffected, and the payload was
    // stored verbatim rather than interpreted.
    const labAfter = await prisma.lab.findUnique({ where: { id: lab.id } });
    expect(labAfter?.name).toBe(payload);
    await expect(prisma.user.count()).resolves.toBeGreaterThan(0);
  });

  it("rejects a script-tag payload in registration only where validation already requires a real email — proves input isn't blindly trusted downstream", async () => {
    // registerPatient's email field is real Zod validation (z.email()), not
    // an injection-specific filter — this documents that a hostile-looking
    // string doesn't get special-cased into passing.
    const email = `<script>alert(1)</script>@test.local`;
    const result = await registerPatient(undefined, fd({ name: "Test User", email, password: "correct-horse" }));
    expect(result).toBe("Enter a valid email address.");
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });
});
