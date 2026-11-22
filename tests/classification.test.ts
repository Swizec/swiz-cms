import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Decision } from "openai/resources/decisions";
import {
  CATEGORIES,
  CATEGORY_WINDOW,
  canonicalizeCategories,
  type Category,
} from "../lib/categories";
import { DECISION_MODEL } from "../lib/models";
import { classifyArticle } from "../lib/server/classification";
import {
  AUTO_CATEGORIES,
  categoryCatalog,
  readCandidates,
  SCALING_FAST_AVAILABLE_FROM,
  topicQuestions,
  upgradeQuestion,
} from "../lib/server/classification-candidates";
import {
  MANUAL_CATEGORIES,
  selectCategories,
} from "../lib/server/category-selection";
import profile from "../lib/server/category-profile.json";
import calibration from "../lib/server/category-calibration.json";
import evalCases from "./fixtures/category-eval.json";
import split from "./fixtures/classifier-calibration-split.json";

const { decide } = vi.hoisted(() => ({ decide: vi.fn() }));
vi.mock("../lib/openai", () => ({
  getOpenAI: () => ({ decisions: { create: decide } }),
}));
const currentDate = "2026-11-14";
const article = {
  title: "A draft",
  body: "The complete article, including its conclusion.",
};
function choice(value: string | boolean): Decision["answers"][number] {
  return {
    type: "choice",
    name: "content_upgrade",
    choice: value,
    confidence: 0.95,
    probabilities: [],
  };
}
function answers(
  probabilities: Partial<Record<Category, number>> = {},
  upgrade = "none",
): Decision["answers"] {
  return [
    choice(upgrade),
    ...AUTO_CATEGORIES.map((category) => ({
      type: "predicate" as const,
      name: `category:${category}`,
      probability: probabilities[category] ?? 0,
    })),
  ];
}
beforeEach(() => vi.resetAllMocks());

describe("category evidence", () => {
  it("keeps the ten-year manual vocabulary and dated definitions separate from evaluation sources", () => {
    expect(Object.keys(categoryCatalog).sort()).toEqual([...CATEGORIES].sort());
    const excluded = new Set([
      ...evalCases.map((p) => p.slug),
      ...split.tuning,
      ...split.holdout,
    ]);
    for (const entry of Object.values(categoryCatalog)) {
      expect(entry.description.length).toBeGreaterThan(100);
      expect(entry.sources.length).toBeGreaterThan(0);
      for (const source of entry.sources) {
        expect(
          source.published >= CATEGORY_WINDOW.start &&
            source.published <= CATEGORY_WINDOW.end,
        ).toBe(true);
        expect(excluded.has(source.url.split("/").at(-1)!)).toBe(false);
      }
    }
    expect(CATEGORIES).not.toContain("review");
    expect(CATEGORIES).toContain("AI");
    expect(MANUAL_CATEGORIES.every((c) => CATEGORIES.includes(c))).toBe(true);
  });
  it("uses five-year usage and examples without putting tuning or holdout articles in prompts", () => {
    expect(Object.keys(profile.categories).sort()).toEqual(
      [...CATEGORIES].sort(),
    );
    expect(profile.window).toEqual(split.window);
    expect(new Set(split.tuning).size).toBe(split.tuning.length);
    expect(new Set(split.holdout).size).toBe(split.holdout.length);
    expect(split.holdout.some((slug) => split.tuning.includes(slug))).toBe(
      false,
    );
    const excluded = new Set([...split.tuning, ...split.holdout]);
    for (const usage of Object.values(profile.categories)) {
      expect(usage.recentCount).toBeLessThanOrEqual(usage.count);
      for (const example of usage.examples) {
        expect(
          example.published >= profile.window.start &&
            example.published <= profile.window.end,
        ).toBe(true);
        expect(excluded.has(example.url.split("/").at(-1)!)).toBe(false);
      }
    }
    expect(calibration.priorDenominator).toBe(profile.trainingPosts + 2);
  });
  it("maps retired archive labels without double counting their replacements", () => {
    expect(
      canonicalizeCategories([
        "Salary",
        "Compensation",
        "Hiring",
        "Interviewing",
        "Career",
        "Teamwork",
        "Leadership",
      ]),
    ).toEqual([
      "Compensation",
      "Interviewing",
      "Career",
      "Teamwork",
      "Leadership",
    ]);
    expect(CATEGORIES).not.toContain("Salary");
    expect(CATEGORIES).not.toContain("Hiring");
  });
  it("preserves curated examples without leaking evaluation articles into prompts", () => {
    const evaluated = new Set([
      ...evalCases.map((p) => p.slug),
      ...split.previousDevelopment,
      ...split.tuning,
      ...split.holdout,
    ]);
    for (const category of CATEGORIES) {
      const curated = categoryCatalog[category].exampleSlugs;
      if (!curated) continue;
      expect(
        profile.categories[category].examples.map((p) => p.url.split("/").at(-1)),
      ).toEqual(curated);
      for (const slug of curated) expect(evaluated.has(slug)).toBe(false);
    }
  });
  it("asks one membership predicate per automatic category with its rubric", () => {
    expect(topicQuestions.length + 1).toBeLessThanOrEqual(400);
    expect(topicQuestions.map((q) => q.name)).toEqual(
      AUTO_CATEGORIES.map((c) => `category:${c}`),
    );
    for (const question of topicQuestions) {
      expect(question.type).toBe("predicate");
      const category = question.name!.slice(9) as Category;
      expect(question.instructions).toContain(
        categoryCatalog[category].description,
      );
    }
  });
});

