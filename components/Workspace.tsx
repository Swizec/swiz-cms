"use client";
import { useEffect, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  FileText,
  MessageSquare,
  PencilLine,
  Send,
} from "lucide-react";
import Markdown from "react-markdown";
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
  const [activeTool, setActiveTool] = useState("feedback");
  const [editorMode, setEditorMode] = useState("write");
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
          <span className="brand-icon">
            <PencilLine size={19} aria-hidden="true" />
          </span>
          Swiz<span className="brand-suffix">CMS</span>
        </a>
        <span className="masthead-note">Your writing workspace</span>
        <a
          className="site-link"
          href="https://swizec.com"
          target="_blank"
          rel="noreferrer"
        >
          View blog <ArrowUpRight size={15} aria-hidden="true" />
        </a>
        <span className="avatar" aria-label="Swizec">
          S
        </span>
      </header>
      <div className="workspace-content">
        <div className="page-heading">
          <div>
            <h1>
              Draft workspace<span className="draft-badge">Draft</span>
            </h1>
            <p className="muted">
              Your words. A little perspective. Ready when you are.
            </p>
          </div>
          <span className="save-status" role="status">
            {saveStatus === "Saved on this device" && (
              <Check size={14} aria-hidden="true" />
            )}{" "}
            {saveStatus}
          </span>
        </div>
        <div className="workspace-grid">
          <Tabs.Root
            className="panel editor"
            value={editorMode}
            onValueChange={setEditorMode}
          >
            <div className="editor-toolbar">
              <h2 id="draft-heading">
                <FileText size={16} aria-hidden="true" />
                Your draft
              </h2>
              <Tabs.List className="view-switch" aria-label="Editor view">
                <Tabs.Trigger value="write">Write</Tabs.Trigger>
                <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
              </Tabs.List>
            </div>
            <Tabs.Content
              value="write"
              forceMount
              hidden={editorMode !== "write"}
              className="editor-fields"
            >
              <label htmlFor="title" className="sr-only">
                Title
              </label>
              <textarea
                id="title"
                className="title-input"
                rows={1}
                placeholder="Give your idea a title…"
                maxLength={250}
                value={article.title}
                disabled={!ready}
                onChange={(event) =>
                  setArticle({ ...article, title: event.target.value })
                }
              />
              <label htmlFor="body" className="sr-only">
                Body
              </label>
              <textarea
                id="body"
                className="body-input"
                placeholder={
                  "Start writing, or paste your draft here.\n\nMarkdown is welcome."
                }
                maxLength={MAX_BODY_LENGTH}
                value={article.body}
                disabled={!ready}
                onChange={(event) =>
                  setArticle({ ...article, body: event.target.value })
                }
              />
            </Tabs.Content>
            <Tabs.Content
              value="preview"
              forceMount
              hidden={editorMode !== "preview"}
              className="draft-preview prose"
            >
              <h1>{article.title || "Untitled draft"}</h1>
              {article.body ? (
                <Markdown
                  components={{
                    a: (props) => (
                      <a {...props} target="_blank" rel="noreferrer" />
                    ),
                  }}
                >
                  {article.body}
                </Markdown>
              ) : (
                <p className="muted">
                  Your Markdown preview will appear here as you write.
                </p>
              )}
            </Tabs.Content>
            <div className="editor-footer">
              <div>
                <span>
                  {words.toLocaleString()} {words === 1 ? "word" : "words"}
                </span>
                <span className="reading-time">
                  {Math.max(1, Math.ceil(words / 220))} min read
                </span>
              </div>
              <span>Markdown</span>
            </div>
          </Tabs.Root>
          <Tabs.Root
            className="inspector"
            value={activeTool}
            onValueChange={setActiveTool}
          >
            <Tabs.List className="tool-tabs" aria-label="Writing tools">
              <Tabs.Trigger value="feedback">
                <MessageSquare size={16} aria-hidden="true" />
                Feedback
              </Tabs.Trigger>
              <Tabs.Trigger value="related">
                <BookOpen size={16} aria-hidden="true" />
                Related
              </Tabs.Trigger>
              <Tabs.Trigger value="publish">
                <Send size={16} aria-hidden="true" />
                Publish
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content
              value="feedback"
              forceMount
              hidden={activeTool !== "feedback"}
            >
              <FeedbackPanel article={article} />
            </Tabs.Content>
            <Tabs.Content
              value="related"
              forceMount
              hidden={activeTool !== "related"}
            >
              <RelatedArticles article={article} />
            </Tabs.Content>
            <Tabs.Content
              value="publish"
              forceMount
              hidden={activeTool !== "publish"}
            >
              <PublishingPanel article={article} />
            </Tabs.Content>
          </Tabs.Root>
        </div>
        <footer className="footer">
          <span className="local-dot" aria-hidden="true" />
          Draft saved locally<span className="footer-divider">/</span>AI runs
          when you ask
        </footer>
      </div>
    </main>
  );
}
