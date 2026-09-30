/**
 * Pure, framework-free history aggregation — the deterministic counterpart to
 * `lib/nutrition/estimate.ts`. Takes the lightweight per-meal totals rows
 * `lib/db/saved-analyses.ts`'s `getNutritionTotalsInRange` returns (never the
 * raw `items` jsonb) and buckets/sums/averages them by day/week/month.
 *
 * Bucketing is UTC-anchored: `created_at` is the only timestamp this app
 * stores and there is no per-user timezone concept anywhere yet, so a
 * late-night meal may land in the "wrong" local day. Known MVP limitation.
 */

export type HistoryGroupBy = "day" | "week" | "month";

export interface NutritionTotalsRow {
  id: string;
  createdAt: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface PeriodBucket {
  /** UTC date key identifying the bucket (day: the date itself; week: that week's Monday; month: the 1st). */
  periodStart: string;
  /** Human-friendly label, e.g. "Aug 16", "Week of Aug 11", "August 2026". */
  periodLabel: string;
  mealCount: number;
  /** Distinct calendar days within this bucket that have at least one meal — the divisor for avg*, so week/month averages are daily (comparable to a daily goal), not per-meal. */
  daysTracked: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
}

function toUtcDate(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday (UTC) of the week containing `d`. */
function startOfIsoWeek(d: Date): Date {
  const day = d.getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day; // shift Sunday back to the prior Monday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  return monday;
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function bucketKey(d: Date, groupBy: HistoryGroupBy): { key: Date; label: string } {
  const dayFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const monthFmt = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  if (groupBy === "day") {
    return { key: d, label: dayFmt.format(d) };
  }
  if (groupBy === "week") {
    const monday = startOfIsoWeek(d);
    return { key: monday, label: `Week of ${dayFmt.format(monday)}` };
  }
  const first = startOfMonth(d);
  return { key: first, label: monthFmt.format(first) };
}

/**
 * Group per-meal totals rows into period buckets, newest first. `groupBy`
 * determines both the bucket size and the label; totals/averages are summed
 * from the already-computed `total_*` columns, never recomputed from items.
 */
export function groupByPeriod(
  rows: NutritionTotalsRow[],
  groupBy: HistoryGroupBy,
): PeriodBucket[] {
  const buckets = new Map<
    string,
    {
      periodStart: string;
      periodLabel: string;
      mealCount: number;
      days: Set<string>;
      totalCalories: number;
      totalProtein: number;
      totalCarbs: number;
      totalFat: number;
    }
  >();

  for (const row of rows) {
    const date = toUtcDate(row.createdAt);
    const { key, label } = bucketKey(date, groupBy);
    const periodStart = isoDate(key);

    const existing = buckets.get(periodStart);
    if (existing) {
      existing.mealCount += 1;
      existing.days.add(isoDate(date));
      existing.totalCalories += row.totalCalories;
      existing.totalProtein += row.totalProtein;
      existing.totalCarbs += row.totalCarbs;
      existing.totalFat += row.totalFat;
    } else {
      buckets.set(periodStart, {
        periodStart,
        periodLabel: label,
        mealCount: 1,
        days: new Set([isoDate(date)]),
        totalCalories: row.totalCalories,
        totalProtein: row.totalProtein,
        totalCarbs: row.totalCarbs,
        totalFat: row.totalFat,
      });
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1))
    .map(({ days, ...b }) => {
      const daysTracked = days.size;
      return {
        ...b,
        daysTracked,
        avgCalories: Math.round(b.totalCalories / daysTracked),
        avgProtein: Math.round(b.totalProtein / daysTracked),
        avgCarbs: Math.round(b.totalCarbs / daysTracked),
        avgFat: Math.round(b.totalFat / daysTracked),
      };
    });
}

/** Overall totals/averages across a set of rows — used for the AI Coach snapshot and header stats. */
export function summarizeRows(rows: NutritionTotalsRow[]) {
  const mealCount = rows.length;
  const totals = rows.reduce(
    (acc, r) => ({
      calories: acc.calories + r.totalCalories,
      protein: acc.protein + r.totalProtein,
      carbs: acc.carbs + r.totalCarbs,
      fat: acc.fat + r.totalFat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const daysTracked = new Set(rows.map((r) => isoDate(toUtcDate(r.createdAt)))).size;
  const divisor = Math.max(daysTracked, 1);

  return {
    mealCount,
    daysTracked,
    totalCalories: Math.round(totals.calories),
    totalProtein: Math.round(totals.protein),
    totalCarbs: Math.round(totals.carbs),
    totalFat: Math.round(totals.fat),
    avgCalories: Math.round(totals.calories / divisor),
    avgProtein: Math.round(totals.protein / divisor),
    avgCarbs: Math.round(totals.carbs / divisor),
    avgFat: Math.round(totals.fat / divisor),
  };
}
