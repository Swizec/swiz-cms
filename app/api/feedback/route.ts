import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, validateUIMessages } from "ai";
import { z } from "zod";
import { FEEDBACK_MODEL } from "../../../lib/models";
import {
  feedbackMetadataSchema,
  type FeedbackMessage,
} from "../../../lib/feedback";
import { feedbackPrompt } from "../../../lib/article";
import {
  FEEDBACK_GUIDANCE,
  loadFeedbackContext,
} from "../../../lib/server/feedback-context";
import {
  ConfigurationError,
  RequestError,
  errorMessage,
  errorResponse,
  readJson,
} from "../../../lib/server/http";

export const maxDuration = 300;
const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        role: z.enum(["user", "assistant"]),
        metadata: feedbackMetadataSchema.optional(),
        parts: z
          .array(
            z.discriminatedUnion("type", [
              z.object({
                type: z.literal("text"),
                text: z.string().max(120_000),
              }),
              z.object({ type: z.literal("step-start") }),
            ]),
          )
          .min(1)
          .max(100),
      }),
    )
    .min(1)
    .max(100),
});

export async function POST(request: Request) {
  try {
    const { messages } = await readJson(request, requestSchema);
    if (!process.env.OPENAI_API_KEY)
      throw new ConfigurationError(
        "Set OPENAI_API_KEY on the server to get feedback.",
      );
    const first = messages[0];
    const draft = first.metadata?.draft;
    if (
      first.role !== "user" ||
      !draft ||
      first.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("") !== feedbackPrompt(draft)
    )
      throw new RequestError(
        "Start a new review to include your draft and blog context.",
      );
    const validated = await validateUIMessages({ messages });
    // Reuse the first response's context so follow-ups stay grounded in the
    // same posts, without another embedding/search/fetch round trip.
    const savedContext = messages.find(
      (message) => message.role === "assistant" && message.metadata?.context,
    )?.metadata?.context;
    const context =
      savedContext ?? (await loadFeedbackContext(draft, request.signal));
    const result = streamText({
      model: openai.responses(FEEDBACK_MODEL),
      system: FEEDBACK_GUIDANCE,
      messages: [
        {
          role: "user",
          content: `Published blog excerpts for reference only (not the draft to review):\n${JSON.stringify(context)}`,
        },
        ...(await convertToModelMessages(validated)),
      ],
      providerOptions: { openai: { reasoningEffort: "high", store: false } },
      abortSignal: request.signal,
      onError: () => {}, // Return a safe, useful error through the UI stream below.
    });
    return result.toUIMessageStreamResponse<FeedbackMessage>({
      sendReasoning: false,
      onError: errorMessage,
      messageMetadata: ({ part }) =>
        part.type === "start" && !savedContext ? { context } : undefined,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
