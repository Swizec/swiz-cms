import OpenAI from "openai";
import { cleanArticle } from "./_cleanArticle";
import { ChatCompletionMessageParam } from "openai/resources";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function createDescription(title: string, content: string) {
    const cleanContent = await cleanArticle(content);

    const messages: ChatCompletionMessageParam[] = [
        {
            role: "system",
            content: `You are a Swizec's assistant. He just wrote a new article and needs an SEO description to put in the CMS.`,
        },
        {
            role: "system",
            content: `The article's title is: ${title}`,
        },
        {
            role: "system",
            content: `The article's content is: ${cleanContent}`,
        },
        {
            role: "user",
            content:
                "Summarize the article in 2 sentences that pique a reader's curiosity to learn more. Write in the same style as the article as if you are the author. Include a key insight in your summary.",
        },
    ];

    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages,
        temperature: 0.6,
        max_tokens: 200,
    });

    if (!completion.choices[0]?.message) {
        throw new Error("something went wrong");
    }

    messages.push(completion.choices[0].message);
    messages.push({
        role: "user",
        content: "Shorten that to max 2 sentences",
    });

    const completion2 = await openai.chat.completions.create({
        model: "gpt-4",
        messages,
        temperature: 0.6,
        max_tokens: 200,
    });

    if (!completion2.choices[0]?.message?.content) {
        throw new Error("something went wrong");
    }

    return completion2.choices[0].message.content.trim();
}
