import Card from "@mui/joy/Card";
import Skeleton from "@mui/joy/Skeleton";
import Typography from "@mui/joy/Typography";
import { FC, Suspense } from "react";
import { createTwitterThread } from "../aistuff/createTwitterThread";
import { CopyableCard } from "../components/CopyableCard";
import Box from "@mui/joy/Box";
import CardContent from "@mui/joy/CardContent";
import { getKeyInsight } from "../aistuff/getKeyInsight";
import Stack from "@mui/joy/Stack";

const Loading = () => (
    <Card>
        <CardContent>
            <Typography level="title-lg">Did you make a point?</Typography>
            <Skeleton level="body-md" variant="text" width="92%" />
            <Skeleton level="body-md" variant="text" width="99%" />
            <Skeleton level="body-md" variant="text" width="96%" />
        </CardContent>
    </Card>
);

const KeyInsight: FC<{ title: string; markdown: string }> = async ({
    title,
    markdown,
}) => {
    const insight = await getKeyInsight(title, markdown);

    return (
        <>
            <Box pb={2}>
                <Typography level="title-lg">Did you make a point?</Typography>
                <Typography level="body-sm">{insight[0]}</Typography>
            </Box>
            <CopyableCard
                title="Key insight as a shareable tweet"
                variant="outlined"
            >
                <Typography level="body-md">{insight[1]}</Typography>
            </CopyableCard>
        </>
    );
};

export const Feedback: FC<{ title: string; markdown: string }> = ({
    title,
    markdown,
}) => {
    return (
        <Suspense fallback={<Loading />}>
            <Card>
                <CardContent>
                    <KeyInsight title={title} markdown={markdown} />
                </CardContent>
            </Card>
        </Suspense>
    );
};
