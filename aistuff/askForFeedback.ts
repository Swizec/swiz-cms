import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { FEEDBACK_MODEL } from "../lib/models";

export async function askForFeedback(title: string, content: string) {
  return streamText({
    model: openai.responses(FEEDBACK_MODEL),
    providerOptions: { openai: { reasoningEffort: "high", store: false } },
    prompt: `what do you think about this\n\n${title}\n\n${content}`,
  });
}
