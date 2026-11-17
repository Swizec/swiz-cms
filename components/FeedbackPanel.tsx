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
  const [reviewedDraft, setReviewedDraft] = useState<Article | null>(null);
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
  const changed =
    reviewedDraft !== null && !sameArticle(reviewedDraft, article);

  function startReview() {
    const parsed = articleSchema.safeParse(article);
    if (!parsed.success || busy) return;
    followLatest.current = true;
    setMessages([]);
    clearError();
    setQuestion("");
    setReviewedDraft({ ...article });
    void sendMessage({
      text: feedbackPrompt(parsed.data),
      metadata: { draft: parsed.data },
    });
  }

  function sendFollowUp() {
    if (!question.trim() || busy) return;
    followLatest.current = true;
    void sendMessage({ text: question.trim() });
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
            disabled={!articleSchema.safeParse(article).success || busy}
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
              disabled={busy || !articleSchema.safeParse(article).success}
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
            {changed && (
              <p className="notice">
                Your draft has changed. Start a new review to include your
                latest edits. Follow-ups here use the previous draft.
              </p>
            )}
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
              {messages.slice(1).map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  <p className="message-author">
                    {message.role === "user" ? "You" : "Astra"}
                  </p>
                  <div className="prose">
                    {message.parts.map((part, index) =>
                      part.type === "text" ? (
                        <Markdown
                          key={index}
                          components={{
                            a: (props) => (
                              <a {...props} target="_blank" rel="noreferrer" />
                            ),
                          }}
                        >
                          {part.text}
                        </Markdown>
                      ) : null,
                    )}
                  </div>
                </div>
              ))}
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
            <label htmlFor="follow-up" className="sr-only">
              Keep the conversation going
            </label>
            <textarea
              id="follow-up"
              rows={2}
              maxLength={20_000}
              placeholder="Ask a follow-up…"
              aria-describedby="follow-up-hint"
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
                  disabled={!question.trim()}
                >
                  Ask Astra <ArrowUp size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </section>
  );
}
