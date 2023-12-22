"use client";
import Stack from "@mui/joy/Stack";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Textarea from "@mui/joy/Textarea";
import Button from "@mui/joy/Button";
import Box from "@mui/joy/Box";
import { FC } from "react";
import { redirect } from "next/navigation";
import LZString from "lz-string";

export const ArticleForm: FC<{ title?: string; markdown?: string }> = ({
    title,
    markdown,
}) => {
    function onSubmit(event) {
        event.preventDefault();

        const title = event.target.querySelector("[name=title]").value;
        const markdown = LZString.compressToEncodedURIComponent(
            event.target.querySelector("[name=markdown]").value
        );

        window.location.href = `?title=${title}&markdown=${markdown}`;
    }

    return (
        <form method="get" onSubmit={onSubmit}>
            <Stack spacing={2}>
                <Box>
                    <FormLabel>Title</FormLabel>
                    <Input name="title" defaultValue={title} />
                </Box>

                <Box>
                    <FormLabel>Markdown sauce 🍝</FormLabel>
                    <Textarea
                        name="markdown"
                        minRows={7}
                        maxRows={10}
                        defaultValue={
                            markdown &&
                            LZString.decompressFromEncodedURIComponent(markdown)
                        }
                    />
                    {markdown ? (
                        <FormLabel>Length is {markdown.length}</FormLabel>
                    ) : null}
                </Box>

                <Button type="submit">Submit</Button>
            </Stack>
        </form>
    );
};
