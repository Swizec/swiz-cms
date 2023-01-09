import { format } from "date-fns";
import { useQuery } from "react-query";

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

export const Frontmatter = ({ title, description, markdown, heroURL }) => {
    const date = format(new Date(), "yyyy-MM-dd");
    const heroName = heroURL?.split("/").pop();

    const { data: generatedDescription } = useQuery(
        ["description", title, markdown],
        async () => createDescription(title, markdown),
        {
            staleTime: Infinity,
        }
    );

    return (
        <pre style={{ whiteSpace: "pre-wrap" }}>{`
---
title: "${title}" 
description: "${generatedDescription}" 
published: ${date}
hero: ./img/${heroName}
---
        `}</pre>
    );
};
