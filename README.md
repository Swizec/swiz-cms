# Swiz CMS

A personal writing and publishing workspace for swizec.com.

## Development

Use Node.js 26 LTS (`nvm use`) and npm. Node.js 22.13 or newer is also supported:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` and `POSTGRES_URL` in `.env.local`. The latter points to the existing Neon/Vercel Postgres database with the `article_embeddings` table. Secrets stay on the server.

```sh
npm run typecheck
npm test
npm run build
```

## Models

Feedback uses `gpt-6-astra` with high reasoning through the Responses API. Smaller writing tasks use `gpt-6-luna`. Model IDs live in `lib/models.ts`.

The existing related-article index uses `text-embedding-ada-002`. Its query model deliberately matches the stored vectors; upgrading embeddings requires reindexing the whole corpus, not just changing the query model.

References: [GPT-6 migration](https://developers.openai.com/api/docs/guides/latest-model), [AI SDK](https://ai-sdk.dev/docs/introduction).

## Writing workflow

The title and Markdown body save in this browser's local storage. Drafts are never placed in the URL. Each feature runs only when requested, with its own loading, error, and retry behavior.

Paste a full Markdown article anywhere in the editor or directly onto the page; no selection or import button is needed. A leading level-one heading plus a nonempty body replaces the draft: the heading becomes the editable title and is removed from the body, so the preview and published article do not duplicate it. Both `# Title` and underlined titles work, including inline formatting. The remaining Markdown is preserved. **Undo** (or ⌘/Ctrl+Z immediately after importing) restores the previous draft. Snippets, standalone headings, code blocks, lower-level headings, and pastes into tool fields are left alone; no AI request is needed.

The compact workspace fills the window with an editor and independently scrolling tools. **Write / Preview** switches between Markdown input and its rendered preview. **Feedback / Related / Publish** switches tools without discarding conversations, in-progress requests, or metadata edits. The feedback composer stays visible; ⌘/Ctrl+Enter sends a follow-up and Enter adds a newline. Radix Tabs provides keyboard navigation; Lucide supplies the interface icons. On narrow screens the tools sit beneath the editor.

- **Get feedback** asks `what do you think about this`, then sends the title and full body to Astra at high reasoning. Server guidance preserves Swizec's voice, and three related posts plus two recent posts supply actual blog context. Follow-up questions include the conversation and reuse the same excerpts. **New review** starts over with the latest draft and fresh context.
- **Find articles** searches the existing vector index and excludes the current article.
- **Publish** prepares commands under `pages/blog/<slug>/` and a complete MDX file. Copy buttons do not execute commands or modify the blog repository.

Feedback stays in memory for the current page visit. Refreshing keeps the draft and starts a fresh conversation. OpenAI responses use `store: false`.

Blog context reuses the existing vector index and reads published pages from swizec.com with Cheerio. It strips site chrome, caps each excerpt at 8,000 characters, and caches public pages for an hour using Next's fetch cache. The context lookup has a 12-second deadline; unavailable posts are skipped and the UI reports partial or missing archive context. Feedback still works with the voice guide when the archive is unavailable. Excerpts travel with the first assistant message as AI SDK metadata so follow-ups use the same evidence. A new review refreshes them. The source list is visible under the review heading.

Run `npm test` for request validation and conversation regression checks.

## Publishing suggestions

**Suggest metadata** runs two tasks in parallel with GPT-6 Luna:

