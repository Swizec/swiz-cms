import type { ArticlePageProps } from "../../lib/article-params";
import Typography from "@mui/joy/Typography";

import slugify from "@sindresorhus/slugify";
import { CopyableCard } from "../../components/CopyableCard";

export default async function CLICopyPasta({ searchParams }: ArticlePageProps) {
    const { title } = (await searchParams) as { title?: string };

    if (!title) {
        return null;
    }

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
}
