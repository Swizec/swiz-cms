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

- **Get feedback** sends exactly `what do you think about this`, then the title and full body, to Astra at high reasoning. Follow-up questions include the conversation history. **New review** starts over with the latest draft.
- **Find articles** searches the existing vector index and excludes the current article.
- **Publish** prepares commands under `pages/blog/<slug>/` and a complete MDX file. Copy buttons do not execute commands or modify the blog repository.

Feedback stays in memory for the current page visit. Refreshing keeps the draft and starts a fresh conversation. OpenAI responses use `store: false`.

Run `npm test` for request validation and conversation regression checks.

## Publishing suggestions

**Suggest metadata** uses GPT-6 Luna in two parallel calls:

- The Responses API selects indexes of one or two representative sentences. The server copies those sentences from the Markdown's plain text; it never substitutes model-written prose.
- The [Decisions API](https://developers.openai.com/api/docs/guides/decisions) chooses `SeniorMindset`, `ScalingFast`, or no content upgrade, and evaluates the hardcoded categories in one shared-input request. The five strongest category matches above 0.8 are offered as suggestions. They are editable; no category is required.

`lib/categories.ts` contains all 284 category names from [swizec.com/categories](https://swizec.com/categories), retrieved on November 14, 2026. Refresh this file manually. There is no runtime scraping or category database.

The generated MDX uses `pages/blog/<slug>/index.mdx`, comma-separated `categories`, an escaped description, and an optional `content_upgrade` field. Selecting **None** omits the upgrade field. If the draft changes after metadata generation, review or regenerate the values before copying the file. Terminal commands create directories and touch the file without overwriting existing contents.

The recommended development and CI runtime is Node.js 26 LTS (`nvm use`). CI installs from `package-lock.json`, typechecks, runs tests, and builds without API credentials. Live model/database checks are separate from CI.
