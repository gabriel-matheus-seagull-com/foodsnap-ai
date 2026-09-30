import { z } from "zod";

import type { DetectedFood } from "@/lib/types";

/**
 * Shared defensive re-check for payloads the client already produced from
 * our own API/action responses moments earlier — bounds validation against a
 * client bug or tampered request, not tolerant coercion of untrusted AI text
 * (that's `lib/ai/analyze-image.ts`'s `rawItemSchema`). Used by both the
 * save and update Server Actions.
 */
export const detectedFoodSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  portionLabel: z.string().trim().max(200),
  grams: z.number().positive().max(5000),
  caloriesPer100g: z.number().nonnegative().max(900),
  proteinPer100g: z.number().nonnegative().max(100),
  carbsPer100g: z.number().nonnegative().max(100),
  fatPer100g: z.number().nonnegative().max(100),
  confidence: z.enum(["low", "medium", "high"]),
}) satisfies z.ZodType<DetectedFood>;
