"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Article } from "../lib/article";

type Result<T> = { data: T; article: Article };
export function useArticleRequest<T>(endpoint: string) {
  const [result, setResult] = useState<Result<T> | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const run = useCallback(
    async (article: Article) => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setPending(true);
      setError(null);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(article),
          signal: current.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Request failed. Please retry.");
        if (!current.signal.aborted) setResult({ data, article });
      } catch (error) {
        if (!current.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Request failed. Please retry.",
          );
      } finally {
        if (!current.signal.aborted) setPending(false);
      }
    },
    [endpoint],
  );
  return { result, pending, error, run };
}
