import { it, expect } from "vitest";
import { createHash } from "node:crypto";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { classifyArticle } from "../lib/server/classification";
import { DECISION_MODEL } from "../lib/models";
import { CATEGORY_WINDOW } from "../lib/categories";
import catalog from "../lib/server/category-catalog.json";
import developmentCases from "./fixtures/category-eval.json";

// The archive is private input; reports contain labels and public URLs, not bodies.
// Run explicitly with BACKTEST_CORPUS and BACKTEST_OUTPUT. Never runs in CI.
it.skipIf(process.env.CLASSIFIER_BACKTEST !== "1")(
  "backtests the frozen classifier against unused archive posts",
  async () => {
    function requiredEnv(name: string) {
      const value = process.env[name];
      if (!value) throw new Error(`Set ${name}.`);
      return value;
    }
    const corpusPath = requiredEnv("BACKTEST_CORPUS");
    const output = requiredEnv("BACKTEST_OUTPUT");
    const raw = await readFile(corpusPath, "utf8");
    const all: {
      slug: string;
      url: string;
      title: string;
      body: string;
      published: string;
      categories: string[];
      contentUpgradeRaw: string | null;
      hasContentUpgrade: boolean;
    }[] = JSON.parse(raw);
    const sources = new Set(
      Object.values(catalog).flatMap((c) => c.sources.map((s) => s.url)),
    );
    const development = new Set(developmentCases.map((p) => p.slug));
    const recent = all.filter(
      (p) =>
        p.published >= CATEGORY_WINDOW.start &&
        p.published <= CATEGORY_WINDOW.end,
    );
    const eligible = recent.filter(
      (p) => !sources.has(p.url) && !development.has(p.slug),
    );
    if (new Set(eligible.map((p) => p.slug)).size !== eligible.length)
      throw new Error("Duplicate articles in corpus.");
    const signature = {
      classifierCommit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      model: DECISION_MODEL,
      classifierSha256: createHash("sha256")
        .update(await readFile("lib/server/classification.ts"))
        .digest("hex"),
      catalogSha256: createHash("sha256")
        .update(JSON.stringify(catalog))
        .digest("hex"),
      corpusSha256: createHash("sha256").update(raw).digest("hex"),
      categoryWindow: CATEGORY_WINDOW,
      totalRecent: recent.length,
      excludedDefinitionSources: recent.filter((p) => sources.has(p.url))
        .length,
      excludedDevelopment: recent.filter(
        (p) => !sources.has(p.url) && development.has(p.slug),
      ).length,
      eligible: eligible.length,
    };
    let previous: string;
    try {
      previous = await readFile(`${output}.meta.json`, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      previous = "";
    }
    if (
      previous &&
      JSON.stringify(JSON.parse(previous).signature) !==
        JSON.stringify(signature)
    )
      throw new Error("Backtest inputs changed; choose a new output path.");
    if (!previous)
      await writeFile(
        `${output}.meta.json`,
        JSON.stringify(
          { signature, startedAt: new Date().toISOString() },
          null,
          2,
        ),
      );
    let lines = "";
    try {
      lines = await readFile(output, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const completed = new Set(
      lines
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line).slug as string),
    );
    const pending = eligible.filter((p) => !completed.has(p.slug));
    let cursor = 0;
    let failures = 0;
    let writes = Promise.resolve();
    async function worker() {
      while (cursor < pending.length) {
        const post = pending[cursor++];
        const start = Date.now();
        let result;
        try {
          // Labels, dates and source URLs never enter the classifier request.
          const prediction = await classifyArticle(
            { title: post.title, body: post.body },
            AbortSignal.timeout(120_000),
          );
          result = { prediction, error: null };
        } catch (error) {
          failures++;
          result = {
            prediction: null,
            error: error instanceof Error ? error.message : String(error),
          };
        }
        const row = {
          slug: post.slug,
          url: post.url,
          title: post.title,
          published: post.published,
          expectedCategories: post.categories,
          expectedContentUpgrade: post.contentUpgradeRaw,
          hasContentUpgrade: post.hasContentUpgrade,
          ...result,
          elapsedMs: Date.now() - start,
        };
        writes = writes.then(() =>
          appendFile(output, JSON.stringify(row) + "\n"),
        );
        await writes;
        completed.add(post.slug);
        if (completed.size % 25 === 0 || completed.size === eligible.length)
          console.log(
            `Backtest ${completed.size}/${eligible.length}; ${failures} request failures this run`,
          );
      }
    }
    await Promise.all(Array.from({ length: 4 }, worker));
    const meta = JSON.parse(await readFile(`${output}.meta.json`, "utf8"));
    await writeFile(
      `${output}.meta.json`,
      JSON.stringify(
        { ...meta, finishedAt: new Date().toISOString() },
        null,
        2,
      ),
    );
    expect(completed.size).toBe(eligible.length);
    expect(failures).toBe(0);
  },
  1_800_000,
);
