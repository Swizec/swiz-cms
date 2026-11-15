import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Decision } from "openai/resources/decisions";
import { CATEGORIES, CATEGORY_WINDOW, type Category } from "../lib/categories";
import { DECISION_MODEL } from "../lib/models";
import {
  categoryCatalog,
  contentUpgradeQuestion,
  nextCategoryQuestion,
  classifyArticle,
  parseContentUpgrade,
  parseCategoryChoice,
} from "../lib/server/classification";
import evalCases from "./fixtures/category-eval.json";

const { decide } = vi.hoisted(() => ({ decide: vi.fn() }));
vi.mock("../lib/openai", () => ({
  getOpenAI: () => ({ decisions: { create: decide } }),
}));

function choice(
  name: string,
  value: string | boolean,
): Decision["answers"][number] {
  return {
    type: "choice",
    name,
    choice: value,
    confidence: 0.95,
    probabilities: [],
  };
}
function reply(category: string | boolean, upgrade?: string) {
  return {
    answers: [
      choice("category", category),
      ...(upgrade ? [choice("content_upgrade", upgrade)] : []),
    ],
  };
}
const article = {
  title: "A draft",
  body: "The complete article, including its conclusion.",
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("recent category catalog", () => {
  it("defines every category using dated sources in the ten-year window, separate from evaluation articles", () => {
    expect(Object.keys(categoryCatalog).sort()).toEqual([...CATEGORIES].sort());
    const heldOut = new Set(
      evalCases.map(({ slug }) => `https://swizec.com/blog/${slug}`),
    );
    for (const entry of Object.values(categoryCatalog)) {
      expect(entry.description.length).toBeGreaterThan(100);
      expect(entry.sources.length).toBeGreaterThan(0);
      for (const source of entry.sources) {
        expect(source.url).toMatch(/^https:\/\/swizec\.com\/blog\/[^/]+$/);
        expect(
          source.published >= CATEGORY_WINDOW.start &&
            source.published <= CATEGORY_WINDOW.end,
        ).toBe(true);
        expect(heldOut.has(source.url)).toBe(false);
      }
    }
    expect(CATEGORIES).not.toContain("review");
    expect(CATEGORIES).toContain("AI");
  });
  it("attaches each definition to a native choice within the API limit", () => {
    const question = nextCategoryQuestion([]);
    expect(question.type).toBe("choice");
    expect(question.choices.length).toBeLessThanOrEqual(255);
    expect(question.choices.map((c) => c.value)).toEqual([
      ...CATEGORIES.filter((c) => c !== "Uncategorized"),
      "none",
    ]);
    for (const option of question.choices.filter((c) => c.value !== "none"))
      expect(option.description).toBe(
        categoryCatalog[option.value as Category].description,
      );
  });
  it("removes selected choices while explaining the topics already covered", () => {
    const question = nextCategoryQuestion(["React", "TypeScript"]);
    expect(question.choices.map((c) => c.value)).not.toContain("React");
    expect(question.choices.map((c) => c.value)).not.toContain("TypeScript");
    expect(question.instructions).toContain(categoryCatalog.React.description);
    expect(question.instructions).toContain(
      categoryCatalog.TypeScript.description,
    );
  });
});

describe("decision parsing", () => {
  it.each(["SeniorMindset", "ScalingFast", "none"])(
    "handles the %s upgrade",
    (value) => {
      expect(parseContentUpgrade([choice("content_upgrade", value)])).toBe(
        value === "none" ? null : value,
      );
    },
  );
  it.each(["AI", "Books", "Personal"])("accepts the category %s", (value) => {
    expect(parseCategoryChoice(reply(value).answers, [])).toBe(value);
  });
  it("allows stopping without forcing a category or filling the cap", () => {
    expect(parseCategoryChoice(reply("none").answers, [])).toBe(null);
    expect(parseCategoryChoice(reply("none").answers, ["React"])).toBe(null);
  });
  it.each(["Invented category", "review", "Uncategorized", true])(
    "rejects unavailable or invalid choices (%s)",
    (value) => {
      expect(() => parseCategoryChoice(reply(value).answers, [])).toThrow(
        "Invalid or repeated",
      );
    },
  );
  it("rejects repeated categories", () => {
    expect(() =>
      parseCategoryChoice(reply("React").answers, ["React"]),
    ).toThrow("Invalid or repeated");
  });
  it.each(["category", "content_upgrade"])(
    "rejects missing, refused, wrong-type and duplicate %s decisions",
    (name) => {
      const parse =
        name === "category"
          ? (a: Decision["answers"]) => parseCategoryChoice(a, [])
          : parseContentUpgrade;
      for (const answers of [
        [],
        [{ type: "refusal", name }],
        [{ type: "predicate", name, probability: 1 }],
        [choice(name, "none"), choice(name, "none")],
      ] as Decision["answers"][])
        expect(() => parse(answers)).toThrow(`No valid ${name} decision`);
    },
  );
  it("rejects an invalid content upgrade", () => {
    expect(() =>
      parseContentUpgrade([choice("content_upgrade", "OtherBook")]),
    ).toThrow();
  });
});

describe("article classification", () => {
  it("chooses categories sequentially with definitions and stops when coverage is sufficient", async () => {
    decide
      .mockResolvedValueOnce(reply("Leadership", "SeniorMindset"))
      .mockResolvedValueOnce(reply("Teamwork"))
      .mockResolvedValueOnce(reply("none"));
    const signal = new AbortController().signal;
    expect(await classifyArticle(article, signal)).toEqual({
      contentUpgrade: "SeniorMindset",
      categories: ["Leadership", "Teamwork"],
    });
    expect(decide).toHaveBeenCalledTimes(3);
    expect(decide.mock.calls[0][0].questions).toEqual([
      contentUpgradeQuestion,
      nextCategoryQuestion([]),
    ]);
    expect(decide.mock.calls[1][0].questions).toEqual([
      nextCategoryQuestion(["Leadership"]),
    ]);
    expect(decide.mock.calls[2][0].questions).toEqual([
      nextCategoryQuestion(["Leadership", "Teamwork"]),
    ]);
    for (const [request, options] of decide.mock.calls) {
      expect(request.model).toBe(DECISION_MODEL);
      expect(JSON.parse(request.input)).toEqual(article);
      expect(options.signal).toBe(signal);
    }
  });
  it("can return no categories", async () => {
    decide.mockResolvedValueOnce(reply("none", "none"));
    expect(await classifyArticle(article)).toEqual({
      contentUpgrade: null,
      categories: [],
    });
    expect(decide).toHaveBeenCalledTimes(1);
  });
  it("caps selection at five distinct categories", async () => {
    const selected = [
      "React",
      "Frontend",
      "JavaScript",
      "Testing",
      "TypeScript",
    ];
    selected.forEach((c, i) =>
      decide.mockResolvedValueOnce(reply(c, i === 0 ? "none" : undefined)),
    );
    expect((await classifyArticle(article)).categories).toEqual(selected);
    expect(decide).toHaveBeenCalledTimes(5);
  });
  it("propagates failures instead of silently returning a partial set", async () => {
    decide
      .mockResolvedValueOnce(reply("React", "none"))
      .mockRejectedValueOnce(new Error("Request failed"));
    await expect(classifyArticle(article)).rejects.toThrow("Request failed");
  });
});
