import Typography from "@mui/joy/Typography";
import { format } from "date-fns";
import { FC } from "react";
import { CopyableCard } from "../../components/CopyableCard";
import { createDescription } from "../../aistuff/createDescription";
import { fetchSocialCard } from "../@socialcard/fetchSocialCard";

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
    const { title, markdown } = searchParams as {
        title?: string;
        markdown?: string;
    };

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
