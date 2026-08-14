"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Active-state category filter pills derived from distinct `Test.category`
 * values (UI_REDESIGN_PLAN.md §3/§4.1) — sits under the hero search bar on
 * `/patient`. Preserves the current `q`/`city`/`sort` query params while
 * toggling `category`; clicking the active pill clears the filter.
 */
export function CategoryPillRow({ categories }: { categories: string[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "";

  function hrefFor(category: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (category) params.set("category", category);
    else params.delete("category");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={hrefFor("")}
        className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
          activeCategory === "" ? "bg-brand text-white" : "bg-surface text-ink-soft hover:bg-brand-tint hover:text-brand-dark"
        }`}
      >
        All categories
      </Link>
      {categories.map((category) => (
        <Link
          key={category}
          href={hrefFor(category)}
          className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
            activeCategory === category
              ? "bg-brand text-white"
              : "bg-surface text-ink-soft hover:bg-brand-tint hover:text-brand-dark"
          }`}
        >
          {category}
        </Link>
      ))}
    </div>
  );
}
