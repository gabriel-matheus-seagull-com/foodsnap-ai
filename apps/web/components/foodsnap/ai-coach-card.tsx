"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclaimer } from "@/components/foodsnap/disclaimer";
import { cn } from "@/lib/utils";
import { COACH_PERIODS, type CoachPeriod } from "@/lib/nutrition/date-range";
import { generateCoachInsightAction } from "@/app/history/actions";

/**
 * The AI Food Coach. Deliberately the only thing on this page that can
 * trigger an AI call — nothing here runs on mount, on period-toggle change,
 * or from any parent re-render; only this component's own button click
 * calls the server action.
 */
export function AiCoachCard() {
  const [period, setPeriod] = React.useState<CoachPeriod>("last_7_days");
  const [status, setStatus] = React.useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [result, setResult] = React.useState<{
    summary: string;
    focus: string;
    period: CoachPeriod;
    cached: boolean;
  } | null>(null);
  const [error, setError] = React.useState("");

  function selectPeriod(value: CoachPeriod) {
    setPeriod(value);
    setResult(null);
    setStatus("idle");
  }

  async function handleAnalyze() {
    setStatus("loading");
    setError("");
    const res = await generateCoachInsightAction(period);
    if (res.ok) {
      setResult(res);
      setStatus("done");
    } else {
      setError(res.error);
      setStatus("error");
    }
  }

  const activeLabel = COACH_PERIODS.find((p) => p.value === period)?.label ?? "";

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {COACH_PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => selectPeriod(p.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                p.value === period
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {!result ? (
          <Button onClick={handleAnalyze} disabled={status === "loading"}>
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {status === "loading" ? "Analyzing…" : `Analyze ${activeLabel.toLowerCase()}`}
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {COACH_PERIODS.find((p) => p.value === result.period)?.label}
            </p>
            <p className="text-sm leading-relaxed">{result.summary}</p>
            {result.focus && (
              <div className="rounded-lg bg-card px-3 py-2.5">
                <p className="text-xs font-semibold text-muted-foreground">Focus</p>
                <p className="text-sm">{result.focus}</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={status === "loading"}
              className="self-start"
            >
              {status === "loading" ? "Analyzing…" : "Regenerate"}
            </Button>
          </div>
        )}

        {status === "error" && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Disclaimer inline />
      </CardContent>
    </Card>
  );
}
