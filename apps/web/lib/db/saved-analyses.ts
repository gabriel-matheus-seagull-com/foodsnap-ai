import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { estimateNutrition } from "@/lib/nutrition/estimate";
import type { NutritionTotalsRow } from "@/lib/nutrition/aggregate-history";
import type { AnalysisResult, DetectedFood } from "@/lib/types";

/**
 * Data-access layer for saved analyses. Mirrors the shape of `lib/ai` —
 * a thin client factory plus typed functions, no ORM. Auth is the caller's
 * responsibility: every function takes an explicit `userId` and never
 * derives one itself, so authorization always happens at the call site
 * (via Clerk's `auth()`), not here.
 *
 * `total_calories`/`total_protein`/`total_carbs`/`total_fat` are a
 * deliberate, narrow exception to "recompute nutrition on every read": they
 * exist purely so search/filter/history queries can run in SQL instead of
 * pulling every row's `items` jsonb into Node. They are written ONLY by
 * calling the same `estimateNutrition()` used everywhere else (see
 * `computeDerivedFields` below) — never computed independently — so there is
 * one source of truth and nothing to diverge. Per-item detail reads still
 * recompute from `items` via `estimateNutrition()`, unchanged.
 */

export interface SavedAnalysis {
  id: string;
  userId: string;
  items: DetectedFood[];
  overallConfidence: AnalysisResult["overallConfidence"];
  note: string;
  source: AnalysisResult["source"];
  provider: string | null;
  createdAt: string;
  updatedAt: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface SavedAnalysisRow {
  id: string;
  user_id: string;
  items: DetectedFood[];
  overall_confidence: string;
  note: string;
  source: string;
  provider: string | null;
  created_at: string;
  updated_at: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

function fromRow(row: SavedAnalysisRow): SavedAnalysis {
  return {
    id: row.id,
    userId: row.user_id,
    items: row.items,
    overallConfidence: row.overall_confidence as SavedAnalysis["overallConfidence"],
    note: row.note,
    source: row.source as SavedAnalysis["source"],
    provider: row.provider,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalCalories: row.total_calories,
    totalProtein: row.total_protein,
    totalCarbs: row.total_carbs,
    totalFat: row.total_fat,
  };
}

/** The one place `total_*`/`search_text` are derived — always from `estimateNutrition()`. */
function computeDerivedFields(items: DetectedFood[], note: string) {
  const estimate = estimateNutrition(items);
  const searchText = `${items.map((i) => i.name).join(" ")} ${note}`
    .trim()
    .toLowerCase();
  return {
    total_calories: estimate.calories,
    total_protein: estimate.protein,
    total_carbs: estimate.carbs,
    total_fat: estimate.fat,
    search_text: searchText,
  };
}

export interface SaveAnalysisInput {
  userId: string;
  items: DetectedFood[];
  overallConfidence: AnalysisResult["overallConfidence"];
  note: string;
  source: AnalysisResult["source"];
  provider?: string;
}

/** Persist a completed analysis snapshot for a user. */
export async function saveAnalysis(
  input: SaveAnalysisInput,
): Promise<SavedAnalysis> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_analyses")
    .insert({
      user_id: input.userId,
      items: input.items,
      overall_confidence: input.overallConfidence,
      note: input.note,
      source: input.source,
      provider: input.provider ?? null,
      ...computeDerivedFields(input.items, input.note),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to save analysis: ${error?.message ?? "unknown error"}`,
    );
  }
  return fromRow(data as SavedAnalysisRow);
}

export interface UpdateAnalysisInput {
  items: DetectedFood[];
  note: string;
}

/** Update a saved analysis's items/note, scoped to userId. Returns null if not found or not owned. */
export async function updateSavedAnalysis(
  userId: string,
  id: string,
  input: UpdateAnalysisInput,
): Promise<SavedAnalysis | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_analyses")
    .update({
      items: input.items,
      note: input.note,
      updated_at: new Date().toISOString(),
      ...computeDerivedFields(input.items, input.note),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update saved analysis: ${error.message}`);
  }
  return data ? fromRow(data as SavedAnalysisRow) : null;
}

/** Delete a saved analysis, scoped to userId. Returns whether a row was deleted. */
export async function deleteSavedAnalysis(
  userId: string,
  id: string,
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_analyses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    throw new Error(`Failed to delete saved analysis: ${error.message}`);
  }
  return Array.isArray(data) && data.length > 0;
}

