import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

const TEXT =
  "Estimates are approximate and for general nutrition awareness only. FoodSnap AI is not a substitute for professional medical or nutrition advice.";

/**
 * The core "approximate, not medical advice" message. `inline` is a compact
 * banner for inside the flow; the default is a quieter footer note.
 */
export function Disclaimer({
  inline = false,
  className,
}: {
  inline?: boolean;
  className?: string;
}) {
  if (inline) {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>{TEXT}</p>
      </div>
    );
  }

  return (
    <p
      className={cn(
        "mx-auto max-w-2xl text-center text-xs leading-relaxed text-muted-foreground",
        className,
      )}
    >
      {TEXT}
    </p>
  );
}
