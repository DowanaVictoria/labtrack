// Global Vitest setup (wired via vitest.config.ts's test.setupFiles) — runs
// before every test file. Mocks the three things Server Actions touch that
// don't work outside a real Next.js request: session lookup, cache
// revalidation, and outbound email. `mockAuth` is exported so individual
// tests can set `mockAuth.mockResolvedValue(session)` per case.
import { vi } from "vitest";

const hoisted = vi.hoisted(() => ({ mockAuth: vi.fn(), mockSignIn: vi.fn(), mockSignOut: vi.fn() }));
export const mockAuth = hoisted.mockAuth;
export const mockSignIn = hoisted.mockSignIn;
export const mockSignOut = hoisted.mockSignOut;

vi.mock("@/auth", () => ({ auth: hoisted.mockAuth, signIn: hoisted.mockSignIn, signOut: hoisted.mockSignOut }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendStaffAccountCreatedEmail: vi.fn().mockResolvedValue({ sent: true }),
  sendAppointmentBookedEmail: vi.fn().mockResolvedValue({ sent: true }),
  sendAppointmentCancelledEmail: vi.fn().mockResolvedValue({ sent: true }),
}));
