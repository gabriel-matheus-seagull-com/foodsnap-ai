import { describe, expect, it } from "vitest";

import {
  buildCoachSnapshot,
  computeSnapshotFingerprint,
  parseCoachResponse,
  buildMockCoachInsight,
  type CoachSnapshot,
} from "@/lib/ai/coach";
import type { UserGoals } from "@/lib/db/goals";

const TOTALS = { daysTracked: 5, avgCalories: 2100, avgProtein: 120, avgCarbs: 200, avgFat: 65 };

const GOALS: UserGoals = {
  userId: "user_abc",
  calorieGoal: 2000,
  proteinGoalG: 140,
  carbGoalG: 220,
  fatGoalG: 70,
  updatedAt: "2026-08-16T00:00:00.000Z",
};

describe("buildCoachSnapshot", () => {
  it("maps totals + goals into the compact snapshot shape", () => {
    const snapshot = buildCoachSnapshot(TOTALS, GOALS, "last_7_days");
    expect(snapshot).toEqual({
      period: "last_7_days",
      daysTracked: 5,
      averageCalories: 2100,
      averageProtein: 120,
      averageCarbohydrates: 200,
      averageFat: 65,
      calorieGoal: 2000,
      proteinGoal: 140,
      carbohydrateGoal: 220,
      fatGoal: 70,
    });
  });

  it("sends null goal fields when no goals are set, rather than omitting or zeroing them", () => {
    const snapshot = buildCoachSnapshot(TOTALS, null, "today");
    expect(snapshot.calorieGoal).toBeNull();
    expect(snapshot.proteinGoal).toBeNull();
  });
});

describe("computeSnapshotFingerprint", () => {
  it("is deterministic for identical snapshots", () => {
    const a = buildCoachSnapshot(TOTALS, GOALS, "last_7_days");
    const b = buildCoachSnapshot(TOTALS, GOALS, "last_7_days");
    expect(computeSnapshotFingerprint(a)).toBe(computeSnapshotFingerprint(b));
  });

  it("changes when the underlying data changes", () => {
    const a = buildCoachSnapshot(TOTALS, GOALS, "last_7_days");
    const b = buildCoachSnapshot({ ...TOTALS, avgCalories: 2200 }, GOALS, "last_7_days");
    expect(computeSnapshotFingerprint(a)).not.toBe(computeSnapshotFingerprint(b));
  });
});

describe("parseCoachResponse", () => {
  it("parses valid JSON", () => {
    const raw = JSON.stringify({ summary: "You're consistent.", focus: "Keep it up." });
    expect(parseCoachResponse(raw)).toEqual({
      summary: "You're consistent.",
      focus: "Keep it up.",
    });
  });

  it("extracts JSON wrapped in prose or code fences", () => {
    const wrapped =
      "Sure!\n```json\n" +
      JSON.stringify({ summary: "Looks good.", focus: "" }) +
      "\n```";
    expect(parseCoachResponse(wrapped)).toEqual({ summary: "Looks good.", focus: "" });
  });

  it("falls back to the raw trimmed text when the response isn't valid JSON", () => {
    const raw = "  You're doing great this week!  ";
    expect(parseCoachResponse(raw)).toEqual({
      summary: "You're doing great this week!",
      focus: "",
    });
  });
});

describe("buildMockCoachInsight", () => {
  it("reports no data for a zero-meal period without dividing by zero", () => {
    const snapshot: CoachSnapshot = buildCoachSnapshot(
      { daysTracked: 0, avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0 },
      GOALS,
      "today",
    );
    const result = buildMockCoachInsight(snapshot);
    expect(result.summary).toMatch(/no meals/i);
    expect(result.focus).toBe("");
  });

  it("prompts to set goals when none exist, instead of a nonsensical percentage", () => {
    const snapshot = buildCoachSnapshot(TOTALS, null, "last_7_days");
    const result = buildMockCoachInsight(snapshot);
    expect(result.summary).not.toMatch(/0%/);
    expect(result.focus).toMatch(/goals/i);
  });

  it("hedges when daysTracked is low", () => {
    const snapshot = buildCoachSnapshot(
      { daysTracked: 1, avgCalories: 2500, avgProtein: 90, avgCarbs: 200, avgFat: 80 },
      GOALS,
      "today",
    );
    const result = buildMockCoachInsight(snapshot);
    expect(result.summary.toLowerCase()).toContain("limited data");
  });

  it("references goal status when goals are set", () => {
    const snapshot = buildCoachSnapshot(TOTALS, GOALS, "last_7_days");
    const result = buildMockCoachInsight(snapshot);
    expect(result.summary).toContain("2100");
    expect(result.summary).toContain("2000");
  });
});
