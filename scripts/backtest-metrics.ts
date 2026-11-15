import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type BacktestRow = {
  slug: string;
  url: string;
  title: string;
  published: string;
  expectedCategories: string[];
  expectedContentUpgrade: string | null;
  hasContentUpgrade: boolean;
  prediction: { categories: string[]; contentUpgrade: string | null } | null;
  error: string | null;
  elapsedMs: number;
};
const divide = (a: number, b: number) => (b ? a / b : 0);
const mean = (numbers: number[]) =>
  divide(
    numbers.reduce((a, b) => a + b, 0),
    numbers.length,
  );
const topics = (labels: string[]) => [
  ...new Set(labels.filter((c) => c !== "Uncategorized")),
];

export function categoryMetrics(rows: BacktestRow[]) {
  const completed = rows.filter((r) => r.prediction);
  const labelled = completed.filter(
    (r) => topics(r.expectedCategories).length > 0,
  );
  const byCategory: Record<
    string,
    {
      category: string;
      support: number;
      predicted: number;
      truePositive: number;
      falsePositive: number;
      falseNegative: number;
    }
  > = {};
  const examples = labelled.map((r) => {
    const actual = new Set(topics(r.expectedCategories));
    const predicted = new Set(r.prediction!.categories);
    const tp = [...actual].filter((c) => predicted.has(c)).length;
    const fp = predicted.size - tp;
    const fn = actual.size - tp;
    for (const category of new Set([...actual, ...predicted])) {
      const count = (byCategory[category] ??= {
        category,
        support: 0,
        predicted: 0,
        truePositive: 0,
        falsePositive: 0,
        falseNegative: 0,
      });
      if (actual.has(category)) count.support++;
      if (predicted.has(category)) count.predicted++;
      if (actual.has(category) && predicted.has(category)) count.truePositive++;
      else if (actual.has(category)) count.falseNegative++;
      else count.falsePositive++;
    }
    return {
      slug: r.slug,
      tp,
      fp,
      fn,
      actual: actual.size,
      predicted: predicted.size,
      exact: fp === 0 && fn === 0,
      f1: divide(2 * tp, 2 * tp + fp + fn),
      jaccard: divide(tp, tp + fp + fn),
    };
  });
  const sum = (key: "tp" | "fp" | "fn" | "actual" | "predicted") =>
    examples.reduce((sum, r) => sum + r[key], 0);
  const tp = sum("tp"),
    fp = sum("fp"),
    fn = sum("fn");
  return {
    attempted: rows.length,
    completed: completed.length,
    labelled: labelled.length,
    unlabelledOrFallbackOnly: completed.length - labelled.length,
    articlesWithMoreThanFiveReferenceLabels: examples.filter(
      (r) => r.actual > 5,
    ).length,
    exactMatches: examples.filter((r) => r.exact).length,
    exactMatchRate: mean(examples.map((r) => Number(r.exact))),
    atLeastOneMatchRate: mean(examples.map((r) => Number(r.tp > 0))),
    microPrecision: divide(tp, tp + fp),
    microRecall: divide(tp, tp + fn),
    microF1: divide(2 * tp, 2 * tp + fp + fn),
    meanArticleF1: mean(examples.map((r) => r.f1)),
    meanJaccard: mean(examples.map((r) => r.jaccard)),
    truePositive: tp,
    falsePositive: fp,
    falseNegative: fn,
    referenceLabels: sum("actual"),
    predictedLabels: sum("predicted"),
    meanReferenceLabels: mean(examples.map((r) => r.actual)),
    meanPredictedLabels: mean(examples.map((r) => r.predicted)),
    fiveCategoryRate: mean(examples.map((r) => Number(r.predicted === 5))),
    recallCeilingAtFive: divide(
      examples.reduce((sum, r) => sum + Math.min(5, r.actual), 0),
      sum("actual"),
    ),
    perCategory: Object.values(byCategory)
      .map((c) => ({
        ...c,
        precision: divide(c.truePositive, c.predicted),
        recall: divide(c.truePositive, c.support),
        f1: divide(
          2 * c.truePositive,
          2 * c.truePositive + c.falsePositive + c.falseNegative,
        ),
      }))
      .sort(
        (a, b) => b.support - a.support || a.category.localeCompare(b.category),
      ),
  };
}

const UPGRADE_LABELS = ["SeniorMindset", "ScalingFast", "none"] as const;
type Upgrade = (typeof UPGRADE_LABELS)[number];
function supportedLabel(r: BacktestRow): Upgrade | null {
  if (!r.hasContentUpgrade) return null;
  if (r.expectedContentUpgrade === null) return "none";
  return r.expectedContentUpgrade === "SeniorMindset" ||
    r.expectedContentUpgrade === "ScalingFast"
    ? r.expectedContentUpgrade
    : null;
}
const predictionLabel = (r: BacktestRow) =>
  (r.prediction!.contentUpgrade ?? "none") as Upgrade;
