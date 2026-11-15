"use client";
import { useEffect, useState } from "react";
import { articleSchema, sameArticle, type Article } from "../lib/article";
import { CATEGORIES, type Category } from "../lib/categories";
import { emptyMetadata, type PublishingMetadata } from "../lib/metadata";
import {
  articleFile,
  articlePath,
  localDate,
  scaffoldCommand,
} from "../lib/publishing";
import { useArticleRequest } from "../hooks/useArticleRequest";
import { CopyBlock } from "./CopyBlock";

export function PublishingPanel({ article }: { article: Article }) {
  const { result, pending, error, run } =
    useArticleRequest<PublishingMetadata>("/api/metadata");
  const [metadata, setMetadata] = useState(emptyMetadata);
  const [metadataFor, setMetadataFor] = useState<Article | null>(null);
  const [published, setPublished] = useState("");
  const [categoryToAdd, setCategoryToAdd] = useState("");
  useEffect(() => setPublished(localDate()), []);
  useEffect(() => {
    if (result) {
      setMetadata(result.data);
      setMetadataFor(result.article);
    }
  }, [result]);
  const directory = articlePath(article.title);
  const stale = metadataFor !== null && !sameArticle(metadataFor, article);
  const update = (values: Partial<PublishingMetadata>) => {
    setMetadata({ ...metadata, ...values });
    if (!metadataFor) setMetadataFor({ ...article });
  };

  return (
    <section className="panel" aria-labelledby="publish-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ready when you are</p>
          <h2 id="publish-heading">Publish</h2>
        </div>
        <button
          type="button"
          className="button secondary small"
          disabled={pending || !articleSchema.safeParse(article).success}
          onClick={() => void run(article)}
        >
          {pending
            ? "Preparing…"
            : result
              ? "Regenerate metadata"
              : "Suggest metadata"}
        </button>
      </div>
      <p className="muted">
        A description in your own words, a few categories, and the right next
        step for your reader.
      </p>
      {pending && (
        <p className="loading" role="status">
          Picking representative sentences and matching topics…
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error} You can also fill in the fields yourself.
        </p>
      )}
      {stale && (
        <div className="notice">
          <p>
            Your draft has changed since these values were prepared. Regenerate
            them, or review and keep them for this draft.
          </p>
          <button
            className="text-button"
            type="button"
            disabled={pending}
            onClick={() => setMetadataFor({ ...article })}
          >
            Keep these values for this draft
          </button>
        </div>
      )}
      <label htmlFor="description">Description</label>
      <textarea
        id="description"
        rows={3}
        placeholder="One or two sentences that capture the idea."
        value={metadata.description}
        disabled={pending}
        onChange={(event) => update({ description: event.target.value })}
      />
      <p className="field-hint">
        Suggestions quote sentences from your article. Everything here is
        editable.
      </p>
      <div className="metadata-grid">
        <div>
          <label htmlFor="content-upgrade">Content upgrade</label>
          <select
            id="content-upgrade"
            value={metadata.contentUpgrade ?? ""}
            disabled={pending}
            onChange={(event) =>
              update({
                contentUpgrade: event.target.value
                  ? (event.target.value as "SeniorMindset" | "ScalingFast")
                  : null,
              })
            }
          >
            <option value="">None</option>
            <option value="SeniorMindset">SeniorMindset</option>
            <option value="ScalingFast">ScalingFast</option>
          </select>
        </div>
        <div>
          <label htmlFor="published">Publish date</label>
          <input
            id="published"
            type="date"
            value={published}
            onChange={(event) => setPublished(event.target.value)}
          />
        </div>
      </div>
      <label htmlFor="category">Categories</label>
      {metadata.categories.length > 0 && (
        <ul className="category-chips">
          {metadata.categories.map((category) => (
            <li key={category}>
              {category}
              <button
                type="button"
                aria-label={`Remove ${category}`}
                disabled={pending}
                onClick={() =>
                  update({
                    categories: metadata.categories.filter(
                      (item) => item !== category,
                    ),
                  })
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="category-picker">
        <select
          id="category"
          value={categoryToAdd}
          disabled={pending || metadata.categories.length >= 5}
          onChange={(event) => setCategoryToAdd(event.target.value)}
        >
          <option value="">Add a category…</option>
          {CATEGORIES.filter(
            (category) => !metadata.categories.includes(category),
          ).map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button secondary"
          disabled={
            pending || !categoryToAdd || metadata.categories.length >= 5
          }
          onClick={() => {
            if (
              CATEGORIES.includes(categoryToAdd as Category) &&
              !metadata.categories.includes(categoryToAdd as Category)
            )
              update({
                categories: [...metadata.categories, categoryToAdd as Category],
              });
            setCategoryToAdd("");
          }}
        >
          Add
        </button>
      </div>
      <p className="field-hint">
        Up to five categories from{" "}
        <a
          href="https://swizec.com/categories"
          target="_blank"
          rel="noreferrer"
        >
          swizec.com
        </a>
        .
      </p>
      {directory ? (
        <>
          <p className="path-label">{directory}/index.mdx</p>
          <CopyBlock
            title="Terminal commands"
            text={scaffoldCommand(article.title)}
          />
          {published && !stale && !pending ? (
            <CopyBlock
              title="Article file"
              text={articleFile(article, metadata, published)}
            />
          ) : (
            <p className="empty-state">
              {stale
                ? "Review the metadata above before copying this draft."
                : pending
                  ? "Your article file will be ready when the suggestions finish."
                  : "Choose a publish date to prepare the article file."}
            </p>
          )}
        </>
      ) : (
        <p className="empty-state">
          Add a title with letters or numbers to prepare your file.
        </p>
      )}
    </section>
  );
}
