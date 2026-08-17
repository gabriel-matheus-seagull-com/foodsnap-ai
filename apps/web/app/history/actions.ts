"use server";

import { auth } from "@clerk/nextjs/server";

import { getNutritionTotalsInRange } from "@/lib/db/saved-analyses";
import { getUserGoals } from "@/lib/db/goals";
import { getCachedInsight, saveInsight } from "@/lib/db/ai-insights";
import { summarizeRows } from "@/lib/nutrition/aggregate-history";
import { coachPeriodRange, type CoachPeriod, COACH_PERIODS } from "@/lib/nutrition/date-range";
import { buildCoachSnapshot, computeSnapshotFingerprint, generateCoachInsight } from "@/lib/ai/coach";

export type CoachInsightResult =
  | { ok: true; summary: string; focus: string; period: CoachPeriod; cached: boolean }
  | { ok: false; error: string };

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function encodeInsight(summary: string, focus: string): string {
  return JSON.stringify({ summary, focus });
}

function decodeInsight(text: string): { summary: string; focus: string } {
  try {
    const parsed = JSON.parse(text) as { summary?: string; focus?: string };
    return { summary: parsed.summary ?? "", focus: parsed.focus ?? "" };
  } catch {
    return { summary: text, focus: "" };
  }
}

/**
 * The ONLY code path that can trigger an AI call for the Food Coach. Never
 * invoked from page load, filters, or navigation — always a direct result of
 * the user clicking "Analyze my week" (or similar). Checks the deterministic
 * snapshot cache before spending any tokens; only regenerates when the
 * underlying aggregate has actually changed since the last generation.
 */
export async function generateCoachInsightAction(
  period: unknown,
): Promise<CoachInsightResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "You need to sign in for AI insights." };
  }

  const isValidPeriod = COACH_PERIODS.some((p) => p.value === period);
  if (!isValidPeriod) {
    return { ok: false, error: "Invalid analysis period." };
  }
  const validPeriod = period as CoachPeriod;

  try {
    const range = coachPeriodRange(validPeriod);
    const periodStart = isoDate(range.start);
    const periodEnd = isoDate(new Date(range.end.getTime() - 86_400_000));

    const rows = await getNutritionTotalsInRange(userId, range);
    const summary = summarizeRows(rows);
    const goals = await getUserGoals(userId);
    const snapshot = buildCoachSnapshot(summary, goals, validPeriod);
    const fingerprint = computeSnapshotFingerprint(snapshot);

    const cached = await getCachedInsight(userId, validPeriod, periodStart);
    if (cached && cached.snapshotFingerprint === fingerprint) {
      const { summary: cachedSummary, focus: cachedFocus } = decodeInsight(
        cached.insightText,
      );
      return { ok: true, summary: cachedSummary, focus: cachedFocus, period: validPeriod, cached: true };
    }

    const insight = await generateCoachInsight(snapshot);
    await saveInsight({
      userId,
      period: validPeriod,
      periodStart,
      periodEnd,
      snapshot,
      snapshotFingerprint: fingerprint,
      insightText: encodeInsight(insight.summary, insight.focus),
      provider: insight.provider,
      model: insight.model,
    });

    return { ok: true, summary: insight.summary, focus: insight.focus, period: validPeriod, cached: false };
  } catch (error) {
    console.error("[generateCoachInsightAction] failed:", error);
    return { ok: false, error: "We couldn't generate insights right now. Try again." };
  }
}
