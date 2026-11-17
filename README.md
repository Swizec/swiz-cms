# Swiz CMS

A personal writing and publishing workspace for swizec.com.

## Development

Use Node.js 22.13 or newer and npm:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` and `POSTGRES_URL` in `.env.local`. The latter points to the existing Neon/Vercel Postgres database with the `article_embeddings` table. Secrets stay on the server.

```sh
npm run typecheck
npm run build
```

## Models

Feedback uses `gpt-6-astra` with high reasoning through the Responses API. Smaller writing tasks use `gpt-6-luna`. Model IDs live in `lib/models.ts`.

The existing related-article index uses `text-embedding-ada-002`. Its query model deliberately matches the stored vectors; upgrading embeddings requires reindexing the whole corpus, not just changing the query model.

References: [GPT-6 migration](https://developers.openai.com/api/docs/guides/latest-model), [AI SDK](https://ai-sdk.dev/docs/introduction).
