import Typography from "@mui/joy/Typography";
import Box from "@mui/joy/Box";
import { ArticleForm } from "./ArticleForm";

const Header = () => (
    <Box sx={{ pt: 2 }}>
        <Typography level="h1">Swiz CMS is where articles are born</Typography>

        <Typography level="body-lg">
            Use this to setup copypasta for a new article and get writing
            feedback from GPT-4
        </Typography>
    </Box>
);

export default function Page({ searchParams }) {
    const { title, markdown } = searchParams as {
        title?: string;
        markdown?: string;
    };

    return (
        <>
            <Header />

            <ArticleForm title={title} markdown={markdown} />
            <Box />
        </>
    );
}
