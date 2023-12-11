import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { cleanArticle } from "./_cleanArticle";

const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
);

export async function createTwitterThread(
    title: string,
    content: string
): string[] {
    const cleanContent = await cleanArticle(content);

    const messages: ChatCompletionRequestMessage[] = [
        {
            role: "system",
            content:
                "You are a blogger who just wrote a new article and needs to write a twitter thread to share the article",
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
                "Write a twitter thread summarizing this article in 6 tweets. It should deliver the key points and make people want to read the full article",
        },
    ];

    const threadCompletion = await openai.createChatCompletion({
        model: "gpt-4",
        messages,
        temperature: 0.6,
        max_tokens: 800,
    });

    if (!threadCompletion.data.choices[0].message) {
        throw new Error("something went wrong");
    }

    const thread = threadCompletion.data.choices[0].message.content
        .trim()
        .split("\n")
        .filter((t) => t.trim().length > 0);

    return thread
        .map((t) =>
            t
                .trim()
                .replace(/^\d+\W\d*/, "")
                .replace(/^[\s\W]+/, "")
                .trim()
        )
        .map((t, i) => `${i + 1}. ${t}`);
}
