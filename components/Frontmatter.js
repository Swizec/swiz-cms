import { format } from "date-fns";
import { useQuery } from "react-query";
import { Box, Button, Spinner } from "theme-ui";

async function createDescription(title, content) {
    const res = await fetch("/api/createDescription", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            title,
            content,
        }),
    });

    if (!res.ok) {
        throw new Error("Failed to createDescription");
    }

    return res.text();
}

export const Frontmatter = ({ title, markdown, heroURL }) => {
    const date = format(new Date(), "yyyy-MM-dd");
    const heroName = heroURL?.split("/").pop();

    const {
        data: generatedDescription,
        isLoading,
        isFetching,
        refetch,
    } = useQuery(
        ["description", title, markdown],
        async () => createDescription(title, markdown),
        {
            staleTime: Infinity,
        }
    );

    if (isLoading || isFetching) {
        return <Spinner />;
    }

    return (
        <Box sx={{ mb: 4 }}>
            <pre style={{ whiteSpace: "pre-wrap" }}>{`
---
title: "${title}" 
description: "${generatedDescription}" 
published: ${date}
hero: ./img/${heroName}
---
        `}</pre>
            <Button onClick={refetch}>Recreate description</Button>
        </Box>
    );
};
