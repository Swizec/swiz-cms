import { afterAll, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { load } from "cheerio";
import type { Article } from "../lib/article";
import { DECISION_MODEL } from "../lib/models";
import { classifyArticle } from "../lib/server/classification";
import cases from "./fixtures/category-eval.json";
import controls from "./fixtures/category-eval-controls.json";

type Result = {
  slug: string;
  categories: string[];
  missing: string[];
  unexpected: string[];
};
const results: Result[] = [];

async function readArticle(slug: string): Promise<Article> {
  if (process.env.CATEGORY_EVAL_CORPUS) {
    const posts: (Article & { slug: string })[] = JSON.parse(
      await readFile(process.env.CATEGORY_EVAL_CORPUS, "utf8"),
    );
    const post = posts.find((p) => p.slug === slug);
    if (!post) throw new Error(`Missing evaluation article: ${slug}`);
    // Never leak the historical frontmatter categories into the classification.
    return { title: post.title, body: post.body };
  }
  const response = await fetch(`https://swizec.com/blog/${slug}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    throw new Error(`Could not read ${slug}: ${response.status}`);
  const $ = load(await response.text());
  const article = $("article").first();
  const title = article.find("h1").first().text().trim();
  // Retain the full published body but remove taxonomy, recommendations and chrome.
  article.find(".article-categories").nextAll().remove();
  article
    .find(".article-categories, h1, script, style, nav, footer, form, button")
    .remove();
  article.find("p, h2, h3, h4, li, pre, blockquote").after("\n\n");
  const body = article.text().trim();
  if (!title || !body) throw new Error(`No article text found: ${slug}`);
  return { title, body };
}

describe.skipIf(process.env.CATEGORY_EVAL !== "1")(
  "live category evaluation (uses paid OpenAI requests)",
  () => {
    afterAll(async () => {
      if (process.env.CATEGORY_EVAL_RESULTS)
        await writeFile(
          process.env.CATEGORY_EVAL_RESULTS,
          JSON.stringify(
            {
              model: DECISION_MODEL,
              evaluatedAt: new Date().toISOString(),
              results,
            },
            null,
            2,
          ),
        );
    });
    async function evaluate(
      slug: string,
      article: Article,
      required: string[],
      excluded: string[],
    ) {
      const { categories } = await classifyArticle(article);
      const selected: string[] = categories;
      const missing = required.filter((c) => !selected.includes(c));
      const unexpected = excluded.filter((c) => selected.includes(c));
      results.push({ slug, categories, missing, unexpected });
      console.log(`${slug}: ${categories.join(", ") || "(none)"}`);
      expect({ missing, unexpected }).toEqual({ missing: [], unexpected: [] });
    }
    it.each(cases)(
      "classifies $slug",
      async ({ slug, required, excluded }) => {
        await evaluate(slug, await readArticle(slug), required, excluded);
      },
      120_000,
    );
    it.each(controls)(
      "checks $id",
      async ({ id, title, body, required, excluded }) => {
        await evaluate(id, { title, body }, required, excluded);
      },
      120_000,
    );
  },
);
