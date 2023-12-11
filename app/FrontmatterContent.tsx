export const FrontmatterContent: FC<{ title: string; markdown: string }> = ({
    title,
    markdown,
}) => {
    const date = format(new Date(), "yyyy-MM-dd");
    const socialCard = await fetchSocialCard(title);
    const heroURL = socialCard.url.split("/").pop();
    const frontmatter = `---
title: "${title}"
published: ${date}
hero: ./img/${heroURL}
---`;
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);

    async function copy() {
        await navigator.clipboard.writeText(frontmatter);
        setSnackbarOpen(true);
    }

    return (
        <>
            <Card variant="solid" color="neutral" invertedColors>
                <CardContent>
                    <Typography level="title-lg">
                        <Link overlay underline="none" onClick={copy}>
                            Copy into /index.mdx
                        </Link>
                    </Typography>
                    <pre>
                        <Typography
                            level="body-md"
                            sx={{
                                fontFamily: "monospace",
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {frontmatter}
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
