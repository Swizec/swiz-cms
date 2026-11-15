import { describe, expect, it } from "vitest";
import { getOpenAI } from "../lib/openai";
import { DECISION_MODEL } from "../lib/models";
import { upgradeQuestion } from "../lib/server/classification-candidates";
import cases from "./fixtures/upgrade-eval.json";

// These are controls for book fit with both offers available, not an archive
// accuracy estimate. Kept separate from the publication-date replay.
describe.skipIf(process.env.CATEGORY_EVAL !== "1")(
  "live upgrade controls",
  () => {
    it.each(cases)(
      "checks $id",
      async ({ title, body, expected }) => {
        const result = await getOpenAI().decisions.create({
          model: DECISION_MODEL,
          input: JSON.stringify({ title, body }),
          questions: [upgradeQuestion("2026-11-14")],
        });
        const answer = result.answers[0];
        expect(answer.type).toBe("choice");
        if (answer.type === "choice")
          expect(answer.choice).toBe(expected ?? "none");
      },
      120_000,
    );
  },
);
