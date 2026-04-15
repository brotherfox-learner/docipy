"use client";

import { useCallback, useEffect, useState } from "react";
import { extractApiError } from "@/lib/extractApiError";
import {
  fetchLearningPathBundle,
  getCachedLearningPathBundle,
  setCachedLearningPathBundle,
  type LearningPathBundle,
} from "@/lib/learning-path-cache";

export function useLearningPathBundle(documentId: string) {
  const initialCached = getCachedLearningPathBundle(documentId) ?? null;
  const [bundle, setBundle] = useState<LearningPathBundle | null>(initialCached);
  const [loading, setLoading] = useState(!initialCached);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (options?: { background?: boolean }) => {
      if (!options?.background) setLoading(true);
      setError(null);
      try {
        const next = await fetchLearningPathBundle(documentId);
        setBundle(next);
        return next;
      } catch (e: unknown) {
        const msg = extractApiError(e) || "Document not found or you do not have access.";
        setError(msg);
        setBundle(null);
        return null;
      } finally {
        if (!options?.background) setLoading(false);
      }
    },
    [documentId]
  );

  useEffect(() => {
    const cached = getCachedLearningPathBundle(documentId) ?? null;
    setBundle(cached);
    setLoading(!cached);
    setError(null);
    if (!cached) {
      void load();
    }
  }, [documentId, load]);

  const updateBundle = useCallback(
    (next: LearningPathBundle) => {
      setCachedLearningPathBundle(documentId, next);
      setBundle(next);
    },
    [documentId]
  );

  return {
    bundle,
    loading,
    error,
    load,
    updateBundle,
  };
}
