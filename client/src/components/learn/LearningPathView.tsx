"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { extractApiError } from "@/lib/extractApiError";
import type { LearningPathApiPayload, LessonNodeRow } from "@/types/learning";
import { ProgressBar } from "./ProgressBar";
import { LessonNodeRenderer } from "./LessonNodeRenderer";
import { ChatLessonDrawer } from "@/components/ChatLessonDrawer";

function buildLessonContext(node: LessonNodeRow | undefined, docTitle: string): string | null {
  if (!node) return `Document: ${docTitle}`;
  const bits = [`Document: ${docTitle}`, `Lesson step: ${node.title}`, `Type: ${node.node_type}`];
  const content = node.content || {};
  if (typeof content.body === "string" && content.body.length > 0) {
    bits.push(`Lesson excerpt: ${content.body.slice(0, 600)}`);
  }
  if (typeof content.description === "string" && content.description.length > 0) {
    bits.push(`Description: ${content.description.slice(0, 400)}`);
  }
  return bits.join("\n");
}

function isFinalExamQuizNode(node: LessonNodeRow): boolean {
  if (node.node_type !== "quiz") return false;
  const mode = node.content?.mode;
  return mode === "final_exam" || String(mode) === "final_exam";
}

function resolveInitialIndex(payload: LearningPathApiPayload, initialNodeId?: string) {
  const nodes = payload?.nodes ?? [];
  const rawCompletedIds = payload?.progress?.completed_node_ids;
  const completedIds = Array.isArray(rawCompletedIds)
    ? rawCompletedIds.filter((id): id is string => typeof id === "string")
    : [];
  const maxUnlockedIndex = Math.min(
    Math.max(0, payload?.progress?.current_node_index ?? 0),
    Math.max(0, nodes.length - 1)
  );

  if (initialNodeId) {
    const nodeIndex = nodes.findIndex((node) => node.id === initialNodeId);
    if (nodeIndex >= 0) {
      const node = nodes[nodeIndex];
      if (node && (completedIds.includes(node.id) || nodeIndex <= maxUnlockedIndex)) {
        return nodeIndex;
      }
      return maxUnlockedIndex;
    }
  }

  return maxUnlockedIndex;
}

type LearningPathViewProps = {
  documentId: string;
  documentTitle: string;
  initialPayload: LearningPathApiPayload;
  onRefresh: () => Promise<unknown>;
  onPayloadUpdate?: (payload: LearningPathApiPayload) => void;
  initialNodeId?: string;
};

