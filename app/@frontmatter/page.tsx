import Typography from "@mui/joy/Typography";
import { format } from "date-fns";
import { FC } from "react";
import LZString from "lz-string";
import { CopyableCard } from "../../components/CopyableCard";
import { createDescription } from "../../aistuff/createDescription";
import { fetchSocialCard } from "../@socialcard/fetchSocialCard";

export const runtime = "edge";

const FrontmatterContent: FC<{ title: string; markdown: string }> = async ({
    title,
    markdown,
}) => {
    const date = format(new Date(), "yyyy-MM-dd");
    const socialCard = await fetchSocialCard(title);
    const description = await createDescription(title, markdown);

    const heroURL = socialCard.url.split("/").pop();
    const frontmatter = `---
title: "${title}"
description: "${description}"
published: ${date}
hero: ./img/${heroURL}
---`;

    return (
        <pre style={{ whiteSpace: "pre-wrap" }}>
            <Typography
                level="body-md"
                sx={{
                    fontFamily: "monospace",
                }}
            >
                {frontmatter}
            </Typography>
        </pre>
    );
};

export default function Frontmatter({ searchParams }) {
    let { title, markdown } = searchParams as {
        title?: string;
        markdown?: string;
    };

    markdown = markdown && LZString.decompressFromEncodedURIComponent(markdown);

    if (title && markdown) {
        return (
            <CopyableCard title="Copy frontmatter into ./index.mdx to set meta data">
                <FrontmatterContent title={title} markdown={markdown} />
            </CopyableCard>
        );
    } else {
        return null;
    }
}