export interface SavedAnalysesFilters {
  /** Matches food-item names and the note (case-insensitive substring). */
  query?: string;
  minCalories?: number;
  maxCalories?: number;
  minProtein?: number;
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;
}

/** List a user's saved analyses, newest first, with optional search/nutrition-range filters. MVP scope: no pagination. */
export async function listSavedAnalyses(
  userId: string,
  filters: SavedAnalysesFilters = {},
  limit = 50,
): Promise<SavedAnalysis[]> {
  const supabase = getSupabaseServerClient();
  let queryBuilder = supabase
    .from("saved_analyses")
    .select()
    .eq("user_id", userId);

  if (filters.query) {
    queryBuilder = queryBuilder.ilike("search_text", `%${filters.query.toLowerCase()}%`);
  }
  if (filters.minCalories !== undefined) {
    queryBuilder = queryBuilder.gte("total_calories", filters.minCalories);
  }
  if (filters.maxCalories !== undefined) {
    queryBuilder = queryBuilder.lte("total_calories", filters.maxCalories);
  }
  if (filters.minProtein !== undefined) {
    queryBuilder = queryBuilder.gte("total_protein", filters.minProtein);
  }
  if (filters.maxProtein !== undefined) {
    queryBuilder = queryBuilder.lte("total_protein", filters.maxProtein);
  }
  if (filters.minCarbs !== undefined) {
    queryBuilder = queryBuilder.gte("total_carbs", filters.minCarbs);
  }
  if (filters.maxCarbs !== undefined) {
    queryBuilder = queryBuilder.lte("total_carbs", filters.maxCarbs);
  }
  if (filters.minFat !== undefined) {
    queryBuilder = queryBuilder.gte("total_fat", filters.minFat);
  }
  if (filters.maxFat !== undefined) {
    queryBuilder = queryBuilder.lte("total_fat", filters.maxFat);
  }

  const { data, error } = await queryBuilder
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list saved analyses: ${error.message}`);
  }
  return (data as SavedAnalysisRow[]).map(fromRow);
}

/**
 * Fetch a single saved analysis by id, scoped to userId. Returns null for
 * both "doesn't exist" and "belongs to someone else" — the caller renders a
 * 404 either way, so non-owners can never distinguish the two.
 */
export async function getSavedAnalysis(
  userId: string,
  id: string,
): Promise<SavedAnalysis | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_analyses")
    .select()
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch saved analysis: ${error.message}`);
  }
  return data ? fromRow(data as SavedAnalysisRow) : null;
}

/**
 * Lightweight per-meal totals for a date range — used for History
 * grouping and the AI Coach snapshot. Deliberately selects only these six
 * columns (never `items`) so a bounded date-range query stays cheap however
 * large a user's full history grows.
 */
export async function getNutritionTotalsInRange(
  userId: string,
  range: { start: Date; end: Date },
): Promise<NutritionTotalsRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_analyses")
    .select("id, created_at, total_calories, total_protein, total_carbs, total_fat")
    .eq("user_id", userId)
    .gte("created_at", range.start.toISOString())
    .lt("created_at", range.end.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch nutrition totals: ${error.message}`);
  }

  return (
    data as Array<{
      id: string;
      created_at: string;
      total_calories: number;
      total_protein: number;
      total_carbs: number;
      total_fat: number;
    }>
  ).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    totalCalories: row.total_calories,
    totalProtein: row.total_protein,
    totalCarbs: row.total_carbs,
    totalFat: row.total_fat,
  }));
}
