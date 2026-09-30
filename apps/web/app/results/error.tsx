"use client";

import { Button } from "@/components/ui/button";

export default function ResultsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container max-w-xl py-10 text-center">
      <h1 className="text-2xl font-bold tracking-tight">
        Couldn&apos;t load your results
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Something went wrong fetching your saved results. Please try again.
      </p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
