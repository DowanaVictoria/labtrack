"use client";

import { useActionState, useMemo, useState } from "react";
import { createOffering } from "@/app/actions/offerings";
import { Button } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/field";
import { CategoryIcon, FlaskIcon } from "@/components/ui/icons";
import { IconTile } from "@/components/ui/icon-tile";

const compactLabel = "flex flex-col gap-1.5 text-[11px] font-bold tracking-wide text-ink-faint uppercase";

type AvailableTest = {
  id: string;
  name: string;
  category: string;
  sampleType: string;
  description: string | null;
};

export function AddOfferingForm({ availableTests }: { availableTests: AvailableTest[] }) {
  const [error, action, pending] = useActionState(createOffering, undefined);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedTestId, setSelectedTestId] = useState(availableTests[0]?.id ?? "");

  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(availableTests.map((test) => test.category))).sort((a, b) => a.localeCompare(b))];
  }, [availableTests]);

  const visibleTests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return availableTests.filter((test) => {
      const matchesCategory = category === "All" || test.category === category;
      const searchable = `${test.name} ${test.category} ${test.sampleType} ${test.description ?? ""}`.toLowerCase();
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [availableTests, category, query]);

  const selectedTest = visibleTests.find((test) => test.id === selectedTestId) ?? visibleTests[0];

  if (availableTests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-brand/35 bg-brand-tint/40 p-5 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-surface text-brand-dark shadow-sm">
          <FlaskIcon width={22} height={22} />
        </div>
        <p className="text-sm font-bold text-foreground">All the tests in your catalog are already listed.</p>
        <p className="mt-1 text-sm text-ink-faint">
          Add a new test to your catalog below, then it&apos;ll appear here to publish.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="grid grid-cols-1 gap-3">
      <label className={compactLabel}>
        Search catalog
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by test, category, or sample"
          className={fieldClasses}
        />
      </label>

      <div className="flex flex-wrap gap-2" aria-label="Filter tests by category">
        {categories.map((item) => {
          const active = item === category;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                active
                  ? "border-brand bg-brand text-white shadow-sm shadow-brand/20"
                  : "border-border bg-background text-ink-soft hover:border-brand hover:bg-brand-tint hover:text-brand-dark"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      <label className={compactLabel}>
        Test to add
        <select
          key={`${category}-${query}`}
          name="testId"
          required
          defaultValue={selectedTest?.id ?? ""}
          onChange={(event) => setSelectedTestId(event.target.value)}
          disabled={visibleTests.length === 0}
          className={fieldClasses}
        >
          {visibleTests.map((test) => (
            <option key={test.id} value={test.id}>
              {test.name} - {test.category}
            </option>
          ))}
        </select>
      </label>

      {selectedTest ? (
        <div className="flex gap-3 rounded-lg border border-border bg-background p-3">
          <IconTile icon={<CategoryIcon category={selectedTest.category} width={20} height={20} />} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{selectedTest.name}</p>
            <p className="text-[12px] text-ink-faint">
              {selectedTest.category} / {selectedTest.sampleType}
            </p>
            {selectedTest.description && <p className="mt-1 line-clamp-2 text-[12px] text-ink-soft">{selectedTest.description}</p>}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-ink-faint">
          No tests match this search or category filter.
        </div>
      )}

      <label className={compactLabel}>
        Price (GHS)
        <input name="price" type="number" step="0.01" min="0.01" required placeholder="120.00" className={fieldClasses} />
      </label>
      <label className={compactLabel}>
        Turnaround (h)
        <input name="turnaroundHours" type="number" min="1" step="1" required placeholder="24" className={fieldClasses} />
      </label>
      <label className={compactLabel}>
        Prep instructions
        <textarea name="prepInstructions" rows={3} placeholder="Optional patient prep notes" className={`${fieldClasses} resize-none`} />
      </label>
      <Button disabled={pending || visibleTests.length === 0} type="submit">
        {pending ? "Adding..." : "Add offering"}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
