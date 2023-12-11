import { Configuration, OpenAIApi } from "openai";
import { createDescription } from "../../aistuff/createDescription";

export default async (req, res) => {
    const { title, content } = req.body;

    try {
        const result = await createDescription(title, content);

        res.status(200).send(result);
    } catch (e) {
        res.status(200).send(e.message);
    }
};
