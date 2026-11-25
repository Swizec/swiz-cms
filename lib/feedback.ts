import type { UIMessage } from "ai";
import { z } from "zod";
import { articleSchema } from "./article";

export const feedbackContextSchema = z.object({
  articles: z
    .array(
      z.object({
        title: z.string().max(500),
        url: z.url().refine((value) => {
          const url = new URL(value);
          return (
            url.origin === "https://swizec.com" &&
            url.pathname.startsWith("/blog/")
          );
        }),
        published: z.string().max(10).nullable(),
        kind: z.enum(["related", "recent"]),
        excerpt: z.string().min(1).max(8_000),
        truncated: z.boolean(),
      }),
    )
    .max(5),
  incomplete: z.boolean(),
});
export const feedbackMetadataSchema = z.object({
  draft: articleSchema.optional(),
  question: z.string().trim().min(1).max(20_000).optional(),
  context: feedbackContextSchema.optional(),
});
export type FeedbackContext = z.infer<typeof feedbackContextSchema>;
export type FeedbackMessage = UIMessage<z.infer<typeof feedbackMetadataSchema>>;
