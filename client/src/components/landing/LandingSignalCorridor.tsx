"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const corridorSignals = ["Retrieval chain", "Knowledge graph", "Guided study route"];

export function LandingSignalCorridor() {
  const ref = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const stageScale = useTransform(scrollYProgress, [0, 1], [1, reducedMotion ? 1 : 1.04]);
  const copyY = useTransform(scrollYProgress, [0, 1], [reducedMotion ? 0 : 32, reducedMotion ? 0 : -28]);
  const summaryY = useTransform(scrollYProgress, [0, 0.5, 1], [reducedMotion ? 0 : 92, 0, reducedMotion ? 0 : -72]);
  const summaryX = useTransform(scrollYProgress, [0, 1], [reducedMotion ? 0 : -22, reducedMotion ? 0 : 36]);
  const summaryRotate = useTransform(scrollYProgress, [0, 1], [reducedMotion ? 0 : -5, reducedMotion ? 0 : 4]);
  const graphY = useTransform(scrollYProgress, [0, 0.5, 1], [reducedMotion ? 0 : 56, 0, reducedMotion ? 0 : -48]);
  const graphRotate = useTransform(scrollYProgress, [0, 1], [reducedMotion ? 0 : 3, reducedMotion ? 0 : -2]);
  const chatY = useTransform(scrollYProgress, [0, 0.5, 1], [reducedMotion ? 0 : 116, 0, reducedMotion ? 0 : -84]);
  const chatX = useTransform(scrollYProgress, [0, 1], [reducedMotion ? 0 : 24, reducedMotion ? 0 : -32]);
  const chatRotate = useTransform(scrollYProgress, [0, 1], [reducedMotion ? 0 : 4, reducedMotion ? 0 : -4]);
  const pulseOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.15, 0.32, 0.22]);

  return (
    <section ref={ref} className="relative h-[185vh]">
      <div className="sticky top-16 flex h-[calc(100svh-4rem)] items-center overflow-hidden border-y border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(243,248,255,0.92))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(9,16,31,0.98),rgba(6,11,22,1))]">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-10 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 xl:px-10">
          <motion.div style={{ y: copyY }} className="max-w-xl self-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Scroll theater</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl dark:text-white">
              One route, multiple layers of understanding.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600 dark:text-slate-300">
              As you move down the page, the product story stays grounded in the same idea: documents become
              retrieval-ready structure, interactive study flows, and visual knowledge systems inside one workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {corridorSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full border border-slate-200/80 bg-white/78 px-4 py-2 text-sm text-slate-600 shadow-[0_10px_28px_rgba(148,163,184,0.12)] backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:shadow-none"
                >
                  {signal}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            style={{ scale: stageScale }}
            className="relative min-h-[540px] overflow-hidden rounded-[2.3rem] border border-white/70 bg-[linear-gradient(160deg,rgba(245,250,255,0.95),rgba(229,240,255,0.88))] p-6 shadow-[0_35px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(160deg,rgba(14,23,42,0.95),rgba(11,20,38,0.95))] dark:shadow-[0_35px_90px_rgba(2,6,23,0.62)]"
          >
            <motion.div
              style={{ opacity: pulseOpacity }}
              className="absolute inset-x-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 blur-3xl"
            />

            <motion.div
              style={{ y: summaryY, x: summaryX, rotate: summaryRotate }}
              className="absolute left-4 top-8 w-[min(320px,70%)] rounded-[1.8rem] border border-white/75 bg-white/88 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/72 dark:shadow-[0_24px_60px_rgba(2,6,23,0.45)]"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-200">
                Summary layer
              </p>
              <h3 className="mt-3 text-xl font-bold text-slate-950 dark:text-white">
                Get the shape of the document first.
              </h3>
              <div className="mt-4 space-y-3">
                {["Top thesis extracted", "Main claims ranked", "Next action surfaced"].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              style={{ y: graphY, rotate: graphRotate }}
              className="absolute left-1/2 top-16 w-[min(360px,76%)] -translate-x-1/2 rounded-[1.9rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(238,246,255,0.82))] p-5 shadow-[0_28px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(12,20,36,0.9))] dark:shadow-[0_28px_70px_rgba(2,6,23,0.52)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                    Graph layer
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                    Relationships stay visible.
                  </p>
                </div>
                <span className="material-symbols-outlined text-cyan-500" aria-hidden>
                  hub
                </span>
              </div>
              <div className="relative mt-5 h-44 overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(84,130,255,0.18),transparent_40%),linear-gradient(180deg,rgba(248,250,252,1),rgba(238,244,255,1))] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(84,130,255,0.24),transparent_35%),linear-gradient(180deg,rgba(3,7,18,1),rgba(7,16,34,1))]">
                {["Methods", "Signals", "Claims", "Findings", "Metrics"].map((node, index) => {
                  const positions = [
                    "left-[11%] top-[24%]",
                    "left-[38%] top-[12%]",
                    "right-[10%] top-[28%]",
                    "left-[26%] bottom-[16%]",
                    "right-[16%] bottom-[18%]",
                  ];
                  return (
                    <div
                      key={node}
                      className={`absolute ${positions[index]} rounded-full border border-slate-300/70 bg-white/85 px-3 py-1 text-xs font-medium text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/8 dark:text-slate-200 dark:shadow-none`}
                    >
                      {node}
                    </div>
                  );
                })}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M20 34 C35 18, 48 18, 58 26" stroke="rgba(96,165,250,0.55)" strokeWidth="0.7" fill="none" />
                  <path d="M58 26 C70 30, 72 40, 80 62" stroke="rgba(34,211,238,0.45)" strokeWidth="0.7" fill="none" />
                  <path d="M20 34 C26 56, 34 64, 44 76" stroke="rgba(59,130,246,0.35)" strokeWidth="0.7" fill="none" />
                  <path d="M44 76 C58 68, 64 56, 74 42" stroke="rgba(56,189,248,0.45)" strokeWidth="0.7" fill="none" />
                </svg>
              </div>
            </motion.div>

            <motion.div
              style={{ y: chatY, x: chatX, rotate: chatRotate }}
              className="absolute bottom-8 right-4 w-[min(300px,68%)] rounded-[1.8rem] border border-white/75 bg-white/88 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/74 dark:shadow-[0_24px_60px_rgba(2,6,23,0.45)]"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-200">
                Retrieval layer
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white dark:bg-slate-900">
                  What changed between section two and section four?
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
                  Section four reframes the earlier claim with stronger evidence and adds a measurable benchmark.
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
