import { beforeEach, describe, expect, it, vi } from "vitest";

let mockUserId: string | null = "user_abc";
const upsertUserGoalsMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: mockUserId }),
}));

vi.mock("@/lib/db/goals", () => ({
  upsertUserGoals: (...args: unknown[]) => upsertUserGoalsMock(...args),
}));

const { saveGoalsAction } = await import("@/app/goals/actions");

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    calorieGoal: 2000,
    proteinGoalG: 140,
    carbGoalG: 220,
    fatGoalG: 70,
    ...overrides,
  };
}

beforeEach(() => {
  mockUserId = "user_abc";
  upsertUserGoalsMock.mockReset();
});

describe("saveGoalsAction — auth", () => {
  it("rejects when signed out, without touching the db layer", async () => {
    mockUserId = null;
    const result = await saveGoalsAction(validInput());
    expect(result.ok).toBe(false);
    expect(upsertUserGoalsMock).not.toHaveBeenCalled();
  });
});

describe("saveGoalsAction — validation", () => {
  it("rejects a non-positive calorie goal", async () => {
    const result = await saveGoalsAction(validInput({ calorieGoal: 0 }));
    expect(result.ok).toBe(false);
    expect(upsertUserGoalsMock).not.toHaveBeenCalled();
  });

  it("rejects a negative macro goal", async () => {
    const result = await saveGoalsAction(validInput({ proteinGoalG: -10 }));
    expect(result.ok).toBe(false);
    expect(upsertUserGoalsMock).not.toHaveBeenCalled();
  });

  it("rejects non-integer values", async () => {
    const result = await saveGoalsAction(validInput({ calorieGoal: 2000.5 }));
    expect(result.ok).toBe(false);
    expect(upsertUserGoalsMock).not.toHaveBeenCalled();
  });
});

describe("saveGoalsAction — happy path", () => {
  it("saves with the signed-in userId", async () => {
    upsertUserGoalsMock.mockResolvedValue({ userId: "user_abc" });
    const result = await saveGoalsAction(validInput());
    expect(result.ok).toBe(true);
    expect(upsertUserGoalsMock).toHaveBeenCalledWith("user_abc", validInput());
  });

  it("returns a graceful error if the db layer throws", async () => {
    upsertUserGoalsMock.mockRejectedValue(new Error("db down"));
    const result = await saveGoalsAction(validInput());
    expect(result.ok).toBe(false);
  });
});
