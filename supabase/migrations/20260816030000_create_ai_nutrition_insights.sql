-- Cache/persistence for AI Food Coach insights. One row per user+period+
-- period_start, upserted in place. `snapshot_fingerprint` lets the app skip
-- the AI call entirely when the underlying deterministic snapshot hasn't
-- changed since the last generation (see lib/ai/coach.ts).

create table if not exists public.ai_nutrition_insights (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,                     -- Clerk user id
  period text not null
    check (period in ('today', 'last_7_days', 'last_30_days')),
  period_start date not null,
  period_end date not null,
  snapshot jsonb not null,
  snapshot_fingerprint text not null,
  insight_text text not null,
  provider text,
  model text,
  generated_at timestamptz not null default now()
);

create unique index if not exists ai_nutrition_insights_user_period_start_idx
  on public.ai_nutrition_insights (user_id, period, period_start);

alter table public.ai_nutrition_insights enable row level security;
