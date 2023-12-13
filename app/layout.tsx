import React from "react";
import { Metadata } from "next";
import { NextAppDirEmotionCacheProvider } from "tss-react/next/appDir";
import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import Grid from "@mui/joy/Grid";
import "@fontsource/inter";
import Stack from "@mui/joy/Stack";
import Box from "@mui/joy/Box";

export default function RootLayout(props: {
    children: React.ReactNode;
    feedback: React.ReactNode;
    clicopypasta: React.ReactNode;
    socialcard: React.ReactNode;
    frontmatter: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <meta
                    name="viewport"
                    content="initial-scale=1, width=device-width"
                />
            </head>
            <body>
                <NextAppDirEmotionCacheProvider options={{ key: "css" }}>
                    <CssVarsProvider>
                        <CssBaseline />
                        <Grid
                            container
                            direction="row"
                            justifyContent="center"
                            alignItems="center"
                        >
                            <Stack spacing={2} maxWidth={900}>
                                {props.children}
                                {props.feedback}
                                {props.clicopypasta}
                                {props.socialcard}
                                {props.frontmatter}

                                <Box p={5} />
                            </Stack>
                        </Grid>
                    </CssVarsProvider>
                </NextAppDirEmotionCacheProvider>
            </body>
        </html>
    );
}

export const metadata: Metadata = {
    title: "Swiz CMS",
    description: "Where good articles are born",
};
