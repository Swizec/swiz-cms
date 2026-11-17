"use client";
import { useEffect, useState } from "react";
import {
  draftSchema,
  emptyDraft,
  MAX_BODY_LENGTH,
  type Article,
} from "../lib/article";
import { FeedbackPanel } from "./FeedbackPanel";
import { PublishingPanel } from "./PublishingPanel";
import { RelatedArticles } from "./RelatedArticles";

const STORAGE_KEY = "swiz-cms:draft:v1";
export function Workspace() {
  const [article, setArticle] = useState<Article>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading draft…");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = draftSchema.safeParse(JSON.parse(saved));
        if (parsed.success) setArticle(parsed.data);
        else setSaveStatus("Saved draft could not be restored.");
      }
    } catch {
      setSaveStatus("Local saving is unavailable.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    setSaveStatus("Saving…");
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(article));
        setSaveStatus("Saved on this device");
      } catch {
        setSaveStatus(
          "Local saving is unavailable. Keep a copy of your draft.",
        );
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [article, ready]);
  const words = article.body.trim()
    ? article.body.trim().split(/\s+/).length
    : 0;

  return (
    <main className="workspace">
      <header className="masthead">
        <a className="brand" href="/">
          Swiz<span>CMS</span>
        </a>
        <span className="masthead-note">
          A little help between draft and publish.
        </span>
        <a
          className="site-link"
          href="https://swizec.com"
          target="_blank"
          rel="noreferrer"
        >
          swizec.com <span aria-hidden="true">↗</span>
        </a>
      </header>
      <div className="page-heading">
        <div>
          <p className="eyebrow">The writing desk</p>
          <h1>Make your point.</h1>
          <p className="muted">
            Bring the words. Find the connections. Talk through the rough edges.
          </p>
        </div>
        <span className="save-status" role="status">
          <span aria-hidden="true">●</span> {saveStatus}
        </span>
      </div>
      <div className="workspace-grid">
        <div className="column">
          <section className="panel editor" aria-labelledby="draft-heading">
            <div className="section-heading">
              <h2 id="draft-heading">Your draft</h2>
              <span className="caption">Markdown welcome</span>
            </div>
            <label htmlFor="title">Title</label>
            <input
              id="title"
              className="title-input"
              placeholder="What’s the idea?"
              maxLength={250}
              value={article.title}
              disabled={!ready}
              onChange={(event) =>
                setArticle({ ...article, title: event.target.value })
              }
            />
            <label htmlFor="body">Body</label>
            <textarea
              id="body"
              className="body-input"
              placeholder="Paste your article here…"
              maxLength={MAX_BODY_LENGTH}
              value={article.body}
              disabled={!ready}
              onChange={(event) =>
                setArticle({ ...article, body: event.target.value })
              }
            />
            <div className="editor-footer">
              <span>
                {words.toLocaleString()} {words === 1 ? "word" : "words"}
              </span>
              <span>Draft saved locally · AI runs when you ask</span>
            </div>
          </section>
          <PublishingPanel article={article} />
        </div>
        <div className="column">
          <FeedbackPanel article={article} />
          <RelatedArticles article={article} />
        </div>
      </div>
      <footer className="footer">
        Words by you. A little help from the machines.
      </footer>
    </main>
  );
}