export function LearningPathView({
  documentId,
  documentTitle,
  initialPayload,
  onRefresh,
  onPayloadUpdate,
  initialNodeId,
}: LearningPathViewProps) {
  const router = useRouter();
  const [payload, setPayload] = useState(initialPayload);
  const [currentIndex, setCurrentIndex] = useState(() => resolveInitialIndex(initialPayload, initialNodeId));
  const [completePending, setCompletePending] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const currentLessonRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setPayload(initialPayload);
    setCurrentIndex(resolveInitialIndex(initialPayload, initialNodeId));
  }, [initialPayload, initialNodeId]);

  const path = payload?.path ?? null;
  const nodes = useMemo(() => payload?.nodes ?? [], [payload]);
  const progress = payload?.progress ?? null;
  const unlockedMaxIndex = Math.min(
    Math.max(0, progress?.current_node_index ?? 0),
    Math.max(0, nodes.length - 1)
  );

  const completedSet = useMemo(() => {
    const raw = progress?.completed_node_ids;
    const arr = Array.isArray(raw) ? raw : [];
    return new Set(arr.filter((value): value is string => typeof value === "string"));
  }, [progress]);

  const currentNode = nodes[currentIndex];

  const syncProgressIndex = useCallback(
    async (index: number) => {
      try {
        await api.patch(`/api/documents/${documentId}/learning-path/progress`, {
          current_node_index: index,
        });
      } catch {
        /* non-fatal */
      }
    },
    [documentId]
  );

  const go = useCallback(
    (next: number) => {
      const capped = Math.min(Math.max(0, next), Math.max(0, nodes.length - 1));
      const nextNode = nodes[capped];
      if (!nextNode) return;

      const unlocked = completedSet.has(nextNode.id) || capped <= unlockedMaxIndex;
      if (!unlocked) return;

      setCurrentIndex(capped);
      void syncProgressIndex(capped);
      router.push(`/documents/${documentId}/learn/${nextNode.id}`);
    },
    [completedSet, documentId, nodes, router, syncProgressIndex, unlockedMaxIndex]
  );

  useEffect(() => {
    const prevNode = nodes[currentIndex - 1];
    const nextNode = nodes[currentIndex + 1];
    if (prevNode) router.prefetch(`/documents/${documentId}/learn/${prevNode.id}`);
    if (nextNode && (completedSet.has(nextNode.id) || currentIndex + 1 <= unlockedMaxIndex)) {
      router.prefetch(`/documents/${documentId}/learn/${nextNode.id}`);
    }
    router.prefetch(`/documents/${documentId}/learn`);
  }, [completedSet, currentIndex, documentId, nodes, router, unlockedMaxIndex]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#current-lesson") return;

    const target = currentLessonRef.current;
    if (!target) return;

    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentNode?.id]);

  async function markComplete() {
    if (!currentNode || completedSet.has(currentNode.id)) return;

    setCompletePending(true);
    setCompleteError(null);

    try {
      const { data } = await api.patch(
        `/api/documents/${documentId}/learning-path/nodes/${currentNode.id}/complete`
      );
      const nextProgress = data.data?.progress;

      if (nextProgress && payload) {
        const nextPayload = { ...payload, progress: nextProgress };
        setPayload(nextPayload);
        onPayloadUpdate?.(nextPayload);
      }

      const learnSuffix = isFinalExamQuizNode(currentNode) ? "?completed=final" : "";
      router.replace(`/documents/${documentId}/learn${learnSuffix}`);
    } catch (error) {
      setCompleteError(extractApiError(error) || "Could not save progress.");
    } finally {
      setCompletePending(false);
    }
  }

  if (!path || path.status !== "ready" || nodes.length === 0 || !currentNode) {
    return null;
  }

  const lessonContext = buildLessonContext(currentNode, documentTitle);
  const isDone = completedSet.has(currentNode.id);
  const canPrev = currentIndex > 0;
  const canNext = currentIndex + 1 <= unlockedMaxIndex;

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,249,255,0.96))] shadow-[0_24px_70px_rgba(148,163,184,0.14)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(11,18,34,0.95),rgba(8,12,24,0.98))] dark:shadow-[0_30px_80px_rgba(2,6,23,0.45)]">
        <div className="border-b border-slate-200/80 p-5 md:p-8 dark:border-white/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-300">
                Lesson checkpoint
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white md:text-3xl">
                {currentNode.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {path.title} - Step {currentIndex + 1} of {nodes.length}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/documents/${documentId}/learn`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-base" aria-hidden>
                  map
                </span>
                Back to map
              </Link>
              <Link
                href={`/documents/${documentId}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Edit source
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <ProgressBar current={currentIndex} total={nodes.length} label="Lesson steps" />
          </div>
        </div>

        <article className="p-5 md:p-8">
          <header
            id="current-lesson"
            ref={currentLessonRef}
            className="mb-6 scroll-mt-24 flex flex-col gap-4 border-b border-slate-200/70 pb-6 dark:border-white/10"
          >
            <div className="flex flex-wrap items-center gap-3">
              <p className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                Step {currentIndex + 1}
              </p>
              <p className="inline-flex items-center rounded-full border border-cyan-200/80 bg-cyan-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
                {currentNode.node_type}
              </p>
              {isDone ? (
                <p className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                  Completed
                </p>
              ) : null}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
              Current lesson
            </p>
            <h3 className="max-w-3xl text-2xl font-black leading-tight tracking-[-0.04em] text-slate-950 dark:text-white">
              {currentNode.title}
            </h3>
          </header>

          <LessonNodeRenderer
            node={currentNode}
            language={path.language === "th" ? "th" : "en"}
            onLessonMastered={() => void markComplete()}
          />

          {completeError ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
              {completeError}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            {currentNode.node_type !== "quiz" ? (
              <button
                type="button"
                disabled={completePending || isDone}
                onClick={() => void markComplete()}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <span className="material-symbols-outlined text-lg" aria-hidden>
                  {isDone ? "check_circle" : "task_alt"}
                </span>
                {isDone ? "Step completed" : completePending ? "Saving..." : "Complete and return to map"}
              </button>
            ) : null}
          </div>
        </article>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 p-5 md:px-8 md:py-6 dark:border-white/10">
          <button
            type="button"
            onClick={() => go(currentIndex - 1)}
            disabled={!canPrev}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden>
              chevron_left
            </span>
            Previous lesson
          </button>
          <Link
            href={`/documents/${documentId}/learn`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            View full map
          </Link>
          <button
            type="button"
            onClick={() => go(currentIndex + 1)}
            disabled={!canNext}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            Next lesson
            <span className="material-symbols-outlined text-lg" aria-hidden>
              chevron_right
            </span>
          </button>
        </footer>
      </section>

      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_20px_40px_rgba(15,23,42,0.25)] transition-transform hover:scale-105 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        aria-label="Open chat about this document"
      >
        <span className="material-symbols-outlined text-2xl" aria-hidden>
          chat
        </span>
      </button>

      <ChatLessonDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        documentId={documentId}
        documentTitle={documentTitle}
        lessonContext={lessonContext}
      />
    </>
  );
}
