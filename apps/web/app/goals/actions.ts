"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { upsertUserGoals } from "@/lib/db/goals";

const saveGoalsInputSchema = z.object({
  calorieGoal: z.number().int().positive().max(20000),
  proteinGoalG: z.number().int().nonnegative().max(2000),
  carbGoalG: z.number().int().nonnegative().max(2000),
  fatGoalG: z.number().int().nonnegative().max(2000),
});

export type SaveGoalsResult = { ok: true } | { ok: false; error: string };

export async function saveGoalsAction(input: unknown): Promise<SaveGoalsResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "You need to sign in to set goals." };
  }

  const parsed = saveGoalsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Those goals couldn't be saved (invalid data)." };
  }

  try {
    await upsertUserGoals(userId, parsed.data);
    return { ok: true };
  } catch (error) {
    console.error("[saveGoalsAction] failed:", error);
    return { ok: false, error: "We couldn't save your goals. Try again." };
  }
}
