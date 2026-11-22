import type { Category } from "../categories";
import calibration from "./category-calibration.json";
import profile from "./category-profile.json";

export type CategoryScore = { category: Category; probability: number };

// Broad format labels stay available in the manual picker. They contributed
// many false positives and are rarely used in the author's recent archive.
export const MANUAL_CATEGORIES: readonly Category[] = [
  "Uncategorized",
  "Lesson",
  "Insights",
  "Tips",
  "Tutorial",
  "Programming Lessons",
  "Thoughts",
  "Opinion",
  "Technical",
  "Programming",
];

function logit(probability: number) {
  const clipped = Math.max(
    calibration.probabilityClip,
    Math.min(1 - calibration.probabilityClip, probability),
  );
  return Math.log(clipped / (1 - clipped));
}

// Native predicate evidence combines with a smoothed five-year usage prior at
// a fitted weight. A rare subject can still be decisive. This ranking
// score is not a measured probability that the historical tag will match.
export function categoryRelevance({ category, probability }: CategoryScore) {
  const prior =
    (profile.categories[category].count + calibration.priorPseudocount) /
    calibration.priorDenominator;
  return (
    1 /
    (1 + Math.exp(-logit(probability) - calibration.priorWeight * logit(prior)))
  );
}

export function selectCategories(scores: CategoryScore[]): Category[] {
  const ranked = scores
    .filter(
      ({ category, probability }) =>
        !MANUAL_CATEGORIES.includes(category) &&
        probability >= calibration.minimumEvidence,
    )
    .map((score) => ({
      category: score.category,
      relevance: categoryRelevance(score),
    }))
    .sort(
      (a, b) =>
        b.relevance - a.relevance ||
        (a.category < b.category ? -1 : a.category > b.category ? 1 : 0),
    );
  const selected: Category[] = [];
  for (const { category, relevance } of ranked) {
    if (selected.includes(category)) continue;
    // The cutoff and optional per-label increment are fitted together. Five is
    // a cap, not a target: never pad the result with a barely fitting label.
    if (
      relevance <
      calibration.threshold + selected.length * calibration.thresholdStep
    )
      break;
    selected.push(category);
    if (selected.length === calibration.maxCategories) break;
  }
  return selected;
}
