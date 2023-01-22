import { useQuery } from "react-query";
import { Box, Button, Spinner } from "theme-ui";

async function findKeyInsight(title, content) {
    const res = await fetch("/api/findKeyInsight", {
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
        throw new Error("Failed to findKeyInsight");
    }

    return res.text();
}

export const KeyInsight = ({ title, markdown }) => {
    const {
        data: thread,
        isLoading,
        isFetching,
        refetch,
    } = useQuery(
        ["key-insight", title, markdown],
        async () => findKeyInsight(title, markdown),
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
${thread?.replaceAll(/(\n)+/g, "\n\n")}
        `}</pre>
            <Button onClick={refetch}>Recreate key insight</Button>
        </Box>
    );
};
