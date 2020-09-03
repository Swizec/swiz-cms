import { format } from "date-fns";

export const Frontmatter = ({ title, description, heroURL }) => {
    const date = format(new Date(), "yyyy-MM-dd");
    const heroName = heroURL?.split("/").pop();

    return (
        <pre>{`
---
title: "${title}" 
description: "${description}" 
published: ${date}
hero: ./img/${heroName}
---
        `}</pre>
    );
};
