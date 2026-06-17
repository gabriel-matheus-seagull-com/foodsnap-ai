# 🥗 FoodSnap AI

**Snap your meal. Get a smart nutrition estimate.**

Upload a photo of a meal and FoodSnap AI identifies the likely foods, estimates
portion sizes, and returns an approximate **calorie range** plus **protein,
carbs, and fats** — with a clear, friendly reminder that the numbers are
estimates for general awareness, not medical or nutrition advice.

> This is an MVP built on a Turborepo + Next.js scaffold. The app lives in
> `apps/web`.

---

## ✨ Features

- **Upload or drag-and-drop** a meal photo (auto-downscaled in the browser for fast, small uploads).
- **AI food detection** via any image-capable model — **Anthropic Claude or Google Gemini**, chosen from env — identifies foods and estimates portions.
- **Editable review step** — confirm, rename, re-portion, remove, or add foods before the final estimate.
- **Visual results** — calorie range, macro breakdown with energy-share bars, and a per-item breakdown.
- **Confidence + uncertainty notes** throughout; ranges instead of fake precision when confidence is low.
- **Graceful states** — loading, empty ("not food"), invalid upload, and analysis-failure handling.
- **Works with no API key** — runs in an offline **demo/mock mode** so you can try the whole flow instantly.
- **Mobile-first, responsive, clean** UI (Tailwind + lightweight shadcn-style components).

---

## 🏗️ Architecture

Clean separation of concerns between UI, AI, and nutrition logic:

```
apps/web/
├─ app/
│  ├─ page.tsx                 # Landing page
│  ├─ analyze/page.tsx         # Flow orchestrator: upload → analyzing → review → results
│  └─ api/analyze/route.ts     # POST endpoint: validates upload, calls the AI layer
├─ components/
│  ├─ ui/                      # shadcn-style primitives (button, card, badge, input, slider…)
│  └─ foodsnap/                # Feature components (uploader, review, results, macros, disclaimer…)
└─ lib/
   ├─ types.ts                 # Shared domain types (the contract between layers)
   ├─ ai/
   │  ├─ prompt.ts             # Vision prompt (asks for per-100g nutrition so edits rescale locally)
   │  ├─ analyze-image.ts      # Orchestration: pick provider → zod validation + mock fallback (+ pure parser)
   │  └─ providers/            # Provider-agnostic backends: anthropic.ts, gemini.ts; selection in index.ts
   └─ nutrition/
      ├─ estimate.ts           # Pure aggregation: totals + confidence-weighted ranges
      └─ food-defaults.ts      # Small food table for the "add item" control
```

**Data flow:** the browser downscales the photo → `POST /api/analyze` → the AI
layer returns `DetectedFood[]` (nutrition stored **per 100 g**) → the review
step lets the user edit → the **nutrition layer** aggregates totals and builds
ranges. Because nutrition is per-100g, editing a portion recomputes **locally**
with no extra AI call.

---

## 🚀 Getting started

### Prerequisites

- Node.js >= 18
- pnpm 9 (`corepack enable` will provide it)

### Install

```sh
pnpm install
```

### Configure (optional)

The app **works without any configuration** — with no API key it returns a
realistic sample meal so you can demo the full flow. The AI layer is
**provider-agnostic**: add **one** provider's key to enable real photo analysis.

```sh
cp apps/web/.env.example apps/web/.env.local
```

Then edit `apps/web/.env.local` with **either**:

```sh
# Option A — Anthropic Claude (https://console.anthropic.com/)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001   # optional override (default = cheapest tier)

# Option B — Google Gemini (https://aistudio.google.com/apikey)
GEMINI_API_KEY=...                          # or GOOGLE_API_KEY
GEMINI_MODEL=gemini-2.5-flash-lite          # optional override (default = cheapest tier)
```

**Provider selection:** with no `AI_PROVIDER` set, the app auto-detects from
whichever key is present (Anthropic wins if both are). To force one, set
`AI_PROVIDER=anthropic`, `AI_PROVIDER=gemini`, or `AI_PROVIDER=mock` (offline
demo). Switching providers needs **no code change** — just env vars.

### Run

```sh
pnpm dev                              # all apps
pnpm exec turbo dev --filter=web      # just FoodSnap → http://localhost:3000
```

Open <http://localhost:3000>, click **Try it now**, and upload a meal photo.

---

## 🧪 Quality checks

```sh
pnpm --filter web test          # unit tests (Vitest)
pnpm --filter web check-types   # next typegen + tsc --noEmit
pnpm --filter web lint          # eslint (fails on any warning)
pnpm --filter web build         # production build
```

### What the tests cover

- **Happy path** — detection parsing + nutrition aggregation produce sensible totals and ranges.
- **Invalid upload** — the API route rejects missing images / unsupported media types (400).
- **Analysis failure** — unparseable model output throws a clear error.
- **Empty / uncertain response** — a "not food" result yields an empty list and a low-confidence note.
- **Low confidence** — ranges widen as confidence drops; the app stays usable.

---

## 🤖 How the AI layer works

1. A **provider** is resolved from env (`lib/ai/providers`): Anthropic or
   Gemini, or `null` for offline mock mode. Each provider implements the same
   tiny `VisionProvider` interface — send image + prompt, return raw text — so
   adding a backend is one new file plus a line in `index.ts`.
2. The chosen provider is sent the image with a prompt that asks for each food's
   **per-100g** calories and macros, an estimated portion in grams, and a
   per-item confidence. The **parsing/validation is shared across providers**.
3. The response is parsed defensively (tolerant JSON extraction) and validated
   with `zod`, with values clamped to sane ranges.
4. The **nutrition layer** turns the (possibly user-edited) foods into a meal
   total and builds calorie/macro ranges using a confidence-weighted band —
   conservative by design.

If no provider key is set, or the model/network fails, the app degrades
gracefully (mock data or a friendly, non-leaky error) rather than breaking the
flow.

---

## ⚠️ Disclaimer

FoodSnap AI provides **approximate** estimates for **general nutrition
awareness only**. It is **not** a substitute for professional medical or
nutrition advice.
