import { useQuery } from "react-query";

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
    const { data: thread } = useQuery(
        ["twitter-thread", title, markdown],
        async () => createTwitterThread(title, markdown),
        {
            staleTime: Infinity,
        }
    );

    return (
        <pre style={{ whiteSpace: "pre-wrap" }}>{`
${thread}
        `}</pre>
    );
};
