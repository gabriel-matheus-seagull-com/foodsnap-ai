"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { deleteSavedAnalysis, updateSavedAnalysis } from "@/lib/db/saved-analyses";
import { detectedFoodSchema } from "@/lib/validation/detected-food";

const updateAnalysisInputSchema = z.object({
  id: z.string().min(1),
  items: z.array(detectedFoodSchema).min(1).max(50),
  note: z.string().trim().max(1000),
});

export type UpdateAnalysisResult =
  | { ok: true }
  | { ok: false; error: string };

/** Re-checks auth() itself rather than trusting the client, mirroring `saveAnalysisAction`. */
export async function updateSavedAnalysisAction(
  input: unknown,
): Promise<UpdateAnalysisResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "You need to sign in to edit results." };
  }

  const parsed = updateAnalysisInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That result couldn't be updated (invalid data)." };
  }

  try {
    const updated = await updateSavedAnalysis(userId, parsed.data.id, {
      items: parsed.data.items,
      note: parsed.data.note,
    });
    if (!updated) {
      return { ok: false, error: "That result doesn't exist or isn't yours." };
    }
    return { ok: true };
  } catch (error) {
    console.error("[updateSavedAnalysisAction] failed:", error);
    return { ok: false, error: "We couldn't update that result. Try again." };
  }
}

export type DeleteAnalysisResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteSavedAnalysisAction(
  id: string,
): Promise<DeleteAnalysisResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "You need to sign in to delete results." };
  }
  if (!id || typeof id !== "string") {
    return { ok: false, error: "Invalid result." };
  }

  try {
    const deleted = await deleteSavedAnalysis(userId, id);
    if (!deleted) {
      return { ok: false, error: "That result doesn't exist or isn't yours." };
    }
    return { ok: true };
  } catch (error) {
    console.error("[deleteSavedAnalysisAction] failed:", error);
    return { ok: false, error: "We couldn't delete that result. Try again." };
  }
}
