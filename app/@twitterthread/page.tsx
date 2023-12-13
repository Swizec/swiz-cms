import Typography from "@mui/joy/Typography";
import { FC, Suspense } from "react";
import { createTwitterThread } from "../../aistuff/createTwitterThread";
import { CopyableCard } from "../../components/CopyableCard";

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

export default function TwitterThread({ searchParams }) {
    const { title, markdown } = searchParams as {
        title?: string;
        markdown?: string;
    };

    if (title && markdown) {
        return (
            <CopyableCard title="A possible twitter thread" variant="plain">
                <TwitterThreadContent title={title} markdown={markdown} />
            </CopyableCard>
        );
    } else {
        return null;
    }
}
