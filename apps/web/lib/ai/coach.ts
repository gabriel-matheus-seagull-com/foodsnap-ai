import { z } from "zod";

import { extractJson } from "@/lib/ai/analyze-image";
import { COACH_SYSTEM_PROMPT, buildCoachUserInstruction } from "@/lib/ai/coach-prompt";
import { hasConfiguredProvider, resolveProvider } from "@/lib/ai/providers";
import type { ProviderId } from "@/lib/ai/providers/types";
import { computeGoalProgress } from "@/lib/nutrition/goal-progress";
import type { CoachPeriod } from "@/lib/nutrition/date-range";
import type { UserGoals } from "@/lib/db/goals";

/**
 * AI Food Coach orchestration layer. Mirrors `lib/ai/analyze-image.ts`'s
 * shape (resolve provider -> call -> shared tolerant parsing), but is
 * text-only: it never sees raw meals, only the small deterministic
 * `CoachSnapshot` built by the caller from already-aggregated DB data.
 */

export interface CoachSnapshot {
  period: CoachPeriod;
  daysTracked: number;
  averageCalories: number;
  averageProtein: number;
  averageCarbohydrates: number;
  averageFat: number;
  calorieGoal: number | null;
  proteinGoal: number | null;
  carbohydrateGoal: number | null;
  fatGoal: number | null;
}

export interface CoachInsight {
  summary: string;
  focus: string;
  provider: ProviderId | "mock";
  model?: string;
}

interface DailyTotals {
  daysTracked: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
}

/** Build the compact, aggregated-only payload sent to the AI — see CLAUDE.md's cost-efficiency requirement. */
export function buildCoachSnapshot(
  totals: DailyTotals,
  goals: UserGoals | null,
  period: CoachPeriod,
): CoachSnapshot {
  return {
    period,
    daysTracked: totals.daysTracked,
    averageCalories: totals.avgCalories,
    averageProtein: totals.avgProtein,
    averageCarbohydrates: totals.avgCarbs,
    averageFat: totals.avgFat,
    calorieGoal: goals?.calorieGoal ?? null,
    proteinGoal: goals?.proteinGoalG ?? null,
    carbohydrateGoal: goals?.carbGoalG ?? null,
    fatGoal: goals?.fatGoalG ?? null,
  };
}

/** Deterministic fingerprint of a snapshot — the cache key that gates whether a fresh AI call is needed. */
export function computeSnapshotFingerprint(snapshot: CoachSnapshot): string {
  return JSON.stringify(snapshot);
}

export function buildCoachPrompt(snapshot: CoachSnapshot): {
  systemPrompt: string;
  userInstruction: string;
} {
  return {
    systemPrompt: COACH_SYSTEM_PROMPT,
    userInstruction: buildCoachUserInstruction(JSON.stringify(snapshot)),
  };
}

const rawCoachResponseSchema = z.object({
  summary: z.string().trim().default(""),
  focus: z.string().trim().default(""),
});

/**
 * Parse + validate the model's raw text response. Pure and synchronous so it
 * can be unit-tested without the network. Unlike the vision parser, this
 * degrades softly on malformed output — a coach response is prose, not
 * structured data the rest of the app depends on — by falling back to the
 * raw trimmed text as the summary instead of throwing.
 */
export function parseCoachResponse(rawText: string): { summary: string; focus: string } {
  try {
    const parsed = JSON.parse(extractJson(rawText));
    const result = rawCoachResponseSchema.safeParse(parsed);
    if (result.success && result.data.summary) {
      return result.data;
    }
  } catch {
    // fall through to the soft fallback below
  }
  return { summary: rawText.trim(), focus: "" };
}

/** A deterministic, rule-based insight used when no AI provider is configured — keeps the Coach demoable offline. */
export function buildMockCoachInsight(snapshot: CoachSnapshot): {
  summary: string;
  focus: string;
} {
  if (snapshot.daysTracked === 0) {
    return {
      summary: "No meals were logged for this period yet.",
      focus: "",
    };
  }

  const calorieProgress = computeGoalProgress(snapshot.averageCalories, snapshot.calorieGoal);
  const proteinProgress = computeGoalProgress(snapshot.averageProtein, snapshot.proteinGoal);

  const hedge = snapshot.daysTracked <= 2 ? "Based on the limited data so far, " : "";

  if (!calorieProgress && !proteinProgress) {
    return {
      summary: `${hedge}You averaged about ${snapshot.averageCalories} kcal and ${snapshot.averageProtein} g of protein per day over ${snapshot.daysTracked} tracked day${snapshot.daysTracked === 1 ? "" : "s"}.`,
      focus: "Set your daily nutrition goals to see how this compares to a target.",
    };
  }

  const parts: string[] = [];
  if (calorieProgress) {
    const word =
      calorieProgress.status === "on_target"
        ? "right around"
        : calorieProgress.status === "above"
          ? "above"
          : "below";
    parts.push(`averaging ${snapshot.averageCalories} kcal/day, ${word} your ${snapshot.calorieGoal} kcal goal`);
  }
  if (proteinProgress) {
    const word =
      proteinProgress.status === "on_target"
        ? "on track with"
        : proteinProgress.status === "above"
          ? "above"
          : "below";
    parts.push(`protein intake (${snapshot.averageProtein} g/day) is ${word} your ${snapshot.proteinGoal} g goal`);
  }

  const focusTarget =
    proteinProgress && proteinProgress.status === "below"
      ? "Try adding a protein-rich food to your main meals."
      : calorieProgress && calorieProgress.status === "above"
        ? "Watch portion sizes on your largest meals."
        : "Keep up your current consistency.";

  return {
    summary: `${hedge}Over ${snapshot.daysTracked} tracked day${snapshot.daysTracked === 1 ? "" : "s"}, you're ${parts.join(", and ")}.`,
    focus: focusTarget,
  };
}

/** True when a real model call can be made (any provider configured). */
export function isCoachAiConfigured(): boolean {
  return hasConfiguredProvider();
}

/** Generate (or mock-generate) an insight for a snapshot. Never called on page load — only from an explicit user action. */
export async function generateCoachInsight(
  snapshot: CoachSnapshot,
): Promise<CoachInsight> {
  const provider = resolveProvider();
  if (!provider) {
    const { summary, focus } = buildMockCoachInsight(snapshot);
    return { summary, focus, provider: "mock" };
  }

  if (snapshot.daysTracked === 0) {
    const { summary, focus } = buildMockCoachInsight(snapshot);
    return { summary, focus, provider: provider.id, model: provider.model };
  }

  const { systemPrompt, userInstruction } = buildCoachPrompt(snapshot);
  const text = await provider.generateChatText({ systemPrompt, userInstruction });
  const { summary, focus } = parseCoachResponse(text);
  return { summary, focus, provider: provider.id, model: provider.model };
}
