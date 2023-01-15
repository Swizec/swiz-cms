import { Configuration, OpenAIApi } from "openai";
import { remark } from "remark";
import remarkStrip from "strip-markdown";
import { visit } from "unist-util-visit";

const openai = new OpenAIApi(
    new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    })
);

function remarkNameOrFriend() {
    const nameOrFriend = /\[\s*name\s*\|(.*)\]/;
    return (tree) => {
        visit(tree, "text", (node, index, parent) => {
            if (node.value.match(nameOrFriend)) {
                node.value = node.value.replace(nameOrFriend, "");
            }
        });
    };
}

function remarkSparkJoy() {
    const sparkjoy = /\[\s*sparkjoy\s*\|(.*)\]/;
    return (tree) => {
        visit(tree, "text", (node, index, parent) => {
            if (node.value.match(sparkjoy)) {
                node.value = node.value.replace(sparkjoy, ``);
            }
        });
    };
}

export default async (req, res) => {
    const { title, content } = req.body;

    const cleanContent = await remark()
        .use(remarkNameOrFriend)
        .use(remarkSparkJoy)
        .use(remarkStrip)
        .process(content);

    const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `You are a blogger trying to promote their latest article on twitter. The title is "${title}". Write an engaging twitter thread summarizing the following article in 6 numbered tweets using a similar writing style as the article: ${cleanContent}`,
        temperature: 0.6,
        max_tokens: 800,
        best_of: 2,
    });

    res.status(200).send(completion.data.choices[0].text.trim());
};
