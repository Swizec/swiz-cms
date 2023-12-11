import { Configuration, OpenAIApi } from "openai";
import { createTwitterThread } from "../../aistuff/createTwitterThread";

const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
);

export default async (req, res) => {
    const { title, content } = req.body;

    const thread = await createTwitterThread(title, content);

    res.status(200).send(thread.join("\n\n"));
};
