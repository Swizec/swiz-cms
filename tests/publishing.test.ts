import { describe, expect, it } from "vitest";
import {
  articleFile,
  articlePath,
  frontmatter,
  scaffoldCommand,
} from "../lib/publishing";
import {
  descriptionCandidates,
  selectedDescription,
} from "../lib/server/description";
import { emptyMetadata } from "../lib/metadata";

describe("publishing output", () => {
  it("writes pages paths and quotes titles and descriptions safely", () => {
    const article = {
      title: 'What "scale" means: a story',
      body: "The original **Markdown** body.\n\n```js\nconst x = 1;\n```",
    };
    const metadata = {
      description: 'A quote: "yes".\nA new line.',
      categories: ["AI", "Senior Mindset"] as const,
      contentUpgrade: "SeniorMindset" as const,
    };
    const output = articleFile(
      article,
      { ...metadata, categories: [...metadata.categories] },
      "2026-11-14",
    );
    expect(output).toContain(`title: ${JSON.stringify(article.title)}`);
    expect(output).toContain(
      `description: ${JSON.stringify(metadata.description)}`,
    );
    expect(output).toContain('categories: "AI, Senior Mindset"');
    expect(output).toContain("content_upgrade: SeniorMindset\n---");
    expect(output).toContain(`\n\n${article.body}\n`);
    expect(scaffoldCommand(article.title)).toContain(
      "pages/blog/what-scale-means-a-story/index.mdx",
    );
    expect(scaffoldCommand(article.title)).not.toContain("src/");
  });
  it("omits a content upgrade when none is selected", () => {
    expect(
      frontmatter(
        { title: "A walk", body: "Outside" },
        emptyMetadata,
        "2026-11-14",
      ),
    ).not.toContain("content_upgrade");
  });
  it("keeps terminal commands safe and never writes over existing article contents", () => {
    const command = scaffoldCommand("Hello'; $(touch /tmp/evil) `whoami`");
    expect(command).not.toContain("$(");
    expect(command).not.toContain("`");
    expect(command).not.toContain(">");
    expect(command).toMatch(/mkdir -p 'pages\/blog\/[a-z0-9-]+\/img'/);
    expect(articlePath("!!!")).toBeNull();
    expect(scaffoldCommand("!!!")).toBe("");
  });
  it("selects actual prose without Markdown URLs or code", async () => {
    const candidates = await descriptionCandidates(
      "# A heading\n\nWe [build systems](https://example.com) for people. **Coordination** is the bottleneck.\n\n```js\nconst secret = true;\n```",
    );
    expect(candidates).toContain("We build systems for people.");
    expect(candidates).toContain("Coordination is the bottleneck.");
    expect(candidates.join(" ")).not.toContain("https://");
    expect(candidates.join(" ")).not.toContain("const secret");
    const first = candidates.indexOf("We build systems for people.");
    const second = candidates.indexOf("Coordination is the bottleneck.");
    expect(selectedDescription(candidates, [second, first])).toBe(
      "We build systems for people. Coordination is the bottleneck.",
    );
    expect(() => selectedDescription(candidates, [999])).toThrow();
  });
});
