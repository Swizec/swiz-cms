import React from "react";
import { useMutation } from "react-query";
import { Button, Spinner } from "theme-ui";

export const ShipIt = ({ article }) => {
    const [shipArticle, { status, isLoading }] = useMutation(async () => {
        return fetch("/api/publishArticle", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(article),
        });
    });

    if (isLoading) {
        return <Spinner></Spinner>;
    } else {
        return <Button onClick={shipArticle}>Ship It</Button>;
    }
};
