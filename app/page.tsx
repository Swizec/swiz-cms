import Typography from "@mui/joy/Typography";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import { ArticleForm } from "./ArticleForm";
import { CLICopyPasta } from "./CLICopyPasta";
import { SocialCard } from "./SocialCard";
import { Frontmatter } from "./Frontmatter";
import { TwitterThread } from "./TwitterThread";

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

        /* {title && markdown ? (
                <Feedback title={title} markdown={markdown} />
            ) : null} */
        //     {title ? <CLICopyPasta title={title} /> : null}
        //     {title ? <SocialCard title={title} /> : null}
        //     {title && markdown ? (
        //         <Frontmatter title={title} markdown={markdown} />
        //     ) : null}
        //     {title && markdown ? (
        //         <TwitterThread title={title} markdown={markdown} />
        //     ) : null}
        //     <Box p={5}></Box>
        // </Stack>
    );
}
