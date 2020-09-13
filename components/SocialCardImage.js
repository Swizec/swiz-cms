import { useQuery } from "react-query";
import { Image, Spinner } from "theme-ui";

async function fetchSocialCard(key, title) {
    if (title) {
        const res = await fetch(
            `https://pifc233qp6.execute-api.us-east-1.amazonaws.com/dev/social-card?title=${title}`
        );

        return res.json();
    } else {
        return null;
    }
}

export function useSocialCardQuery(title) {
    return useQuery(["social-card", title], fetchSocialCard, {
        staleTime: 5000,
    });
}

export const SocialCardImage = ({ title }) => {
    const cardQuery = useSocialCardQuery(title);

    if (cardQuery.isLoading) {
        return <Spinner />;
    }

    return <Image src={cardQuery.data.url} />;
};
