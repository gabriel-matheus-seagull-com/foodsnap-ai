import { describe, expect, it } from "vitest";

import { estimateNutrition, itemNutrition } from "@/lib/nutrition/estimate";
import type { Confidence, DetectedFood } from "@/lib/types";

function food(overrides: Partial<DetectedFood> = {}): DetectedFood {
  return {
    id: "x",
    name: "Grilled chicken breast",
    portionLabel: "1 fillet",
    grams: 150,
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    confidence: "high",
    ...overrides,
  };
}

describe("itemNutrition", () => {
  it("scales per-100g values by grams", () => {
    const n = itemNutrition(food({ grams: 150 }));
    expect(n.calories).toBeCloseTo(247.5, 1);
    expect(n.protein).toBeCloseTo(46.5, 1);
    expect(n.carbs).toBeCloseTo(0, 1);
    expect(n.fat).toBeCloseTo(5.4, 1);
  });

  it("treats negative grams as zero", () => {
    expect(itemNutrition(food({ grams: -50 })).calories).toBe(0);
  });
});

describe("estimateNutrition — happy path", () => {
  it("aggregates a single item with a sensible range around the midpoint", () => {
    const est = estimateNutrition([food()]);
    expect(est.calories).toBe(250); // 247.5 rounded to nearest 5
    expect(est.protein).toBe(47); // 46.5 g rounded to nearest gram
    expect(est.calorieRange.low).toBeLessThan(est.calories);
    expect(est.calorieRange.high).toBeGreaterThan(est.calories);
    expect(est.calorieRange.low).toBeGreaterThanOrEqual(0);
    expect(est.confidence).toBe("high");
  });

  it("sums multiple items", () => {
    const est = estimateNutrition([
      food({ id: "a", grams: 100, caloriesPer100g: 100 }),
      food({ id: "b", grams: 100, caloriesPer100g: 200 }),
    ]);
    expect(est.calories).toBe(300);
  });
});

describe("estimateNutrition — uncertainty handling", () => {
  it("widens the range when confidence is low", () => {
    const high = estimateNutrition([food({ confidence: "high" })]);
    const low = estimateNutrition([food({ confidence: "low" })]);

    expect(low.uncertaintyPct).toBeGreaterThan(high.uncertaintyPct);

    const lowSpread = low.calorieRange.high - low.calorieRange.low;
    const highSpread = high.calorieRange.high - high.calorieRange.low;
    expect(lowSpread).toBeGreaterThan(highSpread);
    expect(low.confidence).toBe("low");
  });

  it.each<Confidence>(["low", "medium", "high"])(
    "produces a non-negative, ordered range for %s confidence",
    (confidence) => {
      const est = estimateNutrition([food({ confidence })]);
      expect(est.calorieRange.low).toBeGreaterThanOrEqual(0);
      expect(est.calorieRange.high).toBeGreaterThan(est.calorieRange.low);
    },
  );
});

describe("estimateNutrition — empty / edge cases", () => {
  it("returns a zeroed, low-confidence estimate for an empty meal", () => {
    const est = estimateNutrition([]);
    expect(est.calories).toBe(0);
    expect(est.protein).toBe(0);
    expect(est.calorieRange).toEqual({ low: 0, high: 0 });
    expect(est.confidence).toBe("low");
  });
});
