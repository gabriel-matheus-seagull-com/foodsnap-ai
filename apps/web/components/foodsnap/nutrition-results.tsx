"use client";

import * as React from "react";
import { Flame, Pencil, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Disclaimer } from "@/components/foodsnap/disclaimer";
import { ConfidenceBadge } from "@/components/foodsnap/confidence-badge";
import { MacroSummary } from "@/components/foodsnap/macro-summary";
import { estimateNutrition, itemNutrition } from "@/lib/nutrition/estimate";
import type { AnalysisResult, DetectedFood } from "@/lib/types";

export function NutritionResults({
  analysis,
  items,
  previewUrl,
  onEdit,
  onStartOver,
}: {
  analysis: AnalysisResult;
  items: DetectedFood[];
  previewUrl: string | null;
  onEdit: () => void;
  onStartOver: () => void;
}) {
  const estimate = React.useMemo(() => estimateNutrition(items), [items]);

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Your nutrition estimate
        </h1>
        <p className="text-sm text-muted-foreground">
          A general guide based on {items.length}{" "}
          {items.length === 1 ? "item" : "items"} in your meal.
        </p>
      </div>

      {/* Calorie hero */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-2 bg-primary/5 py-8 text-center">
          <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Flame className="h-4 w-4 text-accent" />
            Estimated calories
          </span>
          <div className="text-5xl font-extrabold tracking-tight tabular-nums">
            {estimate.calorieRange.low}
            <span className="mx-2 text-2xl font-semibold text-muted-foreground">
              –
            </span>
            {estimate.calorieRange.high}
          </div>
          <span className="text-sm text-muted-foreground">
            kcal · midpoint ≈ {estimate.calories}
          </span>
          <div className="mt-1">
            <ConfidenceBadge confidence={estimate.confidence} />
          </div>
        </CardContent>
      </Card>

      {/* Macros */}
      <Card>
        <CardHeader>
          <CardTitle>Macronutrients</CardTitle>
        </CardHeader>
        <CardContent>
          <MacroSummary estimate={estimate} />
        </CardContent>
      </Card>

      {/* Per-item breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>What&apos;s in this estimate</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {previewUrl && (
            <div className="overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Your meal"
                className="max-h-44 w-full object-cover"
              />
            </div>
          )}
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const kcal = Math.round(itemNutrition(item).calories);
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.grams} g
                      {item.portionLabel ? ` · ${item.portionLabel}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ConfidenceBadge confidence={item.confidence} short />
                    <span className="w-16 text-right text-sm font-semibold tabular-nums">
                      ~{kcal} kcal
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {analysis.note && (
        <p className="rounded-xl bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
          {analysis.note}
        </p>
      )}

      <Disclaimer inline />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" size="lg" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit foods
        </Button>
        <Button className="flex-1" size="lg" onClick={onStartOver}>
          <RotateCcw className="h-4 w-4" />
          Analyze another meal
        </Button>
      </div>
    </div>
  );
}
