import { api } from "@/lib/api";
import type { LearningPathApiPayload } from "@/types/learning";

export type LearningPathBundle = {
  documentTitle: string;
  payload: LearningPathApiPayload;
};

const learningPathCache = new Map<string, LearningPathBundle>();
const learningPathRequests = new Map<string, Promise<LearningPathBundle>>();

export function getCachedLearningPathBundle(documentId: string) {
  return learningPathCache.get(documentId);
}

export function setCachedLearningPathBundle(documentId: string, bundle: LearningPathBundle) {
  learningPathCache.set(documentId, bundle);
}

export async function fetchLearningPathBundle(documentId: string): Promise<LearningPathBundle> {
  const pending = learningPathRequests.get(documentId);
  if (pending) return pending;

  const request = Promise.all([
    api.get(`/api/documents/${documentId}`),
    api.get(`/api/documents/${documentId}/learning-path`),
  ])
    .then(([docRes, pathRes]) => {
      const bundle = {
        documentTitle: (docRes.data.data as { title?: string })?.title || "Untitled",
        payload: pathRes.data.data as LearningPathApiPayload,
      };

      setCachedLearningPathBundle(documentId, bundle);
      return bundle;
    })
    .finally(() => {
      learningPathRequests.delete(documentId);
    });

  learningPathRequests.set(documentId, request);
  return request;
}