function upgradeScore(rows: { actual: Upgrade; predicted: Upgrade }[]) {
  const matrix = Object.fromEntries(
    UPGRADE_LABELS.map((label) => [
      label,
      Object.fromEntries(UPGRADE_LABELS.map((label) => [label, 0])),
    ]),
  ) as Record<Upgrade, Record<Upgrade, number>>;
  rows.forEach((r) => matrix[r.actual][r.predicted]++);
  const classes = UPGRADE_LABELS.map((label) => {
    const support = rows.filter((r) => r.actual === label).length;
    const predicted = rows.filter((r) => r.predicted === label).length;
    const correct = matrix[label][label];
    return {
      label,
      support,
      predicted,
      correct,
      precision: divide(correct, predicted),
      recall: divide(correct, support),
      f1: divide(2 * correct, support + predicted),
    };
  });
  const supported = classes.filter((c) => c.support > 0);
  return {
    count: rows.length,
    correct: rows.filter((r) => r.actual === r.predicted).length,
    accuracy: rows.length
      ? divide(rows.filter((r) => r.actual === r.predicted).length, rows.length)
      : null,
    balancedAccuracy: supported.length
      ? mean(supported.map((c) => c.recall))
      : null,
    macroF1: supported.length ? mean(supported.map((c) => c.f1)) : null,
    majorityBaseline: divide(
      Math.max(0, ...classes.map((c) => c.support)),
      rows.length,
    ),
    matrix,
    classes,
  };
}
export function upgradeMetrics(rows: BacktestRow[]) {
  const completed = rows.filter((r) => r.prediction);
  const labelled = completed.filter((r) => supportedLabel(r) !== null);
  const missing = completed.filter((r) => !r.hasContentUpgrade);
  const legacy = completed.filter(
    (r) => r.hasContentUpgrade && supportedLabel(r) === null,
  );
  const predictions = (rows: BacktestRow[]) =>
    Object.fromEntries(
      UPGRADE_LABELS.map((label) => [
        label,
        rows.filter((r) => predictionLabel(r) === label).length,
      ]),
    );
  return {
    explicitlyLabelled: upgradeScore(
      labelled.map((r) => ({
        actual: supportedLabel(r)!,
        predicted: predictionLabel(r),
      })),
    ),
    missing: { count: missing.length, predictions: predictions(missing) },
    legacy: {
      count: legacy.length,
      labels: Object.fromEntries(
        [...new Set(legacy.map((r) => r.expectedContentUpgrade!))].map(
          (label) => [
            label,
            legacy.filter((r) => r.expectedContentUpgrade === label).length,
          ],
        ),
      ),
      predictions: predictions(legacy),
    },
    missingAsNoneAgreement: upgradeScore([
      ...labelled.map((r) => ({
        actual: supportedLabel(r)!,
        predicted: predictionLabel(r),
      })),
      ...missing.map((r) => ({
        actual: "none" as const,
        predicted: predictionLabel(r),
      })),
    ]),
  };
}

export function summarize(rows: BacktestRow[]) {
  return {
    attempted: rows.length,
    succeeded: rows.filter((r) => r.prediction).length,
    failed: rows.filter((r) => !r.prediction).length,
    categories: categoryMetrics(rows),
    contentUpgrades: upgradeMetrics(rows),
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output)
    throw new Error(
      "Usage: node --experimental-strip-types scripts/backtest-metrics.ts INPUT.jsonl OUTPUT.json",
    );
  const rows: BacktestRow[] = readFileSync(input, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  if (new Set(rows.map((r) => r.slug)).size !== rows.length)
    throw new Error("Duplicate result rows.");
  const meta = JSON.parse(readFileSync(`${input}.meta.json`, "utf8"));
  if (rows.length !== meta.signature.eligible)
    throw new Error("Backtest is incomplete.");
  const summary = summarize(rows);
  const result = {
    ...meta,
    methodology: {
      categoryReference:
        "Saved categories, excluding Uncategorized. Posts with no topic labels are unlabelled and excluded from category accuracy denominators. Missing tags are counted as false positives for historical agreement, not proof of editorial irrelevance.",
      upgradeReference:
        "Primary score uses only explicitly saved, currently supported upgrades. Missing values are not confirmed negatives; their agreement with none is a separate diagnostic. Legacy offers are excluded from accuracy.",
      input:
        "Full Markdown title and body; YAML frontmatter, labels, publication date, and source URL are not sent to the classifier.",
      holdout:
        "All recent archive posts except the category-definition source URLs and the 16 earlier development evaluation posts. No model or prompt changes during this backtest.",
    },
    summary,
    recentTwoYears: summarize(rows.filter((r) => r.published >= "2024-11-14")),
    perYear: [...new Set(rows.map((r) => r.published.slice(0, 4)))]
      .sort()
      .map((year) => {
        const s = summarize(rows.filter((r) => r.published.startsWith(year)));
        const { perCategory: _omit, ...categories } = s.categories;
        return { year, ...s, categories };
      }),
  };
  writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
  const csv = (value: unknown) =>
    '"' + String(value ?? "").replaceAll('"', '""') + '"';
  const header = [
    "url",
    "title",
    "published",
    "saved_categories",
    "suggested_categories",
    "saved_upgrade",
    "upgrade_label_status",
    "suggested_upgrade",
    "error",
  ];
  writeFileSync(
    output.replace(/\.json$/, ".csv"),
    [
      header,
      ...rows.map((r) => [
        r.url,
        r.title,
        r.published,
        r.expectedCategories.join(" | "),
        r.prediction?.categories.join(" | "),
        r.expectedContentUpgrade ?? "none",
        !r.hasContentUpgrade
          ? "missing"
          : supportedLabel(r) === null
            ? "legacy"
            : "explicit",
        r.prediction ? (r.prediction.contentUpgrade ?? "none") : "",
        r.error,
      ]),
    ]
      .map((row) => row.map(csv).join(","))
      .join("\n") + "\n",
  );
  console.log(
    JSON.stringify(
      {
        ...summary,
        categories: { ...summary.categories, perCategory: undefined },
      },
      null,
      2,
    ),
  );
}
