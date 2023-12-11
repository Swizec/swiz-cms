import Typography from "@mui/joy/Typography";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import { ArticleForm } from "./ArticleForm";
import { CLICopyPasta } from "./CLICopyPasta";
import { SocialCard } from "./SocialCard";
import { Frontmatter } from "./Frontmatter";

const Header = () => (
    <Box sx={{ pt: 2 }}>
        <Typography level="h1">Swiz CMS is where articles are born</Typography>

        <Typography level="body-lg">
            Use this to setup your copypasta for a new article
        </Typography>
    </Box>
);

export default function Page({ searchParams }) {
    const { title, markdown } = searchParams as {
        title?: string;
        markdown?: string;
    };

    return (
        <Stack spacing={2}>
            <Header />

            <ArticleForm title={title} markdown={markdown} />

            {title ? <CLICopyPasta title={title} /> : null}
            {title ? <SocialCard title={title} /> : null}
            {title && markdown ? (
                <Frontmatter title={title} markdown={markdown} />
            ) : null}
            <Box p={5} />
        </Stack>
    );
}
