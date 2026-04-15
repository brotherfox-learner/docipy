"use client";

import { motion } from "framer-motion";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ThreeConfetti } from "@/components/learn/ThreeConfetti";

type FinalExamCongratsOverlayProps = {
  documentId: string;
  documentTitle: string;
};

export function FinalExamCongratsOverlay({ documentId, documentTitle }: FinalExamCongratsOverlayProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const show = searchParams.get("completed") === "final";

  if (!show) return null;

  function dismiss() {
    router.replace(`/documents/${documentId}/learn`);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="final-exam-congrats-heading"
    >
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="absolute inset-0 z-0 cursor-default border-0 bg-transparent p-0"
        aria-label="Dismiss celebration overlay"
        onClick={() => dismiss()}
      />
      <ul className="pointer-events-none absolute inset-0 z-0 m-0 list-none p-0" aria-hidden>
        <li className="absolute left-[6%] top-[14%] size-2.5 rounded-full bg-amber-400/50 motion-safe:animate-pulse" />
        <li className="absolute left-[18%] top-[72%] size-2 rounded-full bg-cyan-400/45 motion-safe:animate-pulse motion-safe:[animation-delay:200ms]" />
        <li className="absolute right-[12%] top-[22%] size-3 rounded-full bg-emerald-400/40 motion-safe:animate-pulse motion-safe:[animation-delay:400ms]" />
        <li className="absolute right-[24%] top-[68%] size-2 rounded-full bg-sky-400/50 motion-safe:animate-pulse motion-safe:[animation-delay:100ms]" />
        <li className="absolute left-[42%] top-[8%] size-2 rounded-full bg-primary/40 motion-safe:animate-pulse motion-safe:[animation-delay:300ms]" />
        <li className="absolute right-[40%] bottom-[12%] size-2.5 rounded-full bg-teal-400/45 motion-safe:animate-pulse motion-safe:[animation-delay:500ms]" />
      </ul>

      <ThreeConfetti active={show} />

      <motion.article
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative z-[1] w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.98))] p-8 shadow-[0_28px_80px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(11,18,34,0.99))]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex justify-center">
          <motion.div
            initial={{ scale: 0.6, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.08 }}
            className="flex size-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,#22d3ee_0%,#38bdf8_40%,#34d399_100%)] text-white shadow-lg shadow-cyan-500/30"
            aria-hidden
          >
            <span className="material-symbols-outlined text-5xl">emoji_events</span>
          </motion.div>
        </div>

        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
          className="text-center"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-300">
            Final exam cleared
          </p>
          <h2
            id="final-exam-congrats-heading"
            className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white"
          >
            Congratulations!
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            You passed the final quiz on{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-100">{documentTitle}</span>. Your progress is
            saved—keep exploring the map or revisit any checkpoint.
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35 }}
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <button
            type="button"
            onClick={() => dismiss()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-8 py-3 text-sm font-bold text-white shadow-[0_18px_35px_rgba(15,23,42,0.2)] transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden>
              map
            </span>
            Back to map
          </button>
        </motion.div>
      </motion.article>
    </div>
  );
}
