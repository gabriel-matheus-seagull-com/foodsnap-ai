import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DetectedFood } from "@/lib/types";

let mockUserId: string | null = "user_abc";
const updateSavedAnalysisMock = vi.fn();
const deleteSavedAnalysisMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: mockUserId }),
}));

vi.mock("@/lib/db/saved-analyses", () => ({
  updateSavedAnalysis: (...args: unknown[]) => updateSavedAnalysisMock(...args),
  deleteSavedAnalysis: (...args: unknown[]) => deleteSavedAnalysisMock(...args),
}));

const { updateSavedAnalysisAction, deleteSavedAnalysisAction } = await import(
  "@/app/results/actions"
);

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

beforeEach(() => {
  mockUserId = "user_abc";
  updateSavedAnalysisMock.mockReset();
  deleteSavedAnalysisMock.mockReset();
});

describe("updateSavedAnalysisAction", () => {
  it("rejects when signed out, without touching the db layer", async () => {
    mockUserId = null;
    const result = await updateSavedAnalysisAction({
      id: "row-1",
      items: [item()],
      note: "",
    });
    expect(result.ok).toBe(false);
    expect(updateSavedAnalysisMock).not.toHaveBeenCalled();
  });

  it("rejects an empty items array", async () => {
    const result = await updateSavedAnalysisAction({
      id: "row-1",
      items: [],
      note: "",
    });
    expect(result.ok).toBe(false);
    expect(updateSavedAnalysisMock).not.toHaveBeenCalled();
  });

  it("passes userId + id + items/note through on the happy path", async () => {
    updateSavedAnalysisMock.mockResolvedValue({ id: "row-1" });
    const result = await updateSavedAnalysisAction({
      id: "row-1",
      items: [item()],
      note: "Updated note",
    });
    expect(result.ok).toBe(true);
    expect(updateSavedAnalysisMock).toHaveBeenCalledWith("user_abc", "row-1", {
      items: [item()],
      note: "Updated note",
    });
  });

  it("returns ok:false when the result isn't found or isn't owned", async () => {
    updateSavedAnalysisMock.mockResolvedValue(null);
    const result = await updateSavedAnalysisAction({
      id: "missing",
      items: [item()],
      note: "",
    });
    expect(result.ok).toBe(false);
  });

  it("returns a graceful error if the db layer throws", async () => {
    updateSavedAnalysisMock.mockRejectedValue(new Error("db down"));
    const result = await updateSavedAnalysisAction({
      id: "row-1",
      items: [item()],
      note: "",
    });
    expect(result.ok).toBe(false);
  });
});

describe("deleteSavedAnalysisAction", () => {
  it("rejects when signed out, without touching the db layer", async () => {
    mockUserId = null;
    const result = await deleteSavedAnalysisAction("row-1");
    expect(result.ok).toBe(false);
    expect(deleteSavedAnalysisMock).not.toHaveBeenCalled();
  });

  it("deletes scoped to the signed-in userId", async () => {
    deleteSavedAnalysisMock.mockResolvedValue(true);
    const result = await deleteSavedAnalysisAction("row-1");
    expect(result.ok).toBe(true);
    expect(deleteSavedAnalysisMock).toHaveBeenCalledWith("user_abc", "row-1");
  });

  it("returns ok:false when nothing was deleted", async () => {
    deleteSavedAnalysisMock.mockResolvedValue(false);
    const result = await deleteSavedAnalysisAction("missing");
    expect(result.ok).toBe(false);
  });

  it("returns a graceful error if the db layer throws", async () => {
    deleteSavedAnalysisMock.mockRejectedValue(new Error("db down"));
    const result = await deleteSavedAnalysisAction("row-1");
    expect(result.ok).toBe(false);
  });
});
