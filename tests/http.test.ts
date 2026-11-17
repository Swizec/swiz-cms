import { describe, expect, it } from "vitest";
import { articleSchema } from "../lib/article";
import { errorResponse, readJson } from "../lib/server/http";

describe("request boundaries", () => {
  it("rejects an empty draft and malformed JSON", async () => {
    await expect(
      readJson(
        new Request("http://localhost", { method: "POST", body: "{" }),
        articleSchema,
      ),
    ).rejects.toThrow("valid JSON");
    await expect(
      readJson(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ title: "Title", body: "  " }),
        }),
        articleSchema,
      ),
    ).rejects.toThrow("Add your article");
  });
  it("rejects oversized requests", async () => {
    await expect(
      readJson(
        new Request("http://localhost", {
          method: "POST",
          body: "x".repeat(1_000_001),
        }),
        articleSchema,
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("does not return upstream secrets to the browser", async () => {
    const response = errorResponse(
      new Error("postgres://secret-password@host/database"),
    );
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("secret-password");
  });
});
