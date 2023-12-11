import Card from "@mui/joy/Card";
import Skeleton from "@mui/joy/Skeleton";
import Typography from "@mui/joy/Typography";
import { format } from "date-fns";
import { FC, Suspense } from "react";
import { fetchSocialCard } from "./SocialCard";
import { CopyableCard } from "../components/CopyableCard";
import { createDescription } from "../aistuff/createDescription";

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

const Loading = () => (
    <Card>
        <Skeleton variant="text" level="title-lg" />
        <Skeleton variant="text" level="body-md" />
        <Skeleton variant="text" level="body-md" />
        <Skeleton variant="text" level="body-md" />
    </Card>
);

export const Frontmatter: FC<{ title: string; markdown: string }> = ({
    title,
    markdown,
}) => {
    return (
        <Suspense fallback={<Loading />}>
            <CopyableCard title="Copy into ./index.mdx to set meta data">
                <FrontmatterContent title={title} markdown={markdown} />
            </CopyableCard>
        </Suspense>
    );
};
