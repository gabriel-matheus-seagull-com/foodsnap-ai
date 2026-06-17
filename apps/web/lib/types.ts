/**
 * Shared domain types — the contract between the AI layer, the nutrition
 * estimation layer, and the UI. Kept deliberately small and framework-free.
 */

export type Confidence = "low" | "medium" | "high";

export const MACRO_KEYS = ["protein", "carbs", "fat"] as const;
export type MacroKey = (typeof MACRO_KEYS)[number];

/**
 * A single food the model believes it sees in the photo. Nutrition is stored
 * per-100g so that editing the portion (`grams`) recomputes linearly without
 * another AI call — keeping the AI and nutrition concerns cleanly separated.
 */
export interface DetectedFood {
  id: string;
  name: string;
  /** Human-readable portion, e.g. "1 medium bowl". */
  portionLabel: string;
  /** Estimated portion weight in grams. */
  grams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  /** Per-item confidence in the identification + portion guess. */
  confidence: Confidence;
}

/** What the AI image-analysis layer returns. */
export interface AnalysisResult {
  items: DetectedFood[];
  overallConfidence: Confidence;
  /** Friendly, plain-language uncertainty / context note. */
  note: string;
  /** Whether the result came from the real model or the offline mock. */
  source: "ai" | "mock";
  /** Which backend produced an "ai" result, e.g. "anthropic" | "gemini". */
  provider?: string;
}

/** Nutrition computed for a single item at its current portion. */
export interface ItemNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Range {
  low: number;
  high: number;
}

/** Aggregated, demo-safe nutrition estimate with ranges instead of fake precision. */
export interface NutritionEstimate {
  calories: number;
  calorieRange: Range;
  protein: number;
  proteinRange: Range;
  carbs: number;
  carbsRange: Range;
  fat: number;
  fatRange: Range;
  /** Aggregated confidence across the meal. */
  confidence: Confidence;
  /** The +/- band (0..1) used to build the ranges — surfaced in the UI. */
  uncertaintyPct: number;
}
