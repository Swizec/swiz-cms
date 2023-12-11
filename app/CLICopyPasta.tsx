import Typography from "@mui/joy/Typography";

import slugify from "@sindresorhus/slugify";
import { useState } from "react";
import { CopyableCard } from "../components/CopyableCard";

export const CLICopyPasta = ({ title }) => {
    const slug = slugify(title);
    const commands = `cd ~/Documents/websites/swizec.com
mkdir src/pages/blog/${slug}
mkdir src/pages/blog/${slug}/img
touch src/pages/blog/${slug}/index.mdx`;

    return (
        <CopyableCard title="Copy into terminal to make article">
            <pre>
                <Typography level="body-md" sx={{ fontFamily: "monospace" }}>
                    {commands}
                </Typography>
            </pre>
        </CopyableCard>
    );
};
