import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, validateUIMessages } from "ai";
import { z } from "zod";
import { FEEDBACK_MODEL } from "../../../lib/models";
import {
  ConfigurationError,
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
    const validated = await validateUIMessages({ messages });
    const result = streamText({
      model: openai.responses(FEEDBACK_MODEL),
      messages: await convertToModelMessages(validated),
      providerOptions: { openai: { reasoningEffort: "high", store: false } },
      abortSignal: request.signal,
      onError: () => {}, // Return a safe, useful error through the UI stream below.
    });
    return result.toUIMessageStreamResponse({
      sendReasoning: false,
      onError: errorMessage,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
