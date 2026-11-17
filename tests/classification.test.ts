import { describe, expect, it } from "vitest";
import type { Decision } from "openai/resources/decisions";
import { CATEGORIES } from "../lib/categories";
import {
  classificationQuestions,
  parseClassification,
} from "../lib/server/classification";

function answers(upgrade: string, topics: string[] = []): Decision["answers"] {
  return [
    {
      type: "choice",
      name: "content_upgrade",
      choice: upgrade,
      confidence: 0.95,
      probabilities: [],
    },
    ...CATEGORIES.map((category, index) => ({
      type: "predicate" as const,
      name: `category_${index}`,
      probability: topics.includes(category) ? 0.95 : 0.1,
    })),
  ];
}
describe("decision classification", () => {
  it.each(["SeniorMindset", "ScalingFast", "none"])(
    "handles the %s upgrade",
    (choice) => {
      expect(
        parseClassification(answers(choice, ["AI", "Software Engineering"])),
      ).toEqual({
        contentUpgrade: choice === "none" ? null : choice,
        categories: ["Software Engineering", "AI"],
      });
    },
  );
  it("allows no categories, caps broad matches, and removes Uncategorized when a real topic fits", () => {
    expect(parseClassification(answers("none")).categories).toEqual([]);
    expect(
      parseClassification(answers("none", [...CATEGORIES])).categories.length,
    ).toBeLessThanOrEqual(5);
    expect(
      parseClassification(answers("none", ["AI", "Uncategorized"])).categories,
    ).toEqual(["AI"]);
  });
  it("rejects refusals and incomplete decisions instead of calling them none", () => {
    const missing = answers("none");
    missing.pop();
    expect(() => parseClassification(missing)).toThrow("incomplete");
    const refused = answers("none");
    refused[0] = { type: "refusal", name: "content_upgrade" };
    expect(() => parseClassification(refused)).toThrow();
    expect(() => parseClassification(answers("InventedBook"))).toThrow();
  });
  it("uses one question per hardcoded category within the API limit", () => {
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
    expect(classificationQuestions).toHaveLength(CATEGORIES.length + 1);
    expect(classificationQuestions.length).toBeLessThanOrEqual(400);
  });
});
