import type { NutritionEstimate, Range } from "@/lib/types";

interface MacroRow {
  key: "protein" | "carbs" | "fat";
  label: string;
  grams: number;
  range: Range;
  /** kcal per gram, for the energy-share bar. */
  energyPerGram: number;
  colorVar: string;
}

function fmtRange(range: Range, unit: string): string {
  return `${Math.round(range.low)}–${Math.round(range.high)}${unit}`;
}

/** Macro breakdown with energy-share bars (protein/carbs 4 kcal/g, fat 9 kcal/g). */
export function MacroSummary({ estimate }: { estimate: NutritionEstimate }) {
  const rows: MacroRow[] = [
    {
      key: "protein",
      label: "Protein",
      grams: estimate.protein,
      range: estimate.proteinRange,
      energyPerGram: 4,
      colorVar: "var(--protein)",
    },
    {
      key: "carbs",
      label: "Carbs",
      grams: estimate.carbs,
      range: estimate.carbsRange,
      energyPerGram: 4,
      colorVar: "var(--carbs)",
    },
    {
      key: "fat",
      label: "Fat",
      grams: estimate.fat,
      range: estimate.fatRange,
      energyPerGram: 9,
      colorVar: "var(--fat)",
    },
  ];

  const totalEnergy = rows.reduce((sum, r) => sum + r.grams * r.energyPerGram, 0);

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => {
        const share =
          totalEnergy > 0 ? (row.grams * row.energyPerGram) / totalEnergy : 0;
        return (
          <div key={row.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: `hsl(${row.colorVar})` }}
                />
                {row.label}
              </span>
              <span className="tabular-nums">
                <span className="font-semibold">{Math.round(row.grams)} g</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {fmtRange(row.range, " g")}
                </span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(share * 100, row.grams > 0 ? 4 : 0)}%`,
                  backgroundColor: `hsl(${row.colorVar})`,
                }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Bars show each macro&apos;s share of total energy.
      </p>
    </div>
  );
}
