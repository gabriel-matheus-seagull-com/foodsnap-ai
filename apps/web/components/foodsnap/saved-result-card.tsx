import Link from "next/link";
import { Pencil } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/foodsnap/confidence-badge";
import { DeleteResultButton } from "@/components/foodsnap/delete-result-button";
import { estimateNutrition } from "@/lib/nutrition/estimate";
import type { SavedAnalysis } from "@/lib/db/saved-analyses";

function summarizeItems(names: string[]): string {
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

export function SavedResultCard({ saved }: { saved: SavedAnalysis }) {
  const estimate = estimateNutrition(saved.items);

  return (
    <Card className="transition-colors hover:bg-secondary/40">
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <Link href={`/results/${saved.id}`} className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {summarizeItems(saved.items.map((i) => i.name))}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(saved.createdAt).toLocaleDateString()} · ~
            {estimate.calories} kcal
          </p>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <ConfidenceBadge confidence={estimate.confidence} short />
          <Link
            href={`/results/${saved.id}/edit`}
            aria-label="Edit result"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <DeleteResultButton id={saved.id} />
        </div>
      </CardContent>
    </Card>
  );
}
