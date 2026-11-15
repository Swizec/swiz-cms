import { Suspense } from "react";

export async function AIStreamReader({
    reader,
}: {
    reader: ReadableStreamDefaultReader<string>;
}) {
    const { done, value } = await reader.read();

    if (done) {
        return null;
    }

    const text = value;

    return (
        <>
            {text}
            {text.includes("\n") ? (
                <>
                    <br />
                    <br />
                </>
            ) : null}
            <Suspense>
                <AIStreamReader reader={reader} />
            </Suspense>
        </>
    );
}
