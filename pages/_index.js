import Head from "next/head";

import { Container, Box, Heading } from "theme-ui";
import { useState } from "react";
import { ReactQueryDevtools } from "react-query-devtools";

import { ArticleForm } from "../components/ArticleForm";
import { Frontmatter } from "../components/Frontmatter";
import {
    SocialCardImage,
    useSocialCardQuery,
} from "../components/SocialCardImage";
import { CLICopyPasta } from "../components/CLICopyPasta";
// import { LetterRender } from "markdown-email-converter";
import { ShipIt } from "../components/ShipIt";
import { TwitterThread } from "../components/TwitterThread";
import { KeyInsight } from "../components/KeyInsight";

export async function getStaticProps() {
    return {
        props: {
            giphyAPIKey: process.env.GIPHY_API_KEY,
        },
    };
}

// export default function Home({ giphyAPIKey }) {
//     return <p>{giphyAPIKey}</p>;
// }

export default function Home({ giphyAPIKey }) {
    const [article, setArticle] = useState(null);
    const cardQuery = useSocialCardQuery(article?.title);

    return (
        <>
            <Head>
                <title>Swiz CMS</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <Container>
                <h1>Swiz CMS is where articles are born</h1>

                <p>Use this to setup your copypasta for a new article</p>

                <ArticleForm onSubmit={setArticle} />

                {article ? (
                    <Box sx={{ p: 4 }}>
                        <Heading>
                            1. Run these commands to create an article
                        </Heading>
                        <CLICopyPasta {...article} />

                        <Heading>
                            2. Right click save image to directory
                        </Heading>
                        <SocialCardImage {...article} />

                        <Heading>3. Paste this into index.mdx</Heading>
                        <Frontmatter
                            {...article}
                            heroURL={cardQuery.data?.url}
                        />

                        <Heading>4. Here's a possible twitter thread</Heading>
                        <TwitterThread {...article} />

                        <Heading>5. Here's the viral key insight</Heading>
                        <KeyInsight {...article} />

                        {/* <Heading>This is your email</Heading>
                        <LetterRender
                            markdown={article.markdown}
                            giphyAPIKey={giphyAPIKey}
                        />

                        <ShipIt article={article} /> */}
                    </Box>
                ) : null}
            </Container>

            <ReactQueryDevtools />
        </>
    );
}
