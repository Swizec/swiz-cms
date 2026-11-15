import { remark } from "remark";
import { toString } from "mdast-util-to-string";
import type { Article } from "./article";

const markdownParser = remark();

export function articleFromMarkdown(markdown: string): Article | null {
  const heading = markdownParser.parse(markdown).children[0];
  if (heading?.type !== "heading" || heading.depth !== 1) return null;
  const end = heading.position?.end.offset;
  const title = toString(heading, { includeHtml: false }).trim();
  if (end === undefined || !title) return null;
  const body = markdown.slice(end).replace(/^(?:[\t ]*\r?\n)+/, "");
  // A heading on its own is a snippet, not a replacement article.
  if (!body.trim()) return null;
  return {
    title,
    // Remove only the heading and its separator. Keep the remaining Markdown
    // verbatim, including indentation, code fences, links, and line endings.
    body,
  };
}
