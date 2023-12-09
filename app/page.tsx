import Typography from "@mui/joy/Typography";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Textarea from "@mui/joy/Textarea";
import Button from "@mui/joy/Button";

const Header = () => (
    <Box sx={{ pt: 2 }}>
        <Typography level="h1">Swiz CMS is where articles are born</Typography>

        <Typography level="body-lg">
            Use this to setup your copypasta for a new article
        </Typography>
    </Box>
);

const ArticleForm = () => (
    <form>
        <Stack spacing={2}>
            <Box>
                <FormLabel>Title</FormLabel>
                <Input name="title" />
            </Box>

            <Box>
                <FormLabel>Markdown sauce 🍝</FormLabel>
                <Textarea name="markdown" minRows={10} />
            </Box>

            <Button type="submit">Submit</Button>
        </Stack>
    </form>
);

export default function Page() {
    return (
        <Stack spacing={2}>
            <Header />
            <ArticleForm />
        </Stack>
    );
}
