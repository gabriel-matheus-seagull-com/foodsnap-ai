import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DetectedFood } from "@/lib/types";

/**
 * A minimal stand-in for the chunk of the Supabase query-builder API this
 * module actually uses. Each chain method records what it was called with
 * and returns `this`; awaiting the builder resolves to whatever the test
 * configured via `resolveWith`. Mirrors the "no HTTP mocking library, mock
 * the module directly" convention used elsewhere in this suite.
 */
interface QueryCall {
  method: string;
  args: unknown[];
}

interface FakeQueryBuilder {
  calls: QueryCall[];
  insert(...args: unknown[]): FakeQueryBuilder;
  update(...args: unknown[]): FakeQueryBuilder;
  delete(...args: unknown[]): FakeQueryBuilder;
  select(...args: unknown[]): FakeQueryBuilder;
  eq(...args: unknown[]): FakeQueryBuilder;
  ilike(...args: unknown[]): FakeQueryBuilder;
  gte(...args: unknown[]): FakeQueryBuilder;
  lte(...args: unknown[]): FakeQueryBuilder;
  lt(...args: unknown[]): FakeQueryBuilder;
  order(...args: unknown[]): FakeQueryBuilder;
  limit(...args: unknown[]): FakeQueryBuilder;
  single(): Promise<{ data: unknown; error: unknown }>;
  maybeSingle(): Promise<{ data: unknown; error: unknown }>;
  then(
    onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ): Promise<unknown>;
}

