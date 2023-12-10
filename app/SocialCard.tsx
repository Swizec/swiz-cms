import Card from "@mui/joy/Card";
import Typography from "@mui/joy/Typography";
import AspectRatio from "@mui/joy/AspectRatio";
import Skeleton from "@mui/joy/Skeleton";
import { FC, Suspense } from "react";

async function fetchSocialCard(
    title: string
): Promise<{ status: string; url: string }> {
    const res = await fetch(
        `https://pifc233qp6.execute-api.us-east-1.amazonaws.com/dev/social-card?title=${title}`,
        { cache: "force-cache" }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch image");
    }

    return res.json();
}

const SocialCardImage: FC<{ title: string }> = async ({ title }) => {
    const socialCard = await fetchSocialCard(title);

    return (
        <Card>
            <Typography level="title-lg">
                Right click save image into /img
            </Typography>{" "}
            <AspectRatio objectFit="contain" minHeight={400}>
                <img src={socialCard.url} />
            </AspectRatio>
        </Card>
    );
};

const Loading = () => (
    <Card>
        <Skeleton variant="text" level="title-lg" />
        <AspectRatio minHeight={400}>
            <Skeleton />
        </AspectRatio>
    </Card>
);

export const SocialCard: FC<{ title: string }> = async ({ title }) => {
    return (
        <Suspense fallback={<Loading />}>
            <SocialCardImage title={title} />
        </Suspense>
    );
};
