// Functional tests for account registration (todo.md Phase 4: "lab
// registration", "login/logout"). registerLab/registerPatient are the
// unauthenticated entry points (no session yet) — they redirect on success
// rather than returning. The bcrypt round-trip check at the end stands in
// for "login works" without fighting NextAuth's cookie/request internals
// (see src/lib/__tests__/rate-limit.test.ts for the other half of login's
// custom logic).
import { afterAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { expectRedirect, fd } from "@/test/helpers";

const { registerLab, registerPatient } = await import("@/app/actions/register");

const createdEmails: string[] = [];
const createdLabIds: string[] = [];

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  await prisma.lab.deleteMany({ where: { id: { in: createdLabIds } } });
});

describe("registerPatient", () => {
  it("creates a PATIENT with a bcrypt-hashed password, then redirects to login", async () => {
    const email = `register-patient-${Date.now()}@test.local`;
    createdEmails.push(email);

    await expectRedirect(
      registerPatient(undefined, fd({ name: "New Patient", email, password: "correct-horse" })),
      "/login",
    );

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.role).toBe("PATIENT");
    expect(user?.passwordHash).not.toBe("correct-horse");
    // Same round-trip src/auth.ts's authorize() performs on login.
    expect(await bcrypt.compare("correct-horse", user!.passwordHash)).toBe(true);
    expect(await bcrypt.compare("wrong-password", user!.passwordHash)).toBe(false);
  });

  it("rejects a duplicate email without creating a second row", async () => {
    const email = `register-dupe-${Date.now()}@test.local`;
    createdEmails.push(email);
    await registerPatient(undefined, fd({ name: "First", email, password: "correct-horse" })).catch(() => {});

    const result = await registerPatient(undefined, fd({ name: "Second", email, password: "another-pass" }));
    expect(result).toBe("An account with that email already exists.");
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });
});

describe("registerLab", () => {
  it("creates a Lab (PENDING) and its LAB_ADMIN atomically, then redirects to login", async () => {
    const adminEmail = `register-lab-admin-${Date.now()}@test.local`;
    createdEmails.push(adminEmail);
    const labName = `Registered Lab ${Date.now()}`;

    await expectRedirect(
      registerLab(
        undefined,
        fd({
          labName,
          address: "1 Main St",
          city: "Osu",
          contactEmail: "contact@lab.test",
          adminName: "Lab Admin",
          adminEmail,
          password: "correct-horse",
        }),
      ),
      "/login",
    );

    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    expect(admin?.role).toBe("LAB_ADMIN");
    expect(admin?.labId).not.toBeNull();
    createdLabIds.push(admin!.labId!);

    const lab = await prisma.lab.findUnique({ where: { id: admin!.labId! } });
    expect(lab?.name).toBe(labName);
    expect(lab?.status).toBe("PENDING"); // docs/System_Design.md §6 — starts pending, not auto-approved
  });

  it("rejects a duplicate admin email without creating a Lab or User", async () => {
    const adminEmail = `register-lab-dupe-${Date.now()}@test.local`;
    createdEmails.push(adminEmail);
    const firstLabName = `First Lab ${Date.now()}`;

    await registerLab(
      undefined,
      fd({
        labName: firstLabName,
        address: "1 Main St",
        city: "Osu",
        contactEmail: "contact@lab.test",
        adminName: "Lab Admin",
        adminEmail,
        password: "correct-horse",
      }),
    ).catch(() => {});
    const firstAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    createdLabIds.push(firstAdmin!.labId!);

    const result = await registerLab(
      undefined,
      fd({
        labName: `Second Lab ${Date.now()}`,
        address: "2 Side St",
        city: "Osu",
        contactEmail: "contact2@lab.test",
        adminName: "Someone Else",
        adminEmail,
        password: "another-pass",
      }),
    );

    expect(result).toBe("An account with that admin email already exists.");
    expect(await prisma.lab.count({ where: { name: { startsWith: "Second Lab" } } })).toBe(0);
  });
});
