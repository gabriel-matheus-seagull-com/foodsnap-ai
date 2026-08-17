import { describe, expect, it } from "vitest";

import { computeGoalProgress } from "@/lib/nutrition/goal-progress";

describe("computeGoalProgress", () => {
  it("returns null when there is no goal", () => {
    expect(computeGoalProgress(1500, null)).toBeNull();
    expect(computeGoalProgress(1500, undefined)).toBeNull();
    expect(computeGoalProgress(1500, 0)).toBeNull();
  });

  it("flags exactly on-target at 100%", () => {
    const result = computeGoalProgress(2000, 2000);
    expect(result).toEqual({ percent: 100, status: "on_target" });
  });

  it("stays on-target within the +/-10% band", () => {
    expect(computeGoalProgress(1900, 2000)?.status).toBe("on_target"); // 95%
    expect(computeGoalProgress(2100, 2000)?.status).toBe("on_target"); // 105%
  });

  it("flags below target just past the -10% edge", () => {
    const result = computeGoalProgress(1780, 2000); // 89%
    expect(result?.status).toBe("below");
    expect(result?.percent).toBe(89);
  });

  it("flags above target just past the +10% edge", () => {
    const result = computeGoalProgress(2220, 2000); // 111%
    expect(result?.status).toBe("above");
    expect(result?.percent).toBe(111);
  });

  it("allows percent to exceed 100 without clamping", () => {
    const result = computeGoalProgress(4000, 2000);
    expect(result?.percent).toBe(200);
    expect(result?.status).toBe("above");
  });
});
