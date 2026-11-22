import { it, expect } from "vitest";
import { createHash } from "node:crypto";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import {
  classificationCandidates,
  readCandidates,
  SCALING_FAST_AVAILABLE_FROM,
} from "../lib/server/classification-candidates";
import { selectCategories } from "../lib/server/category-selection";
import { DECISION_MODEL } from "../lib/models";
import { canonicalizeCategories } from "../lib/categories";
import split from "./fixtures/classifier-calibration-split.json";

// The archive is private input; reports contain labels and public URLs, not bodies.
// Run explicitly with BACKTEST_CORPUS and BACKTEST_OUTPUT. Never runs in CI.
it.skipIf(process.env.CLASSIFIER_BACKTEST !== "1")(
  "backtests the frozen classifier partition",
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
    const partition = process.env.BACKTEST_PARTITION ?? "holdout";
    if (partition !== "holdout" && partition !== "tuning")
      throw new Error("BACKTEST_PARTITION must be holdout or tuning.");
    const selected = new Set(split[partition]);
    const eligible = all.filter((p) => selected.has(p.slug));
    if (
      new Set(eligible.map((p) => p.slug)).size !== eligible.length ||
      eligible.length !== selected.size
    )
      throw new Error("Missing or duplicate articles in corpus.");
    if (
      eligible.some(
        (p) =>
          p.published < split.window.start || p.published > split.window.end,
      )
    )
      throw new Error("Article outside the frozen evaluation window.");
    const sourceFiles = [
      "lib/categories.ts",
      "lib/category-aliases.json",
      "lib/server/classification.ts",
      "lib/server/classification-candidates.ts",
      "lib/server/category-selection.ts",
      "lib/server/category-catalog.json",
      "lib/server/category-profile.json",
      "lib/server/category-calibration.json",
      "tests/fixtures/classifier-calibration-split.json",
    ];
    const fingerprints = Object.fromEntries(
      await Promise.all(
        sourceFiles.map(async (path) => [
          path,
          createHash("sha256")
            .update(await readFile(path))
            .digest("hex"),
        ]),
      ),
    );
    const signature = {
      classifierCommit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      model: DECISION_MODEL,
      fingerprints,
      corpusSha256: createHash("sha256").update(raw).digest("hex"),
      partition,
      categoryWindow: split.window,
      upgradeAvailableFrom: SCALING_FAST_AVAILABLE_FROM,
      upgradePolicy:
        "Offer only books available on the publication date; dates and labels are not model input.",
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
    const previousRows: { slug: string; error: string | null }[] = lines
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const completed = new Set(previousRows.map((row) => row.slug));
    if (
      completed.size !== previousRows.length ||
      previousRows.some((row) => !selected.has(row.slug))
    )
      throw new Error("Unexpected or duplicate checkpoint rows.");
    const pending = eligible.filter((p) => !completed.has(p.slug));
    let cursor = 0;
    let failures = previousRows.filter((row) => row.error !== null).length;
    let writes = Promise.resolve();
    async function worker() {
      while (cursor < pending.length) {
        const post = pending[cursor++];
        const start = Date.now();
        let result;
        try {
          // Only the full title/body enters model input. The date filters the
          // available book choices; saved labels never enter this request.
          const answers = await classificationCandidates(
            { title: post.title, body: post.body },
            post.published,
            AbortSignal.timeout(120_000),
          );
          const candidates = readCandidates(answers, post.published);
          const prediction = {
            categories: selectCategories(candidates.scores),
            contentUpgrade: candidates.contentUpgrade,
          };
          result = { ...candidates, prediction, error: null };
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
          expectedCategories: canonicalizeCategories(post.categories),
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
            `Backtest ${completed.size}/${eligible.length}; ${failures} request failures`,
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
