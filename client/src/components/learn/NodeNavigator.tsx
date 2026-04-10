"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import type { LessonNodeRow, LessonNodeType } from "@/types/learning";

type NodeNavigatorProps = {
  nodes: LessonNodeRow[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  onSelectIndex: (index: number) => void;
  completedIds: Set<string>;
};

function iconForType(type: LessonNodeType) {
  switch (type) {
    case "text":
      return "article";
    case "chart":
      return "insights";
    case "image":
      return "image";
    case "quiz":
      return "quiz";
    case "flashcard":
      return "style";
    case "summary":
      return "auto_stories";
    default:
      return "radio_button_checked";
  }
}

export function NodeNavigator({
  nodes,
  currentIndex,
  onPrev,
  onNext,
  canPrev,
  canNext,
  onSelectIndex,
  completedIds,
}: NodeNavigatorProps) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeNode = nodes[currentIndex];

  useEffect(() => {
    const target = itemRefs.current[currentIndex];
    target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, [currentIndex]);

  const positions = useMemo(
    () =>
      nodes.map((_, index) => {
        const pattern = index % 4;
        if (pattern === 0) return "mr-auto";
        if (pattern === 1) return "ml-[18%]";
        if (pattern === 2) return "ml-auto";
        return "ml-[30%]";
      }),
    [nodes]
  );

  return (
    <nav aria-label="Lesson path" className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
          Learning path
        </p>
        <h4 className="mt-3 text-xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">
          Move through lessons like checkpoints.
        </h4>
        <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
          Tap any node to jump in. Your current lesson stays centered, and completed steps remain marked.
        </p>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden>
              chevron_left
            </span>
            Previous checkpoint
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            Next checkpoint
            <span className="material-symbols-outlined text-lg" aria-hidden>
              chevron_right
            </span>
          </button>
        </div>

        {activeNode ? (
          <div className="mt-5 rounded-[1.5rem] border border-cyan-200/80 bg-cyan-50/90 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-200">
              Current node
            </p>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{activeNode.title}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Step {currentIndex + 1} of {nodes.length}
            </p>
          </div>
        ) : null}
      </div>

      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,248,255,0.96))] p-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(11,18,34,0.94),rgba(9,15,28,0.98))]">
        <div className="pointer-events-none absolute left-1/2 top-6 bottom-6 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(34,211,238,0),rgba(49,94,251,0.45),rgba(15,23,42,0))] dark:bg-[linear-gradient(180deg,rgba(34,211,238,0),rgba(96,165,250,0.45),rgba(255,255,255,0))]" />

        <div className="max-h-[680px] overflow-y-auto pr-2 [scrollbar-width:thin]">
          <div className="relative mx-auto flex max-w-xl flex-col gap-4 py-6">
            {nodes.map((node, index) => {
              const completed = completedIds.has(node.id);
              const active = index === currentIndex;
              const unlocked = completed || active || index <= currentIndex + 1;
              const icon = completed ? "check" : iconForType(node.node_type);

              return (
                <div key={node.id} className={`relative flex w-full ${positions[index]}`}>
                  <motion.button
                    ref={(element) => {
                      itemRefs.current[index] = element;
                    }}
                    type="button"
                    onClick={() => onSelectIndex(index)}
                    whileHover={unlocked ? { y: -4, scale: 1.02 } : undefined}
                    whileTap={unlocked ? { scale: 0.98 } : undefined}
                    className={`group relative w-[min(100%,230px)] rounded-[1.65rem] border p-4 text-left transition-all ${
                      active
                        ? "border-cyan-300 bg-slate-950 text-white shadow-[0_22px_45px_rgba(15,23,42,0.24)] dark:border-cyan-300/30 dark:bg-white dark:text-slate-950"
                        : completed
                          ? "border-emerald-200 bg-emerald-50/90 text-slate-900 shadow-[0_14px_30px_rgba(16,185,129,0.12)] dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-white"
                          : unlocked
                            ? "border-slate-200 bg-white/90 text-slate-900 hover:border-cyan-200 hover:bg-cyan-50/70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-cyan-400/10"
                            : "border-slate-200/70 bg-slate-100/90 text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500"
                    }`}
                    aria-current={active ? "step" : undefined}
                    aria-label={`Open lesson ${index + 1}: ${node.title}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-lg ${
                          active
                            ? "border-white/15 bg-white/10 text-white dark:border-slate-200/70 dark:bg-slate-100 dark:text-slate-950"
                            : completed
                              ? "border-emerald-300 bg-emerald-500 text-white dark:border-emerald-300/30 dark:bg-emerald-400"
                              : unlocked
                                ? "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200"
                                : "border-slate-300 bg-slate-200 text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                        }`}
                      >
                        <span className="material-symbols-outlined" aria-hidden>
                          {icon}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                              active
                                ? "bg-white/10 text-white dark:bg-slate-200 dark:text-slate-950"
                                : completed
                                  ? "bg-white/80 text-emerald-700 dark:bg-white/10 dark:text-emerald-200"
                                  : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                            }`}
                          >
                            {node.node_type}
                          </span>
                          <span className="text-xs font-bold opacity-70">#{index + 1}</span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm font-bold leading-6">{node.title}</p>
                        <p
                          className={`mt-1 text-xs ${
                            active
                              ? "text-slate-300 dark:text-slate-700"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {completed ? "Completed checkpoint" : active ? "Current checkpoint" : "Open checkpoint"}
                        </p>
                      </div>
                    </div>

                    {active ? (
                      <motion.div
                        layoutId="active-node-glow"
                        className="pointer-events-none absolute -inset-px rounded-[1.65rem] border border-cyan-300/40"
                      />
                    ) : null}
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
