import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { getNutritionTotalsInRange } from "@/lib/db/saved-analyses";
import { getUserGoals } from "@/lib/db/goals";
import { groupByPeriod, type HistoryGroupBy } from "@/lib/nutrition/aggregate-history";
import { historyDefaultRange } from "@/lib/nutrition/date-range";
import { HistoryPeriodToggle } from "@/components/foodsnap/history-period-toggle";
import { HistorySummaryCard } from "@/components/foodsnap/history-summary-card";
import { AiCoachCard } from "@/components/foodsnap/ai-coach-card";

function parseGroupBy(value: string | string[] | undefined): HistoryGroupBy {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "week" || v === "month" ? v : "day";
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Resource-based auth check, same pattern as /results and /profile.
  const { userId } = await auth.protect();
  const resolved = await searchParams;
  const groupBy = parseGroupBy(resolved.groupBy);

  const range = historyDefaultRange(groupBy);
  // Only the lightweight totals columns are fetched — never raw `items` —
  // and the date range is bounded, so this stays cheap regardless of how
  // much total history a user accumulates.
  const rows = await getNutritionTotalsInRange(userId, range);
  const buckets = groupByPeriod(rows, groupBy);
  const goals = await getUserGoals(userId);

  return (
    <div className="container max-w-xl py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">History</h1>

      <div className="mb-5">
        <HistoryPeriodToggle active={groupBy} />
      </div>

      <div className="mb-6">
        <AiCoachCard />
      </div>

      {buckets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
          <p className="font-medium">No nutrition history yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Save a few meals from the analyzer and they&apos;ll show up here,
            grouped by {groupBy}.
          </p>
          <Link
            href="/analyze"
            className="mt-2 text-sm font-medium text-primary underline underline-offset-4"
          >
            Analyze a meal
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {buckets.map((bucket) => (
            <HistorySummaryCard key={bucket.periodStart} bucket={bucket} goals={goals} />
          ))}
        </div>
      )}
    </div>
  );
}
