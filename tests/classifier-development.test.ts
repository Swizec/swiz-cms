import { it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import type { Article } from "../lib/article";
import { DECISION_MODEL } from "../lib/models";
import {
  classificationCandidates,
  readCandidates,
  topicQuestions,
  upgradeQuestion,
} from "../lib/server/classification-candidates";
import cases from "./fixtures/category-eval.json";
import controls from "./fixtures/category-eval-controls.json";

// Optional raw predicate collection for fitting. This uses the same independent
// central-subject controls as eval:categories, never reserved validation labels.
it.skipIf(process.env.CLASSIFIER_DEVELOPMENT !== "1")(
  "collects development decisions",
  async () => {
    const corpusPath = process.env.CATEGORY_EVAL_CORPUS;
    const output = process.env.BACKTEST_OUTPUT;
    if (!corpusPath || !output)
      throw new Error("Set CATEGORY_EVAL_CORPUS and BACKTEST_OUTPUT.");
    const raw = await readFile(corpusPath, "utf8");
    const corpus: (Article & { slug: string })[] = JSON.parse(raw);
    const inputs = [
      ...cases.map((c) => {
        const post = corpus.find((p) => p.slug === c.slug);
        if (!post) throw new Error(`Missing development article: ${c.slug}`);
        return { ...c, title: post.title, body: post.body };
      }),
      ...controls.map((c) => ({ ...c, slug: c.id })),
    ];
    const asOf = "2026-11-14";
    const rows = [];
    for (const post of inputs) {
      const answers = await classificationCandidates(
        { title: post.title, body: post.body },
        asOf,
        AbortSignal.timeout(120_000),
      );
      rows.push({
        slug: post.slug,
        required: post.required,
        excluded: post.excluded,
        ...readCandidates(answers, asOf),
      });
    }
    await writeFile(
      output,
      rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
    );
    await writeFile(
      `${output}.meta.json`,
      JSON.stringify(
        {
          collectedAt: new Date().toISOString(),
          model: DECISION_MODEL,
          corpusSha256: createHash("sha256").update(raw).digest("hex"),
          questionsSha256: createHash("sha256")
            .update(JSON.stringify([upgradeQuestion(asOf), ...topicQuestions]))
            .digest("hex"),
          count: rows.length,
        },
        null,
        2,
      ) + "\n",
    );
    expect(rows).toHaveLength(cases.length + controls.length);
  },
  1_800_000,
);
