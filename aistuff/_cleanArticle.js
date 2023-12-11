import { remark } from "remark";
import remarkStrip from "strip-markdown";
import { visit } from "unist-util-visit";

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

export async function cleanArticle(content) {
    return (
        remark()
            .use(remarkNameOrFriend)
            .use(remarkSparkJoy)
            // .use(remarkStrip)
            .process(content)
    );
}
