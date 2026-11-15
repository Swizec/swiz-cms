import { z } from "zod";

export const MAX_BODY_LENGTH = 100_000;
export const draftSchema = z.object({
  title: z.string().max(250),
  body: z.string().max(MAX_BODY_LENGTH),
});
export const articleSchema = draftSchema.extend({
  title: z.string().trim().min(1, "Add a title first.").max(250),
  body: z
    .string()
    .max(MAX_BODY_LENGTH)
    .refine((body) => body.trim().length > 0, "Add your article first."),
});
export type Article = z.infer<typeof draftSchema>;
export type RelatedArticle = {
  title: string;
  url: string;
  published: string | null;
};
export const emptyDraft: Article = { title: "", body: "" };
export const sameArticle = (a: Article | null, b: Article) =>
  a?.title === b.title && a.body === b.body;
export const feedbackPrompt = ({ title, body }: Article) =>
  `what do you think about this\n\n${title}\n\n${body}`;
