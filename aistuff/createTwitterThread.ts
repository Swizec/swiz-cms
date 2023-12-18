import OpenAI from "openai";
import { cleanArticle } from "./_cleanArticle";
import { ChatCompletionMessageParam } from "openai/resources";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function createTwitterThread(title: string, content: string) {
    const cleanContent = await cleanArticle(content);

    const messages: ChatCompletionMessageParam[] = [
        {
            role: "system",
            content:
                "You are a Swizec's assistant. He wrote a new article and needs to write a twitter thread to share the key insights",
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
                "Write a twitter thread summarizing this article in 6 tweets. Write in the style of Swizec Teller. Make sure to include key insights that would appeal to software engineers in the startup space.",
        },
    ];

    const threadCompletion = await openai.chat.completions.create({
        model: "gpt-4",
        messages,
        temperature: 0.6,
        max_tokens: 800,
        stream: true,
    });

    return threadCompletion;

    // if (!threadCompletion.choices[0].message.content) {
    //     throw new Error("something went wrong");
    // }

    // const thread = threadCompletion.choices[0].message.content
    //     .trim()
    //     .split("\n")
    //     .filter((t) => t.trim().length > 0);

    // return thread
    //     .map((t) =>
    //         t
    //             .trim()
    //             .replace(/^\d+\W\d*/, "")
    //             .replace(/^[\s\W]+/, "")
    //             .trim()
    //     )
    //     .map((t, i) => `${i + 1}. ${t}`);
}
