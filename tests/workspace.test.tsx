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
  it("splits a pasted article into editable fields, autosaves it, and previews one title", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<Workspace />);
    const body = screen.getByLabelText("Body") as HTMLTextAreaElement;
    fireEvent.paste(body, {
      clipboardData: { getData: () => `# ${article.title}\n\n${article.body}` },
    });
    expect((screen.getByLabelText("Title") as HTMLTextAreaElement).value).toBe(
      article.title,
    );
    expect(body.value).toBe(article.body);
    expect(screen.getByText(/Full article imported/)).toBeTruthy();
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("swiz-cms:draft:v1")!)).toEqual(
        article,
      ),
    );
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Preview" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(
      screen.getAllByRole("heading", { name: article.title }),
    ).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["body", "title", "page", "preview"])(
    "recognizes an article pasted into %s without a selection and can undo the replacement",
    async (target) => {
      localStorage.setItem("swiz-cms:draft:v1", JSON.stringify(article));
      render(<Workspace />);
      const body = screen.getByLabelText("Body") as HTMLTextAreaElement;
      const title = screen.getByLabelText("Title") as HTMLTextAreaElement;
      const clipboardData = {
        getData: () => "# A replacement\n\nA different body.",
      };
      body.setSelectionRange(5, 5);
      if (target === "preview") {
        fireEvent.mouseDown(screen.getByRole("tab", { name: "Preview" }), {
          button: 0,
          ctrlKey: false,
        });
      }
      const pasteTarget =
        target === "page"
          ? document.body
          : target === "title"
            ? title
            : target === "preview"
              ? screen.getByRole("heading", { name: article.title })
              : body;
      expect(fireEvent.paste(pasteTarget, { clipboardData })).toBe(false);
      expect(title.value).toBe("A replacement");
      expect(body.value).toBe("A different body.");
      expect(
        screen
          .getByRole("tab", { name: "Write" })
          .getAttribute("aria-selected"),
      ).toBe("true");
      expect(document.activeElement).toBe(body);
      await waitFor(() =>
        expect(JSON.parse(localStorage.getItem("swiz-cms:draft:v1")!)).toEqual({
          title: "A replacement",
          body: "A different body.",
        }),
      );
      if (target === "page")
        fireEvent.keyDown(body, { key: "z", metaKey: true });
      else fireEvent.click(screen.getByRole("button", { name: "Undo" }));
      expect(title.value).toBe(article.title);
      expect(body.value).toBe(article.body);
      await waitFor(() =>
        expect(JSON.parse(localStorage.getItem("swiz-cms:draft:v1")!)).toEqual(
          article,
        ),
      );
    },
  );
  it.each([
    "A paragraph to insert.",
    "## A section\n\nMore text.",
    "# A heading on its own",
    "```md\n# Example\n```",
  ])("leaves snippet paste to the editor: %s", (snippet) => {
    localStorage.setItem("swiz-cms:draft:v1", JSON.stringify(article));
    render(<Workspace />);
    const body = screen.getByLabelText("Body") as HTMLTextAreaElement;
    body.setSelectionRange(5, 5);
    expect(
      fireEvent.paste(body, { clipboardData: { getData: () => snippet } }),
    ).toBe(true);
    expect(body.value).toBe(article.body);
    expect((screen.getByLabelText("Title") as HTMLTextAreaElement).value).toBe(
      article.title,
    );
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });
  it("does not import articles pasted into tool fields or hijack undo after editing", () => {
    localStorage.setItem("swiz-cms:draft:v1", JSON.stringify(article));
    render(<Workspace />);
    const clipboardData = {
      getData: () => "# Another article\n\nA full body.",
    };
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Publish" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(
      fireEvent.paste(screen.getByLabelText("Description"), { clipboardData }),
    ).toBe(true);
    const body = screen.getByLabelText("Body") as HTMLTextAreaElement;
    expect(body.value).toBe(article.body);
    fireEvent.paste(body, { clipboardData });
    expect(
      fireEvent.keyDown(screen.getByLabelText("Description"), {
        key: "z",
        metaKey: true,
      }),
    ).toBe(true);
    expect(body.value).toBe("A full body.");
    fireEvent.change(body, { target: { value: "A revised body." } });
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    expect(fireEvent.keyDown(body, { key: "z", metaKey: true })).toBe(true);
    expect(body.value).toBe("A revised body.");
  });
  it.each([
    { markdown: `# ${"x".repeat(251)}\n\nA body.`, limit: "250" },
    { markdown: `# A title\n\n${"x".repeat(100_001)}`, limit: "100,000" },
  ])(
    "keeps the existing draft when an import exceeds $limit characters",
    ({ markdown, limit }) => {
      localStorage.setItem("swiz-cms:draft:v1", JSON.stringify(article));
      render(<Workspace />);
      const body = screen.getByLabelText("Body") as HTMLTextAreaElement;
      body.setSelectionRange(5, 5);
      expect(
        fireEvent.paste(body, {
          clipboardData: { getData: () => markdown },
        }),
      ).toBe(false);
      expect(screen.getByRole("alert").textContent).toContain(
        `longer than ${limit} characters`,
      );
      expect(body.value).toBe(article.body);
      expect(
        (screen.getByLabelText("Title") as HTMLTextAreaElement).value,
      ).toBe(article.title);
    },
  );
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
  it("keeps feedback when pasting revisions, sends the latest draft, and can still start over", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        reply("Give the ownership idea an example.", "first"),
      )
      .mockResolvedValueOnce(reply("Show one ambiguous handoff.", "second"))
      .mockResolvedValueOnce(reply("This example is clearer.", "third"))
      .mockResolvedValueOnce(
        reply("The ending now supports the point.", "fourth"),
      )
      .mockResolvedValueOnce(reply("Here is a fresh review.", "fifth"));
    vi.stubGlobal("fetch", fetch);
    localStorage.setItem("swiz-cms:draft:v1", JSON.stringify(article));
    render(<Workspace />);
    fireEvent.click(screen.getByRole("button", { name: /Get feedback/ }));
    await screen.findByText("Give the ownership idea an example.");
    fireEvent.change(screen.getByLabelText("Keep the conversation going"), {
      target: { value: "Which example?" },
    });
    const followUp = screen.getByLabelText("Keep the conversation going");
    expect(fireEvent.keyDown(followUp, { key: "Enter" })).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: /Ask Astra/ }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    fireEvent.keyDown(followUp, { key: "Enter", metaKey: true });
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
    const revised = {
      title: "Ownership in practice",
      body: "A specific handoff example.",
    };
    fireEvent.paste(screen.getByLabelText("Body"), {
      clipboardData: { getData: () => `# ${revised.title}\n\n${revised.body}` },
    });
    expect(screen.getByText(/Draft updated/)).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "How about now?" }));
    await screen.findByText("This example is clearer.");
    const revision = JSON.parse(fetch.mock.calls[2][1].body);
    expect(revision.messages).toHaveLength(5);
    expect(revision.messages.slice(0, 3)).toEqual(request.messages);
    expect(revision.messages[4].metadata).toEqual({
      draft: revised,
      question: "how about now",
    });
    expect(revision.messages[4].parts[0].text).toBe(
      "how about now\n\nUpdated draft:\n\nOwnership in practice\n\nA specific handoff example.",
    );
    expect(
      screen.getByText("Give the ownership idea an example."),
    ).toBeTruthy();
    expect(screen.queryByText(/Draft updated/)).toBeNull();
    const snapshot = screen
      .getByText(`Updated draft · ${revised.title}`)
      .closest("details")!;
    expect(snapshot.open).toBe(false);
    expect(snapshot.querySelector("pre")?.textContent).toBe(revised.body);

    const latestBody = `${revised.body}\n\nAn ending about shared responsibility.`;
    fireEvent.change(screen.getByLabelText("Body"), {
      target: { value: latestBody },
    });
    fireEvent.change(followUp, {
      target: { value: "Does the ending work now?" },
    });
    fireEvent.keyDown(followUp, { key: "Enter", ctrlKey: true });
    await screen.findByText("The ending now supports the point.");
    const nextRevision = JSON.parse(fetch.mock.calls[3][1].body);
    expect(nextRevision.messages).toHaveLength(7);
    expect(nextRevision.messages[6].metadata).toEqual({
      draft: { ...revised, body: latestBody },
      question: "Does the ending work now?",
    });
    expect(nextRevision.messages[6].parts[0].text).toContain(latestBody);
    expect(snapshot.querySelector("pre")?.textContent).toBe(revised.body);
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
    await screen.findByText("Here is a fresh review.");
    const fresh = JSON.parse(fetch.mock.calls[4][1].body);
    expect(fresh.messages).toHaveLength(1);
    expect(fresh.messages[0].parts[0].text).toContain(latestBody);
    expect(
      screen.queryByText("Give the ownership idea an example."),
    ).toBeNull();
  });
  it("retries the submitted revision while keeping newer edits ready for the next message", async () => {
    let failRevision!: (response: Response) => void;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply("Add a concrete example.", "first"))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            failRevision = resolve;
          }),
      )
      .mockResolvedValueOnce(reply("The example helps.", "retry"))
      .mockResolvedValueOnce(reply("The new ending helps too.", "latest"))
      .mockResolvedValueOnce(reply("Yes, keep it.", "follow-up"));
    vi.stubGlobal("fetch", fetch);
    const { rerender } = render(<FeedbackPanel article={article} />);
    fireEvent.click(screen.getByRole("button", { name: /Get feedback/ }));
    await screen.findByText("Add a concrete example.");
    const submitted = { ...article, body: "An example of shared ownership." };
    rerender(<FeedbackPanel article={submitted} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "How about now?" }),
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const latest = { ...submitted, body: "An example with a better ending." };
    rerender(<FeedbackPanel article={latest} />);
    expect(screen.getByRole("button", { name: "Stop response" })).toBeTruthy();
    expect(screen.getByText(/Draft updated/)).toBeTruthy();
    failRevision(Response.json({ error: "Please retry." }, { status: 502 }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Retry response" }));
    await screen.findByText("The example helps.");
    expect(JSON.parse(fetch.mock.calls[2][1].body).messages).toEqual(
      JSON.parse(fetch.mock.calls[1][1].body).messages,
    );
    expect(screen.getByText(/Draft updated/)).toBeTruthy();
    fireEvent.click(
      await screen.findByRole("button", { name: "How about now?" }),
    );
    await screen.findByText("The new ending helps too.");
    const sent = JSON.parse(fetch.mock.calls[3][1].body).messages;
    expect(sent.at(-1).metadata.draft).toEqual(latest);
    expect(sent[2].metadata.draft).toEqual(submitted);
    expect(screen.queryByText(/Draft updated/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Keep the conversation going"), {
      target: { value: "Should I keep the ending?" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Ask Astra/ }));
    await screen.findByText("Yes, keep it.");
    const followUp = JSON.parse(fetch.mock.calls[4][1].body).messages.at(-1);
    expect(followUp.metadata).toBeUndefined();
    expect(followUp.parts).toEqual([
      { type: "text", text: "Should I keep the ending?" },
    ]);
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
    expect(
      fireEvent.paste(screen.getByLabelText("Keep the conversation going"), {
        clipboardData: { getData: () => "# A quote\n\nA quoted article." },
      }),
    ).toBe(true);
    expect((screen.getByLabelText("Body") as HTMLTextAreaElement).value).toBe(
      article.body,
    );
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
