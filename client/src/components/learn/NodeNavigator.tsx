"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { LessonNodeRow, LessonNodeType } from "@/types/learning";

const LearnMapAmbientScene = dynamic(
  () => import("@/components/learn/LearnMapAmbientScene").then((module) => module.LearnMapAmbientScene),
  { ssr: false }
);

type NodeNavigatorProps = {
  nodes: LessonNodeRow[];
  currentIndex: number;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  completedIds: Set<string>;
};

type UnitDisplayItem = {
  kind: "unit";
  unitIndex: number;
  title: string;
  stepLabel: string;
};

type StepDisplayItem = {
  kind: "step";
  node: LessonNodeRow;
  nodeIndex: number;
};

type DisplayItem = UnitDisplayItem | StepDisplayItem;

const EDGE_OFFSET = 164;
const STEP_GAP = 170;
const UNIT_EXTRA_GAP = 56;
const UNIT_SIZE = 3;
const STEP_X_PATTERN = [26, 54, 76, 38, 68, 30];

function labelForType(type: LessonNodeType) {
  if (type === "flashcard") return "review";
  return type;
}

function summarizeUnit(nodes: LessonNodeRow[], startIndex: number, endIndex: number) {
  const slice = nodes.slice(startIndex, endIndex + 1);
  const focusNode =
    slice.find((node) => !["quiz", "summary", "flashcard"].includes(node.node_type)) ??
    slice.find((node) => node.node_type !== "quiz") ??
    slice[0];

  const stepLabel =
    startIndex === endIndex ? `Step ${startIndex + 1}` : `Steps ${startIndex + 1}-${endIndex + 1}`;

  return {
    title: focusNode?.title ?? "Learning block",
    stepLabel,
  };
}

function buildDisplayItems(nodes: LessonNodeRow[]) {
  const items: DisplayItem[] = [];

  for (let unitStart = 0; unitStart < nodes.length; unitStart += UNIT_SIZE) {
    const unitIndex = Math.floor(unitStart / UNIT_SIZE);
    const unitEnd = Math.min(nodes.length - 1, unitStart + UNIT_SIZE - 1);
    const unitSummary = summarizeUnit(nodes, unitStart, unitEnd);

    items.push({
      kind: "unit",
      unitIndex,
      title: unitSummary.title,
      stepLabel: unitSummary.stepLabel,
    });

    for (let nodeIndex = unitStart; nodeIndex <= unitEnd; nodeIndex += 1) {
      const node = nodes[nodeIndex];
      if (node) {
        items.push({
          kind: "step",
          node,
          nodeIndex,
        });
      }
    }
  }

  return items;
}

function buildPoints(displayItems: DisplayItem[]) {
  const offsets: number[] = [];
  let distanceFromBottom = EDGE_OFFSET;

  displayItems.forEach((item, index) => {
    offsets.push(distanceFromBottom);

    const next = displayItems[index + 1];
    if (!next) return;

    let gap = STEP_GAP;
    if (item.kind === "unit" || next.kind === "unit") {
      gap += UNIT_EXTRA_GAP;
    }
    distanceFromBottom += gap;
  });

  const mapHeight = Math.max(1180, distanceFromBottom + EDGE_OFFSET + 220);

  const points = displayItems.map((item, index) => ({
    x: item.kind === "unit" ? 50 : STEP_X_PATTERN[item.nodeIndex % STEP_X_PATTERN.length] ?? 50,
    y: mapHeight - offsets[index]!,
  }));

  return { mapHeight, points };
}

