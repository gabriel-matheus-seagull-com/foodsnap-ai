"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";

const MESSAGES = [
  "Looking at your photo…",
  "Identifying the foods…",
  "Estimating portion sizes…",
  "Crunching the numbers…",
];

/** Loading state shown while the image is analyzed — cycles status messages. */
export function AnalyzingState({ previewUrl }: { previewUrl: string }) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % MESSAGES.length),
      1600,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="relative overflow-hidden rounded-2xl border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Analyzing meal"
          className="max-h-[320px] w-full max-w-md object-contain"
        />
        <div className="absolute inset-0 animate-pulse bg-gradient-to-t from-primary/30 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Analyzing
        </div>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span aria-live="polite" className="text-sm font-medium">
          {MESSAGES[index]}
        </span>
      </div>
    </div>
  );
}
