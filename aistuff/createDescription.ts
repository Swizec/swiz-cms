import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { cleanArticle } from "./_cleanArticle";

const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
);

export async function createDescription(title: string, content: string) {
    const cleanContent = await cleanArticle(content);

    const messages: ChatCompletionRequestMessage[] = [
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

    const completion = await openai.createChatCompletion({
        model: "gpt-4",
        messages,
        temperature: 0.6,
        max_tokens: 200,
    });

    if (!completion.data.choices[0].message) {
        throw new Error("something went wrong");
    }

    messages.push(completion.data.choices[0].message);
    messages.push({
        role: "user",
        content: "Shorten that to max 2 sentences",
    });

    const completion2 = await openai.createChatCompletion({
        model: "gpt-4",
        messages,
        temperature: 0.6,
        max_tokens: 200,
    });

    if (!completion2.data.choices[0].message) {
        throw new Error("something went wrong");
    }

    return completion2.data.choices[0].message.content.trim();
}
