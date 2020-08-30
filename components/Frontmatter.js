import { format } from "date-fns";

export const Frontmatter = ({ title, description }) => {
    const date = format(new Date(), "yyyy-MM-dd");
    return (
        <pre>{`
            ---
            title: "${title}" 
            description: "${description}" 
            published: ${date}
            ---
        `}</pre>
    );
};
