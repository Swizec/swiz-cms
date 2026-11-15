import { cleanArticle } from "./_cleanArticle";
import { getOpenAI } from "../lib/openai";
import { EMBEDDING_MODEL } from "../lib/models";

export async function getArticleEmbedding(content: string): Promise<number[]> {
    const cleanContent = await cleanArticle(content);

    const res = await getOpenAI().embeddings.create({
        input: cleanContent.toString(),
        model: EMBEDDING_MODEL,
    });

    return res.data[0].embedding;
}
