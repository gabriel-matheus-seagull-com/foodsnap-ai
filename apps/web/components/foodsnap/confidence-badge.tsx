import { Badge } from "@/components/ui/badge";
import type { Confidence } from "@/lib/types";

const META: Record<Confidence, { label: string; variant: "high" | "medium" | "low" }> = {
  high: { label: "High confidence", variant: "high" },
  medium: { label: "Medium confidence", variant: "medium" },
  low: { label: "Low confidence", variant: "low" },
};

export function ConfidenceBadge({
  confidence,
  short = false,
}: {
  confidence: Confidence;
  short?: boolean;
}) {
  const meta = META[confidence];
  return (
    <Badge variant={meta.variant}>{short ? confidence : meta.label}</Badge>
  );
}
