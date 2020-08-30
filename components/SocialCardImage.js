import { useQuery } from "react-query";
import { Image, Spinner } from "theme-ui";

async function fetchSocialCard(key, title) {
    const res = await fetch(
        `https://pifc233qp6.execute-api.us-east-1.amazonaws.com/dev/social-card?title=${title}`
    );

    return res.json();
}

export const SocialCardImage = ({ title }) => {
    const cardQuery = useQuery(["social-card", title], fetchSocialCard);

    if (cardQuery.isLoading) {
        return <Spinner />;
    }

    return <Image src={cardQuery.data.url} />;
};
