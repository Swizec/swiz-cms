import { describe, expect, it } from "vitest";
import {
  categoryMetrics,
  upgradeMetrics,
  historicalUpgradeMetrics,
  compareClassifiers,
  type BacktestRow,
} from "../scripts/backtest-metrics";
function row(
  expected: string[],
  predicted: string[] | null,
  upgrade: string | null = null,
  predictedUpgrade: string | null = null,
  hasContentUpgrade = false,
): BacktestRow {
  return {
    slug: "test",
    url: "https://swizec.com/blog/test",
    title: "Test",
    published: "2026-01-01",
    expectedCategories: expected,
    expectedContentUpgrade: upgrade,
    hasContentUpgrade,
    prediction:
      predicted === null
        ? null
        : { categories: predicted, contentUpgrade: predictedUpgrade },
    error: predicted === null ? "failed" : null,
    elapsedMs: 0,
  };
}
describe("backtest metrics", () => {
  it("scores multi-label overlap without rewarding absent categories", () => {
    const score = categoryMetrics([
      row(["A", "B"], ["A", "C"]),
      row(["B"], ["B"]),
      row(["A", "B", "C", "D", "E", "F"], ["A", "B", "C", "D", "E"]),
    ]);
    expect(score.labelled).toBe(3);
    expect(score.truePositive).toBe(7);
    expect(score.falsePositive).toBe(1);
    expect(score.falseNegative).toBe(2);
    expect(score.microPrecision).toBeCloseTo(7 / 8);
    expect(score.microRecall).toBeCloseTo(7 / 9);
    expect(score.microF1).toBeCloseTo(14 / 17);
    expect(score.exactMatchRate).toBeCloseTo(1 / 3);
    expect(score.meanJaccard).toBeCloseTo((1 / 3 + 1 + 5 / 6) / 3);
    expect(score.recallCeilingAtFive).toBeCloseTo(8 / 9);
  });
  it("keeps unlabelled posts and request failures out of scoring denominators", () => {
    const score = categoryMetrics([
      row([], ["A"]),
      row(["Uncategorized"], []),
      row(["A"], null),
      row(["A", "A", "Uncategorized"], ["A"]),
    ]);
    expect(score.attempted).toBe(4);
    expect(score.completed).toBe(3);
    expect(score.labelled).toBe(1);
    expect(score.unlabelledOrFallbackOnly).toBe(2);
    expect(score.exactMatchRate).toBe(1);
  });
  it("separates explicit upgrade labels, missing labels, and unsupported historical offers", () => {
    const score = upgradeMetrics([
      row(["A"], ["A"], "SeniorMindset", "SeniorMindset", true),
      row(["A"], ["A"], "ScalingFast", "SeniorMindset", true),
      row([], [], null, null, false),
      row([], [], "ReactCU", "ScalingFast", true),
      row([], [], null, "ScalingFast", true),
      row([], null, "ScalingFast", null, true),
    ]);
    expect(score.explicitlyLabelled.count).toBe(3);
    expect(score.explicitlyLabelled.accuracy).toBeCloseTo(1 / 3);
    expect(score.explicitlyLabelled.matrix.ScalingFast.SeniorMindset).toBe(1);
    expect(score.explicitlyLabelled.matrix.none.ScalingFast).toBe(1);
    expect(score.missing).toEqual({
      count: 1,
      predictions: { SeniorMindset: 0, ScalingFast: 0, none: 1 },
    });
    expect(score.legacy.count).toBe(1);
    expect(score.missingAsNoneAgreement.count).toBe(4);
    expect(score.missingAsNoneAgreement.accuracy).toBe(0.5);
  });
  it("reports a majority baseline and balanced accuracy for uneven upgrade classes", () => {
    const rows = [
      ...Array.from({ length: 9 }, () =>
        row([], [], "SeniorMindset", "SeniorMindset", true),
      ),
      row([], [], "ScalingFast", "SeniorMindset", true),
    ];
    const score = upgradeMetrics(rows).explicitlyLabelled;
    expect(score.accuracy).toBe(0.9);
    expect(score.majorityBaseline).toBe(0.9);
    expect(score.balancedAccuracy).toBe(0.5);
  });
  it("does not report zero accuracy when there are no explicit upgrade labels", () => {
    const score = upgradeMetrics([row([], [], null, "ScalingFast", false)]);
    expect(score.explicitlyLabelled.count).toBe(0);
    expect(score.explicitlyLabelled.accuracy).toBeNull();
    expect(score.explicitlyLabelled.balancedAccuracy).toBeNull();
  });
  it("excludes prelaunch book backfills without turning them into negative labels", () => {
    const before = {
      ...row([], [], "ScalingFast", "SeniorMindset", true),
      slug: "backfill",
      published: "2024-01-01",
    };
    const senior = {
      ...row([], [], "SeniorMindset", "SeniorMindset", true),
      slug: "senior",
      published: "2024-02-01",
    };
    const after = { ...row([], [], "ScalingFast", null, true), slug: "after" };
    const missing = { ...row([], [], null, null, false), slug: "missing" };
    const result = historicalUpgradeMetrics(
      [before, senior, after, missing],
      "2025-12-07",
    );
    expect(result.backfilledBeforeAvailability).toHaveLength(1);
    expect(result.eligible.explicitlyLabelled.count).toBe(2);
    expect(result.eligible.explicitlyLabelled.accuracy).toBe(0.5);
    expect(result.beforeAvailability.count).toBe(1);
    expect(result.afterAvailability.count).toBe(1);
    expect(result.eligible.missing.count).toBe(1);
    expect(result.publicationEraBaseline).toEqual({
      count: 2,
      correct: 2,
      accuracy: 1,
    });
  });
  it("compares the same articles and refuses changed reference labels", () => {
    const before = row(["A"], ["B"]);
    const after = row(["A"], ["A"]);
    const result = compareClassifiers(
      [before, { ...before, slug: "unused" }],
      [after],
      "2025-12-07",
    );
    expect(result.before.categories.labelled).toBe(1);
    expect(result.after.categories.microPrecision).toBe(1);
    expect(() =>
      compareClassifiers(
        [before],
        [{ ...after, expectedCategories: ["B"] }],
        "2025-12-07",
      ),
    ).toThrow("different reference");
    expect(() => compareClassifiers([], [after], "2025-12-07")).toThrow(
      "Missing",
    );
  });
});
