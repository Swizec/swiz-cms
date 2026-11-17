import { z } from "zod";

export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export class ConfigurationError extends Error {}

export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  const body = await request.text();
  if (new TextEncoder().encode(body).length > 1_000_000) {
    throw new RequestError(
      "This request is too large. Shorten the draft or start a new review.",
      413,
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    throw new RequestError("Send a valid JSON request.");
  }
  const result = schema.safeParse(value);
  if (!result.success)
    throw new RequestError(
      result.error.issues[0]?.message ?? "Invalid request.",
    );
  return result.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof RequestError || error instanceof ConfigurationError)
    return error.message;
  const status =
    error && typeof error === "object" && "status" in error
      ? error.status
      : error && typeof error === "object" && "statusCode" in error
        ? error.statusCode
        : undefined;
  if (status === 401 || status === 403)
    return "OpenAI rejected the API key. Check OPENAI_API_KEY on the server.";
  if (status === 429)
    return "OpenAI is rate limited or out of credits. Check your usage, then retry.";
  if (status === 404)
    return "The requested model is unavailable for this OpenAI project.";
  return "Couldn't complete the request. Please retry.";
}

export function errorResponse(error: unknown) {
  return Response.json(
    { error: errorMessage(error) },
    {
      status:
        error instanceof RequestError
          ? error.status
          : error instanceof ConfigurationError
            ? 503
            : 502,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
