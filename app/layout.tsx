import React from "react";
import { Metadata } from "next";
import { NextAppDirEmotionCacheProvider } from "tss-react/next/appDir";
import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import Grid from "@mui/joy/Grid";
import "@fontsource/inter";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
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
                            {children}
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
