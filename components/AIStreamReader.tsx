import { Suspense } from "react";

export async function AIStreamReader({
    reader,
}: {
    reader: ReadableStreamDefaultReader<any>;
}) {
    const { done, value } = await reader.read();

    if (done) {
        return null;
    }

    const text = new TextDecoder().decode(value);

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