export function NodeNavigator({
  nodes,
  currentIndex,
  selectedIndex,
  onSelectIndex,
  completedIds,
}: NodeNavigatorProps) {
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; startY: number; scrollTop: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const displayItems = useMemo(() => buildDisplayItems(nodes), [nodes]);
  const { mapHeight, points } = useMemo(() => buildPoints(displayItems), [displayItems]);

  const pathData = useMemo(() => {
    if (points.length < 2) return "";

    return points
      .map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prev = points[index - 1];
        if (!prev) return "";
        const controlOffset = STEP_GAP * 0.42;
        return `C ${prev.x} ${prev.y - controlOffset}, ${point.x} ${point.y + controlOffset}, ${point.x} ${point.y}`;
      })
      .join(" ");
  }, [points]);

  useEffect(() => {
    const target = nodeRefs.current[selectedIndex] ?? nodeRefs.current[currentIndex];
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIndex, selectedIndex]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target.closest("button")) return;
    if (!scrollerRef.current) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      scrollTop: scrollerRef.current.scrollTop,
    };
    setDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId || !scrollerRef.current) return;
    const delta = event.clientY - dragRef.current.startY;
    scrollerRef.current.scrollTop = dragRef.current.scrollTop - delta;
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,255,0.96))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_24px_70px_rgba(148,163,184,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(10,18,34,0.96),rgba(8,12,24,0.98))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_28px_72px_rgba(2,6,23,0.4)]">
      <div
        ref={scrollerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        className={`relative max-h-[72vh] overflow-y-auto rounded-[1.6rem] border border-white/70 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_26%),linear-gradient(180deg,rgba(251,253,255,0.98),rgba(242,246,255,0.98))] px-3 py-6 md:px-6 md:py-8 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_26%),linear-gradient(180deg,rgba(11,18,34,0.96),rgba(5,10,20,0.98))] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div className="pointer-events-none absolute left-10 top-12 size-32 rounded-full bg-cyan-200/18 blur-3xl dark:bg-cyan-400/8" />
        <div className="pointer-events-none absolute bottom-12 right-12 size-36 rounded-full bg-blue-200/16 blur-3xl dark:bg-blue-500/8" />

        <div className="relative mx-auto max-w-4xl" style={{ height: `${mapHeight}px` }}>
          <div className="pointer-events-none absolute inset-0">
            <LearnMapAmbientScene height={mapHeight} />
          </div>
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 100 ${mapHeight}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d={pathData}
              fill="none"
              stroke="rgba(148,163,184,0.2)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d={pathData}
              fill="none"
              stroke="rgba(56,189,248,0.18)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeDasharray="2 4"
            />
            <path
              d={pathData}
              fill="none"
              stroke="rgba(59,130,246,0.09)"
              strokeWidth="4.2"
              strokeLinecap="round"
            />
          </svg>

          {displayItems.map((item, displayIndex) => {
            const point = points[displayIndex];
            if (!point) return null;

            if (item.kind === "unit") {
              const unitUnlocked = item.unitIndex <= Math.floor(currentIndex / UNIT_SIZE);
              const unitActive = item.unitIndex === Math.floor(selectedIndex / UNIT_SIZE);

              return (
                <div
                  key={`unit-${item.unitIndex}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${point.x}%`, top: `${point.y}px` }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.45, ease: "easeOut", delay: item.unitIndex * 0.04 }}
                    className={`relative w-[min(270px,calc(100vw-5rem))] overflow-hidden rounded-[1.5rem] border px-5 py-5 text-left shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-xl ${
                      unitUnlocked
                        ? "border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,248,255,0.95))] text-slate-950 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(16,24,40,0.94),rgba(10,18,34,0.98))] dark:text-white"
                        : "border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(234,239,246,0.94))] text-slate-500 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.9),rgba(15,23,42,0.95))] dark:text-slate-300"
                    }`}
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(148,163,184,0.35),rgba(255,255,255,0))]" />
                    <div className="relative">
                      <p className="text-[10px] font-black uppercase tracking-[0.34em] text-sky-700 dark:text-sky-200">
                        Unit {item.unitIndex + 1}
                      </p>
                      <h3 className="mt-3 text-lg font-semibold leading-6 tracking-[-0.02em] text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">
                        {item.stepLabel}
                      </p>
                    </div>
                    {unitActive ? (
                      <motion.div
                        className="pointer-events-none absolute inset-0 rounded-[1.7rem] border border-sky-300/50"
                        animate={{ opacity: [0.28, 0.82, 0.28] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      />
                    ) : null}
                  </motion.div>
                </div>
              );
            }

            const { node, nodeIndex } = item;
            const completed = completedIds.has(node.id);
            const unlocked = completed || nodeIndex <= currentIndex;
            const active = nodeIndex === selectedIndex;
            const current = nodeIndex === currentIndex && !completed;

            return (
              <div
                key={node.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${point.x}%`, top: `${point.y}px` }}
              >
                <motion.button
                  ref={(element) => {
                    nodeRefs.current[nodeIndex] = element;
                  }}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onSelectIndex(nodeIndex)}
                  whileHover={unlocked ? { y: -4, scale: 1.03 } : undefined}
                  whileTap={unlocked ? { scale: 0.98 } : undefined}
                  className="group relative flex min-w-[154px] flex-col items-center gap-3 rounded-[2rem] p-3"
                  aria-label={`${unlocked ? "Open" : "Locked"} step ${nodeIndex + 1}: ${node.title}`}
                  aria-current={active ? "step" : undefined}
                >
                  <div
                    className={`relative flex size-[5.4rem] items-center justify-center rounded-full border-[7px] transition-all ${
                      !unlocked
                        ? "border-slate-300/80 bg-[radial-gradient(circle_at_top,#f8fafc,#cbd5e1)] text-slate-400 shadow-[0_18px_35px_rgba(148,163,184,0.18)] dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top,#334155,#0f172a)] dark:text-slate-500"
                        : completed
                          ? "border-emerald-300 bg-[radial-gradient(circle_at_top,#86efac,#16a34a)] text-white shadow-[0_22px_40px_rgba(22,163,74,0.24)]"
                          : current
                            ? "border-cyan-200 bg-[radial-gradient(circle_at_top,#67e8f9,#1d4ed8)] text-white shadow-[0_24px_50px_rgba(37,99,235,0.28)]"
                            : "border-white bg-[radial-gradient(circle_at_top,#ffffff,#dbeafe)] text-slate-800 shadow-[0_20px_40px_rgba(59,130,246,0.16)] dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top,#334155,#0f172a)] dark:text-slate-100"
                    }`}
                  >
                    <span className="text-[22px] font-black tracking-[-0.04em]" aria-hidden>
                      {!unlocked ? "--" : nodeIndex + 1}
                    </span>
                    {active ? (
                      <motion.div
                        className="absolute -inset-3 rounded-full border border-cyan-300/70"
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 2.2, repeat: Infinity }}
                      />
                    ) : null}
                  </div>

                  <div
                    className={`min-w-[148px] rounded-[1.35rem] border px-3 py-3 text-center shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur-lg ${
                      !unlocked
                        ? "border-slate-200/80 bg-slate-50/95 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500"
                        : current
                          ? "border-cyan-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(237,247,255,0.96))] text-slate-900 dark:border-cyan-400/20 dark:bg-[linear-gradient(180deg,rgba(18,28,46,0.95),rgba(10,20,36,0.96))] dark:text-white"
                          : "border-white/80 bg-white/94 text-slate-700 dark:border-white/10 dark:bg-white/8 dark:text-slate-100"
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
                      Step {nodeIndex + 1}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{node.title}</p>
                    <p
                      className={`mt-2 text-[10px] font-bold uppercase tracking-[0.18em] ${
                        completed
                          ? "text-emerald-600 dark:text-emerald-200"
                          : current
                            ? "text-cyan-700 dark:text-cyan-200"
                            : "text-slate-400 dark:text-slate-400"
                      }`}
                    >
                      {labelForType(node.node_type)}
                    </p>
                  </div>
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