function makeQueryBuilder(result: {
  data: unknown;
  error: unknown;
}): FakeQueryBuilder {
  const calls: QueryCall[] = [];
  const chain =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  const builder: FakeQueryBuilder = {
    calls,
    insert: chain("insert"),
    update: chain("update"),
    delete: chain("delete"),
    select: chain("select"),
    eq: chain("eq"),
    ilike: chain("ilike"),
    gte: chain("gte"),
    lte: chain("lte"),
    lt: chain("lt"),
    order: chain("order"),
    limit: chain("limit"),
    single() {
      calls.push({ method: "single", args: [] });
      return Promise.resolve(result);
    },
    maybeSingle() {
      calls.push({ method: "maybeSingle", args: [] });
      return Promise.resolve(result);
    },
    then(
      onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
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

const {
  saveAnalysis,
  updateSavedAnalysis,
  deleteSavedAnalysis,
  listSavedAnalyses,
  getSavedAnalysis,
  getNutritionTotalsInRange,
} = await import("@/lib/db/saved-analyses");

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

const ROW = {
  id: "row-1",
  user_id: "user_abc",
  items: [item()],
  overall_confidence: "medium",
  note: "Rough estimate.",
  source: "ai",
  provider: "anthropic",
  created_at: "2026-08-16T00:00:00.000Z",
  updated_at: "2026-08-16T00:00:00.000Z",
  total_calories: 248,
  total_protein: 47,
  total_carbs: 0,
  total_fat: 5,
};

beforeEach(() => {
  lastBuilder = null;
  nextResult = { data: null, error: null };
});

describe("saveAnalysis", () => {
  it("inserts and maps the returned row to the domain shape, computing totals via estimateNutrition", async () => {
    nextResult = { data: ROW, error: null };
    const result = await saveAnalysis({
      userId: "user_abc",
      items: [item()],
      overallConfidence: "medium",
      note: "Rough estimate.",
      source: "ai",
      provider: "anthropic",
    });

    expect(result.id).toBe("row-1");
    expect(result.totalCalories).toBe(248);

    const insertCall = lastBuilder?.calls.find((c) => c.method === "insert");
    const inserted = insertCall?.args[0] as Record<string, unknown>;
    expect(inserted).toMatchObject({ user_id: "user_abc" });
    // total_* / search_text are derived from items via estimateNutrition(),
    // never hardcoded or independently computed.
    expect(inserted.total_calories).toBeGreaterThan(0);
    expect(inserted.search_text).toContain("grilled chicken breast");
  });

  it("throws when Supabase returns an error", async () => {
    nextResult = { data: null, error: { message: "boom" } };
    await expect(
      saveAnalysis({
        userId: "user_abc",
        items: [item()],
        overallConfidence: "low",
        note: "",
        source: "mock",
      }),
    ).rejects.toThrow("Failed to save analysis");
  });
});

describe("updateSavedAnalysis", () => {
  it("updates items/note scoped to id and userId", async () => {
    nextResult = { data: ROW, error: null };
    const result = await updateSavedAnalysis("user_abc", "row-1", {
      items: [item({ name: "Salmon" })],
      note: "Updated",
    });

    expect(result?.id).toBe("row-1");
    const eqCalls = lastBuilder?.calls.filter((c) => c.method === "eq") ?? [];
    expect(eqCalls).toEqual([
      { method: "eq", args: ["id", "row-1"] },
      { method: "eq", args: ["user_id", "user_abc"] },
    ]);
    const updateCall = lastBuilder?.calls.find((c) => c.method === "update");
    const updated = updateCall?.args[0] as Record<string, unknown>;
    expect(updated.note).toBe("Updated");
    expect(updated.search_text).toContain("salmon");
  });

  it("returns null when not found or not owned", async () => {
    nextResult = { data: null, error: null };
    const result = await updateSavedAnalysis("user_abc", "missing", {
      items: [item()],
      note: "",
    });
    expect(result).toBeNull();
  });

  it("throws when Supabase returns an error", async () => {
    nextResult = { data: null, error: { message: "boom" } };
    await expect(
      updateSavedAnalysis("user_abc", "row-1", { items: [item()], note: "" }),
    ).rejects.toThrow("Failed to update saved analysis");
  });
});

describe("deleteSavedAnalysis", () => {
  it("returns true when a row was deleted, scoped to id and userId", async () => {
    nextResult = { data: [{ id: "row-1" }], error: null };
    const result = await deleteSavedAnalysis("user_abc", "row-1");
    expect(result).toBe(true);
    const eqCalls = lastBuilder?.calls.filter((c) => c.method === "eq") ?? [];
    expect(eqCalls).toEqual([
      { method: "eq", args: ["id", "row-1"] },
      { method: "eq", args: ["user_id", "user_abc"] },
    ]);
  });

  it("returns false when nothing matched", async () => {
    nextResult = { data: [], error: null };
    const result = await deleteSavedAnalysis("user_abc", "missing");
    expect(result).toBe(false);
  });

  it("throws when Supabase returns an error", async () => {
    nextResult = { data: null, error: { message: "boom" } };
    await expect(deleteSavedAnalysis("user_abc", "row-1")).rejects.toThrow(
      "Failed to delete saved analysis",
    );
  });
});

describe("listSavedAnalyses", () => {
  it("filters by userId only when no filters given", async () => {
    nextResult = { data: [ROW], error: null };
    const result = await listSavedAnalyses("user_abc");

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("row-1");
    const eqCall = lastBuilder?.calls.find((c) => c.method === "eq");
    expect(eqCall?.args).toEqual(["user_id", "user_abc"]);
    expect(lastBuilder?.calls.some((c) => c.method === "ilike")).toBe(false);
    expect(lastBuilder?.calls.some((c) => c.method === "gte")).toBe(false);
  });

  it("applies search + nutrition-range filters", async () => {
    nextResult = { data: [ROW], error: null };
    await listSavedAnalyses("user_abc", {
      query: "Chicken",
      minCalories: 200,
      maxCalories: 800,
      minProtein: 20,
    });

    const ilikeCall = lastBuilder?.calls.find((c) => c.method === "ilike");
    expect(ilikeCall?.args).toEqual(["search_text", "%chicken%"]);
    const gteCalls = lastBuilder?.calls.filter((c) => c.method === "gte") ?? [];
    expect(gteCalls).toEqual([
      { method: "gte", args: ["total_calories", 200] },
      { method: "gte", args: ["total_protein", 20] },
    ]);
    const lteCall = lastBuilder?.calls.find((c) => c.method === "lte");
    expect(lteCall?.args).toEqual(["total_calories", 800]);
  });

  it("throws when Supabase returns an error", async () => {
    nextResult = { data: null, error: { message: "boom" } };
    await expect(listSavedAnalyses("user_abc")).rejects.toThrow(
      "Failed to list saved analyses",
    );
  });
});

describe("getSavedAnalysis", () => {
  it("filters by both id and userId", async () => {
    nextResult = { data: ROW, error: null };
    const result = await getSavedAnalysis("user_abc", "row-1");

    expect(result?.id).toBe("row-1");
    const eqCalls = lastBuilder?.calls.filter((c) => c.method === "eq") ?? [];
    expect(eqCalls).toEqual([
      { method: "eq", args: ["id", "row-1"] },
      { method: "eq", args: ["user_id", "user_abc"] },
    ]);
  });

  it("returns null when no row matches (not found or not owned)", async () => {
    nextResult = { data: null, error: null };
    const result = await getSavedAnalysis("user_abc", "missing");
    expect(result).toBeNull();
  });
});

describe("getNutritionTotalsInRange", () => {
  it("selects only lightweight columns, scoped by userId and date range", async () => {
    nextResult = {
      data: [
        {
          id: "row-1",
          created_at: "2026-08-16T12:00:00.000Z",
          total_calories: 500,
          total_protein: 40,
          total_carbs: 30,
          total_fat: 10,
        },
      ],
      error: null,
    };

    const start = new Date("2026-08-10T00:00:00.000Z");
    const end = new Date("2026-08-17T00:00:00.000Z");
    const result = await getNutritionTotalsInRange("user_abc", { start, end });

    expect(result).toEqual([
      {
        id: "row-1",
        createdAt: "2026-08-16T12:00:00.000Z",
        totalCalories: 500,
        totalProtein: 40,
        totalCarbs: 30,
        totalFat: 10,
      },
    ]);

    const selectCall = lastBuilder?.calls.find((c) => c.method === "select");
    expect(selectCall?.args[0]).not.toContain("items");
    const gteCall = lastBuilder?.calls.find((c) => c.method === "gte");
    expect(gteCall?.args).toEqual(["created_at", start.toISOString()]);
    const ltCall = lastBuilder?.calls.find((c) => c.method === "lt");
    expect(ltCall?.args).toEqual(["created_at", end.toISOString()]);
  });

  it("throws when Supabase returns an error", async () => {
    nextResult = { data: null, error: { message: "boom" } };
    await expect(
      getNutritionTotalsInRange("user_abc", {
        start: new Date(),
        end: new Date(),
      }),
    ).rejects.toThrow("Failed to fetch nutrition totals");
  });
});
