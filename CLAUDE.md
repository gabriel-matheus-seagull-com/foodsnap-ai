# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

The FoodSnap AI MVP is implemented in `apps/web` (landing page, upload → analyze → review → results flow, `api/analyze` route, a provider-agnostic AI vision layer with offline mock fallback, and a pure nutrition-estimation layer). The analyzer stays fully usable without signing in. Authenticated users additionally get a Clerk-backed profile page and can save/revisit analysis results via a Supabase-backed `saved_analyses` table, with search/filter/edit/delete on the results list. Authenticated users can also set daily nutrition goals, view a day/week/month nutrition history with goal-progress bars, and request an AI Food Coach interpretation of their own aggregated history — see "History, goals & AI Food Coach" below. `apps/docs` is still the untouched Turborepo starter.

Stack added on top of the scaffold: Tailwind CSS v3, lightweight shadcn-style UI primitives (`apps/web/components/ui`), `zod` for validation, `lucide-react` icons, Vitest for unit tests, `@clerk/nextjs` for auth, and `@supabase/supabase-js` for persistence. See the root `README.md` for the full architecture.

### AI provider layer (`lib/ai/providers`)

The vision layer is **provider-agnostic**. `lib/ai/analyze-image.ts` orchestrates (resolve provider → call → shared zod parsing), but the model backend lives behind a small `VisionProvider` interface (`providers/types.ts`):

- `providers/anthropic.ts` — Claude via `@anthropic-ai/sdk` (default model `claude-haiku-4-5-20251001`, the cheapest tier).
- `providers/gemini.ts` — Gemini via the REST API with `fetch` (no extra SDK dependency; default `gemini-2.5-flash-lite`, the cheapest tier).
- `providers/index.ts` — `resolveProvider()` selects the backend from env only: explicit `AI_PROVIDER` (`anthropic`/`gemini`/`mock`), else auto-detect from whichever key is present (Anthropic preferred), else `null` → offline mock.

