import { format } from "date-fns";
import { useQuery } from "react-query";

async function createDescription(markdown) {
    const res = await fetch("/api/createDescription", {
        method: "POST",
        body: markdown,
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
        ["description", markdown],
        () => createDescription(markdown)
    );

    return (
        <pre>{`
---
title: "${title}" 
description: "${generatedDescription}" 
published: ${date}
hero: ./img/${heroName}
---
        `}</pre>
    );
};
