import { describe, expect, it } from "vitest";
import { articleFromMarkdown } from "../lib/markdown-import";

describe("Markdown article import", () => {
  it("extracts a formatted main title and preserves the rest of the Markdown", () => {
    const body =
      "An **actual** paragraph.\n\n## A section\n\n```md\n# This is code\n```\n\n[An example](https://example.com)\n";
    expect(
      articleFromMarkdown(
        `\n\n# A **bold** [idea](https://example.com) with \`code\` ###\n\n${body}`,
      ),
    ).toEqual({ title: "A bold idea with code", body });
  });
  it("supports underlined titles and preserves CRLF and indented code", () => {
    expect(
      articleFromMarkdown(
        "A good title\r\n============\r\n\r\n    indented code\r\n\r\nThe ending.\r\n",
      ),
    ).toEqual({
      title: "A good title",
      body: "    indented code\r\n\r\nThe ending.\r\n",
    });
  });
  it.each([
    "## A section\n\nBody",
    "```md\n# An example heading\n```\n\nBody",
    "> # A quoted heading\n\nBody",
    "An opening paragraph.\n\n# A later heading",
    "#not-a-heading\n\nBody",
    "#\n\nBody",
    "# Just a heading",
    "# Just a heading\n\n  \n",
    "A heading\n=========\n",
  ])("leaves non-title Markdown alone: %s", (markdown) => {
    expect(articleFromMarkdown(markdown)).toBeNull();
  });
});
