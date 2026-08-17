import Link from "next/link";
import { ArrowLeft, Flame } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Disclaimer } from "@/components/foodsnap/disclaimer";
import { ConfidenceBadge } from "@/components/foodsnap/confidence-badge";
import { MacroSummary } from "@/components/foodsnap/macro-summary";
import { itemNutrition } from "@/lib/nutrition/estimate";
import type { NutritionEstimate } from "@/lib/types";
import type { SavedAnalysis } from "@/lib/db/saved-analyses";

/**
 * Read-only view of a previously saved analysis. A slimmed sibling of
 * `nutrition-results.tsx` — no photo (none is persisted), no edit/start-over
 * actions (nothing to edit here), plain server component since `estimate` is
 * computed once by the caller.
 */
export function SavedAnalysisDetail({
  saved,
  estimate,
}: {
  saved: SavedAnalysis;
  estimate: NutritionEstimate;
}) {
  return (
    <div className="container max-w-xl py-10">
      <Link
        href="/results"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to results
      </Link>

      <div className="flex flex-col gap-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Saved result</h1>
          <p className="text-sm text-muted-foreground">
            Saved on {new Date(saved.createdAt).toLocaleDateString()} ·{" "}
            {saved.items.length} {saved.items.length === 1 ? "item" : "items"}
          </p>
        </div>

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

        <Card>
          <CardHeader>
            <CardTitle>Macronutrients</CardTitle>
          </CardHeader>
          <CardContent>
            <MacroSummary estimate={estimate} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What was in this estimate</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {saved.items.map((item) => {
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

        {saved.note && (
          <p className="rounded-xl bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
            {saved.note}
          </p>
        )}

        <Disclaimer inline />
      </div>
    </div>
  );
}
