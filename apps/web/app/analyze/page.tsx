"use client";

import * as React from "react";

import { Disclaimer } from "@/components/foodsnap/disclaimer";
import { ImageUploader, type UploadPayload } from "@/components/foodsnap/image-uploader";
import { AnalyzingState } from "@/components/foodsnap/analyzing-state";
import { DetectedFoodsReview } from "@/components/foodsnap/detected-foods-review";
import { NutritionResults } from "@/components/foodsnap/nutrition-results";
import { StepIndicator, type FlowStep } from "@/components/foodsnap/step-indicator";
import type { AnalysisResult, DetectedFood } from "@/lib/types";

type Step = "upload" | "analyzing" | "review" | "results";

const INDICATOR_STEP: Record<Step, FlowStep> = {
  upload: "upload",
  analyzing: "review",
  review: "review",
  results: "results",
};

export default function AnalyzePage() {
  const [step, setStep] = React.useState<Step>("upload");
  const [payload, setPayload] = React.useState<UploadPayload | null>(null);
  const [analysis, setAnalysis] = React.useState<AnalysisResult | null>(null);
  const [items, setItems] = React.useState<DetectedFood[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAnalyze(next: UploadPayload) {
    setPayload(next);
    setError(null);
    setStep("analyzing");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: next.base64,
          mediaType: next.mediaType,
        }),
      });

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok || !data || typeof data !== "object") {
        const message =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "We couldn't analyze that photo. Please try again.";
        setError(message);
        setStep("upload");
        return;
      }

      const result = data as AnalysisResult;
      setAnalysis(result);
      setItems(result.items);
      setStep("review");
    } catch {
      setError(
        "We couldn't reach the analysis service. Check your connection and try again.",
      );
      setStep("upload");
    }
  }

  function resetAll() {
    setStep("upload");
    setPayload(null);
    setAnalysis(null);
    setItems([]);
    setError(null);
  }

  return (
    <div className="container max-w-xl py-10">
      <div className="mb-8">
        <StepIndicator current={INDICATOR_STEP[step]} />
      </div>

      {step === "upload" && (
        <div className="flex animate-fade-in flex-col gap-5">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Analyze your meal
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload a clear photo of your plate to get started.
            </p>
          </div>
          <ImageUploader onAnalyze={handleAnalyze} serverError={error} />
          <Disclaimer inline />
        </div>
      )}

      {step === "analyzing" && payload && (
        <div className="animate-fade-in">
          <AnalyzingState previewUrl={payload.previewUrl} />
        </div>
      )}

      {step === "review" && analysis && (
        <div className="animate-fade-in">
          <DetectedFoodsReview
            analysis={analysis}
            items={items}
            onItemsChange={setItems}
            onConfirm={() => setStep("results")}
            onRetake={resetAll}
            previewUrl={payload?.previewUrl ?? null}
          />
        </div>
      )}

      {step === "results" && analysis && (
        <div className="animate-fade-in">
          <NutritionResults
            analysis={analysis}
            items={items}
            previewUrl={payload?.previewUrl ?? null}
            onEdit={() => setStep("review")}
            onStartOver={resetAll}
          />
        </div>
      )}
    </div>
  );
}
