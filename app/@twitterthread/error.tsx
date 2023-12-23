"use client"; // Error components must be Client Components

import { useEffect } from "react";
import Alert from "@mui/joy/Alert";
import ReportIcon from "@mui/icons-material/Report";
import Button from "@mui/joy/Button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <Alert
            color="danger"
            variant="soft"
            startDecorator={<ReportIcon />}
            endDecorator={
                <Button
                    onClick={
                        // Attempt to recover by trying to re-render the segment
                        () => reset()
                    }
                    variant="soft"
                    color="danger"
                >
                    Try again
                </Button>
            }
        >
            Something went wrong!
        </Alert>
    );
}
