# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

The FoodSnap AI MVP is implemented in `apps/web` (landing page, upload → analyze → review → results flow, `api/analyze` route, a provider-agnostic AI vision layer with offline mock fallback, and a pure nutrition-estimation layer). `apps/docs` is still the untouched Turborepo starter.

Stack added on top of the scaffold: Tailwind CSS v3, lightweight shadcn-style UI primitives (`apps/web/components/ui`), `zod` for validation, `lucide-react` icons, and Vitest for unit tests. See the root `README.md` for the full architecture.

### AI provider layer (`lib/ai/providers`)

The vision layer is **provider-agnostic**. `lib/ai/analyze-image.ts` orchestrates (resolve provider → call → shared zod parsing), but the model backend lives behind a small `VisionProvider` interface (`providers/types.ts`):

- `providers/anthropic.ts` — Claude via `@anthropic-ai/sdk` (default model `claude-haiku-4-5-20251001`, the cheapest tier).
- `providers/gemini.ts` — Gemini via the REST API with `fetch` (no extra SDK dependency; default `gemini-2.5-flash-lite`, the cheapest tier).
- `providers/index.ts` — `resolveProvider()` selects the backend from env only: explicit `AI_PROVIDER` (`anthropic`/`gemini`/`mock`), else auto-detect from whichever key is present (Anthropic preferred), else `null` → offline mock.

Env vars: `AI_PROVIDER`, `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`, `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)/`GEMINI_MODEL` — all registered in `turbo.json` `globalEnv`. **Add a new provider** by creating `providers/<name>.ts` returning a `VisionProvider` and wiring it into `resolveProvider()`; parsing/validation is shared and needs no changes.

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
