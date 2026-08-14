/**
 * Centralizes currency/duration display, replacing the scattered
 * `` `GHS ${price.toString()}` `` literals across patient/lab pages
 * (UI_REDESIGN_PLAN.md §3/§8).
 */

/**
 * Formats a Prisma `Decimal(10,2)` price as `"GHS 1,234.56"`.
 *
 * Accepts anything with a Decimal-shaped `.toString()` (Prisma's Decimal,
 * or a plain string/number already in that form) and formats from that
 * string representation — never round-trips through a lossy intermediate
 * float before rendering, since this is money (UI_REDESIGN_PLAN.md §8).
 * `Intl.NumberFormat` only touches the value for thousands-separator
 * grouping after parsing the exact decimal string; GHS prices in the
 * realistic 10–100,000 range with 2 decimal places fit safely in a JS
 * double without precision loss at that stage.
 */
export function formatGHS(price: { toString(): string } | number | string): string {
  const raw = typeof price === "object" ? price.toString() : String(price);
  const value = Number(raw);
  if (!Number.isFinite(value)) return `GHS ${raw}`;
  const formatted = new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `GHS ${formatted}`;
}

/** Formats a turnaround duration in hours as "2h", "24h", or "3d" for >=24h. */
export function formatTurnaround(hours: number): string {
  if (hours >= 24 && hours % 24 === 0) {
    const days = hours / 24;
    return `${days}d`;
  }
  return `${hours}h`;
}
