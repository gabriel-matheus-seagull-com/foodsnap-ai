import type {
  Confidence,
  DetectedFood,
  ItemNutrition,
  NutritionEstimate,
  Range,
} from "@/lib/types";

/**
 * Nutrition estimation layer.
 *
 * Pure, framework-free functions that turn a list of detected/edited foods into
 * an aggregated estimate. Deliberately conservative: when confidence is low we
 * widen the calorie/macro ranges rather than implying false precision.
 */

/** +/- band applied to totals, by confidence. Lower confidence → wider range. */
const CONFIDENCE_BAND: Record<Confidence, number> = {
  high: 0.12,
  medium: 0.2,
  low: 0.35,
};

/** Compute nutrition for one item at its current portion (per-100g → grams). */
export function itemNutrition(item: DetectedFood): ItemNutrition {
  const factor = Math.max(0, item.grams) / 100;
  return {
    calories: item.caloriesPer100g * factor,
    protein: item.proteinPer100g * factor,
    carbs: item.carbsPer100g * factor,
    fat: item.fatPer100g * factor,
  };
}

function round(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function makeRange(value: number, band: number, step: number): Range {
  const low = Math.max(0, value * (1 - band));
  const high = value * (1 + band);
  const lowR = Math.floor(low / step) * step;
  const highR = Math.ceil(high / step) * step;
  // Guarantee a visible spread even for tiny values.
  return { low: lowR, high: Math.max(highR, lowR + step) };
}

function bandToConfidence(band: number): Confidence {
  if (band <= 0.15) return "high";
  if (band <= 0.25) return "medium";
  return "low";
}

/**
 * Aggregate a meal into a single estimate. The uncertainty band is weighted by
 * each item's calorie contribution, so a confidently-identified main dish isn't
 * dragged down by a small, uncertain garnish (and vice versa).
 */
export function estimateNutrition(items: DetectedFood[]): NutritionEstimate {
  if (items.length === 0) {
    return {
      calories: 0,
      calorieRange: { low: 0, high: 0 },
      protein: 0,
      proteinRange: { low: 0, high: 0 },
      carbs: 0,
      carbsRange: { low: 0, high: 0 },
      fat: 0,
      fatRange: { low: 0, high: 0 },
      confidence: "low",
      uncertaintyPct: CONFIDENCE_BAND.low,
    };
  }

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let weightedBand = 0;
  let bandSum = 0;

  for (const item of items) {
    const n = itemNutrition(item);
    calories += n.calories;
    protein += n.protein;
    carbs += n.carbs;
    fat += n.fat;

    const band = CONFIDENCE_BAND[item.confidence];
    // Weight by calorie contribution; fall back to equal weight when calorie-less.
    weightedBand += band * n.calories;
    bandSum += band;
  }

  const band =
    calories > 0 ? weightedBand / calories : bandSum / items.length;

  return {
    calories: round(calories, 5),
    calorieRange: makeRange(calories, band, 10),
    protein: round(protein, 1),
    proteinRange: makeRange(protein, band, 1),
    carbs: round(carbs, 1),
    carbsRange: makeRange(carbs, band, 1),
    fat: round(fat, 1),
    fatRange: makeRange(fat, band, 1),
    confidence: bandToConfidence(band),
    uncertaintyPct: Math.round(band * 100) / 100,
  };
}
