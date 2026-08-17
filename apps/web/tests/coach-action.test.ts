import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NutritionTotalsRow } from "@/lib/nutrition/aggregate-history";
import type { UserGoals } from "@/lib/db/goals";

let mockUserId: string | null = "user_abc";
const getNutritionTotalsInRangeMock = vi.fn();
const getUserGoalsMock = vi.fn();
const getCachedInsightMock = vi.fn();
const saveInsightMock = vi.fn();
const generateCoachInsightMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: mockUserId }),
}));

vi.mock("@/lib/db/saved-analyses", () => ({
  getNutritionTotalsInRange: (...args: unknown[]) => getNutritionTotalsInRangeMock(...args),
}));

vi.mock("@/lib/db/goals", () => ({
  getUserGoals: (...args: unknown[]) => getUserGoalsMock(...args),
}));

vi.mock("@/lib/db/ai-insights", () => ({
  getCachedInsight: (...args: unknown[]) => getCachedInsightMock(...args),
  saveInsight: (...args: unknown[]) => saveInsightMock(...args),
}));

vi.mock("@/lib/ai/coach", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/coach")>();
  return {
    ...actual,
    generateCoachInsight: (...args: unknown[]) => generateCoachInsightMock(...args),
  };
});

const { generateCoachInsightAction } = await import("@/app/history/actions");

const GOALS: UserGoals = {
  userId: "user_abc",
  calorieGoal: 2000,
  proteinGoalG: 140,
  carbGoalG: 220,
  fatGoalG: 70,
  updatedAt: "2026-08-16T00:00:00.000Z",
};

const ROWS: NutritionTotalsRow[] = [
  {
    id: "row-1",
    createdAt: "2026-08-15T12:00:00.000Z",
    totalCalories: 2100,
    totalProtein: 120,
    totalCarbs: 200,
    totalFat: 65,
  },
];

beforeEach(() => {
  mockUserId = "user_abc";
  getNutritionTotalsInRangeMock.mockReset().mockResolvedValue(ROWS);
  getUserGoalsMock.mockReset().mockResolvedValue(GOALS);
  getCachedInsightMock.mockReset().mockResolvedValue(null);
  saveInsightMock.mockReset().mockResolvedValue({});
  generateCoachInsightMock.mockReset().mockResolvedValue({
    summary: "Fresh insight.",
    focus: "Eat more protein.",
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
  });
});

describe("generateCoachInsightAction — auth & validation", () => {
  it("rejects when signed out, without calling the AI or touching the db", async () => {
    mockUserId = null;
    const result = await generateCoachInsightAction("last_7_days");
    expect(result.ok).toBe(false);
    expect(generateCoachInsightMock).not.toHaveBeenCalled();
    expect(getNutritionTotalsInRangeMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid period", async () => {
    const result = await generateCoachInsightAction("last_year");
    expect(result.ok).toBe(false);
    expect(generateCoachInsightMock).not.toHaveBeenCalled();
  });
});

describe("generateCoachInsightAction — caching", () => {
  it("cache miss: calls the AI once and persists the result", async () => {
    const result = await generateCoachInsightAction("last_7_days");

    expect(result).toMatchObject({ ok: true, cached: false, summary: "Fresh insight." });
    expect(generateCoachInsightMock).toHaveBeenCalledTimes(1);
    expect(saveInsightMock).toHaveBeenCalledTimes(1);
    expect(saveInsightMock.mock.calls[0]?.[0]).toMatchObject({
      userId: "user_abc",
      period: "last_7_days",
    });
  });

  it("cache hit with a matching fingerprint: reuses the cached insight, no AI call", async () => {
    // First call to learn the exact fingerprint the action computes.
    await generateCoachInsightAction("last_7_days");
    const snapshot = saveInsightMock.mock.calls[0]?.[0].snapshot;
    const fingerprint = saveInsightMock.mock.calls[0]?.[0].snapshotFingerprint;

    generateCoachInsightMock.mockClear();
    saveInsightMock.mockClear();
    getCachedInsightMock.mockResolvedValue({
      id: "insight-1",
      userId: "user_abc",
      period: "last_7_days",
      periodStart: "2026-08-10",
      periodEnd: "2026-08-16",
      snapshot,
      snapshotFingerprint: fingerprint,
      insightText: JSON.stringify({ summary: "Cached insight.", focus: "Stay consistent." }),
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      generatedAt: "2026-08-16T00:00:00.000Z",
    });

    const result = await generateCoachInsightAction("last_7_days");

    expect(result).toMatchObject({
      ok: true,
      cached: true,
      summary: "Cached insight.",
      focus: "Stay consistent.",
    });
    expect(generateCoachInsightMock).not.toHaveBeenCalled();
    expect(saveInsightMock).not.toHaveBeenCalled();
  });

  it("cache present but fingerprint stale (data changed): regenerates via the AI", async () => {
    getCachedInsightMock.mockResolvedValue({
      id: "insight-1",
      userId: "user_abc",
      period: "last_7_days",
      periodStart: "2026-08-10",
      periodEnd: "2026-08-16",
      snapshot: {},
      snapshotFingerprint: "stale-fingerprint",
      insightText: JSON.stringify({ summary: "Old insight.", focus: "" }),
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      generatedAt: "2026-08-01T00:00:00.000Z",
    });

    const result = await generateCoachInsightAction("last_7_days");

    expect(result).toMatchObject({ ok: true, cached: false, summary: "Fresh insight." });
    expect(generateCoachInsightMock).toHaveBeenCalledTimes(1);
    expect(saveInsightMock).toHaveBeenCalledTimes(1);
  });
});

describe("generateCoachInsightAction — zero-meal period", () => {
  it("still calls the AI/mock path once but does not error on empty data", async () => {
    getNutritionTotalsInRangeMock.mockResolvedValue([]);
    const result = await generateCoachInsightAction("today");
    expect(result.ok).toBe(true);
    expect(saveInsightMock).toHaveBeenCalledTimes(1);
  });
});
