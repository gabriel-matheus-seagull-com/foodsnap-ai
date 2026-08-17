import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { listSavedAnalyses, type SavedAnalysesFilters } from "@/lib/db/saved-analyses";
import { ResultsFilterBar } from "@/components/foodsnap/results-filter-bar";
import { SavedResultCard } from "@/components/foodsnap/saved-result-card";
import { buttonVariants } from "@/components/ui/button";

function parseNumberParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function buildFilters(
  searchParams: Record<string, string | string[] | undefined>,
): SavedAnalysesFilters {
  const get = (key: string) => {
    const v = searchParams[key];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    query: get("q")?.trim() || undefined,
    minCalories: parseNumberParam(get("minCalories")),
    maxCalories: parseNumberParam(get("maxCalories")),
    minProtein: parseNumberParam(get("minProtein")),
    maxProtein: parseNumberParam(get("maxProtein")),
    minCarbs: parseNumberParam(get("minCarbs")),
    maxCarbs: parseNumberParam(get("maxCarbs")),
    minFat: parseNumberParam(get("minFat")),
    maxFat: parseNumberParam(get("maxFat")),
  };
}

export default async function ResultsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Resource-based auth check: redirects to sign-in if signed out (see
  // proxy.ts for why this isn't done via path-matched middleware instead).
  const { userId } = await auth.protect();
  const resolvedSearchParams = await searchParams;
  const filters = buildFilters(resolvedSearchParams);
  const hasFilters = Object.values(filters).some((v) => v !== undefined);

  const saved = await listSavedAnalyses(userId, filters);

  const totalCount = hasFilters ? null : saved.length;

  if (totalCount === 0) {
    return (
      <div className="container max-w-xl py-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          No saved results yet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Analyze a meal and tap &quot;Save result&quot; to see it here.
        </p>
        <Link
          href="/analyze"
          className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4"
        >
          Analyze a meal
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-xl py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">My Results</h1>
      <div className="mb-4">
        <ResultsFilterBar />
      </div>

      {saved.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
          <p className="font-medium">No results match your filters</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try widening your search or clearing the nutrition filters.
          </p>
          <Link
            href="/results"
            className={buttonVariants({ variant: "outline", className: "mt-2" })}
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {saved.map((s) => (
            <li key={s.id}>
              <SavedResultCard saved={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
