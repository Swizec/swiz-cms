import Card from "@mui/joy/Card";
import Skeleton from "@mui/joy/Skeleton";
import Typography from "@mui/joy/Typography";

export default function Loading() {
    return (
        <Card>
            <Typography level="title-lg">
                Copy frontmatter into ./index.mdx to set meta data
            </Typography>
            <Skeleton variant="text" level="body-md" />
            <Skeleton variant="text" level="body-md" />
            <Skeleton variant="text" level="body-md" width="30%" />
            <Skeleton variant="text" level="body-md" width="60%" />
        </Card>
    );
}
