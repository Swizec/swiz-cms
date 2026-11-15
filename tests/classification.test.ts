import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Decision } from "openai/resources/decisions";
import { CATEGORIES } from "../lib/categories";
import { DECISION_MODEL } from "../lib/models";
import {
  classifyArticle,
  parseClassification,
} from "../lib/server/classification";

const { decide, selectCategories } = vi.hoisted(() => ({
  decide: vi.fn(),
  selectCategories: vi.fn(),
}));
vi.mock("../lib/openai", () => ({
  getOpenAI: () => ({
    decisions: { create: decide },
    responses: { parse: selectCategories },
  }),
}));

function answers(upgrade: string): Decision["answers"] {
  return [
    {
      type: "choice",
      name: "content_upgrade",
      choice: upgrade,
      confidence: 0.95,
      probabilities: [],
    },
  ];
}
const article = {
  title: "Reviewing work when agents write the code",
  body: "People review architecture and user outcomes. Coding agents implement the feature and run automated checks. This changes where engineers spend their review time.",
};

beforeEach(() => {
  vi.clearAllMocks();
  decide.mockResolvedValue({ answers: answers("SeniorMindset") });
  selectCategories.mockResolvedValue({
    status: "completed",
    output_parsed: { categories: ["AI", "Software Engineering", "Teamwork"] },
  });
});

describe("article classification", () => {
  it.each(["SeniorMindset", "ScalingFast", "none"])(
    "handles the %s upgrade",
    (choice) => {
      expect(
        parseClassification(answers(choice), {
          categories: ["AI", "Software Engineering"],
        }),
      ).toEqual({
        contentUpgrade: choice === "none" ? null : choice,
        categories: ["AI", "Software Engineering"],
      });
    },
  );
  it("preserves the selected set and order instead of sorting by category popularity", () => {
    expect(
      parseClassification(answers("none"), {
        categories: ["AI", "Software Engineering", "Teamwork"],
      }).categories,
    ).toEqual(["AI", "Software Engineering", "Teamwork"]);
  });
  it("allows an empty selection or an Uncategorized fallback", () => {
    expect(
      parseClassification(answers("none"), { categories: [] }).categories,
    ).toEqual([]);
    expect(
      parseClassification(answers("none"), { categories: ["Uncategorized"] })
        .categories,
    ).toEqual(["Uncategorized"]);
  });
  it("removes duplicates and Uncategorized when a real topic fits", () => {
    expect(
      parseClassification(answers("none"), {
        categories: ["AI", "Uncategorized", "AI", "Teamwork"],
      }).categories,
    ).toEqual(["AI", "Teamwork"]);
  });
  it.each([
    { categories: ["Invented category"] },
    { categories: CATEGORIES.slice(0, 6) },
    { categories: "AI" },
    {},
    null,
  ])("rejects invalid category selections: %j", (selection) => {
    expect(() => parseClassification(answers("none"), selection)).toThrow();
  });
  it("rejects missing, refused, and invalid upgrade decisions", () => {
    const selected = { categories: ["AI"] };
    expect(() => parseClassification([], selected)).toThrow();
    expect(() =>
      parseClassification(
        [{ type: "refusal", name: "content_upgrade" }],
        selected,
      ),
    ).toThrow();
    expect(() =>
      parseClassification(answers("InventedBook"), selected),
    ).toThrow();
  });
  it("uses Luna to select categories jointly from the complete article and allowed list", async () => {
    const signal = new AbortController().signal;
    expect(await classifyArticle(article, signal)).toEqual({
      contentUpgrade: "SeniorMindset",
      categories: ["AI", "Software Engineering", "Teamwork"],
    });
    const [request, options] = selectCategories.mock.calls[0];
    expect(request.model).toBe(DECISION_MODEL);
    expect(request.store).toBe(false);
    expect(JSON.parse(request.input)).toEqual(article);
    expect(request.text.format.schema.properties.categories.items.enum).toEqual(
      CATEGORIES,
    );
    expect(request.text.format.schema.properties.categories.maxItems).toBe(5);
    expect(options.signal).toBe(signal);
    expect(decide.mock.calls[0][0].input).toBe(
      `${article.title}\n\n${article.body}`,
    );
    expect(decide.mock.calls[0][1].signal).toBe(signal);
  });
  it.each([
    { status: "completed", output_parsed: null },
    { status: "incomplete", output_parsed: { categories: ["AI"] } },
  ])(
    "rejects a refused or incomplete category response: %j",
    async (response) => {
      selectCategories.mockResolvedValueOnce(response);
      await expect(classifyArticle(article)).rejects.toThrow(
        "no complete category selection",
      );
    },
  );
});
