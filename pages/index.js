import Head from "next/head";

import { FrontmatterForm } from "../components/FrontmatterForm";
import { Frontmatter } from "../components/Frontmatter";
import { SocialCardImage } from "../components/SocialCardImage";
import { Container, Box } from "theme-ui";
import { useState } from "react";
import { ReactQueryDevtools } from "react-query-devtools";

export default function Home() {
    const [frontmatter, setFrontmatter] = useState(null);

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

                <Box sx={{ p: 4 }}>
                    {frontmatter ? <SocialCardImage {...frontmatter} /> : null}

                    {frontmatter ? <Frontmatter {...frontmatter} /> : null}
                </Box>
            </Container>

            <ReactQueryDevtools />
        </>
    );
}
