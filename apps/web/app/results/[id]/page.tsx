import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { getSavedAnalysis } from "@/lib/db/saved-analyses";
import { estimateNutrition } from "@/lib/nutrition/estimate";
import { SavedAnalysisDetail } from "@/components/foodsnap/saved-analysis-detail";

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Resource-based auth check: redirects to sign-in if signed out (see
  // proxy.ts for why this isn't done via path-matched middleware instead).
  const { userId } = await auth.protect();
  const saved = await getSavedAnalysis(userId, id);

  // Covers both "doesn't exist" and "belongs to someone else" identically —
  // no signal is leaked to distinguish the two.
  if (!saved) notFound();

  const estimate = estimateNutrition(saved.items);
  return <SavedAnalysisDetail saved={saved} estimate={estimate} />;
}
