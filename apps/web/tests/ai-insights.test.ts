import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CoachSnapshot } from "@/lib/ai/coach";

interface QueryCall {
  method: string;
  args: unknown[];
}

function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const calls: QueryCall[] = [];
  const chain =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  const builder = {
    calls,
    select: chain("select"),
    eq: chain("eq"),
    upsert: chain("upsert"),
    single() {
      calls.push({ method: "single", args: [] });
      return Promise.resolve(result);
    },
    maybeSingle() {
      calls.push({ method: "maybeSingle", args: [] });
      return Promise.resolve(result);
    },
  };
  return builder;
}

let lastBuilder: ReturnType<typeof makeQueryBuilder> | null = null;
let nextResult: { data: unknown; error: unknown } = { data: null, error: null };

vi.mock("@/lib/db/supabase-server", () => ({
  getSupabaseServerClient: () => ({
    from: () => {
      lastBuilder = makeQueryBuilder(nextResult);
      return lastBuilder;
    },
  }),
}));

const { getCachedInsight, saveInsight } = await import("@/lib/db/ai-insights");

const SNAPSHOT: CoachSnapshot = {
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
};

const ROW = {
  id: "insight-1",
  user_id: "user_abc",
  period: "last_7_days",
  period_start: "2026-08-10",
  period_end: "2026-08-16",
  snapshot: SNAPSHOT,
  snapshot_fingerprint: "fp-1",
  insight_text: JSON.stringify({ summary: "You're doing well.", focus: "Add more protein." }),
  provider: "anthropic",
  model: "claude-haiku-4-5-20251001",
  generated_at: "2026-08-16T00:00:00.000Z",
};

beforeEach(() => {
  lastBuilder = null;
  nextResult = { data: null, error: null };
});

describe("getCachedInsight", () => {
  it("filters by userId, period, and periodStart", async () => {
    nextResult = { data: ROW, error: null };
    const result = await getCachedInsight("user_abc", "last_7_days", "2026-08-10");

    expect(result?.snapshotFingerprint).toBe("fp-1");
    const eqCalls = lastBuilder?.calls.filter((c) => c.method === "eq") ?? [];
    expect(eqCalls).toEqual([
      { method: "eq", args: ["user_id", "user_abc"] },
      { method: "eq", args: ["period", "last_7_days"] },
      { method: "eq", args: ["period_start", "2026-08-10"] },
    ]);
  });

  it("returns null when nothing is cached", async () => {
    nextResult = { data: null, error: null };
    const result = await getCachedInsight("user_abc", "today", "2026-08-16");
    expect(result).toBeNull();
  });

  it("throws when Supabase returns an error", async () => {
    nextResult = { data: null, error: { message: "boom" } };
    await expect(
      getCachedInsight("user_abc", "today", "2026-08-16"),
    ).rejects.toThrow("Failed to fetch cached insight");
  });
});

describe("saveInsight", () => {
  it("upserts on (user_id, period, period_start)", async () => {
    nextResult = { data: ROW, error: null };
    const result = await saveInsight({
      userId: "user_abc",
      period: "last_7_days",
      periodStart: "2026-08-10",
      periodEnd: "2026-08-16",
      snapshot: SNAPSHOT,
      snapshotFingerprint: "fp-1",
      insightText: ROW.insight_text,
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
    });

    expect(result.id).toBe("insight-1");
    const upsertCall = lastBuilder?.calls.find((c) => c.method === "upsert");
    expect(upsertCall?.args[0]).toMatchObject({ user_id: "user_abc", period: "last_7_days" });
    expect(upsertCall?.args[1]).toMatchObject({
      onConflict: "user_id,period,period_start",
    });
  });

  it("throws when Supabase returns an error", async () => {
    nextResult = { data: null, error: { message: "boom" } };
    await expect(
      saveInsight({
        userId: "user_abc",
        period: "today",
        periodStart: "2026-08-16",
        periodEnd: "2026-08-16",
        snapshot: SNAPSHOT,
        snapshotFingerprint: "fp-1",
        insightText: "{}",
      }),
    ).rejects.toThrow("Failed to save AI insight");
  });
});
