import type { DetectedFood } from "@/lib/types";
import { makeId } from "@/lib/utils";

/**
 * A small table of common foods used by the "add item" control on the review
 * step. Values are approximate per-100g figures (USDA-ballpark) — good enough
 * for a general-awareness estimate, never gram-precise.
 */
export interface FoodPreset {
  name: string;
  portionLabel: string;
  defaultGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export const FOOD_PRESETS: FoodPreset[] = [
  { name: "Grilled chicken breast", portionLabel: "1 fillet", defaultGrams: 150, caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
  { name: "White rice (cooked)", portionLabel: "1 cup", defaultGrams: 180, caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 },
  { name: "Pasta (cooked)", portionLabel: "1 plate", defaultGrams: 200, caloriesPer100g: 158, proteinPer100g: 5.8, carbsPer100g: 31, fatPer100g: 0.9 },
  { name: "Mixed green salad", portionLabel: "1 small bowl", defaultGrams: 100, caloriesPer100g: 20, proteinPer100g: 1.5, carbsPer100g: 3.5, fatPer100g: 0.2 },
  { name: "Egg", portionLabel: "1 egg", defaultGrams: 50, caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11 },
  { name: "Salmon fillet", portionLabel: "1 fillet", defaultGrams: 150, caloriesPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13 },
  { name: "Avocado", portionLabel: "1/2 avocado", defaultGrams: 75, caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 15 },
  { name: "Bread", portionLabel: "1 slice", defaultGrams: 40, caloriesPer100g: 265, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2 },
  { name: "Cheese", portionLabel: "1 small piece", defaultGrams: 30, caloriesPer100g: 402, proteinPer100g: 25, carbsPer100g: 1.3, fatPer100g: 33 },
  { name: "Banana", portionLabel: "1 medium", defaultGrams: 120, caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3 },
  { name: "French fries", portionLabel: "1 small portion", defaultGrams: 120, caloriesPer100g: 312, proteinPer100g: 3.4, carbsPer100g: 41, fatPer100g: 15 },
  { name: "Broccoli", portionLabel: "1 serving", defaultGrams: 90, caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 7, fatPer100g: 0.4 },
];

/** Generic fallback profile used when the user adds a free-text "other" food. */
export const GENERIC_FOOD: FoodPreset = {
  name: "Other food",
  portionLabel: "1 serving",
  defaultGrams: 100,
  caloriesPer100g: 200,
  proteinPer100g: 8,
  carbsPer100g: 25,
  fatPer100g: 7,
};

/** Build a fresh DetectedFood (medium confidence) from a preset for the review list. */
export function presetToDetectedFood(preset: FoodPreset): DetectedFood {
  return {
    id: makeId(),
    name: preset.name,
    portionLabel: preset.portionLabel,
    grams: preset.defaultGrams,
    caloriesPer100g: preset.caloriesPer100g,
    proteinPer100g: preset.proteinPer100g,
    carbsPer100g: preset.carbsPer100g,
    fatPer100g: preset.fatPer100g,
    confidence: "medium",
  };
}
