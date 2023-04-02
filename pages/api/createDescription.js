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

    const messages = [
        {
            role: "system",
            content: `You are a blogger who just wrote a new article and needs to write an SEO description to put in your CMS.`,
        },
        {
            role: "system",
            content: `The article's title is: ${title}`,
        },
        {
            role: "system",
            content: `The article's content is: ${cleanContent}`,
        },
        {
            role: "user",
            content:
                "Write a description for that article that inspires curiosity in your target audience and ranks well on search engines",
        },
    ];

    try {
        const completion = await openai.createChatCompletion({
            model: "gpt-4",
            messages,
            temperature: 0.6,
            max_tokens: 200,
        });

        messages.push(completion.data.choices[0].message);
        messages.push({
            role: "user",
            content: "Shorten that to max 2 sentences",
        });

        const completion2 = await openai.createChatCompletion({
            model: "gpt-4",
            messages,
            temperature: 0.6,
            max_tokens: 200,
        });

        res.status(200).send(
            completion2.data.choices[0].message.content.trim()
        );
    } catch (e) {
        res.status(200).send(e.message);
    }
};
