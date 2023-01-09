import { Configuration, OpenAIApi } from "openai";

const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
);

export default async (req, res) => {
    const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `You are a blogger trying to promote their latest article to search engines. Write a description that summarizes the following article in 160 characters: ${req.body}`,
        temperature: 0.4,
        max_tokens: 50,
        best_of: 3,
    });

    res.status(200).send(completion.data.choices[0].text.trim());
};
