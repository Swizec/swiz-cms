"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import Markdown from "react-markdown";
import {
  articleSchema,
  feedbackPrompt,
  sameArticle,
  type Article,
} from "../lib/article";

const transport = new DefaultChatTransport({ api: "/api/feedback" });
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
  } = useChat({ transport });
  const [reviewedDraft, setReviewedDraft] = useState<Article | null>(null);
  const [question, setQuestion] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const changed =
    reviewedDraft !== null && !sameArticle(reviewedDraft, article);

  function startReview() {
    const parsed = articleSchema.safeParse(article);
    if (!parsed.success || busy) return;
    setMessages([]);
    clearError();
    setQuestion("");
    setReviewedDraft({ ...article });
    void sendMessage({ text: feedbackPrompt(parsed.data) });
  }

  return (
    <section
      className="panel feedback-panel"
      aria-labelledby="feedback-heading"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">A second pair of eyes</p>
          <h2 id="feedback-heading">Talk it through</h2>
        </div>
        <span className="model-label">Astra · high</span>
      </div>
      {!messages.length ? (
        <div className="feedback-empty">
          <span className="quote-mark" aria-hidden="true">
            “
          </span>
          <p>what do you think about this</p>
          <span className="muted">
            Your article, an open question, and room to follow up.
          </span>
          <button
            type="button"
            className="button"
            disabled={!articleSchema.safeParse(article).success || busy}
            onClick={startReview}
          >
            Get feedback <span aria-hidden="true">↗</span>
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
              New review
            </button>
          </div>
          {changed && (
            <p className="notice">
              Your draft has changed. Start a new review to include your latest
              edits. Follow-ups here use the previous draft.
            </p>
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
            {status === "submitted" && (
              <p className="loading" role="status">
                Astra is thinking about your article…
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
          <form
            className="follow-up"
            onSubmit={(event) => {
              event.preventDefault();
              if (question.trim() && !busy) {
                void sendMessage({ text: question.trim() });
                setQuestion("");
              }
            }}
          >
            <label htmlFor="follow-up">Keep the conversation going</label>
            <textarea
              id="follow-up"
              rows={3}
              maxLength={20_000}
              placeholder="Ask a question, push back, or dig into an idea…"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <div className="action-row">
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
                  Ask Astra <span aria-hidden="true">↑</span>
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </section>
  );
}
