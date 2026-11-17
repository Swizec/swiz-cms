import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { WRITING_MODEL } from "../lib/models";

export async function createDescription(title: string, content: string) {
  const result = await generateText({
    model: openai.responses(WRITING_MODEL),
    providerOptions: { openai: { reasoningEffort: "low", store: false } },
    system: "Write a description of this article in at most two sentences. Preserve the author's voice and core insight. Return only the description.",
    prompt: `${title}\n\n${content}`,
  });
  if (!result.text.trim()) throw new Error("The model returned no description.");
  return result.text.trim();
}
