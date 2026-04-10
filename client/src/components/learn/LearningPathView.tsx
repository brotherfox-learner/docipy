"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { extractApiError } from "@/lib/extractApiError";
import type { LearningPathApiPayload, LessonNodeRow } from "@/types/learning";
import { ProgressBar } from "./ProgressBar";
import { NodeNavigator } from "./NodeNavigator";
import { LessonNodeRenderer } from "./LessonNodeRenderer";
import { ChatLessonDrawer } from "@/components/ChatLessonDrawer";

function buildLessonContext(node: LessonNodeRow | undefined, docTitle: string): string | null {
  if (!node) return `Document: ${docTitle}`;
  const bits = [`Document: ${docTitle}`, `Lesson step: ${node.title}`, `Type: ${node.node_type}`];
  const c = node.content || {};
  if (typeof c.body === "string" && c.body.length > 0) bits.push(`Lesson excerpt: ${c.body.slice(0, 600)}`);
  if (typeof c.description === "string" && c.description.length > 0) {
    bits.push(`Description: ${c.description.slice(0, 400)}`);
  }
  return bits.join("\n");
}

type LearningPathViewProps = {
  documentId: string;
  documentTitle: string;
  initialPayload: LearningPathApiPayload;
  onRefresh: () => Promise<void>;
};

export function LearningPathView({
  documentId,
  documentTitle,
  initialPayload,
  onRefresh,
}: LearningPathViewProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const p = initialPayload?.progress;
    if (!p || !initialPayload?.nodes?.length) return 0;
    return Math.min(Math.max(0, p.current_node_index), initialPayload.nodes.length - 1);
  });
  const [completePending, setCompletePending] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    setPayload(initialPayload);
    const nodes = initialPayload?.nodes ?? [];
    const p = initialPayload?.progress;
    if (nodes.length > 0 && p) {
      setCurrentIndex(Math.min(Math.max(0, p.current_node_index), nodes.length - 1));
    }
  }, [initialPayload]);

  const path = payload?.path ?? null;
  const nodes = payload?.nodes ?? [];
  const progress = payload?.progress ?? null;

  const completedSet = useMemo(() => {
    const raw = progress?.completed_node_ids;
    const arr = Array.isArray(raw) ? raw : [];
    return new Set(arr.filter((x): x is string => typeof x === "string"));
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
      setCurrentIndex(capped);
      void syncProgressIndex(capped);
    },
    [nodes.length, syncProgressIndex]
  );

  async function markComplete() {
    if (!currentNode || completedSet.has(currentNode.id)) return;
    setCompletePending(true);
    setCompleteError(null);
    try {
      const { data } = await api.patch(
        `/api/documents/${documentId}/learning-path/nodes/${currentNode.id}/complete`
      );
      const prog = data.data?.progress;
      if (prog) {
        setPayload((prev) => (prev ? { ...prev, progress: prog } : prev));
      }
      if (currentIndex < nodes.length - 1) go(currentIndex + 1);
      await onRefresh();
    } catch (e) {
      setCompleteError(extractApiError(e) || "Could not save progress.");
    } finally {
      setCompletePending(false);
    }
  }

  if (!path || path.status !== "ready" || nodes.length === 0) return null;

  const lessonContext = buildLessonContext(currentNode, documentTitle);
  const isDone = currentNode ? completedSet.has(currentNode.id) : false;

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,249,255,0.96))] shadow-[0_24px_70px_rgba(148,163,184,0.14)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(11,18,34,0.95),rgba(8,12,24,0.98))] dark:shadow-[0_30px_80px_rgba(2,6,23,0.45)]">
        <div className="border-b border-slate-200/80 p-5 md:p-8 dark:border-white/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-300">
                Guided learning path
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white md:text-3xl">
                {path.title}
              </h2>
              {path.description ? (
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {path.description}
                </p>
              ) : null}
            </div>

            {progress ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                    XP earned
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{progress.xp_earned}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                    Streak
                  </p>
                  <p className="mt-2 text-lg font-black text-amber-600 dark:text-amber-300">
                    {progress.streak_count} days
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                    Completed
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                    {completedSet.size} / {nodes.length}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <ProgressBar current={currentIndex} total={nodes.length} label="Lesson steps" />
          </div>
        </div>

        <article className="p-5 md:p-8">
          {currentNode ? (
            <>
              <header className="mb-6 flex flex-col gap-4 border-b border-slate-200/70 pb-6 dark:border-white/10">
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
              <LessonNodeRenderer node={currentNode} />
            </>
          ) : null}

          {completeError ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
              {completeError}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={completePending || !currentNode || isDone}
              onClick={() => void markComplete()}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden>
                {isDone ? "check_circle" : "task_alt"}
              </span>
              {isDone ? "Step completed" : completePending ? "Saving..." : "Mark step complete"}
            </button>
            <Link
              href={`/documents/${documentId}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Edit source text
            </Link>
          </div>
        </article>

        <footer className="border-t border-slate-200/70 p-5 pt-5 md:px-8 md:pb-8 dark:border-white/10">
          <NodeNavigator
            nodes={nodes}
            currentIndex={currentIndex}
            completedIds={completedSet}
            canPrev={currentIndex > 0}
            canNext={currentIndex < nodes.length - 1}
            onPrev={() => go(currentIndex - 1)}
            onNext={() => go(currentIndex + 1)}
            onSelectIndex={(i) => go(i)}
          />
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
