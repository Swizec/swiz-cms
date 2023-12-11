import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Link from "@mui/joy/Link";
import Skeleton from "@mui/joy/Skeleton";
import Snackbar from "@mui/joy/Snackbar";
import Typography from "@mui/joy/Typography";
import { format } from "date-fns";
import { FC, Suspense, useState } from "react";
import { fetchSocialCard } from "./SocialCard";
import { CopyableCard } from "../components/CopyableCard";

const FrontmatterContent: FC<{ title: string; markdown: string }> = async ({
    title,
    markdown,
}) => {
    const date = format(new Date(), "yyyy-MM-dd");
    const socialCard = await fetchSocialCard(title);

    const heroURL = socialCard.url.split("/").pop();
    const frontmatter = `---
title: "${title}"
published: ${date}
hero: ./img/${heroURL}
---`;

    async function copy() {
        // await navigator.clipboard.writeText(frontmatter);
        // setSnackbarOpen(true);
    }

    return (
        <pre>
            <Typography
                level="body-md"
                sx={{
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
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
