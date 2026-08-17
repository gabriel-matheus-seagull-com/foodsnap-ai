export type GoalStatus = "below" | "on_target" | "above";

export interface GoalProgress {
  /** Percent of goal reached, e.g. 84 for 84%. Not clamped — can exceed 100. */
  percent: number;
  status: GoalStatus;
}

/** +/- band around the goal that counts as "on target". */
const ON_TARGET_BAND = 0.1;

/**
 * Compare an actual nutrition value against a user goal. Pure and
 * framework-free, mirroring `lib/nutrition/estimate.ts`'s style. Returns
 * `null` when there is no goal to compare against (caller should render a
 * "set your goals" prompt instead of a progress bar).
 */
export function computeGoalProgress(
  actual: number,
  goal: number | null | undefined,
): GoalProgress | null {
  if (goal === null || goal === undefined || goal <= 0) return null;

  const percent = Math.round((actual / goal) * 100);
  const ratio = actual / goal;

  let status: GoalStatus;
  if (ratio < 1 - ON_TARGET_BAND) status = "below";
  else if (ratio > 1 + ON_TARGET_BAND) status = "above";
  else status = "on_target";

  return { percent, status };
}
