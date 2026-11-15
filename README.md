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

- The Responses API selects indexes of one or two representative sentences. The server copies those sentences from the Markdown's plain text; it never substitutes model-written prose.
- The [Decisions API](https://developers.openai.com/api/docs/guides/decisions) chooses the content upgrade (`SeniorMindset`, `ScalingFast`, or none) and categories. Every category is a native `choice` option with its own definition and applicability criteria. It selects the best additional category, sees what is already covered, and can stop when another label would be incidental or redundant. There are at most five sequential choices; the upgrade shares the first request. Suggestions remain editable and no category is required.

`lib/categories.ts` contains 132 categories used in 823 published posts from **November 14, 2016 through November 14, 2026**. The ten-year window applies to post publication dates. Older categories, including `review`, are excluded from both suggestions and the manual picker. `Uncategorized` remains a manual fallback and is not an automatic suggestion.

`lib/server/category-catalog.json` defines every category using its recent archive posts and the blog's curated category introductions where available. Each entry records supporting URLs and publication dates. The definitions were drafted from archive excerpts and reviewed, including ambiguous names and named series. Historical tags are evidence, not perfect labels. Refresh the list, window, and definitions together manually; there is no runtime scraping or category database.

Category selection compares meanings directly instead of sorting independent confidence scores. Later choices consider earlier choices to avoid spending all five slots on overlapping labels. Missing, refused, invalid, or repeated decisions fail the request so the user can retry instead of receiving a silently incomplete result.

The opt-in live evaluation uses 16 recent articles covering engineering, React, databases, serverless, leadership, books, retrospectives, travel, creative writing, careers, programming, immigration, and overcommitment. These articles are excluded from the definition sources. It checks a few essential categories and clear exclusions rather than requiring an exact historical tag set. Four additional synthetic controls cover an incidental AI-tool mention, human-only code review, health, and freelance contracts. Ordinary tests verify catalog coverage, dates, the native choice contract, stopping, cancellation propagation, and error handling without API calls.

```sh
# Uses OPENAI_API_KEY from .env.local; fetches the published articles and makes paid API calls.
npm run eval:categories

# Optional: use full Markdown bodies from a local JSON archive, without frontmatter.
# Corpus shape: [{ "slug": "...", "title": "...", "body": "..." }]
CATEGORY_EVAL_CORPUS=/path/to/posts.json CATEGORY_EVAL_RESULTS=/tmp/category-results.json npm run eval:categories
```

Live results can change with model behavior or published content; this small sample is a regression check, not a claim of accuracy across every category.

The generated MDX uses `pages/blog/<slug>/index.mdx`, comma-separated `categories`, an escaped description, and an optional `content_upgrade` field. Selecting **None** omits the upgrade field. If the draft changes after metadata generation, review or regenerate the values before copying the file. Terminal commands check out `master` in the blog repository, create the article directory and its `img` subdirectory with one `mkdir -p`, and touch the file without overwriting existing contents. Each step runs only if the previous step succeeds.

The recommended development and CI runtime is Node.js 26 LTS (`nvm use`). CI installs from `package-lock.json`, typechecks, runs tests, and builds without API credentials. Live model/database checks are separate from CI.
