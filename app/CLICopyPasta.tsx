"use client";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Link from "@mui/joy/Link";
import Typography from "@mui/joy/Typography";
import Snackbar from "@mui/joy/Snackbar";
import slugify from "@sindresorhus/slugify";
import { useState } from "react";

export const CLICopyPasta = ({ title }) => {
    const slug = slugify(title);
    const commands = `cd ~/Documents/websites/swizec.com
mkdir src/pages/blog/${slug}
mkdir src/pages/blog/${slug}/img
touch src/pages/blog/${slug}/index.mdx`;
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);

    async function copy() {
        await navigator.clipboard.writeText(commands);
        setSnackbarOpen(true);
    }

    return (
        <>
            <Card variant="solid" color="neutral" invertedColors>
                <CardContent>
                    <Typography level="title-lg">
                        <Link overlay underline="none" onClick={copy}>
                            Copy into terminal to make article
                        </Link>
                    </Typography>
                    <pre>
                        <Typography
                            level="body-md"
                            sx={{ fontFamily: "monospace" }}
                        >
                            {commands}
                        </Typography>
                    </pre>
                </CardContent>
            </Card>
            <Snackbar
                autoHideDuration={800}
                color="primary"
                size="lg"
                variant="outlined"
                open={snackbarOpen}
                onClose={() => setSnackbarOpen(false)}
            >
                Copied to clipboard
            </Snackbar>
        </>
    );
};
