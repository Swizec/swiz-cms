import { Configuration, OpenAIApi } from "openai";
import { cleanArticle } from "../../aistuff/_cleanArticle";

const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
);

export default async (req, res) => {
    const { content, title } = req.body;

    const cleanContent = await cleanArticle(content);

    let messages = [
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

    res.status(200).send(
        [
            insight1.data.choices[0].message.content.trim(),
            insight2.data.choices[0].message.content.trim(),
        ].join("\n\n")
    );
};
