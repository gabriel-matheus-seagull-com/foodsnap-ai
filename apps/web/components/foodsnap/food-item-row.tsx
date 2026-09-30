"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ConfidenceBadge } from "@/components/foodsnap/confidence-badge";
import { itemNutrition } from "@/lib/nutrition/estimate";
import type { DetectedFood } from "@/lib/types";

const SLIDER_MAX = 600;
const SLIDER_STEP = 5;

export function FoodItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: DetectedFood;
  onChange: (item: DetectedFood) => void;
  onRemove: (id: string) => void;
}) {
  const calories = Math.round(itemNutrition(item).calories);

  function setGrams(value: number) {
    const grams = Math.max(0, Math.min(2000, Math.round(value)));
    onChange({ ...item, grams });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <Input
          aria-label="Food name"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          className="h-10 flex-1 font-medium"
        />
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.name}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <ConfidenceBadge confidence={item.confidence} />
        <div className="flex items-baseline gap-1.5 text-sm">
          <span className="font-semibold tabular-nums">~{calories}</span>
          <span className="text-muted-foreground">kcal</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Slider
          aria-label={`Portion size for ${item.name} in grams`}
          min={0}
          max={SLIDER_MAX}
          step={SLIDER_STEP}
          value={Math.min(item.grams, SLIDER_MAX)}
          onChange={(e) => setGrams(Number(e.target.value))}
          className="flex-1"
        />
        <div className="flex items-center gap-1">
          <Input
            aria-label={`Grams of ${item.name}`}
            type="number"
            min={0}
            inputMode="numeric"
            value={item.grams}
            onChange={(e) => setGrams(Number(e.target.value))}
            className="h-9 w-20 text-right tabular-nums"
          />
          <span className="text-sm text-muted-foreground">g</span>
        </div>
      </div>
      {item.portionLabel && (
        <p className="mt-2 text-xs text-muted-foreground">
          Detected portion: {item.portionLabel}
        </p>
      )}
    </div>
  );
}
