import type { Article } from "../article";
import { selectCategories } from "./category-selection";
import {
  classificationCandidates,
  readCandidates,
} from "./classification-candidates";

export async function classifyArticle(
  article: Article,
  signal?: AbortSignal,
  asOf = new Date().toISOString().slice(0, 10),
) {
  const answers = await classificationCandidates(article, asOf, signal);
  const { scores, contentUpgrade } = readCandidates(answers, asOf);
  return { categories: selectCategories(scores), contentUpgrade };
}
