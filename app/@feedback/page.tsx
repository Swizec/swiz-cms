import Card from "@mui/joy/Card";
import Skeleton from "@mui/joy/Skeleton";
import Typography from "@mui/joy/Typography";
import { FC, Suspense } from "react";
import Box from "@mui/joy/Box";
import CardContent from "@mui/joy/CardContent";
import Markdown from "react-markdown";
import { OpenAIStream } from "ai";
import { getKeyInsight } from "../../aistuff/getKeyInsight";
import { CopyableCard } from "../../components/CopyableCard";
import { askForFeedback } from "../../aistuff/askForFeedback";

const Loading: FC<{ title: string }> = ({ title }) => (
    <Card>
        <CardContent>
            <Typography level="title-lg">{title}</Typography>
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
        <Card>
            <CardContent>
                <Box pb={2}>
                    <Typography level="title-lg">
                        Did you make a point?
                    </Typography>
                    <Typography level="body-sm">{insight[0]}</Typography>
                </Box>

                <CopyableCard
                    title="Key insight as a shareable tweet"
                    variant="outlined"
                >
                    <Typography level="body-md">{insight[1]}</Typography>
                </CopyableCard>
            </CardContent>
        </Card>
    );
};

async function Reader({
    reader,
}: {
    reader: ReadableStreamDefaultReader<any>;
}) {
    const { done, value } = await reader.read();

    if (done) {
        return null;
    }

    const text = new TextDecoder().decode(value);

    return (
        <span>
            {text}
            <Suspense>
                <Reader reader={reader} />
            </Suspense>
        </span>
    );
}

const Improvements: FC<{ title: string; markdown: string }> = async ({
    title,
    markdown,
}) => {
    const feedback = await askForFeedback(title, markdown);
    const stream = OpenAIStream(feedback);

    return (
        <Card>
            <CardContent>
                <Box pb={2}>
                    <Typography level="title-lg">
                        What can be improved?
                    </Typography>

                    <Reader reader={stream.getReader()} />
                    {/* <Markdown>{feedback}</Markdown> */}
                </Box>
            </CardContent>
        </Card>
    );
};

export default function Feedback({
    // title,
    // markdown,
    searchParams,
}) {
    const { title, markdown } = searchParams as {
        title?: string;
        markdown?: string;
    };

    if (title && markdown) {
        return (
            <>
                <Suspense fallback={<Loading title="Did you make a point?" />}>
                    <KeyInsight title={title} markdown={markdown} />
                </Suspense>
                <Suspense fallback={<Loading title="What can be improved?" />}>
                    <Improvements title={title} markdown={markdown} />
                </Suspense>
            </>
        );
    } else {
        return null;
    }
}
