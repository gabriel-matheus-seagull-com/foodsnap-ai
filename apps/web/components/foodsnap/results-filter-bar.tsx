"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RangeField {
  key: "Calories" | "Protein" | "Carbs" | "Fat";
  label: string;
  unit: string;
}

const RANGE_FIELDS: RangeField[] = [
  { key: "Calories", label: "Calories", unit: "kcal" },
  { key: "Protein", label: "Protein", unit: "g" },
  { key: "Carbs", label: "Carbs", unit: "g" },
  { key: "Fat", label: "Fat", unit: "g" },
];

/** Search + nutrition-range filter bar for My Results. Drives plain URL searchParams, no client state library needed. */
export function ResultsFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasActiveFilters = Array.from(searchParams.keys()).length > 0;
  const [showRanges, setShowRanges] = React.useState(
    RANGE_FIELDS.some(
      (f) => searchParams.get(`min${f.key}`) || searchParams.get(`max${f.key}`),
    ),
  );

  function submit(formData: FormData) {
    const params = new URLSearchParams();
    const q = (formData.get("q") as string | null)?.trim();
    if (q) params.set("q", q);

    for (const field of RANGE_FIELDS) {
      const min = (formData.get(`min${field.key}`) as string | null)?.trim();
      const max = (formData.get(`max${field.key}`) as string | null)?.trim();
      if (min) params.set(`min${field.key}`, min);
      if (max) params.set(`max${field.key}`, max);
    }

    router.push(params.size > 0 ? `/results?${params.toString()}` : "/results");
  }

  return (
    <form
      action={submit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor="q" className="sr-only">
            Search results
          </Label>
          <Input
            id="q"
            name="q"
            placeholder="Search by food name…"
            defaultValue={searchParams.get("q") ?? ""}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowRanges((v) => !v)}
            className="flex-1 sm:flex-none"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
          <Button type="submit" className="flex-1 sm:flex-none">
            Apply
          </Button>
        </div>
      </div>

      {showRanges && (
        <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
          {RANGE_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {field.label} ({field.unit})
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  name={`min${field.key}`}
                  placeholder="Min"
                  defaultValue={searchParams.get(`min${field.key}`) ?? ""}
                  className="h-9"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  name={`max${field.key}`}
                  placeholder="Max"
                  defaultValue={searchParams.get(`max${field.key}`) ?? ""}
                  className="h-9"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => router.push("/results")}
          className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Clear filters
        </button>
      )}
    </form>
  );
}
