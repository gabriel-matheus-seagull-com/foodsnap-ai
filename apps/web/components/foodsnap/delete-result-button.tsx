"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

import { deleteSavedAnalysisAction } from "@/app/results/actions";

/**
 * Idle -> "Confirm?" -> deleting -> refresh. Same multi-click-state pattern
 * as the Save button in `nutrition-results.tsx`, so no Dialog primitive is
 * needed for a destructive confirm.
 */
export function DeleteResultButton({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = React.useState<"idle" | "confirm" | "deleting" | "error">(
    "idle",
  );

  React.useEffect(() => {
    if (state !== "confirm") return;
    const timer = setTimeout(() => setState("idle"), 4000);
    return () => clearTimeout(timer);
  }, [state]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (state === "idle" || state === "error") {
      setState("confirm");
      return;
    }
    if (state === "confirm") {
      setState("deleting");
      const result = await deleteSavedAnalysisAction(id);
      if (result.ok) {
        router.refresh();
      } else {
        setState("error");
      }
    }
  }

  if (state === "deleting") {
    return (
      <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
    );
  }

  if (state === "confirm") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex h-9 items-center gap-1 rounded-lg bg-destructive/10 px-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Confirm?
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Delete result"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
      {state === "error" && (
        <span className="sr-only">Delete failed, try again</span>
      )}
    </button>
  );
}