describe("selection", () => {
  it("abstains when every subject is marginal, even for common categories", () => {
    expect(
      selectCategories(
        AUTO_CATEGORIES.map((category) => ({ category, probability: 0.89 })),
      ),
    ).toEqual([]);
    expect(selectCategories([])).toEqual([]);
  });
  it("never pads the result with generic labels", () => {
    expect(
      selectCategories([
        { category: "AI", probability: 1 },
        ...MANUAL_CATEGORIES.map((category) => ({ category, probability: 1 })),
        { category: "React", probability: 0.7 },
      ]),
    ).toEqual(["AI"]);
  });
  it("raises the bar for each additional label instead of filling five slots", () => {
    const candidates: Category[] = [
      "Senior Mindset",
      "Software Engineering",
      "Leadership",
      "Teamwork",
      "Career",
    ];
    const selected = selectCategories(
      candidates.map((category) => ({ category, probability: 0.94 })),
    );
    expect(selected).toEqual([
      "Senior Mindset",
      "Software Engineering",
      // The reviewed archive uses Teamwork more often than Leadership.
      "Teamwork",
    ]);
  });
  it("still allows a rare specific subject with decisive evidence", () => {
    expect(selectCategories([{ category: "Haskell", probability: 1 }])).toEqual(
      ["Haskell"],
    );
  });
  it("caps strong selections at five distinct categories deterministically", () => {
    const scores = AUTO_CATEGORIES.map((category) => ({
      category,
      probability: 1,
    }));
    const selected = selectCategories([...scores, ...scores]);
    expect(selected).toHaveLength(5);
    expect(new Set(selected).size).toBe(5);
    expect(selectCategories(scores.toReversed())).toEqual(selected);
  });
});

describe("decisions and upgrade availability", () => {
  it.each(["SeniorMindset", "ScalingFast", "none"])("parses %s", (upgrade) => {
    expect(
      readCandidates(answers({}, upgrade), currentDate).contentUpgrade,
    ).toBe(upgrade === "none" ? null : upgrade);
  });
  it("offers Scaling Fast from its article-upgrade launch, and never predicts it earlier", () => {
    expect(upgradeQuestion("2025-12-06").choices.map((c) => c.value)).toEqual([
      "SeniorMindset",
      "none",
    ]);
    expect(
      upgradeQuestion(SCALING_FAST_AVAILABLE_FROM).choices.map((c) => c.value),
    ).toContain("ScalingFast");
    expect(() =>
      readCandidates(answers({}, "ScalingFast"), "2025-12-06"),
    ).toThrow("content_upgrade");
  });
  it.each(["garbage", "2026-2-01", "2026-13-01", "2026-02-30"])(
    "rejects invalid replay date %s",
    (date) => {
      expect(() => upgradeQuestion(date)).toThrow("YYYY-MM-DD");
    },
  );
  it.each([true, "OtherBook"])("rejects invalid upgrade %s", (value) => {
    const input = answers();
    input[0] = choice(value);
    expect(() => readCandidates(input, currentDate)).toThrow("content_upgrade");
  });
  it.each(["content_upgrade", "category:AI"])(
    "rejects missing, refused, wrong-type and duplicate answers for %s",
    (name) => {
      const rest = answers().filter((a) => a.name !== name);
      const original = answers().find((a) => a.name === name)!;
      const invalid: Decision["answers"][] = [
        rest,
        [...rest, { type: "refusal", name }],
        [...rest, original, original],
        [
          ...rest,
          name === "content_upgrade"
            ? { type: "predicate", name, probability: 1 }
            : { ...choice("none"), name },
        ],
      ];
      invalid.forEach((input) =>
        expect(() => readCandidates(input, currentDate)).toThrow(),
      );
    },
  );
  it.each([-0.1, 1.1, NaN, Infinity])(
    "rejects invalid predicate probability %s",
    (probability) => {
      expect(() =>
        readCandidates(answers({ AI: probability }), currentDate),
      ).toThrow("category decision: AI");
    },
  );
});

describe("article classification", () => {
  it("sends the full title/body once, with rubrics, and forwards cancellation", async () => {
    decide.mockResolvedValue({
      answers: answers({ AI: 1, "Software Engineering": 1 }, "ScalingFast"),
    });
    const signal = new AbortController().signal;
    expect(await classifyArticle(article, signal, currentDate)).toEqual({
      categories: ["Software Engineering", "AI"],
      contentUpgrade: "ScalingFast",
    });
    expect(decide).toHaveBeenCalledOnce();
    const [request, options] = decide.mock.calls[0];
    expect(request).toEqual({
      model: DECISION_MODEL,
      input: JSON.stringify(article),
      questions: [upgradeQuestion(currentDate), ...topicQuestions],
    });
    expect(options.signal).toBe(signal);
  });
  it("uses today's available offers by default and permits empty categories", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
    try {
      decide.mockResolvedValue({ answers: answers() });
      expect(await classifyArticle(article)).toEqual({
        categories: [],
        contentUpgrade: null,
      });
      expect(decide.mock.calls[0][0].questions[0]).toEqual(
        upgradeQuestion(currentDate),
      );
    } finally {
      vi.useRealTimers();
    }
  });
  it("propagates failures instead of returning partial metadata", async () => {
    decide.mockRejectedValue(new Error("Request failed"));
    await expect(classifyArticle(article)).rejects.toThrow("Request failed");
  });
});
