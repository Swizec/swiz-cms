import Stack from "@mui/joy/Stack";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Textarea from "@mui/joy/Textarea";
import Button from "@mui/joy/Button";
import Box from "@mui/joy/Box";
import { FC } from "react";

export const ArticleForm: FC<{ title?: string; markdown?: string }> = ({
    title,
    markdown,
}) => (
    <form method="get">
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
                    defaultValue={markdown}
                />
            </Box>

            <Button type="submit">Submit</Button>
        </Stack>
    </form>
);
