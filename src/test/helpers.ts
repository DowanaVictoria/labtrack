// Shared helpers for Server Action tests — session forging, FormData
// construction, and assertions on next/navigation's forbidden()/redirect(),
// which signal by throwing rather than returning.
import { expect } from "vitest";
import type { Session } from "next-auth";

export function sessionAs(user: {
  id: string;
  role: "PATIENT" | "LAB_STAFF" | "LAB_ADMIN" | "PLATFORM_ADMIN";
  labId?: string | null;
  email?: string;
  name?: string;
}): Session {
  return {
    user: {
      id: user.id,
      role: user.role,
      labId: user.labId ?? null,
      name: user.name ?? "Test User",
      email: user.email ?? "test@test.local",
    },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

export function fd(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

export async function expectForbidden(promise: Promise<unknown>) {
  await expect(promise).rejects.toMatchObject({ digest: expect.stringMatching(/^NEXT_HTTP_ERROR_FALLBACK;403/) });
}

export async function expectRedirect(promise: Promise<unknown>, toPathPrefix?: string) {
  await expect(promise).rejects.toMatchObject({
    // digest shape: "NEXT_REDIRECT;<type>;<url>;<statusCode>;" — match the
    // url segment as a prefix, since it may carry a query string.
    digest: expect.stringMatching(toPathPrefix ? new RegExp(`^NEXT_REDIRECT;\\w+;${escapeRegex(toPathPrefix)}`) : /^NEXT_REDIRECT;/),
  });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
