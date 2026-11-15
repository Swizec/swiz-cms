import slugify from "@sindresorhus/slugify";
import { getEncoding } from "js-tiktoken";
import { remark } from "remark";
import stripMarkdown from "strip-markdown";
import { getDatabase } from "../database";
import { getOpenAI } from "../openai";
import { EMBEDDING_MODEL } from "../models";
import type { Article, RelatedArticle } from "../article";

const tokenizer = getEncoding("cl100k_base");

export async function findRelatedArticles(
  article: Article,
  signal?: AbortSignal,
): Promise<RelatedArticle[]> {
  const sql = getDatabase();
  const plainText = String(
    await remark()
      .use(stripMarkdown)
      .process(`${article.title}\n\n${article.body}`),
  );
  // ada-002 accepts at most 8,191 input tokens. Long drafts still get useful matches.
  const tokens = tokenizer.encode(plainText).slice(0, 8191);
  const result = await getOpenAI().embeddings.create(
    { model: EMBEDDING_MODEL, input: tokens },
    { signal },
  );
  const embedding = result.data[0]?.embedding;
  if (!embedding?.length) throw new Error("No embedding returned.");
  const ownUrl = `/blog/${slugify(article.title)}/`;
  const rows =
    await sql`select url, title, to_char(published_date, 'YYYY-MM-DD') as published_date from article_embeddings
    where rtrim(url, '/') <> ${ownUrl.slice(0, -1)}
      and rtrim(url, '/') <> ${`https://swizec.com${ownUrl.slice(0, -1)}`}
    order by embedding <-> ${JSON.stringify(embedding)}::vector asc, published_date desc limit 5`;
  return rows.flatMap((row) => {
    const url = new URL(String(row.url), "https://swizec.com");
    if (
      url.origin !== "https://swizec.com" ||
      !url.pathname.startsWith("/blog/")
    )
      return [];
    return [
      {
        title: String(row.title),
        url: url.href,
        published: row.published_date
          ? String(row.published_date).slice(0, 10)
          : null,
      },
    ];
  });
}
