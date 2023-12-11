"use client";

import Box from "@mui/joy/Box";
import Card, { CardPropsVariantOverrides } from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Link from "@mui/joy/Link";
import Snackbar from "@mui/joy/Snackbar";
import Typography from "@mui/joy/Typography";
import { VariantProp } from "@mui/joy/styles";
import { FC, PropsWithChildren, useRef, useState } from "react";

export const CopyableCard: FC<
    PropsWithChildren<{
        title: string;
        variant?: VariantProp;
    }>
> = ({ children, title, variant }) => {
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
    const ref = useRef<HTMLElement>(null);

    async function copy() {
        console.log(ref.current?.textContent);
        await navigator.clipboard.writeText(ref.current?.textContent ?? "");
        setSnackbarOpen(true);
    }

    return (
        <Box>
            <Card variant={variant ?? "solid"} color="neutral" invertedColors>
                <CardContent>
                    <Typography level="title-lg">
                        <Link overlay underline="none" onClick={copy}>
                            {title}
                        </Link>
                    </Typography>
                    <Box ref={ref}>{children}</Box>
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
        </Box>
    );
};
