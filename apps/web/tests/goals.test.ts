import { beforeEach, describe, expect, it, vi } from "vitest";

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

const { getUserGoals, upsertUserGoals } = await import("@/lib/db/goals");

const ROW = {
  user_id: "user_abc",
  calorie_goal: 2000,
  protein_goal_g: 140,
  carb_goal_g: 220,
  fat_goal_g: 70,
  updated_at: "2026-08-16T00:00:00.000Z",
};

beforeEach(() => {
  lastBuilder = null;
  nextResult = { data: null, error: null };
});

describe("getUserGoals", () => {
  it("returns null when no goals are set yet", async () => {
    nextResult = { data: null, error: null };
    const result = await getUserGoals("user_abc");
    expect(result).toBeNull();
  });

  it("maps the row to the domain shape", async () => {
    nextResult = { data: ROW, error: null };
    const result = await getUserGoals("user_abc");
    expect(result).toEqual({
      userId: "user_abc",
      calorieGoal: 2000,
      proteinGoalG: 140,
      carbGoalG: 220,
      fatGoalG: 70,
      updatedAt: "2026-08-16T00:00:00.000Z",
    });
    const eqCall = lastBuilder?.calls.find((c) => c.method === "eq");
    expect(eqCall?.args).toEqual(["user_id", "user_abc"]);
  });

  it("throws when Supabase returns an error", async () => {
    nextResult = { data: null, error: { message: "boom" } };
    await expect(getUserGoals("user_abc")).rejects.toThrow(
      "Failed to fetch nutrition goals",
    );
  });
});

describe("upsertUserGoals", () => {
  it("upserts on user_id and maps the result", async () => {
    nextResult = { data: ROW, error: null };
    const result = await upsertUserGoals("user_abc", {
      calorieGoal: 2000,
      proteinGoalG: 140,
      carbGoalG: 220,
      fatGoalG: 70,
    });
    expect(result.calorieGoal).toBe(2000);

    const upsertCall = lastBuilder?.calls.find((c) => c.method === "upsert");
    expect(upsertCall?.args[0]).toMatchObject({ user_id: "user_abc" });
    expect(upsertCall?.args[1]).toMatchObject({ onConflict: "user_id" });
  });

  it("throws when Supabase returns an error", async () => {
    nextResult = { data: null, error: { message: "boom" } };
    await expect(
      upsertUserGoals("user_abc", {
        calorieGoal: 2000,
        proteinGoalG: 140,
        carbGoalG: 220,
        fatGoalG: 70,
      }),
    ).rejects.toThrow("Failed to save nutrition goals");
  });
});
