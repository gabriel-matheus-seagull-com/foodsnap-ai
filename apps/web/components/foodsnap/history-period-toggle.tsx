import Link from "next/link";

import { cn } from "@/lib/utils";
import type { HistoryGroupBy } from "@/lib/nutrition/aggregate-history";

const OPTIONS: { value: HistoryGroupBy; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** Plain button group (no Tabs primitive exists) for switching History's grouping. */
export function HistoryPeriodToggle({ active }: { active: HistoryGroupBy }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-1">
      {OPTIONS.map((opt) => (
        <Link
          key={opt.value}
          href={`/history?groupBy=${opt.value}`}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            opt.value === active
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
