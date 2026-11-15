import slugify from "@sindresorhus/slugify";
import type { Article } from "./article";

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
export function articleFile(
  article: Article,
  description: string,
  published: string,
) {
  // JSON string literals are valid quoted YAML scalars, including quotes and newlines.
  return `---\ntitle: ${JSON.stringify(article.title)}\ndescription: ${JSON.stringify(description)}\npublished: ${published}\n---\n\n${article.body}\n`;
}
