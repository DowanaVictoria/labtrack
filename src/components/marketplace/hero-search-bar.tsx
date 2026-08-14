import { buttonClasses } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/field";

/**
 * Reusable `GET`-form search bar (test/category + city inputs) — plain form,
 * no client JS required. The marketplace lives at `/`, while `/patient`
 * remains only as a compatibility redirect.
 */
export function HeroSearchBar({
  action = "/",
  defaultQuery = "",
  defaultCity = "",
  variant = "light",
}: {
  action?: string;
  defaultQuery?: string;
  defaultCity?: string;
  /** "light" (on brand-colored hero backgrounds) or "surface" (on a plain card). */
  variant?: "light" | "surface";
}) {
  const isLight = variant === "light";

  return (
    <form
      method="GET"
      action={action}
      className={`flex w-full max-w-2xl flex-col gap-2 rounded-lg border p-2 shadow-xl shadow-black/10 sm:flex-row ${
        isLight ? "border-white/25 bg-white/95" : "border-border bg-surface"
      }`}
    >
      <input
        name="q"
        defaultValue={defaultQuery}
        placeholder="Search test or category"
        className={`${fieldClasses} min-w-0 flex-1 bg-white`}
      />
      <input
        name="city"
        defaultValue={defaultCity}
        placeholder="City"
        className={`${fieldClasses} bg-white sm:w-36`}
      />
      <button type="submit" className={buttonClasses("primary", "default", "shrink-0")}>
        Search
      </button>
    </form>
  );
}
