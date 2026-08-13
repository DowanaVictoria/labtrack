import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import path from "node:path";

// Mirrors `tsx --env-file=.env` (used by scripts/verify-tenant-isolation.ts)
// so tests hit the same dev DB — Prisma itself doesn't auto-load .env
// (see the note at the top of .env), and Vite's loadEnv() only recognizes
// VITE_-prefixed vars for non-VITE_ keys unless the third arg is "", which
// isn't reliably wired through vitest's config loader across versions.
function loadDotEnv(filePath: string): Record<string, string> {
  let contents: string;
  try {
    contents = readFileSync(filePath, "utf8");
  } catch {
    return {};
  }
  const result: Record<string, string> = {};
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export default defineConfig(() => {
  // Set directly on test.env below (not just process.env here) — the
  // default "forks" worker pool doesn't reliably inherit env mutated at
  // config-load time, only what's explicitly passed through test.env.
  const dotEnv = loadDotEnv(path.resolve(__dirname, ".env"));
  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "server-only": path.resolve(__dirname, "./vitest.server-only-stub.ts"),
      },
    },
    test: {
      environment: "node",
      setupFiles: ["./src/test/setup.ts"],
      // Tests run against the real dev Postgres DB (same as
      // scripts/verify-tenant-isolation.ts) — sequential, not parallel,
      // so fixture setup/teardown across files never races.
      fileParallelism: false,
      testTimeout: 20_000,
      env: {
        ...dotEnv,
        // next/navigation's forbidden() throws its "experimental" error
        // instead of the real 403 digest unless this matches next.config.ts's
        // experimental.authInterrupts (normally set by the Next.js build).
        __NEXT_EXPERIMENTAL_AUTH_INTERRUPTS: "true",
      },
    },
  };
});
