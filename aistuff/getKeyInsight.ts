import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { cleanArticle } from "./_cleanArticle";

const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
);

export async function getKeyInsight(
    title: string,
    content: string
): Promise<string[]> {
    const cleanContent = await cleanArticle(content);

    let messages: ChatCompletionRequestMessage[] = [
        {
            role: "system",
            content: `You just read an article titled ${title}`,
        },
        {
            role: "system",
            content: `The article content is: ${cleanContent}`,
        },
        {
            role: "user",
            content: "What is the core insight of that article?",
        },
    ];

    const insight1 = await openai.createChatCompletion({
        model: "gpt-4",
        messages,
        temperature: 0.6,
        max_tokens: 800,
    });

    if (!insight1.data.choices[0].message) {
        throw new Error("something went wrong");
    }

    messages.push(insight1.data.choices[0].message);
    messages.push({
        role: "user",
        content: "Turn that insight into a pithy tweet",
    });

    const insight2 = await openai.createChatCompletion({
        model: "gpt-4",
        messages,
        temperature: 0.6,
        max_tokens: 800,
    });

    if (!insight2.data.choices[0].message) {
        throw new Error("something went wrong");
    }

    return [
        insight1.data.choices[0].message.content.trim(),
        insight2.data.choices[0].message.content.trim(),
    ];
}
