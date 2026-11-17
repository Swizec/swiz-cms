import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { WRITING_MODEL } from "../lib/models";

export async function createTwitterThread(title: string, content: string) {
  return streamText({
    model: openai.responses(WRITING_MODEL),
    providerOptions: { openai: { reasoningEffort: "low", store: false } },
    system: "Write a six-tweet thread summarizing this article in the author's style. Include insights for software engineers at startups.",
    prompt: `${title}\n\n${content}`,
  });
}
