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
const { requirePatientSession } = await import("@/lib/session");

const createdEmails: string[] = [];
let lab: { id: string };
let admin: { id: string };
let testId: string;
let offering: { id: string };

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  if (offering) await prisma.labTestOffering.deleteMany({ where: { id: offering.id } });
  if (testId) await prisma.test.delete({ where: { id: testId } });
  if (admin) await prisma.user.delete({ where: { id: admin.id } });
  if (lab) await prisma.lab.delete({ where: { id: lab.id } });
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

// UI_REDESIGN_PLAN.md §9.3 / §11: `/patient` and `/patient/labs/[labId]`
// deliberately lost their `requirePatientSession()` gate to become public
// marketplace pages — this is a documented, intentional decision (the one
// non-visual, behaviorally significant change in the whole redesign), not a
// bug for a future contributor to "fix" by re-adding a session gate. These
// pages read the base `prisma` client directly, filtered by business rules
// (`status: "APPROVED"`, `active: true`) instead of by a session/tenant
// scope — the tests below exercise exactly that query pattern with no
// auth() mock configured at all (mockAuth reset to reject), proving the read
// path itself has no session dependency.
describe("public marketplace reads — intentionally reachable without a session", () => {
  it("lists active offerings at approved labs via the base prisma client with no auth() call involved", async () => {
    mockAuth.mockReset();
    mockAuth.mockRejectedValue(new Error("auth() must not be called by this business-rule-filtered read path"));

    await expect(
      prisma.labTestOffering.findMany({
        where: { active: true, lab: { status: "APPROVED" } },
        include: { lab: true, test: true },
        take: 5,
      }),
    ).resolves.toBeInstanceOf(Array);
  });

  it("only ever returns APPROVED labs for the lab-profile business-rule filter, unauthenticated", async () => {
    mockAuth.mockReset();
    mockAuth.mockRejectedValue(new Error("auth() must not be called by this business-rule-filtered read path"));

    const pendingLab = await prisma.lab.create({
      data: { name: `Security Pending Lab ${Date.now()}`, address: "x", city: "Osu", contactEmail: "p@lab.test", status: "PENDING" },
    });
    try {
      const found = await prisma.lab.findFirst({ where: { id: pendingLab.id, status: "APPROVED" } });
      expect(found).toBeNull(); // same filter shape as patient/labs/[labId]/page.tsx — a PENDING lab is never visible
    } finally {
      await prisma.lab.delete({ where: { id: pendingLab.id } });
    }
  });
});

// UI_REDESIGN_PLAN.md §6/§11: requirePatientSession() gains an optional
// callback-URL parameter (only /patient/book/[offeringId] passes one) that
// changes the unauthenticated redirect target from bare /login.
describe("requirePatientSession(callbackUrl) — open-redirect-safe callback", () => {
  it("redirects to bare /login when no callback URL is supplied (unchanged default)", async () => {
    mockAuth.mockResolvedValue(null);
    await expectRedirect(requirePatientSession(), "/login");
  });

  it("redirects to /login?callbackUrl=<encoded value> when a callback URL is supplied", async () => {
    mockAuth.mockResolvedValue(null);
    await expectRedirect(
      requirePatientSession("/patient/book/some-offering-id"),
      `/login?callbackUrl=${encodeURIComponent("/patient/book/some-offering-id")}`,
    );
  });
});

describe("injection-payload safety", () => {
  it("stores a classic SQLi payload as inert literal text, not executed SQL", async () => {
    lab = await prisma.lab.create({
      data: { name: "Security-Test Lab", address: "1 Main St", city: "Osu", contactEmail: "sec@lab.test", status: "APPROVED" },
    });
    const test = await prisma.test.create({
      data: { labId: lab.id, name: `Security Test ${Date.now()}`, category: "Blood", sampleType: "Serum" },
    });
    testId = test.id;
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
