import Typography from "@mui/joy/Typography";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import { ArticleForm } from "./ArticleForm";
import { CLICopyPasta } from "./CLICopyPasta";

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
        </Stack>
    );
}
