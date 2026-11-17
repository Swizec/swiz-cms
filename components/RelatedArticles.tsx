"use client";
import {
  articleSchema,
  sameArticle,
  type Article,
  type RelatedArticle,
} from "../lib/article";
import { useArticleRequest } from "../hooks/useArticleRequest";

export function RelatedArticles({ article }: { article: Article }) {
  const { result, pending, error, run } =
    useArticleRequest<RelatedArticle[]>("/api/related");
  return (
    <section className="panel" aria-labelledby="related-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">From your archive</p>
          <h2 id="related-heading">Related articles</h2>
        </div>
        <button
          type="button"
          className="button secondary small"
          disabled={pending || !articleSchema.safeParse(article).success}
          onClick={() => void run(article)}
        >
          {pending ? "Searching…" : result ? "Refresh" : "Find articles"}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {pending && (
        <p role="status" className="loading">
          Looking for connections in your writing…
        </p>
      )}
      {result && !sameArticle(result.article, article) && (
        <p className="notice">
          These matches are for an earlier draft. Refresh when you’re ready.
        </p>
      )}
      {result ? (
        result.data.length ? (
          <ul className="related-list">
            {result.data.map((item) => (
              <li key={item.url}>
                <a href={item.url} target="_blank" rel="noreferrer">
                  <span>{item.title}</span>
                  <span aria-hidden="true">↗</span>
                </a>
                {item.published && (
                  <time dateTime={item.published}>{item.published}</time>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No related articles found.</p>
        )
      ) : (
        !pending && (
          <p className="empty-state">
            Find older articles worth linking to in this one.
          </p>
        )
      )}
    </section>
  );
}
