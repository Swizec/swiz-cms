"""Fit conservative selection thresholds without tuning on reserved articles.

python scripts/fit-category-calibration.py TUNING.jsonl DEVELOPMENT.jsonl OUTPUT.json
The app uses the exported constants; Python/sklearn are offline tools only.
"""
import datetime
import json
import math
import sys
from pathlib import Path

import numpy as np
from sklearn.model_selection import KFold, ParameterGrid

if len(sys.argv) != 4:
    raise SystemExit(__doc__)


def read_json(path):
    return json.loads(Path(path).read_text())


def read_lines(path):
    return [json.loads(line) for line in Path(path).read_text().splitlines() if line]


rows, development = read_lines(sys.argv[1]), read_lines(sys.argv[2])
profile = read_json("lib/server/category-profile.json")
split = read_json("tests/fixtures/classifier-calibration-split.json")
controls = {
    case.get("slug", case.get("id")): case
    for case in read_json("tests/fixtures/category-eval.json")
    + read_json("tests/fixtures/category-eval-controls.json")
}
if len(rows) != len(split["tuning"]) or {r["slug"] for r in rows} != set(split["tuning"]):
    raise ValueError("Use the complete tuning partition, never holdout rows.")
if len(development) != len(controls) or {r["slug"] for r in development} != set(controls):
    raise ValueError("Missing or duplicate development controls.")
for row in rows + development:
    if any(not 0 <= s["probability"] <= 1 for s in row["scores"]):
        raise ValueError("Invalid predicate probability.")
    if len({s["category"] for s in row["scores"]}) != len(row["scores"]):
        raise ValueError("Duplicate category probabilities.")
labelled = [r for r in rows if set(r["expectedCategories"]) - {"Uncategorized"}]
clip = 0.0001
minimum_evidence = 0.9
maximum = 5
half_life_years = 3
end = datetime.date.fromisoformat(profile["window"]["end"])
weights = np.array([
    2 ** (-((end - datetime.date.fromisoformat(r["published"])).days / 365.25) / half_life_years)
    for r in labelled
])


def logit(probability):
    p = min(1 - clip, max(clip, probability))
    return math.log(p / (1 - p))


def rank(row, prior_weight):
    ranked = []
    for score in row["scores"]:
        if score["probability"] < minimum_evidence:
            continue
        prior = (profile["categories"][score["category"]]["count"] + 1) / (profile["trainingPosts"] + 2)
        relevance = 1 / (1 + math.exp(-logit(score["probability"]) - prior_weight * logit(prior)))
        ranked.append((score["category"], relevance))
    return sorted(ranked, key=lambda score: (-score[1], score[0]))


def predict(ranked, threshold, step):
    selected = set()
    for index, (category, relevance) in enumerate(ranked[:maximum]):
        if relevance < threshold + index * step:
            break
        selected.add(category)
    return selected


def metrics(counts, sample_weights=None):
    tp, fp, fn = np.sum(counts * (sample_weights[:, None] if sample_weights is not None else 1), axis=0)
    return {
        "precision": tp / (tp + fp), "recall": tp / (tp + fn),
        "f1": 2 * tp / (2 * tp + fp + fn),
        "f05": 1.25 * tp / (1.25 * tp + fp + 0.25 * fn),
        "meanCategories": (tp + fp) / (sum(sample_weights) if sample_weights is not None else len(counts)),
    }


candidates = []
for prior_weight in (0, 0.025, 0.05, 0.075, 0.1, 0.125, 0.15, 0.2, 0.25, 0.3):
    training_ranks = [rank(r, prior_weight) for r in labelled]
    development_ranks = [rank(r, prior_weight) for r in development]
    for params in ParameterGrid({
        "threshold": [round(0.7 + i * 0.01, 2) for i in range(29)],
        "step": [0, 0.005, 0.01, 0.015, 0.02, 0.025],
    }):
        threshold, step = params["threshold"], params["step"]
        # Historical agreement cannot justify losing known central subjects.
        valid = True
        for row, ranked in zip(development, development_ranks):
            selected = predict(ranked, threshold, step)
            case = controls[row["slug"]]
            if set(case["required"]) - selected or set(case["excluded"]) & selected:
                valid = False
                break
        if not valid:
            continue
        counts = []
        for row, ranked in zip(labelled, training_ranks):
            selected = predict(ranked, threshold, step)
            actual = set(row["expectedCategories"]) - {"Uncategorized"}
            counts.append([len(selected & actual), len(selected - actual), len(actual - selected)])
        candidates.append(({
            "priorWeight": prior_weight, "threshold": threshold, "thresholdStep": step,
        }, np.array(counts)))
if not candidates:
    raise ValueError("No policy preserves the development controls; inspect the model decisions.")

# All category outcomes of an article stay together. Each fold selects settings
# on its training articles, then evaluates its validation articles. The profile
# is fixed using all non-holdout posts; the 20 development controls are also fixed.
cv_counts = np.zeros((len(labelled), 3))
folds = []
for train, validation in KFold(5, shuffle=True, random_state=42).split(labelled):
    best = max(candidates, key=lambda c: metrics(c[1][train], weights[train])["f05"])
    cv_counts[validation] = best[1][validation]
    folds.append(best[0])
best = max(candidates, key=lambda c: metrics(c[1], weights)["f05"])
result = {
    "method": "smoothed archive-prior odds; constrained F0.5 grid search; article-level five-fold cross-validation",
    "window": profile["window"], "trainingArticles": len(labelled),
    "developmentControls": len(development),
    "priorDenominator": profile["trainingPosts"] + 2, "priorPseudocount": 1,
    "probabilityClip": clip, "minimumEvidence": minimum_evidence,
    "maxCategories": maximum, **best[0], "sampleWeightHalfLifeYears": half_life_years,
    "crossValidated": metrics(cv_counts), "crossValidatedFolds": folds,
    "training": metrics(best[1]),
}
Path(sys.argv[3]).write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
