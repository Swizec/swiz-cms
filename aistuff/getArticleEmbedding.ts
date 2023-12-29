import OpenAI from "openai";
import { cleanArticle } from "./_cleanArticle";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function getArticleEmbedding(content: string): Promise<number[]> {
    const cleanContent = await cleanArticle(content);

    const res = await openai.embeddings.create({
        input: cleanContent.toString(),
        model: "text-embedding-ada-002",
    });

    return res.data[0].embedding;
}
