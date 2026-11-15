import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { WRITING_MODEL } from "../lib/models";

export async function getKeyInsight(title: string, content: string): Promise<string[]> {
  const options = {
    model: openai.responses(WRITING_MODEL),
    providerOptions: { openai: { reasoningEffort: "low" as const, store: false } },
  };
  const insight = await generateText({
    ...options,
    prompt: `What is the core insight of this article?\n\n${title}\n\n${content}`,
  });
  const tweet = await generateText({
    ...options,
    prompt: `Turn this insight into a pithy tweet in the author's voice:\n\n${insight.text}`,
  });
  return [insight.text.trim(), tweet.text.trim()];
}
