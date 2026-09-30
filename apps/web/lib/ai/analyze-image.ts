import { z } from "zod";

import type { AnalysisResult, DetectedFood } from "@/lib/types";
import { makeId } from "@/lib/utils";
import { SYSTEM_PROMPT, USER_INSTRUCTION } from "@/lib/ai/prompt";
import {
  hasConfiguredProvider,
  resolveProvider,
} from "@/lib/ai/providers";
import type { SupportedMediaType } from "@/lib/ai/providers/types";

/**
 * AI image-analysis layer. Responsible only for turning an image into a
 * structured list of detected foods — it knows nothing about how nutrition is
 * aggregated (that's the nutrition layer's job) nor which model backend runs
 * (that's the provider layer in `./providers`).
 *
 * Designed to degrade gracefully:
 *  - No provider configured -> deterministic mock (the app fully demos offline).
 *  - Bad/empty model output  -> validated + clamped, or a clear thrown error.
 */

export type { SupportedMediaType };

export interface AnalyzeInput {
  imageBase64: string;
  mediaType: SupportedMediaType;
}

/** Raw shape we accept from the model — tolerant (coerces numbers, fills defaults). */
const rawItemSchema = z.object({
  name: z.string().trim().min(1),
  portionLabel: z.string().trim().default("1 serving"),
  grams: z.coerce.number().positive(),
  caloriesPer100g: z.coerce.number().nonnegative(),
  proteinPer100g: z.coerce.number().nonnegative(),
  carbsPer100g: z.coerce.number().nonnegative(),
  fatPer100g: z.coerce.number().nonnegative(),
  confidence: z.enum(["low", "medium", "high"]).catch("medium"),
});

const rawResultSchema = z.object({
  items: z.array(rawItemSchema),
  overallConfidence: z.enum(["low", "medium", "high"]).catch("medium"),
  note: z.string().trim().default(""),
});

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function toDetectedFood(raw: z.infer<typeof rawItemSchema>): DetectedFood {
  return {
    id: makeId(),
    name: raw.name,
    portionLabel: raw.portionLabel || "1 serving",
    grams: Math.round(clamp(raw.grams, 1, 2000)),
    caloriesPer100g: clamp(raw.caloriesPer100g, 0, 900),
    proteinPer100g: clamp(raw.proteinPer100g, 0, 100),
    carbsPer100g: clamp(raw.carbsPer100g, 0, 100),
    fatPer100g: clamp(raw.fatPer100g, 0, 100),
    confidence: raw.confidence,
  };
}

/** Extract the first balanced JSON object from a model response. */
export function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response.");
  }
  return text.slice(start, end + 1);
}

/**
 * Parse + validate a raw model text response into an AnalysisResult.
 * Pure and synchronous so it can be unit-tested without the network.
 */
export function parseAnalysis(rawText: string): AnalysisResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(rawText));
  } catch {
    throw new Error("Could not parse the AI response as JSON.");
  }

  const result = rawResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("The AI response did not match the expected format.");
  }

  const items = result.data.items.map(toDetectedFood);
  return {
    items,
    overallConfidence: result.data.overallConfidence,
    note:
      result.data.note ||
      "These are rough estimates based on the photo — treat them as a general guide.",
    source: "ai",
  };
}

/** A deterministic sample plate used when no API key is configured. */
export function buildMockAnalysis(): AnalysisResult {
  const items: DetectedFood[] = [
    {
      id: makeId(),
      name: "Grilled chicken breast",
      portionLabel: "1 fillet",
      grams: 150,
      caloriesPer100g: 165,
      proteinPer100g: 31,
      carbsPer100g: 0,
      fatPer100g: 3.6,
      confidence: "high",
    },
    {
      id: makeId(),
      name: "White rice (cooked)",
      portionLabel: "1 cup",
      grams: 180,
      caloriesPer100g: 130,
      proteinPer100g: 2.7,
      carbsPer100g: 28,
      fatPer100g: 0.3,
      confidence: "medium",
    },
    {
      id: makeId(),
      name: "Mixed green salad",
      portionLabel: "1 small bowl",
      grams: 90,
      caloriesPer100g: 22,
      proteinPer100g: 1.5,
      carbsPer100g: 3.8,
      fatPer100g: 0.3,
      confidence: "low",
    },
  ];

  return {
    items,
    overallConfidence: "medium",
    note: "Demo mode: no AI provider is configured, so this is a sample meal. Add an Anthropic or Gemini API key to analyze real photos. Estimates are always approximate.",
    source: "mock",
  };
}

/** True when a real model call can be made (any provider configured). */
export function isAiConfigured(): boolean {
  return hasConfiguredProvider();
}

/**
 * Analyze a meal image. Returns detected foods (per-100g basis). Falls back to
 * a mock when no provider is configured; throws a friendly Error on
 * model/parse failure. The chosen backend (Anthropic, Gemini, …) is decided by
 * the provider layer purely from environment variables.
 */
export async function analyzeImage(
  input: AnalyzeInput,
): Promise<AnalysisResult> {
  const provider = resolveProvider();
  if (!provider) {
    return buildMockAnalysis();
  }

  const text = await provider.generateText({
    imageBase64: input.imageBase64,
    mediaType: input.mediaType,
    systemPrompt: SYSTEM_PROMPT,
    userInstruction: USER_INSTRUCTION,
  });

  return { ...parseAnalysis(text), provider: provider.id };
}
