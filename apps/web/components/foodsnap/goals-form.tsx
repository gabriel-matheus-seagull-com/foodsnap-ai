"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveGoalsAction } from "@/app/goals/actions";
import type { UserGoals } from "@/lib/db/goals";

const FIELDS: {
  key: "calorieGoal" | "proteinGoalG" | "carbGoalG" | "fatGoalG";
  label: string;
  unit: string;
}[] = [
  { key: "calorieGoal", label: "Daily calorie target", unit: "kcal" },
  { key: "proteinGoalG", label: "Daily protein target", unit: "g" },
  { key: "carbGoalG", label: "Daily carbohydrate target", unit: "g" },
  { key: "fatGoalG", label: "Daily fat target", unit: "g" },
];

const DEFAULTS = { calorieGoal: 2000, proteinGoalG: 140, carbGoalG: 220, fatGoalG: 70 };

export function GoalsForm({ goals }: { goals: UserGoals | null }) {
  const [values, setValues] = React.useState({
    calorieGoal: goals?.calorieGoal ?? DEFAULTS.calorieGoal,
    proteinGoalG: goals?.proteinGoalG ?? DEFAULTS.proteinGoalG,
    carbGoalG: goals?.carbGoalG ?? DEFAULTS.carbGoalG,
    fatGoalG: goals?.fatGoalG ?? DEFAULTS.fatGoalG,
  });
  const [state, setState] = React.useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError("");
    const result = await saveGoalsAction(values);
    if (result.ok) {
      setState("saved");
    } else {
      setState("error");
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Label htmlFor={field.key}>{field.label}</Label>
          <div className="flex items-center gap-2">
            <Input
              id={field.key}
              type="number"
              min={0}
              inputMode="numeric"
              value={values[field.key]}
              onChange={(e) => {
                setState("idle");
                setValues((v) => ({ ...v, [field.key]: Number(e.target.value) }));
              }}
              className="max-w-[160px]"
            />
            <span className="text-sm text-muted-foreground">{field.unit}</span>
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-1.5">
        <Button type="submit" size="lg" disabled={state === "saving"}>
          {state === "saved" ? <Check className="h-4 w-4" /> : null}
          {state === "saved" ? "Saved" : state === "saving" ? "Saving…" : "Save goals"}
        </Button>
        {state === "error" && (
          <p className="text-center text-xs text-destructive">{error}</p>
        )}
      </div>
    </form>
  );
}
