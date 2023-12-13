import Card from "@mui/joy/Card";
import Skeleton from "@mui/joy/Skeleton";
import Typography from "@mui/joy/Typography";

export default function Loading() {
    return (
        <Card>
            <Typography level="title-lg">A possible twitter thread</Typography>
            <Skeleton variant="rectangular" height={350} />
        </Card>
    );
}
