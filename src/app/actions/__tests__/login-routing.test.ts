import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { mockSignIn } from "@/test/setup";
import { fd } from "@/test/helpers";

const { login } = await import("@/app/actions/auth");

const createdEmails: string[] = [];
const createdLabIds: string[] = [];

beforeEach(() => {
  mockSignIn.mockReset();
  mockSignIn.mockResolvedValue(undefined);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  await prisma.lab.deleteMany({ where: { id: { in: createdLabIds } } });
});

async function createUser(role: "PATIENT" | "LAB_ADMIN" | "LAB_STAFF" | "PLATFORM_ADMIN") {
  const email = `login-routing-${role.toLowerCase()}-${Date.now()}-${createdEmails.length}@test.local`;
  createdEmails.push(email);
  const lab =
    role === "LAB_ADMIN" || role === "LAB_STAFF"
      ? await prisma.lab.create({
          data: {
            name: `Login Routing Lab ${Date.now()}`,
            address: "1 Main St",
            city: "Osu",
            contactEmail: email,
            status: "APPROVED",
          },
        })
      : null;

  if (lab) {
    createdLabIds.push(lab.id);
  }

  await prisma.user.create({
    data: {
      name: "Login User",
      email,
      passwordHash: "not-used-by-mocked-signin",
      role,
      labId: lab?.id,
    },
  });

  return { email, labId: lab?.id };
}

describe("login role routing", () => {
  it("sends lab admins to their lab dashboard by default", async () => {
    const { email } = await createUser("LAB_ADMIN");
    await login(undefined, fd({ email, password: "correct-horse", callbackUrl: "/" }));

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email,
      password: "correct-horse",
      redirectTo: "/lab",
    });
  });

  it("sends platform admins to the admin dashboard by default", async () => {
    const { email } = await createUser("PLATFORM_ADMIN");
    await login(undefined, fd({ email, password: "correct-horse", callbackUrl: "/" }));

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email,
      password: "correct-horse",
      redirectTo: "/admin",
    });
  });

  it("preserves patient booking callbacks", async () => {
    const { email } = await createUser("PATIENT");
    await login(undefined, fd({ email, password: "correct-horse", callbackUrl: "/patient/book/offering-1" }));

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email,
      password: "correct-horse",
      redirectTo: "/patient/book/offering-1",
    });
  });

  it("does not send a lab admin to a patient callback", async () => {
    const { email } = await createUser("LAB_ADMIN");
    await login(undefined, fd({ email, password: "correct-horse", callbackUrl: "/patient/book/offering-1" }));

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email,
      password: "correct-horse",
      redirectTo: "/lab",
    });
  });
});
