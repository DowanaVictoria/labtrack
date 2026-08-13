import "server-only";

/**
 * In-memory sliding-window limiter — a baseline brute-force guard for a
 * single-instance pilot deployment (NFR8: scaling is documented, not built).
 * State is per-process: it resets on redeploy and doesn't share across
 * instances behind a load balancer. A production-scale deployment should
 * replace this with a shared store (e.g. Redis) keyed the same way.
 */
export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  function currentEntry(key: string) {
    const entry = attempts.get(key);
    if (entry && Date.now() > entry.resetAt) {
      attempts.delete(key);
      return undefined;
    }
    return entry;
  }

  return {
    isLimited(key: string): boolean {
      const entry = currentEntry(key);
      return (entry?.count ?? 0) >= maxAttempts;
    },
    recordFailure(key: string): void {
      const entry = currentEntry(key);
      if (entry) {
        entry.count += 1;
      } else {
        attempts.set(key, { count: 1, resetAt: Date.now() + windowMs });
      }
    },
    reset(key: string): void {
      attempts.delete(key);
    },
  };
}
