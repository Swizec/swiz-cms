import { z } from "zod";
import { CATEGORIES } from "./categories";

export const contentUpgradeSchema = z
  .enum(["SeniorMindset", "ScalingFast"])
  .nullable();
export const metadataSchema = z.object({
  description: z.string(),
  categories: z.array(z.enum(CATEGORIES)).max(5),
  contentUpgrade: contentUpgradeSchema,
});
export type PublishingMetadata = z.infer<typeof metadataSchema>;
export const emptyMetadata: PublishingMetadata = {
  description: "",
  categories: [],
  contentUpgrade: null,
};
