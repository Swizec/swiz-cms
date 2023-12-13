import AspectRatio from "@mui/joy/AspectRatio";
import Card from "@mui/joy/Card";
import Skeleton from "@mui/joy/Skeleton";

export default function Loading() {
    return (
        <Card>
            <Skeleton variant="text" level="title-lg" />
            <AspectRatio maxHeight={300}>
                <Skeleton />
            </AspectRatio>
        </Card>
    );
}
