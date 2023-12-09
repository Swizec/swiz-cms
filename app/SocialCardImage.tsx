import Card from "@mui/joy/Card";
import Typography from "@mui/joy/Typography";
import AspectRatio from "@mui/joy/AspectRatio";
import { FC } from "react";

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

export const SocialCardImage: FC<{ title: string }> = async ({ title }) => {
    const socialCard = await fetchSocialCard(title);

    return (
        <Card>
            <Typography level="title-lg">
                Right click save image into /img
            </Typography>{" "}
            <AspectRatio objectFit="contain">
                <img src={socialCard.url} />
            </AspectRatio>
        </Card>
    );
};
