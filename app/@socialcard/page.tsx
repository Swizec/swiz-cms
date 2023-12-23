import Card from "@mui/joy/Card";
import Typography from "@mui/joy/Typography";
import AspectRatio from "@mui/joy/AspectRatio";
import { FC } from "react";
import { fetchSocialCard } from "./fetchSocialCard";

const SocialCardImage: FC<{ title: string }> = async ({ title }) => {
    const socialCard = await fetchSocialCard(title);

    return (
        <Card>
            <Typography level="title-lg">
                Right click save image into /img
            </Typography>{" "}
            <AspectRatio objectFit="contain" maxHeight={300}>
                <img src={socialCard.url} />
            </AspectRatio>
        </Card>
    );
};

export default function SocialCard({ searchParams }) {
    const { title } = searchParams as { title?: string };

    if (title) {
        return <SocialCardImage title={title} />;
    } else {
        return null;
    }
}
