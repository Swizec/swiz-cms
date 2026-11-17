"use client";
import { useEffect, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  FileText,
  MessageSquare,
  PencilLine,
  Send,
  Undo2,
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
import { articleFromMarkdown } from "../lib/markdown-import";

const STORAGE_KEY = "swiz-cms:draft:v1";
function isToolInput(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("input, textarea, select, [contenteditable]") &&
    !target.closest(".editor")
  );
}

export function Workspace() {
  const [article, setArticle] = useState<Article>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [activeTool, setActiveTool] = useState("feedback");
  const [editorMode, setEditorMode] = useState("write");
  const [saveStatus, setSaveStatus] = useState("Loading draft…");
  const [pasteNotice, setPasteNotice] = useState<{
    message: string;
    error: boolean;
    previousDraft?: Article;
  } | null>(null);
  const bodyField = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (pasteNotice?.previousDraft) {
      bodyField.current?.focus();
      bodyField.current?.setSelectionRange(0, 0);
      if (bodyField.current) bodyField.current.scrollTop = 0;
    }
  }, [pasteNotice]);
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

  function undoImport() {
    if (!pasteNotice?.previousDraft) return;
    setArticle(pasteNotice.previousDraft);
    setPasteNotice(null);
    bodyField.current?.focus();
  }

  useEffect(() => {
    function pasteArticle(event: ClipboardEvent) {
      if (!ready || event.defaultPrevented || isToolInput(event.target)) return;
      const imported = articleFromMarkdown(
        event.clipboardData?.getData("text/plain") ?? "",
      );
      if (!imported) return;
      event.preventDefault();
      const parsed = draftSchema.safeParse(imported);
      if (!parsed.success) {
        setPasteNotice({
          message:
            imported.title.length > 250
              ? "The pasted title is longer than 250 characters. Shorten it before importing."
              : "The pasted body is longer than 100,000 characters. Shorten it before importing.",
          error: true,
        });
        return;
      }
      setArticle(parsed.data);
      setEditorMode("write");
      setPasteNotice({
        message: "Full article imported. Title and body separated.",
        error: false,
        previousDraft: article,
      });
    }
    document.addEventListener("paste", pasteArticle);
    return () => document.removeEventListener("paste", pasteArticle);
  }, [article, ready]);

  return (
    <main
      className="workspace"
      onKeyDown={(event) => {
        if (
          pasteNotice?.previousDraft &&
          !isToolInput(event.target) &&
          (event.metaKey || event.ctrlKey) &&
          !event.shiftKey &&
          !event.altKey &&
          !event.nativeEvent.isComposing &&
          event.key.toLowerCase() === "z"
        ) {
          event.preventDefault();
          undoImport();
        }
      }}
    >
      <header className="masthead">
        <a className="brand" href="/">
          <span className="brand-icon">
            <PencilLine size={15} aria-hidden="true" />
          </span>
          Swiz<span className="brand-suffix">CMS</span>
        </a>
        <h1 className="workspace-title">Draft workspace</h1>
        <span className="save-status" role="status">
          {saveStatus === "Saved on this device" && (
            <Check size={13} aria-hidden="true" />
          )}
          {saveStatus}
        </span>
        <a
          className="site-link"
          href="https://swizec.com"
          target="_blank"
          rel="noreferrer"
          aria-label="View blog"
        >
          <span>View blog</span> <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </header>
      <div className="workspace-grid">
        <Tabs.Root
          className="panel editor"
          value={editorMode}
          onValueChange={setEditorMode}
        >
          <div className="editor-toolbar">
            <h2 id="draft-heading">
              <FileText size={16} aria-hidden="true" />
              Draft
            </h2>
            <Tabs.List className="view-switch" aria-label="Editor view">
              <Tabs.Trigger value="write">Write</Tabs.Trigger>
              <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
            </Tabs.List>
          </div>
          {pasteNotice && (
            <div
              className={`import-notice${pasteNotice.error ? " error" : ""}`}
              role={pasteNotice.error ? "alert" : "status"}
            >
              <span>{pasteNotice.message}</span>
              {pasteNotice.previousDraft && (
                <button
                  className="text-button"
                  type="button"
                  onClick={undoImport}
                  title="Undo import (⌘ / Ctrl + Z)"
                >
                  <Undo2 size={13} aria-hidden="true" /> Undo
                </button>
              )}
            </div>
          )}
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
              placeholder="Article title"
              maxLength={250}
              value={article.title}
              disabled={!ready}
              onChange={(event) => {
                setArticle({ ...article, title: event.target.value });
                setPasteNotice(null);
              }}
            />
            <label htmlFor="body" className="sr-only">
              Body
            </label>
            <textarea
              id="body"
              ref={bodyField}
              className="body-input"
              placeholder={
                "Write in Markdown, or paste a full article.\nA leading # title is detected automatically."
              }
              maxLength={MAX_BODY_LENGTH}
              value={article.body}
              disabled={!ready}
              onChange={(event) => {
                setArticle({ ...article, body: event.target.value });
                setPasteNotice(null);
              }}
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
            className="tool-panel feedback-tool"
            forceMount
            hidden={activeTool !== "feedback"}
          >
            <FeedbackPanel article={article} />
          </Tabs.Content>
          <Tabs.Content
            value="related"
            className="tool-panel"
            forceMount
            hidden={activeTool !== "related"}
          >
            <RelatedArticles article={article} />
          </Tabs.Content>
          <Tabs.Content
            value="publish"
            className="tool-panel"
            forceMount
            hidden={activeTool !== "publish"}
          >
            <PublishingPanel article={article} />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </main>
  );
}
