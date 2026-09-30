"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { saveAnalysis } from "@/lib/db/saved-analyses";
import { detectedFoodSchema } from "@/lib/validation/detected-food";

const saveAnalysisInputSchema = z.object({
  items: z.array(detectedFoodSchema).min(1).max(50),
  overallConfidence: z.enum(["low", "medium", "high"]),
  note: z.string().trim().max(1000),
  source: z.enum(["ai", "mock"]),
  provider: z.string().max(100).optional(),
});

export type SaveAnalysisResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function saveAnalysisAction(
  input: unknown,
): Promise<SaveAnalysisResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "You need to sign in to save results." };
  }

  const parsed = saveAnalysisInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That result couldn't be saved (invalid data)." };
  }

  try {
    const saved = await saveAnalysis({ userId, ...parsed.data });
    return { ok: true, id: saved.id };
  } catch (error) {
    console.error("[saveAnalysisAction] failed:", error);
    return { ok: false, error: "We couldn't save that result. Try again." };
  }
}
