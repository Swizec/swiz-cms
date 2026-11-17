import { ConfigurationError } from "./server/http";
import OpenAI from "openai";

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new ConfigurationError(
      "Set OPENAI_API_KEY in .env.local to enable AI features.",
    );
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
