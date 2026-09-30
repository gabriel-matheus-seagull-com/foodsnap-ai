-- Adds computed nutrition totals + search text to saved_analyses.
--
-- This is a deliberate, narrow exception to the original migration's "never
-- persist derived nutrition" stance: server-side filtering by nutrition
-- range (My Results) and history aggregation (day/week/month totals) are
-- impractical against a jsonb blob at scale. To avoid these columns ever
-- diverging from the truth, application code writes them ONLY by calling
-- the existing `estimateNutrition()` (apps/web/lib/nutrition/estimate.ts)
-- at insert/update time — see lib/db/saved-analyses.ts. Per-item detail
-- views keep recomputing from `items` on every read, unchanged.

create extension if not exists "pg_trgm";

alter table public.saved_analyses
  add column if not exists total_calories int,
  add column if not exists total_protein numeric,
  add column if not exists total_carbs numeric,
  add column if not exists total_fat numeric,
  add column if not exists search_text text not null default '',
  add column if not exists updated_at timestamptz not null default now();

-- Backfill existing rows from `items`, mirroring estimateNutrition()'s point
-- values (calories rounded to the nearest 5, macros to the nearest 1). This
-- is a one-time best-effort computation for rows written before this
-- migration; all future writes go through the app's shared pure function.
update public.saved_analyses
set
  total_calories = coalesce((
    select round(sum((elem->>'caloriesPer100g')::numeric * (elem->>'grams')::numeric / 100) / 5) * 5
    from jsonb_array_elements(items) elem
  ), 0),
  total_protein = coalesce((
    select round(sum((elem->>'proteinPer100g')::numeric * (elem->>'grams')::numeric / 100))
    from jsonb_array_elements(items) elem
  ), 0),
  total_carbs = coalesce((
    select round(sum((elem->>'carbsPer100g')::numeric * (elem->>'grams')::numeric / 100))
    from jsonb_array_elements(items) elem
  ), 0),
  total_fat = coalesce((
    select round(sum((elem->>'fatPer100g')::numeric * (elem->>'grams')::numeric / 100))
    from jsonb_array_elements(items) elem
  ), 0),
  search_text = lower(
    coalesce((select string_agg(elem->>'name', ' ') from jsonb_array_elements(items) elem), '')
    || ' ' || coalesce(note, '')
  )
where total_calories is null;

alter table public.saved_analyses
  alter column total_calories set not null,
  alter column total_protein set not null,
  alter column total_carbs set not null,
  alter column total_fat set not null;

create index if not exists saved_analyses_user_id_total_calories_idx
  on public.saved_analyses (user_id, total_calories);
create index if not exists saved_analyses_user_id_total_protein_idx
  on public.saved_analyses (user_id, total_protein);
create index if not exists saved_analyses_user_id_total_carbs_idx
  on public.saved_analyses (user_id, total_carbs);
create index if not exists saved_analyses_user_id_total_fat_idx
  on public.saved_analyses (user_id, total_fat);
create index if not exists saved_analyses_search_text_trgm_idx
  on public.saved_analyses using gin (search_text gin_trgm_ops);
