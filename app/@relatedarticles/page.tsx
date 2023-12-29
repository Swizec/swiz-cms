import Card from "@mui/joy/Card";
import LZString from "lz-string";
import { FC } from "react";
import { sql } from "@vercel/postgres";
import { getArticleEmbedding } from "../../aistuff/getArticleEmbedding";
import Typography from "@mui/joy/Typography";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import Link from "@mui/joy/Link";
import slugify from "@sindresorhus/slugify";

const RelatedArticlesList: FC<{ title: string; content: string }> = async ({
    title,
    content,
}) => {
    const embedding = await getArticleEmbedding(content);
    const url = `/blog/${slugify(title)}/`;

    const { rows } = await sql<{
        url: string;
        title: string;
        published_date: Date;
    }>`select url, title, published_date from article_embeddings where url <> ${url} order by embedding <-> ${JSON.stringify(
        embedding
    )} asc, published_date desc limit 5`;

    return (
        <Card>
            <Typography level="title-lg">Related articles</Typography>
            <List>
                {rows.map((row) => (
                    <ListItem>
                        <Link
                            href={`https://swizec.com${row.url}`}
                            target="_blank"
                        >
                            {row.title}
                        </Link>
                    </ListItem>
                ))}
            </List>
        </Card>
    );
};

export default function RelatedArticles({ searchParams }) {
    let { title, markdown } = searchParams as {
        title?: string;
        markdown?: string;
    };

    markdown = markdown && LZString.decompressFromEncodedURIComponent(markdown);

    if (title && markdown) {
        return <RelatedArticlesList title={title} content={markdown} />;
    } else {
        return null;
    }
}
