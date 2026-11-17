"use client";
import { useState } from "react";
import type { Article } from "../lib/article";
import {
  articleFile,
  articlePath,
  localDate,
  scaffoldCommand,
} from "../lib/publishing";
import { CopyBlock } from "./CopyBlock";

export function PublishingPanel({ article }: { article: Article }) {
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(localDate);
  const directory = articlePath(article.title);
  return (
    <section className="panel" aria-labelledby="publish-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ready when you are</p>
          <h2 id="publish-heading">Publish</h2>
        </div>
      </div>
      <p className="muted">Set up the file, then paste in your article.</p>
      <label htmlFor="description">Description</label>
      <textarea
        id="description"
        rows={3}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <label htmlFor="published">Publish date</label>
      <input
        id="published"
        type="date"
        value={published}
        onChange={(event) => setPublished(event.target.value)}
      />
      {directory && published ? (
        <>
          <p className="path-label">{directory}/index.mdx</p>
          <CopyBlock
            title="Terminal commands"
            text={scaffoldCommand(article.title)}
          />
          <CopyBlock
            title="Article file"
            text={articleFile(article, description, published)}
          />
        </>
      ) : (
        <p className="empty-state">
          Add a title and publish date to prepare your file.
        </p>
      )}
    </section>
  );
}
