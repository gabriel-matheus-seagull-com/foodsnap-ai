import type { HistoryGroupBy } from "@/lib/nutrition/aggregate-history";

/** Smallest useful set of AI Coach periods for the MVP (see CLAUDE.md). */
export type CoachPeriod = "today" | "last_7_days" | "last_30_days";

export const COACH_PERIODS: { value: CoachPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
];

export interface DateRange {
  /** Inclusive, UTC midnight. */
  start: Date;
  /** Exclusive, UTC midnight of the day after the range ends. */
  end: Date;
}

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** UTC date range for a Coach period, anchored on `now` (defaults to the real time). */
export function coachPeriodRange(period: CoachPeriod, now = new Date()): DateRange {
  const today = utcMidnight(now);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 1);

  if (period === "today") {
    return { start: today, end };
  }

  const days = period === "last_7_days" ? 7 : 30;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { start, end };
}

/** Default lookback window for the History page's day/week/month grouping. */
export function historyDefaultRange(groupBy: HistoryGroupBy, now = new Date()): DateRange {
  const today = utcMidnight(now);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 1);

  const daysBack = groupBy === "day" ? 14 : groupBy === "week" ? 56 : 180;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (daysBack - 1));
  return { start, end };
}
