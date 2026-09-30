-- Saved food-analysis results. One row per "Save" action from the results
-- step of the analyzer. Self-contained snapshot: items are stored verbatim
-- (jsonb), not references to any other table, so there is nothing to
-- "dangle" if app-side food defaults ever change.
--
-- Nutrition totals (calories/macros) are deliberately NOT stored here — they
-- are pure functions of `items` (see lib/nutrition/estimate.ts) and are
-- recomputed on every read to avoid divergence between stored and derived
-- values.

create extension if not exists "pgcrypto";

create table if not exists public.saved_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,                    -- Clerk user id (e.g. "user_xxx")
  items jsonb not null,                      -- DetectedFood[]
  overall_confidence text not null
    check (overall_confidence in ('low', 'medium', 'high')),
  note text not null default '',
  source text not null check (source in ('ai', 'mock')),
  provider text,                             -- optional, matches AnalysisResult.provider
  created_at timestamptz not null default now()
);

create index if not exists saved_analyses_user_id_created_at_idx
  on public.saved_analyses (user_id, created_at desc);

-- Row Level Security: deny-by-default. This app does NOT use Supabase Auth
-- (no JWT template, no anon/authenticated Supabase sessions) — the only
-- credential used server-side is the service_role key, which BYPASSES RLS
-- entirely by design. These policies exist purely as defense-in-depth in
-- case the anon/authenticated keys are ever accidentally exposed or used;
-- the real authorization boundary is "service_role key only reachable from
-- server-only code, every query filtered by userId from Clerk's auth()".
alter table public.saved_analyses enable row level security;

-- No policies created for anon/authenticated roles => all access via those
-- roles is denied by default under RLS. Only service_role (which bypasses
-- RLS) can read/write.
