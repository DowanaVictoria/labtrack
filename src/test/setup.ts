// Global Vitest setup (wired via vitest.config.ts's test.setupFiles) — runs
// before every test file. Mocks the three things Server Actions touch that
// don't work outside a real Next.js request: session lookup, cache
// revalidation, and outbound email. `mockAuth` is exported so individual
// tests can set `mockAuth.mockResolvedValue(session)` per case.
import { vi } from "vitest";

const hoisted = vi.hoisted(() => ({ mockAuth: vi.fn() }));
export const mockAuth = hoisted.mockAuth;

vi.mock("@/auth", () => ({ auth: hoisted.mockAuth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendStaffAccountCreatedEmail: vi.fn().mockResolvedValue({ sent: true }),
  sendAppointmentBookedEmail: vi.fn().mockResolvedValue({ sent: true }),
  sendAppointmentCancelledEmail: vi.fn().mockResolvedValue({ sent: true }),
}));
