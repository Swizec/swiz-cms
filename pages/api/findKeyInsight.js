import { Configuration, OpenAIApi } from "openai";
import { cleanArticle } from "./_cleanArticle";

const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
);

export default async (req, res) => {
    const { content } = req.body;

    const cleanContent = await cleanArticle(content);

    const insight1 = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `What is the most surprising insight in this article: ${cleanContent}`,
        temperature: 0.6,
        max_tokens: 800,
    });

    const insight2 = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `Turn this description into a viral tweet: ${insight1.data.choices[0].text.trim()}`,
        temperature: 0.6,
        max_tokens: 800,
    });

    res.status(200).send(
        [
            insight1.data.choices[0].text.trim(),
            insight2.data.choices[0].text.trim(),
        ].join("\n\n")
    );
};
