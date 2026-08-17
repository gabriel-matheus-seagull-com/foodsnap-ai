"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DetectedFoodsReview } from "@/components/foodsnap/detected-foods-review";
import { updateSavedAnalysisAction } from "@/app/results/actions";
import type { AnalysisResult, DetectedFood } from "@/lib/types";
import type { SavedAnalysis } from "@/lib/db/saved-analyses";

/** Edit a saved result's food items, reusing the same review UI from the analyze flow. */
export function EditSavedResult({ saved }: { saved: SavedAnalysis }) {
  const router = useRouter();
  const [items, setItems] = React.useState<DetectedFood[]>(saved.items);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const analysisForReview: AnalysisResult = {
    items: saved.items,
    overallConfidence: saved.overallConfidence,
    note: saved.note,
    source: saved.source,
    provider: saved.provider ?? undefined,
  };

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    const result = await updateSavedAnalysisAction({
      id: saved.id,
      items,
      note: saved.note,
    });
    setSaving(false);
    if (result.ok) {
      router.push(`/results/${saved.id}`);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  function handleCancel() {
    router.push(`/results/${saved.id}`);
  }

  return (
    <div className="container max-w-xl py-10">
      <DetectedFoodsReview
        analysis={analysisForReview}
        items={items}
        onItemsChange={setItems}
        onConfirm={handleConfirm}
        onRetake={handleCancel}
        previewUrl={null}
        title="Edit this result"
        subtitle="Adjust the foods and portions, then save your changes."
        confirmLabel={saving ? "Saving…" : "Save changes"}
        retakeLabel="Cancel"
        confirmDisabled={saving}
      />
      {error && (
        <p className="mt-3 text-center text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
