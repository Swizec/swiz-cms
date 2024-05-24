export async function fetchSocialCard(
    title: string
): Promise<{ status: string; url: string }> {
    const res = await fetch(
        `https://mskj2vd0r9.execute-api.us-east-1.amazonaws.com/dev2/social-card?title=${title}`,
        { cache: "force-cache" }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch image");
    }

    return res.json();
}
