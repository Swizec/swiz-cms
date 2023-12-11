import { getKeyInsight } from "../../aistuff/getKeyInsight";

export default async (req, res) => {
    const insight = getKeyInsight(title, content);

    res.status(200).send(insight.join("\n\n"));
};