Env vars: `AI_PROVIDER`, `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`, `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)/`GEMINI_MODEL` — all registered in `turbo.json` `globalEnv`. **Add a new provider** by creating `providers/<name>.ts` returning a `VisionProvider` and wiring it into `resolveProvider()`; parsing/validation is shared and needs no changes.

### Auth layer (`proxy.ts`, Clerk)

Clerk (`@clerk/nextjs`) is the sole source of truth for identity — there is no second auth system. `proxy.ts` (Next.js 16's rename of the middleware file convention) only wires up `clerkMiddleware()` so `auth()`/`auth.protect()` work anywhere in the app — it does **not** gate routes by path. Route protection instead happens per-page via `auth.protect()` (Clerk's current recommended "resource-based" pattern; path-matched middleware protection via `createRouteMatcher` is deprecated upstream), called directly in `app/profile/[[...profile]]/page.tsx`, `app/results/page.tsx`, and `app/results/[id]/page.tsx`. The analyzer (`/`, `/analyze`, `/api/analyze`) has no auth check anywhere and stays fully public.

`<ClerkProvider>` wraps the root layout (`app/layout.tsx`); `components/foodsnap/app-header.tsx` (a Server Component) renders auth-aware nav via Clerk's async `<Show when="signed-in">`/`<Show when="signed-out">` (this Clerk major version removed the old `<SignedIn>`/`<SignedOut>` client components in favor of `<Show>`). Client components that need the same check (e.g. the Save button in `nutrition-results.tsx`) use the `useUser()` hook's `isSignedIn` instead, since `<Show>` is itself an async Server Component and can't be rendered directly inside a `"use client"` tree.

The profile page (`app/profile/[[...profile]]/page.tsx`) mounts Clerk's prebuilt `<UserProfile />` rather than a custom form — name and username live natively in Clerk (username enabled via the Clerk Dashboard), so there is no `users`/`profiles` table in Supabase and nothing is duplicated between the two systems.

Google SSO and the username field are **Clerk Dashboard** configuration, not code. Env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

### Data layer (`lib/db`)

Structurally mirrors the AI provider layer: a thin client factory (`lib/db/supabase-server.ts`) plus typed data functions (`lib/db/saved-analyses.ts`), no ORM. The Supabase client uses the **service-role key** and is loaded only in server-only code (enforced by the `server-only` package) — the service-role key bypasses Row Level Security entirely, so every data function takes an explicit `userId` and every caller must obtain it from Clerk's `auth()` server-side; never trust a client-supplied id. RLS is enabled on `saved_analyses` as defense-in-depth only (see the migration file), not the real authorization boundary.

Saving happens through a Server Action (`app/analyze/actions.ts`, invoked from the results step's Save button) that re-checks `auth()` itself rather than trusting the client to only show the button when signed in. Nutrition totals are never persisted — `saved_analyses` stores only `items` (a self-contained `DetectedFood[]` snapshot) plus `AnalysisResult` metadata; every read recomputes totals via the existing `estimateNutrition()`.

Schema/migrations live in `supabase/migrations/` (SQL, applied manually via the Supabase CLI or SQL editor — not run automatically by this repo). Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only; there is no client-side Supabase usage, so no `NEXT_PUBLIC_`/anon key exists).

### History, goals & AI Food Coach

Builds on the data/AI layers above. The guiding principle: **deterministic code/DB does all nutrition math; the AI only ever interprets a small pre-aggregated snapshot, and only when the user explicitly clicks a button** — never on page load, filter change, or navigation.

- **`saved_analyses` gained `total_calories`/`total_protein`/`total_carbs`/`total_fat`/`search_text` columns** (migration `20260816010000_...`). This is a deliberate, narrow exception to "recompute nutrition on every read": server-side search/range-filtering (My Results) and history aggregation are impractical against a `jsonb` blob at scale. These columns are written **only** by calling the existing `estimateNutrition()` at insert/update time (see `computeDerivedFields` in `lib/db/saved-analyses.ts`) — never computed independently — so there's one source of truth. Per-item detail reads (`/results/[id]`) still recompute from `items` via `estimateNutrition()`, unchanged.
- **`lib/nutrition/aggregate-history.ts`** — pure functions (`groupByPeriod`, `summarizeRows`) that bucket lightweight per-meal totals rows (never raw `items`) into day/week/month summaries with per-day averages, UTC-anchored (no per-user timezone concept exists yet). **`lib/nutrition/goal-progress.ts`** — `computeGoalProgress()`, a ±10%-band below/on-target/above comparison. **`lib/nutrition/date-range.ts`** — UTC date-range helpers for both the History page's grouping window and the AI Coach's three periods.
- **`lib/db/goals.ts`** (`user_nutrition_goals` table, migration `20260816020000_...`) — one row per user, upserted in place, same explicit-`userId`/RLS-as-defense-in-depth pattern as `saved_analyses`.
- **AI Food Coach (`lib/ai/coach.ts`)** — mirrors `analyze-image.ts`'s shape but is text-only. The vision providers (`providers/anthropic.ts`/`gemini.ts`) each gained a second method, `generateChatText({systemPrompt, userInstruction})`, alongside the existing image-only `generateText()`; `resolveProvider()` is reused unchanged. `buildCoachSnapshot()` builds the compact JSON payload sent to the model (period, days tracked, daily averages, goals — no raw meals, no images); `parseCoachResponse()` tolerantly parses the model's `{summary, focus}` JSON, degrading to raw text rather than throwing (a coach response is prose, not structured data the rest of the app depends on); `buildMockCoachInsight()` provides a deterministic offline fallback, same role as `buildMockAnalysis()`.
- **Caching (`lib/db/ai-insights.ts`, `ai_nutrition_insights` table, migration `20260816030000_...`)** — one row per `(user_id, period, period_start)`, upserted in place, keyed by a fingerprint of the deterministic snapshot (`computeSnapshotFingerprint`). `app/history/actions.ts`'s `generateCoachInsightAction` — the *only* code path allowed to call the AI — checks the cache first and only regenerates when the fingerprint has changed (i.e. a meal in that window was added/edited/deleted since the last generation).
- **New routes**: `/history` (day/week/month summaries + goal-progress bars + the `AiCoachCard`), `/goals` (daily target form), `/results/[id]/edit` (reuses `DetectedFoodsReview`/`FoodItemRow` from the analyze flow — now parameterized with optional label props — to edit a saved result's food items). All three call `auth.protect()`, matching `/results` and `/profile`.
- No new env vars — the Coach reuses `AI_PROVIDER`/`ANTHROPIC_API_KEY`/`GEMINI_API_KEY` exactly as configured for image analysis.

## Toolchain

- **Package manager:** pnpm 9 (`packageManager` is pinned; use pnpm, not npm/yarn). Node >= 18.
- **Monorepo:** Turborepo. Workspaces are `apps/*` and `packages/*` (see `pnpm-workspace.yaml`).
- All top-level scripts go through `turbo`, which respects the task graph in `turbo.json`.

## Commands

Run from the repo root:

```sh
pnpm dev            # run all apps in dev (turbo, persistent, uncached)
pnpm build          # build all apps/packages (^build dependency order)
pnpm lint           # eslint across the graph, fails on any warning (--max-warnings 0)
pnpm check-types    # next typegen + tsc --noEmit across the graph
pnpm format         # prettier --write over **/*.{ts,tsx,md}
```

Scope to a single workspace with a turbo filter:

```sh
pnpm exec turbo dev --filter=web        # web app only (http://localhost:3000)
pnpm exec turbo dev --filter=docs       # docs app only (http://localhost:3001)
pnpm exec turbo build --filter=docs
```

**Tests:** Vitest is configured in `apps/web` (a `test` task is wired into `turbo.json`). Run all tests with `pnpm test`, or just the web app with `pnpm --filter web test`. Tests live in `apps/web/tests/` and focus on the pure logic (nutrition estimation, AI response parsing, and the API route).

## Architecture

Two Next.js 16 apps (App Router, React 19) share code through internal `@repo/*` packages:

- `apps/web` — Next.js app, dev port **3000**.
- `apps/docs` — Next.js app, dev port **3001**.
- `packages/ui` (`@repo/ui`) — shared React component library.
- `packages/eslint-config` (`@repo/eslint-config`) — flat ESLint configs.
- `packages/typescript-config` (`@repo/typescript-config`) — shared `tsconfig` bases.

### Shared UI package (`@repo/ui`)

Key non-obvious detail: this package is **not built**. Its `exports` map is `"./*": "./src/*.tsx"`, so consumers import raw source by subpath and Next.js transpiles it:

```ts
import { Button } from "@repo/ui/button";   // -> packages/ui/src/button.tsx
```

Add a new component by creating `packages/ui/src/<name>.tsx`; it becomes importable as `@repo/ui/<name>` with no barrel/index file. There is a `generate:component` script (`turbo gen react-component`), but no generator templates exist under the repo yet, so scaffold manually for now.

### Shared config packages

- `@repo/eslint-config` exposes three entry points used by each workspace's `eslint.config.js`: `./base`, `./next-js` (apps), `./react-internal` (the UI lib). Note `eslint-plugin-only-warn` downgrades everything to warnings, and the lint scripts use `--max-warnings 0` — so any lint issue still fails the build.
- `@repo/typescript-config` exposes `base.json`, `nextjs.json`, and `react-library.json`; each package's `tsconfig.json` extends one of these. The base enables `strict` and `noUncheckedIndexedAccess` with `NodeNext` module resolution — expect index access to be `T | undefined`.

### Type checking

`check-types` runs `next typegen && tsc --noEmit` per app, so type errors surface independently of the Next build. Run it before assuming a change type-checks.
