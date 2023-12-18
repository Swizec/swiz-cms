import { OpenAIStream, StreamingTextResponse } from "ai";
import { createTwitterThread } from "../../../aistuff/createTwitterThread";

export const runtime = "edge";

export async function POST(req: Request) {
    const { title, markdown } = await req.json();

    const thread = await createTwitterThread(title, markdown);
    const stream = OpenAIStream(thread);

    return new StreamingTextResponse(stream);
}
