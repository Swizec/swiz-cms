import { Configuration, OpenAIApi } from "openai";
import { cleanArticle } from "./_cleanArticle";

const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
);

export default async (req, res) => {
    const { title, content } = req.body;

    const cleanContent = await cleanArticle(content);

    const threadCompletion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `You are a blogger promoting their latest article on twitter. The title is "${title}". Write an engaging twitter thread summarizing the following article in 6 numbered tweets using a similar writing style as the article: ${cleanContent}`,
        temperature: 0.6,
        max_tokens: 800,
        best_of: 2,
    });

    const thread = threadCompletion.data.choices[0].text
        .trim()
        .split("\n")
        .filter((t) => t.trim().length > 0);

    const hookCompletion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `You just wrote this twitter thread to share an article titled "${title}". Rewrite the first tweet to work as a viral hook: ${thread.join(
            "\n\n"
        )}`,
        temperature: 0.6,
        max_tokens: 800,
    });

    const hook = hookCompletion.data.choices[0].text
        .trim()
        .replace(/^(Rewrite|Hook|Rewrite the first tweet|Revised tweet):/i, "")
        .trim();

    thread[0] = hook;

    res.status(200).send(
        thread
            .map((t) =>
                t
                    .trim()
                    .replace(/^\d+\W\d*/, "")
                    .trim()
            )
            .map((t, i) => `${i + 1}. ${t}`)
            .join("\n\n")
    );
};
