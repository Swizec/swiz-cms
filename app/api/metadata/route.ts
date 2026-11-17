import { articleSchema } from "../../../lib/article";
import { metadataSchema } from "../../../lib/metadata";
import { classifyArticle } from "../../../lib/server/classification";
import { suggestDescription } from "../../../lib/server/description";
import { errorResponse, readJson } from "../../../lib/server/http";

export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    const article = await readJson(request, articleSchema);
    const [description, classification] = await Promise.all([
      suggestDescription(article, request.signal),
      classifyArticle(article, request.signal),
    ]);
    return Response.json(
      metadataSchema.parse({ description, ...classification }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
