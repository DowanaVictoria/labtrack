// Unit test for the login brute-force limiter (todo.md Phase 4: "login/logout"
// coverage — this is the actual custom logic src/auth.ts's authorize() relies
// on; the surrounding NextAuth credentials flow itself is third-party and
// exercised live per todo.md's Phase 3 security-controls entry). Pure logic,
// no DB/mocks needed.
import { describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  it("allows attempts under the limit, then blocks at the limit", () => {
    const limiter = createRateLimiter(3, 1000);
    expect(limiter.isLimited("a@test.local")).toBe(false);
    limiter.recordFailure("a@test.local");
    limiter.recordFailure("a@test.local");
    expect(limiter.isLimited("a@test.local")).toBe(false); // 2 failures, limit is 3
    limiter.recordFailure("a@test.local");
    expect(limiter.isLimited("a@test.local")).toBe(true); // 3rd failure hits the limit
  });

  it("is keyed independently per key (per-email, not global)", () => {
    const limiter = createRateLimiter(1, 1000);
    limiter.recordFailure("a@test.local");
    expect(limiter.isLimited("a@test.local")).toBe(true);
    expect(limiter.isLimited("b@test.local")).toBe(false);
  });

  it("resets on success", () => {
    const limiter = createRateLimiter(1, 1000);
    limiter.recordFailure("a@test.local");
    expect(limiter.isLimited("a@test.local")).toBe(true);
    limiter.reset("a@test.local");
    expect(limiter.isLimited("a@test.local")).toBe(false);
  });

  it("clears the window after it expires", () => {
    vi.useFakeTimers();
    try {
      const limiter = createRateLimiter(1, 1000);
      limiter.recordFailure("a@test.local");
      expect(limiter.isLimited("a@test.local")).toBe(true);
      vi.advanceTimersByTime(1001);
      expect(limiter.isLimited("a@test.local")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
