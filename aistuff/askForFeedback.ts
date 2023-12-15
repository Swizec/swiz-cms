import OpenAI from "openai";
import { cleanArticle } from "./_cleanArticle";
import { ChatCompletionMessageParam } from "openai/resources";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function askForFeedback(title: string, content: string) {
    const cleanContent = await cleanArticle(content);

    let messages: ChatCompletionMessageParam[] = [
        {
            role: "system",
            content:
                "You are a Swizec's editor. He wrote a new article and is looking for your feedback.",
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
                "Suggest editorial improvements I can make so the article delivers its core insight more clearly and better engages readers. Respond in short bullet points formatted as markdown",
        },
    ];

    const feedback = await openai.chat.completions.create({
        model: "gpt-4",
        messages,
        temperature: 0.6,
        max_tokens: 800,
        stream: true,
    });

    return feedback;
}
