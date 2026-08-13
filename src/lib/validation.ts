import "server-only";
import { z } from "zod";

/**
 * Parses FormData against a Zod schema, returning the first validation
 * issue as a single string — matches the `string | undefined` convention
 * every useActionState action in src/app/actions/ already returns errors as.
 * `ok` is a literal-tagged discriminant so `if (!parsed.ok) return parsed.error`
 * narrows `parsed.data` cleanly on the other branch.
 */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.infer<S> } | { ok: false; error: string } {
  const raw = Object.fromEntries(formData.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Invalid input." };
  }
  return { ok: true, data: result.data };
}
