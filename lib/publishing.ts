import slugify from "@sindresorhus/slugify";
import type { Article } from "./article";
import type { PublishingMetadata } from "./metadata";

export function articlePath(title: string) {
  const slug = slugify(title).slice(0, 120).replace(/-+$/, "");
  return slug ? `pages/blog/${slug}` : null;
}
export function scaffoldCommand(title: string) {
  const directory = articlePath(title);
  if (!directory) return "";
  return `cd ~/Documents/websites/swizec.com &&\nmkdir -p '${directory}/img' &&\ntouch '${directory}/index.mdx'`;
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function frontmatter(
  article: Article,
  metadata: PublishingMetadata,
  published: string,
) {
  // JSON string literals are valid quoted YAML scalars, including quotes and newlines.
  const lines = [
    "---",
    `title: ${JSON.stringify(article.title)}`,
    `description: ${JSON.stringify(metadata.description)}`,
    `published: ${published}`,
    `categories: ${JSON.stringify(metadata.categories.join(", "))}`,
  ];
  if (metadata.contentUpgrade)
    lines.push(`content_upgrade: ${metadata.contentUpgrade}`);
  return [...lines, "---"].join("\n");
}
export function articleFile(
  article: Article,
  metadata: PublishingMetadata,
  published: string,
) {
  return `${frontmatter(article, metadata, published)}\n\n${article.body}\n`;
}
