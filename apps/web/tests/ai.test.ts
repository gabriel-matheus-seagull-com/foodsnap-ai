import { describe, expect, it } from "vitest";

import { buildMockAnalysis, parseAnalysis } from "@/lib/ai/analyze-image";

const VALID = JSON.stringify({
  items: [
    {
      name: "Spaghetti bolognese",
      portionLabel: "1 plate",
      grams: 350,
      caloriesPer100g: 150,
      proteinPer100g: 8,
      carbsPer100g: 20,
      fatPer100g: 4,
      confidence: "medium",
    },
  ],
  overallConfidence: "medium",
  note: "Looks like a pasta dish.",
});

describe("parseAnalysis — happy path", () => {
  it("parses valid JSON into detected foods with generated ids", () => {
    const result = parseAnalysis(VALID);
    expect(result.source).toBe("ai");
    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item).toBeDefined();
    expect(item!.name).toBe("Spaghetti bolognese");
    expect(item!.id).toBeTruthy();
    expect(result.overallConfidence).toBe("medium");
  });

  it("extracts JSON even when wrapped in prose or code fences", () => {
    const wrapped = "Sure! Here is the result:\n```json\n" + VALID + "\n```";
    const result = parseAnalysis(wrapped);
    expect(result.items).toHaveLength(1);
  });

  it("clamps out-of-range nutrition values", () => {
    const raw = JSON.stringify({
      items: [
        {
          name: "Mystery",
          grams: 5000,
          caloriesPer100g: 99999,
          proteinPer100g: 500,
          carbsPer100g: 500,
          fatPer100g: 500,
          confidence: "low",
        },
      ],
      overallConfidence: "low",
      note: "",
    });
    const item = parseAnalysis(raw).items[0];
    expect(item).toBeDefined();
    expect(item!.grams).toBe(2000); // clamped from 5000
    expect(item!.caloriesPer100g).toBe(900);
    expect(item!.proteinPer100g).toBe(100);
    expect(item!.portionLabel).toBe("1 serving"); // default applied
  });
});

describe("parseAnalysis — failure & empty cases", () => {
  it("throws on non-JSON / unparseable model output", () => {
    expect(() => parseAnalysis("I cannot help with that.")).toThrow();
  });

  it("handles an uncertain 'not food' response (empty items)", () => {
    const raw = JSON.stringify({
      items: [],
      overallConfidence: "low",
      note: "This doesn't look like food.",
    });
    const result = parseAnalysis(raw);
    expect(result.items).toHaveLength(0);
    expect(result.overallConfidence).toBe("low");
    expect(result.note).toContain("food");
  });
});

describe("buildMockAnalysis", () => {
  it("returns a deterministic sample meal flagged as mock", () => {
    const mock = buildMockAnalysis();
    expect(mock.source).toBe("mock");
    expect(mock.items.length).toBeGreaterThan(0);
    expect(mock.items.every((i) => i.id)).toBe(true);
  });
});
