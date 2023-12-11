import { getKeyInsight } from "../../aistuff/getKeyInsight";

export default async (req, res) => {
    const { title, content } = req.body;
    const insight = await getKeyInsight(title, content);

    res.status(200).send(insight.join("\n\n"));
};
