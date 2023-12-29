import Card from "@mui/joy/Card";
import Skeleton from "@mui/joy/Skeleton";
import Typography from "@mui/joy/Typography";

export default function Loading() {
    return (
        <Card>
            <Typography level="title-lg">Related articles</Typography>
            <Skeleton variant="text" level="body-md" />
            <Skeleton variant="text" level="body-md" width="81%" />
            <Skeleton variant="text" level="body-md" width="45%" />
            <Skeleton variant="text" level="body-md" width="67%" />
        </Card>
    );
}
