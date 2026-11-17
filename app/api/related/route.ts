import { articleSchema } from "../../../lib/article";
import { errorResponse, readJson } from "../../../lib/server/http";
import { findRelatedArticles } from "../../../lib/server/related";

export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const article = await readJson(request, articleSchema);
    return Response.json(await findRelatedArticles(article, request.signal), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
