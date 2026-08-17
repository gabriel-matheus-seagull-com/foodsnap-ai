import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import type { CoachPeriod } from "@/lib/nutrition/date-range";
import type { CoachSnapshot } from "@/lib/ai/coach";

/**
 * Cache/persistence for AI Food Coach insights. One row per
 * (userId, period, periodStart), upserted in place — see `lib/ai/coach.ts`
 * for how the snapshot fingerprint is computed and compared.
 */

export interface AiInsight {
  id: string;
  userId: string;
  period: CoachPeriod;
  periodStart: string;
  periodEnd: string;
  snapshot: CoachSnapshot;
  snapshotFingerprint: string;
  insightText: string;
  provider: string | null;
  model: string | null;
  generatedAt: string;
}

interface AiInsightRow {
  id: string;
  user_id: string;
  period: CoachPeriod;
  period_start: string;
  period_end: string;
  snapshot: CoachSnapshot;
  snapshot_fingerprint: string;
  insight_text: string;
  provider: string | null;
  model: string | null;
  generated_at: string;
}

function fromRow(row: AiInsightRow): AiInsight {
  return {
    id: row.id,
    userId: row.user_id,
    period: row.period,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    snapshot: row.snapshot,
    snapshotFingerprint: row.snapshot_fingerprint,
    insightText: row.insight_text,
    provider: row.provider,
    model: row.model,
    generatedAt: row.generated_at,
  };
}

/** Fetch a previously generated insight for this exact user+period+window, if any. */
export async function getCachedInsight(
  userId: string,
  period: CoachPeriod,
  periodStart: string,
): Promise<AiInsight | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ai_nutrition_insights")
    .select()
    .eq("user_id", userId)
    .eq("period", period)
    .eq("period_start", periodStart)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch cached insight: ${error.message}`);
  }
  return data ? fromRow(data as AiInsightRow) : null;
}

export interface SaveInsightInput {
  userId: string;
  period: CoachPeriod;
  periodStart: string;
  periodEnd: string;
  snapshot: CoachSnapshot;
  snapshotFingerprint: string;
  insightText: string;
  provider?: string;
  model?: string;
}

/** Persist (or replace) the generated insight for a user+period+window. */
export async function saveInsight(input: SaveInsightInput): Promise<AiInsight> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ai_nutrition_insights")
    .upsert(
      {
        user_id: input.userId,
        period: input.period,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        snapshot: input.snapshot,
        snapshot_fingerprint: input.snapshotFingerprint,
        insight_text: input.insightText,
        provider: input.provider ?? null,
        model: input.model ?? null,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,period,period_start" },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to save AI insight: ${error?.message ?? "unknown error"}`,
    );
  }
  return fromRow(data as AiInsightRow);
}
