export async function fetchSocialCard(
    title: string
): Promise<{ status: string; url: string }> {
    const res = await fetch(
        `https://pifc233qp6.execute-api.us-east-1.amazonaws.com/dev/social-card?title=${title}`,
        { cache: "force-cache" }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch image");
    }

    return res.json();
}
