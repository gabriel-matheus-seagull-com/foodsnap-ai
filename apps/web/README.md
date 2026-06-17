# FoodSnap AI — web app

This is the FoodSnap AI Next.js app (App Router, port **3000**).

See the [root README](../../README.md) for the full overview, architecture,
setup, and the optional AI provider configuration (Anthropic or Gemini).

```sh
pnpm exec turbo dev --filter=web   # http://localhost:3000
```

Key locations:

- `app/` — landing page, `analyze/` flow, and the `api/analyze` route.
- `components/foodsnap/` — feature components; `components/ui/` — UI primitives.
- `lib/ai/` — vision analysis + mock fallback; `lib/ai/providers/` — pluggable Anthropic/Gemini backends; `lib/nutrition/` — estimation logic.
- `tests/` — Vitest unit tests (`pnpm --filter web test`).
