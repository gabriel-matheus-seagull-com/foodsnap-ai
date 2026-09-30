import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DetectedFood } from "@/lib/types";

let mockUserId: string | null = "user_abc";
const saveAnalysisMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: mockUserId }),
}));

vi.mock("@/lib/db/saved-analyses", () => ({
  saveAnalysis: (...args: unknown[]) => saveAnalysisMock(...args),
}));

const { saveAnalysisAction } = await import("@/app/analyze/actions");

function item(overrides: Partial<DetectedFood> = {}): DetectedFood {
  return {
    id: "food-1",
    name: "Grilled chicken breast",
    portionLabel: "1 fillet",
    grams: 150,
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    confidence: "high",
    ...overrides,
  };
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    items: [item()],
    overallConfidence: "medium" as const,
    note: "Rough estimate.",
    source: "ai" as const,
    provider: "anthropic",
    ...overrides,
  };
}

beforeEach(() => {
  mockUserId = "user_abc";
  saveAnalysisMock.mockReset();
});

describe("saveAnalysisAction — auth", () => {
  it("rejects when signed out, without touching the db layer", async () => {
    mockUserId = null;
    const result = await saveAnalysisAction(validInput());

    expect(result.ok).toBe(false);
    expect(saveAnalysisMock).not.toHaveBeenCalled();
  });
});

describe("saveAnalysisAction — validation", () => {
  it("rejects an empty items array", async () => {
    const result = await saveAnalysisAction(validInput({ items: [] }));
    expect(result.ok).toBe(false);
    expect(saveAnalysisMock).not.toHaveBeenCalled();
  });

  it("rejects out-of-range grams", async () => {
    const result = await saveAnalysisAction(
      validInput({ items: [item({ grams: -10 })] }),
    );
    expect(result.ok).toBe(false);
    expect(saveAnalysisMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid confidence enum", async () => {
    const result = await saveAnalysisAction(
      validInput({ overallConfidence: "extreme" }),
    );
    expect(result.ok).toBe(false);
    expect(saveAnalysisMock).not.toHaveBeenCalled();
  });
});

describe("saveAnalysisAction — happy path", () => {
  it("saves with the signed-in userId and returns the new id", async () => {
    saveAnalysisMock.mockResolvedValue({ id: "row-1" });
    const result = await saveAnalysisAction(validInput());

    expect(result).toEqual({ ok: true, id: "row-1" });
    expect(saveAnalysisMock).toHaveBeenCalledTimes(1);
    expect(saveAnalysisMock.mock.calls[0]?.[0]).toMatchObject({
      userId: "user_abc",
      overallConfidence: "medium",
      source: "ai",
    });
  });

  it("returns a graceful error if the db layer throws", async () => {
    saveAnalysisMock.mockRejectedValue(new Error("db down"));
    const result = await saveAnalysisAction(validInput());
    expect(result.ok).toBe(false);
  });
});
