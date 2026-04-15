"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import type { LearningPathApiPayload, LessonNodeRow } from "@/types/learning";
import { ProgressBar } from "./ProgressBar";
import { NodeNavigator } from "./NodeNavigator";

type LearningMapViewProps = {
  documentId: string;
  documentTitle: string;
  payload: NonNullable<LearningPathApiPayload>;
};

function buildPreview(node: LessonNodeRow | null | undefined) {
  if (!node) {
    return {
      summary: "Choose a checkpoint to preview what you will learn.",
      bullets: [] as string[],
    };
  }

  const content = node.content || {};

  if (typeof content.body === "string" && content.body.trim().length > 0) {
    const plain = content.body.replace(/[#*_`>-]/g, " ").replace(/\s+/g, " ").trim();
    return {
      summary: plain.slice(0, 180),
      bullets: Array.isArray(content.key_points)
        ? content.key_points.filter((item): item is string => typeof item === "string").slice(0, 3)
        : [],
    };
  }

  if (typeof content.description === "string" && content.description.trim().length > 0) {
    return {
      summary: content.description.slice(0, 180),
      bullets: Array.isArray(content.key_ideas)
        ? content.key_ideas.filter((item): item is string => typeof item === "string").slice(0, 3)
        : [],
    };
  }

  if (Array.isArray(content.questions) && content.questions.length > 0) {
    return {
      summary:
        node.node_type === "quiz"
          ? "Answer focused questions to prove you have mastered the ideas from the previous checkpoints."
          : "Review the main ideas from this route before continuing upward.",
      bullets: (content.questions as Array<Record<string, unknown>>)
        .map((question) => question.question)
        .filter((item): item is string => typeof item === "string")
        .slice(0, 2),
    };
  }

  if (typeof content.caption === "string" && content.caption.trim().length > 0) {
    return {
      summary: content.caption.slice(0, 180),
      bullets: [],
    };
  }

  return {
    summary: "Open this checkpoint to see the full lesson and continue your guided route.",
    bullets: [],
  };
}

export function LearningMapView({ documentId, documentTitle, payload }: LearningMapViewProps) {
  const router = useRouter();
  const nodes = payload.nodes;
  const progress = payload.progress;
  const currentIndex = Math.min(
    Math.max(0, progress?.current_node_index ?? 0),
    Math.max(0, nodes.length - 1)
  );
  const completedSet = useMemo(() => {
    const raw = progress?.completed_node_ids;
    const arr = Array.isArray(raw) ? raw : [];
    return new Set(arr.filter((value): value is string => typeof value === "string"));
  }, [progress]);
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const currentNode = nodes[currentIndex];
  const safeSelectedIndex = Math.min(selectedIndex, currentIndex);
  const selectedNode = nodes[safeSelectedIndex] ?? currentNode;
  const previewNode = previewIndex !== null ? nodes[previewIndex] : null;
  const preview = buildPreview(previewNode);
  const completedCount = nodes.filter((node) => completedSet.has(node.id)).length;
  const canPrev = safeSelectedIndex > 0;
  const canNext = safeSelectedIndex < currentIndex;

  useEffect(() => {
    setSelectedIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    if (previewIndex === null) return;
    const node = nodes[previewIndex];
    const unlocked = Boolean(node) && (completedSet.has(node.id) || previewIndex <= currentIndex);
    if (!unlocked) {
      setPreviewIndex(null);
    }
  }, [completedSet, currentIndex, nodes, previewIndex]);

  useEffect(() => {
    if (currentNode) {
      router.prefetch(`/documents/${documentId}/learn/${currentNode.id}`);
    }
    if (selectedNode) {
      router.prefetch(`/documents/${documentId}/learn/${selectedNode.id}`);
    }
  }, [currentNode, documentId, router, selectedNode]);

  function openNode(index: number) {
    const node = nodes[index];
    if (!node) return;
    const unlocked = completedSet.has(node.id) || index <= currentIndex;
    if (!unlocked) return;

    setSelectedIndex(index);
    setPreviewIndex(index);
  }

  function goToLesson(index: number) {
    const node = nodes[index];
    if (!node) return;
    setPreviewIndex(null);
    router.push(`/documents/${documentId}/learn/${node.id}#current-lesson`);
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,249,255,0.96))] shadow-[0_24px_70px_rgba(148,163,184,0.14)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(11,18,34,0.95),rgba(8,12,24,0.98))] dark:shadow-[0_30px_80px_rgba(2,6,23,0.45)]">
      <div className="border-b border-slate-200/80 p-5 md:p-8 dark:border-white/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-300">
              Guided learning path
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white md:text-3xl">
              {payload.path.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              {payload.path.description || `Choose your next checkpoint from ${documentTitle}.`}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                XP on this path
              </p>
              <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{progress?.xp_earned ?? 0}</p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                Account-wide level and next level-up are on{" "}
                <Link href="/settings" className="font-semibold text-primary hover:underline">
                  Settings → Profile
                </Link>
                .
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                Streak
              </p>
              <p className="mt-2 text-lg font-black text-amber-600 dark:text-amber-300">
                {progress?.streak_count ?? 0} days
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                Next up
              </p>
              <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">
                {currentNode?.title ?? "Ready to start"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ProgressBar current={currentIndex} total={nodes.length} label="Route progress" />
        </div>
      </div>

      <div className="p-5 md:p-8">
        <NodeNavigator
          nodes={nodes}
          currentIndex={currentIndex}
          selectedIndex={safeSelectedIndex}
          completedIds={completedSet}
          onSelectIndex={openNode}
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_45px_rgba(148,163,184,0.1)] dark:border-white/10 dark:bg-white/5">
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              Learn like moving through a route, not a list. Each node is a checkpoint. Completed lessons stay
              stamped, the current lesson stays in focus, and future checkpoints stay locked until you clear
              the step before them.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => setSelectedIndex((value) => Math.max(0, value - 1))}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-lg" aria-hidden>
                  chevron_left
                </span>
                Previous checkpoint
              </button>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setSelectedIndex((value) => Math.min(currentIndex, value + 1))}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Next checkpoint
                <span className="material-symbols-outlined text-lg" aria-hidden>
                  chevron_right
                </span>
              </button>
              {selectedNode ? (
                <button
                  type="button"
                  onClick={() => setPreviewIndex(safeSelectedIndex)}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  Preview checkpoint
                  <span className="material-symbols-outlined text-lg" aria-hidden>
                    arrow_forward
                  </span>
                </button>
              ) : null}
            </div>
          </div>

          <aside className="overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(236,246,255,0.98))] text-slate-950 shadow-[0_24px_60px_rgba(56,189,248,0.16)] dark:border-cyan-300/20 dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(12,20,36,0.98))] dark:text-white">
            <div className="border-b border-cyan-100/80 px-5 py-4 dark:border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-200">
                Active route
              </p>
            </div>
            <div className="space-y-3 px-5 py-5">
              <p className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                Unit {Math.floor(safeSelectedIndex / 3) + 1}
              </p>
              <h3 className="text-xl font-black leading-tight text-slate-950 dark:text-white">
                {selectedNode?.title ?? "Ready to start"}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Step {safeSelectedIndex + 1} of {nodes.length}
              </p>
              <div className="rounded-[1.25rem] border border-cyan-100 bg-white/75 px-4 py-3 dark:border-white/10 dark:bg-white/6">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                  <span>Completed</span>
                  <span>{completedCount}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#38bdf8_45%,#6ee7b7_100%)]"
                    style={{ width: `${nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-cyan-100/80 bg-cyan-50/80 px-4 py-3 dark:border-cyan-400/15 dark:bg-cyan-400/10">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                  Route status
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {safeSelectedIndex === currentIndex
                    ? "This is your live checkpoint. Finish it to unlock the next step."
                    : "You are reviewing an unlocked checkpoint on the route."}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {previewNode ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.98))] shadow-[0_28px_80px_rgba(15,23,42,0.25)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(11,18,34,0.98))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200/80 px-6 py-5 dark:border-white/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-200">
                    Step preview
                  </p>
                  <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950 dark:text-white">
                    {previewNode.title}
                  </h3>
                  <p className="mt-3 inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                    Unit {previewIndex != null ? Math.floor(previewIndex / 3) + 1 : 1} · Step{" "}
                    {previewIndex != null ? previewIndex + 1 : 1} · {previewNode.node_type}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewIndex(null)}
                  className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Close preview"
                >
                  <span className="material-symbols-outlined" aria-hidden>
                    close
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {preview.summary}
                </p>
              </div>

              {preview.bullets.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    What you will cover
                  </p>
                  <ul className="m-0 list-none space-y-2 p-0">
                    {preview.bullets.map((item, index) => (
                      <li
                        key={`${previewNode.id}-${index}`}
                        className="flex gap-2 rounded-xl border border-cyan-100 bg-cyan-50/70 px-3 py-3 text-sm text-slate-700 dark:border-cyan-400/15 dark:bg-cyan-400/10 dark:text-slate-200"
                      >
                        <span className="material-symbols-outlined shrink-0 text-lg text-cyan-700 dark:text-cyan-200" aria-hidden>
                          radio_button_checked
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewIndex(null)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (previewIndex != null) goToLesson(previewIndex);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  Start lesson
                  <span className="material-symbols-outlined text-lg" aria-hidden>
                    play_arrow
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
