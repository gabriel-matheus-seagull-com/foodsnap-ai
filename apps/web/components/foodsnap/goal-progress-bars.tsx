import Link from "next/link";

import { computeGoalProgress, type GoalStatus } from "@/lib/nutrition/goal-progress";
import type { UserGoals } from "@/lib/db/goals";

interface Actuals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Row {
  key: "calories" | "protein" | "carbs" | "fat";
  label: string;
  unit: string;
  actual: number;
  goal: number | null;
  colorVar: string;
}

const STATUS_TEXT: Record<GoalStatus, string> = {
  below: "Below target",
  on_target: "On target",
  above: "Above target",
};

const STATUS_CLASS: Record<GoalStatus, string> = {
  below: "text-muted-foreground",
  on_target: "text-primary",
  above: "text-destructive",
};

/**
 * Deterministic goal-vs-actual progress bars — the visual counterpart to
 * `computeGoalProgress`. Distinct from `macro-summary.tsx`'s share-of-total
 * bars: these compare against an external target, so a bar can exceed 100%.
 */
export function GoalProgressBars({
  actuals,
  goals,
}: {
  actuals: Actuals;
  goals: UserGoals | null;
}) {
  if (!goals) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Set your daily nutrition goals to see progress here.
        </p>
        <Link
          href="/goals"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          Set goals
        </Link>
      </div>
    );
  }

  const rows: Row[] = [
    {
      key: "calories",
      label: "Calories",
      unit: "kcal",
      actual: actuals.calories,
      goal: goals.calorieGoal,
      colorVar: "var(--primary)",
    },
    {
      key: "protein",
      label: "Protein",
      unit: "g",
      actual: actuals.protein,
      goal: goals.proteinGoalG,
      colorVar: "var(--protein)",
    },
    {
      key: "carbs",
      label: "Carbohydrates",
      unit: "g",
      actual: actuals.carbs,
      goal: goals.carbGoalG,
      colorVar: "var(--carbs)",
    },
    {
      key: "fat",
      label: "Fat",
      unit: "g",
      actual: actuals.fat,
      goal: goals.fatGoalG,
      colorVar: "var(--fat)",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => {
        const progress = computeGoalProgress(row.actual, row.goal);
        if (!progress) return null;
        const barWidth = Math.min(progress.percent, 100);
        return (
          <div key={row.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{row.label}</span>
              <span className="tabular-nums">
                <span className="font-semibold">
                  {Math.round(row.actual)} / {row.goal} {row.unit}
                </span>
                <span
                  className={`ml-2 text-xs font-medium ${STATUS_CLASS[progress.status]}`}
                >
                  {STATUS_TEXT[progress.status]}
                </span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(barWidth, row.actual > 0 ? 2 : 0)}%`,
                  backgroundColor:
                    progress.status === "above"
                      ? "hsl(var(--destructive))"
                      : `hsl(${row.colorVar})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
