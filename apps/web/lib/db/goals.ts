import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";

/**
 * Data-access layer for per-user daily nutrition goals. Mirrors
 * `lib/db/saved-analyses.ts`'s style: thin typed functions, explicit
 * `userId`, no ORM. One row per user, upserted in place (no history).
 */

export interface UserGoals {
  userId: string;
  calorieGoal: number;
  proteinGoalG: number;
  carbGoalG: number;
  fatGoalG: number;
  updatedAt: string;
}

interface UserGoalsRow {
  user_id: string;
  calorie_goal: number;
  protein_goal_g: number;
  carb_goal_g: number;
  fat_goal_g: number;
  updated_at: string;
}

function fromRow(row: UserGoalsRow): UserGoals {
  return {
    userId: row.user_id,
    calorieGoal: row.calorie_goal,
    proteinGoalG: row.protein_goal_g,
    carbGoalG: row.carb_goal_g,
    fatGoalG: row.fat_goal_g,
    updatedAt: row.updated_at,
  };
}

/** Fetch a user's nutrition goals, or null if they haven't set any yet. */
export async function getUserGoals(userId: string): Promise<UserGoals | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_nutrition_goals")
    .select()
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch nutrition goals: ${error.message}`);
  }
  return data ? fromRow(data as UserGoalsRow) : null;
}

export interface UpsertGoalsInput {
  calorieGoal: number;
  proteinGoalG: number;
  carbGoalG: number;
  fatGoalG: number;
}

/** Create or replace a user's nutrition goals (single row per user). */
export async function upsertUserGoals(
  userId: string,
  input: UpsertGoalsInput,
): Promise<UserGoals> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_nutrition_goals")
    .upsert(
      {
        user_id: userId,
        calorie_goal: input.calorieGoal,
        protein_goal_g: input.proteinGoalG,
        carb_goal_g: input.carbGoalG,
        fat_goal_g: input.fatGoalG,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to save nutrition goals: ${error?.message ?? "unknown error"}`,
    );
  }
  return fromRow(data as UserGoalsRow);
}
