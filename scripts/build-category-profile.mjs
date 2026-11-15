import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error(
    "Usage: node scripts/build-category-profile.mjs CORPUS.json OUTPUT.json",
  );
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const split = read("tests/fixtures/classifier-calibration-split.json");
const catalog = read("lib/server/category-catalog.json");
const corpus = read(input);
if (new Set(corpus.map((p) => p.slug)).size !== corpus.length)
  throw new Error("Duplicate corpus articles.");
const holdout = new Set(split.holdout);
const tuning = new Set(split.tuning);
const training = corpus.filter(
  (p) =>
    p.published >= split.window.start &&
    p.published <= split.window.end &&
    !holdout.has(p.slug),
);
const recentWindowStart = "2024-11-14";
const categories = {};
for (const name of Object.keys(catalog)) {
  const tagged = training.filter((p) => p.categories.includes(name));
  // Usage priors can use tuning labels; prompt examples cannot. Keep corpus
  // order stable so the snapshot and example selection are reproducible.
  const available = tagged.filter((p) => !tuning.has(p.slug));
  const indexes = [
    ...new Set([
      0,
      Math.floor((available.length - 1) / 2),
      available.length - 1,
    ]),
  ].filter((i) => i >= 0 && i < available.length);
  categories[name] = {
    count: tagged.length,
    recentCount: tagged.filter((p) => p.published >= recentWindowStart).length,
    examples: indexes.map((i) => ({
      title: available[i].title,
      url: available[i].url,
      published: available[i].published,
    })),
  };
}
writeFileSync(
  output,
  JSON.stringify(
    {
      window: split.window,
      trainingPosts: training.length,
      categories,
      recentWindowStart,
      recentTrainingPosts: training.filter(
        (p) => p.published >= recentWindowStart,
      ).length,
    },
    null,
    2,
  ) + "\n",
);
