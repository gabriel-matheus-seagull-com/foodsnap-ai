import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalProgressBars } from "@/components/foodsnap/goal-progress-bars";
import type { PeriodBucket } from "@/lib/nutrition/aggregate-history";
import type { UserGoals } from "@/lib/db/goals";

export function HistorySummaryCard({
  bucket,
  goals,
}: {
  bucket: PeriodBucket;
  goals: UserGoals | null;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between space-y-0">
        <CardTitle>{bucket.periodLabel}</CardTitle>
        <span className="text-sm text-muted-foreground">
          {bucket.mealCount} {bucket.mealCount === 1 ? "meal" : "meals"}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Calories", value: bucket.totalCalories, unit: "kcal" },
            { label: "Protein", value: bucket.totalProtein, unit: "g" },
            { label: "Carbs", value: bucket.totalCarbs, unit: "g" },
            { label: "Fat", value: bucket.totalFat, unit: "g" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-secondary/50 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-semibold tabular-nums">
                {Math.round(stat.value)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {stat.unit}
                </span>
              </p>
            </div>
          ))}
        </div>

        <GoalProgressBars
          actuals={{
            calories: bucket.avgCalories,
            protein: bucket.avgProtein,
            carbs: bucket.avgCarbs,
            fat: bucket.avgFat,
          }}
          goals={goals}
        />
      </CardContent>
    </Card>
  );
}
