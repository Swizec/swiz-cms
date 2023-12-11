import Card from "@mui/joy/Card";
import Skeleton from "@mui/joy/Skeleton";
import Typography from "@mui/joy/Typography";
import { FC, Suspense } from "react";
import { createTwitterThread } from "../aistuff/createTwitterThread";
import { CopyableCard } from "../components/CopyableCard";
import Box from "@mui/joy/Box";

const Loading = () => (
    <Card>
        <Typography level="title-lg">A possible twitter thread</Typography>
        <Skeleton variant="rectangular" height={350} />
    </Card>
);

const TwitterThreadContent: FC<{ title: string; markdown: string }> = async ({
    title,
    markdown,
}) => {
    const thread = await createTwitterThread(title, markdown);

    return (
        <Typography level="body-sm">
            {thread.map((tweet, i) => (
                <Typography key={i}>
                    {tweet}
                    <br />
                    <br />
                </Typography>
            ))}
        </Typography>
    );
};

export const TwitterThread: FC<{ title: string; markdown: string }> = ({
    title,
    markdown,
}) => {
    return (
        <Suspense fallback={<Loading />}>
            <CopyableCard title="A possible twitter thread" variant="plain">
                <TwitterThreadContent title={title} markdown={markdown} />
            </CopyableCard>
        </Suspense>
    );
};
