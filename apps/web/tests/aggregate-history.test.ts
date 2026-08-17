import { describe, expect, it } from "vitest";

import {
  groupByPeriod,
  summarizeRows,
  type NutritionTotalsRow,
} from "@/lib/nutrition/aggregate-history";

function row(overrides: Partial<NutritionTotalsRow> = {}): NutritionTotalsRow {
  return {
    id: "row-1",
    createdAt: "2026-08-16T12:00:00.000Z",
    totalCalories: 500,
    totalProtein: 40,
    totalCarbs: 50,
    totalFat: 15,
    ...overrides,
  };
}

describe("groupByPeriod — day", () => {
  it("buckets meals on the same UTC day together, newest first", () => {
    const rows = [
      row({ id: "a", createdAt: "2026-08-16T08:00:00.000Z", totalCalories: 400 }),
      row({ id: "b", createdAt: "2026-08-16T20:00:00.000Z", totalCalories: 600 }),
      row({ id: "c", createdAt: "2026-08-15T12:00:00.000Z", totalCalories: 300 }),
    ];

    const buckets = groupByPeriod(rows, "day");

    expect(buckets).toHaveLength(2);
    expect(buckets[0]?.periodStart).toBe("2026-08-16");
    expect(buckets[0]?.mealCount).toBe(2);
    expect(buckets[0]?.totalCalories).toBe(1000);
    expect(buckets[0]?.daysTracked).toBe(1);
    expect(buckets[0]?.avgCalories).toBe(1000); // per-day average, not per-meal
    expect(buckets[1]?.periodStart).toBe("2026-08-15");
  });
});

describe("groupByPeriod — week", () => {
  it("buckets by the ISO week's Monday and averages per distinct day", () => {
    const rows = [
      row({ id: "a", createdAt: "2026-08-10T08:00:00.000Z", totalCalories: 400 }), // Monday
      row({ id: "b", createdAt: "2026-08-12T08:00:00.000Z", totalCalories: 600 }), // Wednesday, same week
      row({ id: "c", createdAt: "2026-08-16T08:00:00.000Z", totalCalories: 300 }), // Sunday, same week (week starts Monday)
    ];

    const buckets = groupByPeriod(rows, "week");

    expect(buckets).toHaveLength(1);
    expect(buckets[0]?.periodStart).toBe("2026-08-10");
    expect(buckets[0]?.mealCount).toBe(3);
    expect(buckets[0]?.daysTracked).toBe(3);
    expect(buckets[0]?.totalCalories).toBe(1300);
    expect(buckets[0]?.avgCalories).toBeCloseTo(1300 / 3, 0);
  });
});

describe("groupByPeriod — month", () => {
  it("buckets by calendar month", () => {
    const rows = [
      row({ id: "a", createdAt: "2026-08-01T08:00:00.000Z" }),
      row({ id: "b", createdAt: "2026-08-31T08:00:00.000Z" }),
      row({ id: "c", createdAt: "2026-09-01T08:00:00.000Z" }),
    ];

    const buckets = groupByPeriod(rows, "month");

    expect(buckets).toHaveLength(2);
    expect(buckets[0]?.periodStart).toBe("2026-09-01");
    expect(buckets[1]?.periodStart).toBe("2026-08-01");
    expect(buckets[1]?.mealCount).toBe(2);
  });

  it("returns an empty array for no rows", () => {
    expect(groupByPeriod([], "day")).toEqual([]);
  });
});

describe("summarizeRows", () => {
  it("sums totals and averages per distinct tracked day", () => {
    const rows = [
      row({ id: "a", createdAt: "2026-08-16T08:00:00.000Z", totalCalories: 400, totalProtein: 30 }),
      row({ id: "b", createdAt: "2026-08-16T20:00:00.000Z", totalCalories: 600, totalProtein: 40 }),
      row({ id: "c", createdAt: "2026-08-15T12:00:00.000Z", totalCalories: 500, totalProtein: 35 }),
    ];

    const summary = summarizeRows(rows);

    expect(summary.mealCount).toBe(3);
    expect(summary.daysTracked).toBe(2);
    expect(summary.totalCalories).toBe(1500);
    expect(summary.avgCalories).toBe(750); // 1500 / 2 days, not / 3 meals
    expect(summary.avgProtein).toBe(53); // 105 / 2, rounded
  });

  it("handles zero rows without dividing by zero", () => {
    const summary = summarizeRows([]);
    expect(summary.mealCount).toBe(0);
    expect(summary.daysTracked).toBe(0);
    expect(summary.avgCalories).toBe(0);
  });
});
