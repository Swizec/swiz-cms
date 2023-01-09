import { useQuery } from "react-query";
import { Spinner } from "theme-ui";

async function createTwitterThread(title, content) {
    const res = await fetch("/api/createTwitterThread", {
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
        throw new Error("Failed to createTwitterThread");
    }

    return res.text();
}

export const TwitterThread = ({ title, markdown }) => {
    const { data: thread, isLoading } = useQuery(
        ["twitter-thread", title, markdown],
        async () => createTwitterThread(title, markdown),
        {
            staleTime: Infinity,
        }
    );

    if (isLoading) {
        return <Spinner />;
    }

    return (
        <pre style={{ whiteSpace: "pre-wrap" }}>{`
${thread.replaceAll("\n", "\n\n")}
        `}</pre>
    );
};
