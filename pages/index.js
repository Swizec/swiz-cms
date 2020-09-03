import Head from "next/head";

import { FrontmatterForm } from "../components/FrontmatterForm";
import { Frontmatter } from "../components/Frontmatter";
import {
    SocialCardImage,
    useSocialCardQuery,
} from "../components/SocialCardImage";
import { Container, Box, Heading } from "theme-ui";
import { useState } from "react";
import { ReactQueryDevtools } from "react-query-devtools";
import { CLICopyPasta } from "../components/CLICopyPasta";

export default function Home() {
    const [frontmatter, setFrontmatter] = useState(null);
    const cardQuery = useSocialCardQuery(frontmatter?.title);

    return (
        <>
            <Head>
                <title>Swiz CMS</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <Container>
                <h1>Swiz CMS is where articles are born</h1>

                <p>Use this to setup your copypasta for a new article</p>

                <FrontmatterForm onSubmit={setFrontmatter} />

                {frontmatter ? (
                    <Box sx={{ p: 4 }}>
                        <Heading>
                            1. Run these commands to create an article
                        </Heading>
                        <CLICopyPasta {...frontmatter} />

                        <Heading>
                            2. Right click save image to directory
                        </Heading>
                        <SocialCardImage {...frontmatter} />

                        <Heading>3. Paste this into index.mdx</Heading>
                        <Frontmatter
                            {...frontmatter}
                            heroURL={cardQuery.data?.url}
                        />
                    </Box>
                ) : null}
            </Container>

            <ReactQueryDevtools />
        </>
    );
}
