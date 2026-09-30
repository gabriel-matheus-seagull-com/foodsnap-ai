-- One row per user's daily nutrition targets. Same authorization stance as
-- saved_analyses: no Supabase Auth, service_role key only, RLS enabled purely
-- as defense-in-depth (no policies -> anon/authenticated denied by default).

create table if not exists public.user_nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,              -- Clerk user id
  calorie_goal int not null check (calorie_goal > 0),
  protein_goal_g int not null check (protein_goal_g >= 0),
  carb_goal_g int not null check (carb_goal_g >= 0),
  fat_goal_g int not null check (fat_goal_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_nutrition_goals enable row level security;