- The Responses API selects indexes of one or two representative sentences. The server copies those sentences from the Markdown's plain text.
- One [Decisions API](https://developers.openai.com/api/docs/guides/decisions) request selects the content upgrade (`SeniorMindset`, `ScalingFast`, or none) and evaluates category membership with native predicates. Each category has an applicability rubric and recent examples. Selection requires strong evidence and applies a fitted historical-usage adjustment. Zero categories is allowed; five is a cap. All suggestions remain editable.

The manual picker contains 130 categories from the snapshot of 823 posts published **November 14, 2016 through November 14, 2026**. On November 21, `Hiring` merged into `Interviewing` and `Salary` into `Compensation`, matching the blog migration. `Interviewing` covers recruiting and candidate selection as well as interviews; `Compensation` covers salary, negotiation, and other employment rewards. `Career`, `Teamwork`, and `Leadership` remain separate. Older tags such as `review` are excluded. Ten broad labels remain manual-only: `Uncategorized`, `Lesson`, `Insights`, `Tips`, `Tutorial`, `Programming Lessons`, `Thoughts`, `Opinion`, `Technical`, and `Programming`.

Teamwork describes how people collaborate and coordinate shared work. Leadership describes guiding, managing, and developing people, including leadership by individual contributors and creating conditions for others to succeed. It can be taught through everyday engineering work: mentoring through code review, giving people clarity and autonomy, or shaping culture and decisions. Peer coordination or a technical workflow alone does not establish Leadership. Both labels can apply when both subjects are strongly developed. Their definitions pin representative archive examples with `exampleSlugs`, which the profile builder validates against the training partition and preserves on regeneration.

[Companion blog PR #183](https://github.com/Swizec/swizec.com/pull/183) reviews the 72 Leadership additions from July's parent-tag backfill, removes 48, and retains 24 with substantive leadership content. Every Teamwork tag and pre-existing Leadership tag is preserved. The profile now reflects that reviewed archive: Leadership has 33 training posts (13 recent), down from 76 (34 recent); other category counts and all examples stay the same. In the last five years of the archive, overlap falls from 60 to 25 of 65 Teamwork posts. This is an editorial correction, not a new accuracy estimate; dated audits and backtests retain their original labels.

`lib/server/category-catalog.json` supplies definitions and dated source URLs. `category-profile.json` supplies five-year usage and example titles; `category-calibration.json` stores the fitted cutoffs. The automatic selector evaluates 120 categories in one request. It does not use native choice confidence as a membership score. Its adjusted ranking scores are not measured probabilities of historical agreement. Invalid, missing, refused, or repeated decisions fail the request instead of returning partial metadata.

Calibration gives recent articles more weight, with a three-year half-life. It fits the archive-frequency weight and selection cutoffs together, constrained by separate checks for central subjects such as AI and rarely discussed technologies. The current fit uses a 0.25 prior weight and a 0.90 relevance cutoff, with no extra cutoff increase for later suggestions. Native evidence must still reach 0.90. The runtime needs no Python, training service, extra model call, or taxonomy lookup. Refresh the static taxonomy, profile, model decisions, calibration, and validation together.

The final November 21 refit passes all 28 live category controls and all six upgrade controls. These include peer collaboration, handoffs, managing/developing reports, leadership without a manager title, both subjects together, and technical content that merely mentions a manager. The auto-merge article now receives `AI`. The earlier [archive-sync results](reports/category-archive-sync-eval-2026-11-21.json) and [boundary results](reports/category-boundary-eval-2026-11-21.json) describe the superseded cutoffs and retain their original results.

The book rubrics distinguish individual career growth (`SeniorMindset`) from engineering teams, business growth, and evolving production systems (`ScalingFast`). Current drafts can use either book. Historical replay offers Scaling Fast only from **December 7, 2025**, when blog commit `8557ae475bea49eddcf416f1fb8b9a1d4cb2aaae` introduced its standard article content upgrade. The book announcement followed on December 8; a separate landing-page signup existed from September 17.

## Validation after the archive cleanup

The November 21 revision clarifies Leadership and refits selection against the reviewed blog archive. Two Leadership definitions were compared on the 148-article tuning partition; the first was selected using recency-weighted F0.5 and separate boundary checks. A wording-only validation recovered one Leadership tag. Selection was then refitted using only the tuning partition and all 28 development controls. The existing five-fold procedure selected the same settings in every fold; its precision is 63.6%, recall 52.6%, and F0.5 61.1%. Teamwork's definition, prompt examples, usage profile, model, and book criteria are unchanged.

On the same 66 reserved articles, 63 with category labels, both versions use the updated archive's reference labels:

| Historical category agreement | Before this revision | Revised rubric and cutoffs |
| --- | ---: | ---: |
| Precision | 62.7% | 70.6% |
| Recall | 44.7% | 47.3% |
| F1 | 52.2% | 56.7% |
| F0.5 (precision weighted) | 58.0% | 64.3% |
| Extra labels | 50 | 37 |
| Missed labels | 104 | 99 |
| Mean suggested categories | 2.13 | 2.00 |

Leadership recovers 3 of 9 saved tags, up from 2, with no unmatched Leadership predictions. Teamwork is unchanged. All 7,854 native scores for unchanged category questions are identical between these runs. The latest two years improve from 56.3% to 63.8% precision and 49.5% to 55.6% F1. Content-upgrade agreement remains 28/29 eligible explicit labels, with the same availability and sample-size limitations described below.

This is reused retrospective validation, not an untouched test: the earlier backtest informed the diagnosis, and wording-only results were inspected before refitting. No reserved labels were used by the fitter or added as prompt examples. Most of the improvement comes from selection; Leadership recall remains limited. Seven of the 63 labelled posts now receive no suggestion, up from one, and two saved Books tags are among the losses. Historical disagreement is not a definitive editorial judgment. Detailed runs, fingerprints, and paired comparisons are retained as local evaluation artifacts rather than added to the blog repository.

## Historical calibration

The scores below and the dated reports describe the November 15 classifier, before the category merges, Teamwork/Leadership distinction, archive cleanup, and subsequent refit above. `lib/category-aliases.json` maps retired labels when generating profiles and collecting new backtests, deduplicating posts tagged with both names. Old reports remain unchanged. For a new comparison, normalize both runs' reference labels and predictions with the same mapping and report that taxonomy-only effect separately from new model results; do not interpret the old scores as a validation of the revised rubrics.

The comparison uses content published **November 14, 2021–November 14, 2026**. Of 361 posts, 148 were used for tuning (133 category-labelled), 66 were reserved from fitting (63 category-labelled), and 147 were existing definition/development sources. Usage counts use the 295 non-reserved posts. Prompt example titles exclude both tuning and reserved articles. A seeded split is checked in at `tests/fixtures/classifier-calibration-split.json`.

The 66 validation articles were included in the earlier baseline and evaluated twice during this revision. This is **reused validation**, not an untouched test set. No final cutoffs were fitted to their labels. A first, stronger frequency-weighted model reached 76.9% precision but failed central-subject checks, including AI and specific technologies, so it was rejected. The final policy uses scikit-learn grid search, article-level five-fold cross-validation, and the precision-oriented F0.5 objective, constrained by separate development controls. Its cross-validated precision is 60.9%, recall 48.4%, and F0.5 57.9%.

On the same 63 labelled validation articles:

| Historical category agreement   | Original selector | Final selector |
| ------------------------------- | ----------------: | -------------: |
| Precision                       |             32.9% |          58.8% |
| Recall                          |             52.9% |          45.5% |
| Micro F1                        |             40.6% |          51.3% |
| F0.5 (precision weighted)       |             35.6% |          55.6% |
| Mean suggested categories       |              4.87 |           2.35 |
| Posts receiving five categories |           59 / 63 |         6 / 63 |
| Exact category set              |            0 / 63 |         4 / 63 |

The saved posts average 3.03 categories. Extra labels fall from 206 to 61; missed historical labels increase from 90 to 104. Some deliberately omitted generic labels count as misses. On the latest two years (20 labelled validation articles), precision rises from 31.9% to 60.4%, recall from 47.6% to 50.8%, and F1 from 38.2% to 55.2%. Historical agreement is not the same as editorial correctness, and the model still misses some named collections and adds some plausible but unsaved subjects.

Date-aware content-upgrade agreement improves from **27/29 (93.1%) to 28/29 (96.6%)** on eligible explicit labels. This is weak evidence of book discrimination: 26 are prelaunch SeniorMindset labels and only three are post-launch ScalingFast labels. Post-launch accuracy is 2/3, versus 3/3 for the original selector; a simple publication-era heuristic scores 29/29. Five older ScalingFast labels are backfills and excluded. Another 30 posts have missing upgrades and two use legacy offers; missing metadata is not a verified `none` label. The final classifier suggests SeniorMindset on 23 of those 30 missing-label posts and none on seven. Six current-day controls separately check career, team delivery, migrations, narrow tutorials, and unrelated personal writing with both books available; all pass.

The final 20 category development checks pass, including substantial versus incidental AI, specific technologies, books, and personal subjects. One old 2018 fixture now expects its saved `Personal` category instead of requiring an inferred `productivity` tag that was never saved. This corrects the development assertion; historical reference labels and scoring remain unchanged. These controls constrain development and are not accuracy estimates.

[Comparison metrics](reports/classifier-calibration-2026-11-15.json) include per-category counts, year breakdowns, confusion matrices, availability exclusions, calibration settings, and collection fingerprints. The [paired CSV](reports/classifier-calibration-2026-11-15.csv) shows every saved, original, and final label without article bodies. The [original ten-year report](reports/classifier-backtest-2026-11-14.json) remains available as the baseline.

## Reproducing the evaluation

Ordinary `npm test` and CI skip paid API calls. Live regression checks:

```sh
CATEGORY_EVAL_CORPUS=/path/to/archive.json npm run eval:categories
```

The archive is a JSON array with `slug`, `url`, `title`, full Markdown `body` without YAML, `published` (YYYY-MM-DD), canonical `categories`, `hasContentUpgrade`, and `contentUpgradeRaw`. Only title/body enter model input; publication date filters available book options locally.

Collect the frozen reserved partition, then compare with original JSONL predictions:

```sh
BACKTEST_CORPUS=/path/to/archive.json BACKTEST_OUTPUT=/tmp/validation.jsonl npm run backtest:classifier
node --experimental-strip-types scripts/backtest-metrics.ts --compare /tmp/original.jsonl /tmp/validation.jsonl /tmp/comparison.json
```

The runner defaults to `BACKTEST_PARTITION=holdout`; use `tuning` for the calibration partition. It checkpoints with four workers and refuses to resume after input or source fingerprints change. Keep the JSONL and its `.meta.json` together. The comparison refuses changed reference labels. API errors remain errors, not negative predictions.

To reproduce offline fitting, first collect tuning probabilities and the separate development controls. Fit only on the tuning partition and create a new reserved set before further iterative tuning:

```sh
BACKTEST_PARTITION=tuning BACKTEST_CORPUS=/path/to/archive.json BACKTEST_OUTPUT=/tmp/tuning.jsonl npm run backtest:classifier
CLASSIFIER_DEVELOPMENT=1 CATEGORY_EVAL_CORPUS=/path/to/archive.json BACKTEST_OUTPUT=/tmp/development.jsonl node --env-file-if-exists=.env.local node_modules/vitest/vitest.mjs run tests/classifier-development.test.ts
python3 -m venv /tmp/cms-calibration
/tmp/cms-calibration/bin/pip install -r scripts/calibration-requirements.txt
/tmp/cms-calibration/bin/python scripts/fit-category-calibration.py /tmp/tuning.jsonl /tmp/development.jsonl /tmp/calibration.json
```

`node scripts/build-category-profile.mjs /path/to/archive.json /tmp/profile.json` reproduces the usage profile from the frozen corpus order and split. Use archive labels from the companion blog migration, including its per-article Leadership removals; the profile builder maps the two retired category names but does not infer editorial removals. The offline fitter refuses missing tuning/control records and never accepts reserved articles. Model responses can vary between runs; the checked-in report records the evaluated snapshot.
