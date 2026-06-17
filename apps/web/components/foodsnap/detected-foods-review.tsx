"use client";

import * as React from "react";
import { ArrowLeft, Plus, UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/foodsnap/disclaimer";
import { ConfidenceBadge } from "@/components/foodsnap/confidence-badge";
import { FoodItemRow } from "@/components/foodsnap/food-item-row";
import { estimateNutrition } from "@/lib/nutrition/estimate";
import {
  FOOD_PRESETS,
  GENERIC_FOOD,
  presetToDetectedFood,
} from "@/lib/nutrition/food-defaults";
import type { AnalysisResult, DetectedFood } from "@/lib/types";

export function DetectedFoodsReview({
  analysis,
  items,
  onItemsChange,
  onConfirm,
  onRetake,
  previewUrl,
}: {
  analysis: AnalysisResult;
  items: DetectedFood[];
  onItemsChange: (items: DetectedFood[]) => void;
  onConfirm: () => void;
  onRetake: () => void;
  previewUrl: string | null;
}) {
  const [presetIndex, setPresetIndex] = React.useState("");

  const estimate = React.useMemo(() => estimateNutrition(items), [items]);

  function updateItem(updated: DetectedFood) {
    onItemsChange(items.map((it) => (it.id === updated.id ? updated : it)));
  }

  function removeItem(id: string) {
    onItemsChange(items.filter((it) => it.id !== id));
  }

  function addPreset() {
    const preset =
      presetIndex === "other" || presetIndex === ""
        ? GENERIC_FOOD
        : FOOD_PRESETS[Number(presetIndex)] ?? GENERIC_FOOD;
    onItemsChange([...items, presetToDetectedFood(preset)]);
    setPresetIndex("");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Review your meal</h1>
        <p className="text-sm text-muted-foreground">
          Tweak the foods and portions so the estimate matches what you ate.
        </p>
      </div>

      {previewUrl && (
        <div className="mx-auto overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Your meal"
            className="max-h-40 w-full object-cover"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/50 px-4 py-3">
        <p className="flex-1 text-sm text-muted-foreground">{analysis.note}</p>
        <ConfidenceBadge confidence={analysis.overallConfidence} />
      </div>

      {items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <FoodItemRow
              key={item.id}
              item={item}
              onChange={updateItem}
              onRemove={removeItem}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <UtensilsCrossed className="h-6 w-6" />
          </span>
          <p className="font-medium">No foods yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            We couldn&apos;t confidently detect foods in this photo. Add items
            manually below, or go back and try a clearer picture.
          </p>
        </div>
      )}

      {/* Add a food */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <label htmlFor="add-food" className="text-sm font-medium sm:sr-only">
          Add a food
        </label>
        <select
          id="add-food"
          value={presetIndex}
          onChange={(e) => setPresetIndex(e.target.value)}
          className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Add a food…</option>
          {FOOD_PRESETS.map((preset, i) => (
            <option key={preset.name} value={i}>
              {preset.name}
            </option>
          ))}
          <option value="other">Other (custom)</option>
        </select>
        <Button variant="secondary" onClick={addPreset}>
          <Plus className="h-4 w-4" />
          Add food
        </Button>
      </div>

      {/* Running estimate preview */}
      {items.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            Estimated so far
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {estimate.calorieRange.low}–{estimate.calorieRange.high} kcal
          </span>
        </div>
      )}

      <Disclaimer inline />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" size="lg" onClick={onRetake}>
          <ArrowLeft className="h-4 w-4" />
          Use a different photo
        </Button>
        <Button
          className="flex-1"
          size="lg"
          onClick={onConfirm}
          disabled={items.length === 0}
        >
          Confirm &amp; see results
        </Button>
      </div>
    </div>
  );
}
