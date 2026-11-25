"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import type { FeedbackMessage } from "../lib/feedback";
import { ArrowUp, ArrowUpRight, RotateCcw } from "lucide-react";
import {
  articleSchema,
  feedbackPrompt,
  feedbackRevisionPrompt,
  sameArticle,
  type Article,
} from "../lib/article";

const transport = new DefaultChatTransport<FeedbackMessage>({
  api: "/api/feedback",
});
function readableError(message: string) {
  try {
    return JSON.parse(message).error || message;
  } catch {
    return message;
  }
}

export function FeedbackPanel({ article }: { article: Article }) {
  const {
    messages,
    sendMessage,
    setMessages,
    status,
    error,
    clearError,
    regenerate,
    stop,
  } = useChat<FeedbackMessage>({ transport });
  const [question, setQuestion] = useState("");
  const scrollArea = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    const viewport = scrollArea.current;
    if (viewport && viewport.clientHeight > 0 && followLatest.current) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, status]);
  const latestMessage = messages.at(-1);
  const context = messages.find(
    (message) => message.role === "assistant" && message.metadata?.context,
  )?.metadata?.context;
  const hasResponseText =
    latestMessage?.role === "assistant" &&
    latestMessage.parts.some(
      (part) => part.type === "text" && part.text.trim().length > 0,
    );
  const reviewedDraft = messages.findLast(
    (message) => message.role === "user" && message.metadata?.draft,
  )?.metadata?.draft;
  const parsedArticle = articleSchema.safeParse(article);
  const changed =
    reviewedDraft !== undefined &&
    !sameArticle(
      reviewedDraft,
      parsedArticle.success ? parsedArticle.data : article,
    );
  const canSend = changed ? parsedArticle.success : Boolean(question.trim());

  function startReview() {
    if (!parsedArticle.success || busy) return;
    followLatest.current = true;
    setMessages([]);
    clearError();
    setQuestion("");
    void sendMessage({
      text: feedbackPrompt(parsedArticle.data),
      metadata: { draft: parsedArticle.data },
    });
  }

  function sendFollowUp() {
    if (!canSend || busy) return;
    followLatest.current = true;
    clearError();
    if (changed && parsedArticle.success) {
      const followUp = question.trim() || "how about now";
      void sendMessage({
        text: feedbackRevisionPrompt(parsedArticle.data, followUp),
        metadata: { draft: parsedArticle.data, question: followUp },
      });
    } else {
      void sendMessage({ text: question.trim() });
    }
    setQuestion("");
  }

  return (
    <section
      className={`panel feedback-panel${messages.length ? " has-conversation" : ""}`}
      aria-labelledby="feedback-heading"
    >
      <div className="section-heading">
        <h2 id="feedback-heading">Draft feedback</h2>
        <span className="model-label">Astra · high</span>
      </div>
      {!messages.length ? (
        <div className="feedback-empty">
          <p className="muted">
            Review this draft with your writing style, recent posts, and
            relevant articles from your archive as context. Ask follow-up
            questions in the same conversation.
          </p>
          <p className="feedback-prompt">
            “what do you think about this” + your draft
          </p>
          <button
            type="button"
            className="button"
            disabled={!parsedArticle.success || busy}
            onClick={startReview}
          >
            Get feedback <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <div className="review-context">
            <span>
              Reviewing <strong>{reviewedDraft?.title}</strong>
            </span>
            <button
              type="button"
              className="text-button"
              disabled={busy || !parsedArticle.success}
              onClick={startReview}
            >
              <RotateCcw size={12} aria-hidden="true" />
              New review
            </button>
          </div>
          <div
            className="feedback-scroll"
            ref={scrollArea}
            onScroll={(event) => {
              const viewport = event.currentTarget;
              followLatest.current =
                viewport.scrollHeight -
                  viewport.scrollTop -
                  viewport.clientHeight <
                40;
            }}
          >
            {context && (
              <details className="archive-context">
                <summary>
                  {context.articles.length
                    ? `Using ${context.articles.length} ${context.articles.length === 1 ? "post" : "posts"} from your archive`
                    : "Using your writing style guide"}
                </summary>
                {context.articles.length === 0 ? (
                  <p className="muted">
                    The archive couldn’t be loaded. Start a new review to try
                    again.
                  </p>
                ) : (
                  <ul>
                    {context.articles.map((item) => (
                      <li key={item.url}>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          {item.title}
                        </a>
                        <span className="caption">
                          {item.kind === "recent"
                            ? "Recent writing"
                            : "Related post"}
                          {item.published ? ` · ${item.published}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {context.incomplete && context.articles.length > 0 && (
                  <p className="muted">
                    Some posts couldn’t be loaded. This review uses the
                    available excerpts.
                  </p>
                )}
              </details>
            )}
            <div
              className="conversation"
              aria-label="Feedback conversation"
              aria-busy={busy}
            >
              {messages.slice(1).map((message) => {
                const revision =
                  message.role === "user" && message.metadata?.question
                    ? message.metadata.draft
                    : undefined;
                return (
                  <div key={message.id} className={`message ${message.role}`}>
                    <p className="message-author">
                      {message.role === "user" ? "You" : "Astra"}
                    </p>
                    <div className="prose">
                      <Markdown
                        components={{
                          a: (props) => (
                            <a {...props} target="_blank" rel="noreferrer" />
                          ),
                        }}
                      >
                        {revision
                          ? message.metadata?.question
                          : message.parts
                              .filter((part) => part.type === "text")
                              .map((part) => part.text)
                              .join("\n\n")}
                      </Markdown>
                    </div>
                    {revision && (
                      <details className="draft-revision">
                        <summary>Updated draft · {revision.title}</summary>
                        <pre>{revision.body}</pre>
                      </details>
                    )}
                  </div>
                );
              })}
              {busy && !hasResponseText && (
                <p className="loading" role="status">
                  {status === "submitted" && !context
                    ? "Reading your draft and blog history…"
                    : "Astra is thinking about your article…"}
                </p>
              )}
            </div>
            {error && (
              <div className="error" role="alert">
                <p>{readableError(error.message)}</p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void regenerate()}
                >
                  Retry response
                </button>
              </div>
            )}
          </div>
          <form
            className="follow-up"
            onSubmit={(event) => {
              event.preventDefault();
              sendFollowUp();
            }}
          >
            {changed && (
              <p className="revision-notice" id="revision-hint" role="status">
                {parsedArticle.success
                  ? "Draft updated. Your next message includes these edits and keeps the conversation."
                  : "Add a title and body to send your updated draft."}
              </p>
            )}
            <label htmlFor="follow-up" className="sr-only">
              Keep the conversation going
            </label>
            <textarea
              id="follow-up"
              rows={2}
              maxLength={20_000}
              placeholder={
                changed
                  ? "How about now? Or ask a specific question…"
                  : "Ask a follow-up…"
              }
              aria-describedby={
                changed ? "revision-hint follow-up-hint" : "follow-up-hint"
              }
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  (event.metaKey || event.ctrlKey) &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  sendFollowUp();
                }
              }}
            />
            <div className="action-row">
              <span id="follow-up-hint" className="caption">
                ⌘ / Ctrl + Enter to send
              </span>
              {busy ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => void stop()}
                >
                  Stop response
                </button>
              ) : (
                <button
                  className="button"
                  type="submit"
                  disabled={!canSend}
                >
                  {changed
                    ? question.trim()
                      ? "Send updated draft"
                      : "How about now?"
                    : "Ask Astra"}{" "}
                  <ArrowUp size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </section>
  );
}
