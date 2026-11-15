// @vitest-environment happy-dom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { FeedbackPanel } from "../components/FeedbackPanel";
import { PublishingPanel } from "../components/PublishingPanel";
import { Workspace } from "../components/Workspace";
import type { FeedbackContext } from "../lib/feedback";

const article = {
  title: "Scaling teams",
  body: "Coordination is the bottleneck. Teams need clear ownership.",
};
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
function reply(text: string, id: string, context?: FeedbackContext) {
  const events = [
    {
      type: "start",
      messageId: id,
      ...(context ? { messageMetadata: { context } } : {}),
    },
    { type: "start-step" },
    { type: "text-start", id: "text" },
    { type: "text-delta", id: "text", delta: text },
    { type: "text-end", id: "text" },
    { type: "finish-step" },
    { type: "finish", finishReason: "stop" },
  ];
  return new Response(
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") +
      "data: [DONE]\n\n",
    {
      headers: {
        "Content-Type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
      },
    },
  );
}

describe("writing workspace", () => {
  it("restores and autosaves a draft without sending it to an API or URL", async () => {
    localStorage.setItem("swiz-cms:draft:v1", JSON.stringify(article));
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<Workspace />);
    expect(
      ((await screen.findByLabelText("Title")) as HTMLInputElement).value,
    ).toBe(article.title);
    fireEvent.change(screen.getByLabelText("Body"), {
      target: { value: "An updated draft." },
    });
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("swiz-cms:draft:v1")!).body).toBe(
        "An updated draft.",
      ),
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });
  it("streams feedback, sends follow-ups with context, and resets to the latest draft", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        reply("Give the ownership idea an example.", "first"),
      )
      .mockResolvedValueOnce(reply("Show one ambiguous handoff.", "second"))
      .mockResolvedValueOnce(reply("This example is clearer.", "third"));
    vi.stubGlobal("fetch", fetch);
    const { rerender } = render(<FeedbackPanel article={article} />);
    fireEvent.click(screen.getByRole("button", { name: /Get feedback/ }));
    await screen.findByText("Give the ownership idea an example.");
    fireEvent.change(screen.getByLabelText("Keep the conversation going"), {
      target: { value: "Which example?" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Ask Astra/ }));
    await screen.findByText("Show one ambiguous handoff.");
    const request = JSON.parse(fetch.mock.calls[1][1].body);
    expect(request.messages).toHaveLength(3);
    expect(request.messages[0].parts[0].text).toContain(article.body);
    expect(
      request.messages[1].parts.some(
        (part: { text?: string }) =>
          part.text === "Give the ownership idea an example.",
      ),
    ).toBe(true);
    expect(request.messages[2].parts[0].text).toBe("Which example?");
    rerender(
      <FeedbackPanel
        article={{ ...article, body: "A specific handoff example." }}
      />,
    );
    expect(screen.getByText(/Your draft has changed/)).toBeTruthy();
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "New review",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "New review" }));
    await screen.findByText("This example is clearer.");
    const fresh = JSON.parse(fetch.mock.calls[2][1].body);
    expect(fresh.messages).toHaveLength(1);
    expect(fresh.messages[0].parts[0].text).toContain(
      "A specific handoff example.",
    );
  });
  it("keeps late metadata tied to its original draft and requires review before copying", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      ),
    );
    const { rerender } = render(<PublishingPanel article={article} />);
    fireEvent.click(screen.getByRole("button", { name: "Suggest metadata" }));
    rerender(
      <PublishingPanel
        article={{ title: "A new article", body: "A different point." }}
      />,
    );
    resolve(
      Response.json({
        description: article.body,
        categories: ["Teamwork"],
        contentUpgrade: "SeniorMindset",
      }),
    );
    await screen.findByText(/Your draft has changed/);
    expect(
      screen.queryByRole("button", { name: "Copy article file" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Keep these values for this draft" }),
    );
    expect(
      await screen.findByRole("button", { name: "Copy article file" }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Content upgrade"), {
      target: { value: "" },
    });
    expect(document.querySelectorAll("pre")[1].textContent).not.toContain(
      "content_upgrade:",
    );
  });
  it("preserves draft, feedback context, and publishing edits across workspace tabs", async () => {
    const context: FeedbackContext = {
      articles: [
        {
          title: "An earlier post",
          url: "https://swizec.com/blog/earlier-post",
          published: "2026-06-17",
          kind: "related",
          excerpt: "An actual example from the archive.",
          truncated: false,
        },
      ],
      incomplete: false,
    };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        reply("This builds on your earlier post.", "first", context),
      )
      .mockResolvedValueOnce(
        reply("The new example adds a useful distinction.", "second"),
      );
    vi.stubGlobal("fetch", fetch);
    localStorage.setItem("swiz-cms:draft:v1", JSON.stringify(article));
    render(<Workspace />);
    const switchTab = (name: string) =>
      fireEvent.mouseDown(screen.getByRole("tab", { name }), {
        button: 0,
        ctrlKey: false,
      });
    switchTab("Preview");
    expect(
      await screen.findByRole("heading", { name: article.title }),
    ).toBeTruthy();
    switchTab("Write");
    expect((screen.getByLabelText("Body") as HTMLTextAreaElement).value).toBe(
      article.body,
    );
    fireEvent.click(screen.getByRole("button", { name: /Get feedback/ }));
    await screen.findByText("This builds on your earlier post.");
    expect(screen.getByText("Using 1 post from your archive")).toBeTruthy();
    expect(
      JSON.parse(fetch.mock.calls[0][1].body).messages[0].metadata.draft,
    ).toEqual(article);
    switchTab("Publish");
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "An edited description." },
    });
    fireEvent.change(screen.getByLabelText("Content upgrade"), {
      target: { value: "ScalingFast" },
    });
    switchTab("Related");
    expect(screen.getByRole("button", { name: "Find articles" })).toBeTruthy();
    switchTab("Feedback");
    expect(screen.getByText("This builds on your earlier post.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Keep the conversation going"), {
      target: { value: "What is different this time?" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Ask Astra/ }));
    await screen.findByText("The new example adds a useful distinction.");
    expect(
      JSON.parse(fetch.mock.calls[1][1].body).messages[1].metadata.context,
    ).toEqual(context);
    switchTab("Publish");
    expect(
      (screen.getByLabelText("Description") as HTMLTextAreaElement).value,
    ).toBe("An edited description.");
    expect(
      (screen.getByLabelText("Content upgrade") as HTMLSelectElement).value,
    ).toBe("ScalingFast");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
