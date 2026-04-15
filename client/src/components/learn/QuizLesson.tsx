"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ThreeConfetti } from "@/components/learn/ThreeConfetti";

export type QuizQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

type QuizLessonProps = {
  title: string;
  questions: QuizQuestion[];
  mode: "checkpoint" | "final_exam";
  passingScore?: number;
  onPassed?: () => void;
};

export function QuizLesson({
  title,
  questions,
  mode,
  passingScore = 70,
  onPassed,
}: QuizLessonProps) {
  const normalizedQuestions = useMemo(
    () => (mode === "checkpoint" ? questions.slice(0, 3) : questions),
    [mode, questions]
  );
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [correctAnswers, setCorrectAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const completionNotifiedRef = useRef(false);
  const advanceTimerRef = useRef<number | null>(null);

  const question = normalizedQuestions[idx];
  const total = normalizedQuestions.length;

  const score = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((correctAnswers.length / total) * 100);
  }, [correctAnswers.length, total]);

  useEffect(() => {
    if (status !== "correct" || finished || idx >= total - 1) return;
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null;
      setIdx((value) => value + 1);
      setPicked(null);
      setStatus("idle");
    }, 3000);
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    };
  }, [idx, status, total, finished]);

  function notifyLessonComplete(nextCorrectCount: number) {
    if (!onPassed || completionNotifiedRef.current) return;
    const pct = total === 0 ? 0 : Math.round((nextCorrectCount / total) * 100);
    const qualifies = mode === "checkpoint" || pct >= passingScore;
    if (!qualifies) return;
    completionNotifiedRef.current = true;
    queueMicrotask(() => {
      onPassed();
    });
  }

  if (!question) {
    return <p className="text-sm text-slate-500">No questions in this lesson.</p>;
  }

  function choose(optionIndex: number) {
    if (finished || status === "correct") return;
    setPicked(optionIndex);

    if (optionIndex === question.correct_index) {
      const nextCorrect = correctAnswers.includes(idx) ? correctAnswers : [...correctAnswers, idx];
      setCorrectAnswers(nextCorrect);
      setStatus("correct");
      if (idx >= total - 1) {
        setFinished(true);
        if (mode === "checkpoint") {
          window.setTimeout(() => notifyLessonComplete(nextCorrect.length), 950);
        } else {
          notifyLessonComplete(nextCorrect.length);
        }
      }
      return;
    }

    setStatus("wrong");
  }

  function retryCurrent() {
    setPicked(null);
    setStatus("idle");
  }

  function nextExamQuestion() {
    if (idx >= total - 1) {
      setFinished(true);
      const pct = total === 0 ? 0 : Math.round((correctAnswers.length / total) * 100);
      if (pct >= passingScore) {
        notifyLessonComplete(correctAnswers.length);
      }
      return;
    }
    setIdx((value) => value + 1);
    setPicked(null);
    setStatus("idle");
  }

  function skipWaitAndAdvance() {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    nextExamQuestion();
  }

  const checkpointComplete = finished && mode === "checkpoint";
  const examPassed = finished && score >= passingScore;
  const examFailed = finished && score < passingScore;

  return (
    <article className="flex flex-col gap-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {mode === "final_exam" ? "Final exam" : "Checkpoint quiz"}
          </p>
          <p className="text-xs font-semibold text-slate-500">
            Question {idx + 1} of {total}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-white/5">
          <h3 className="text-lg font-black leading-snug text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{question.question}</p>
        </div>
      </header>

      <ul className="m-0 mt-1 flex list-none flex-col gap-4 p-0">
        {question.options.map((option, index) => {
          const selected = picked === index;
          const correct = index === question.correct_index;
          const ring =
            status === "correct" && correct
              ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/25"
              : status === "wrong" && selected
                ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                : "border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/70";

          return (
            <li key={index}>
              <button
                type="button"
                disabled={finished || status === "correct"}
                onClick={() => choose(index)}
                className={`w-full rounded-[1.25rem] border px-4 py-4 text-left text-sm font-medium transition-colors hover:border-primary/50 disabled:cursor-default ${ring}`}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>

      {status === "correct" && !finished ? (
        <section
          className="mt-2 rounded-[1.35rem] bg-emerald-50/90 p-5 text-sm text-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100"
          aria-live="polite"
        >
          <p className="font-bold">Correct.</p>
          <p className="mt-1">{question.explanation}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Next question in 3 seconds
          </p>
          <button
            type="button"
            onClick={skipWaitAndAdvance}
            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            Continue now
            <span className="material-symbols-outlined text-base" aria-hidden>
              arrow_forward
            </span>
          </button>
        </section>
      ) : null}

      {status === "wrong" ? (
        <section
          className="mt-2 rounded-[1.35rem] bg-amber-50/90 p-5 text-sm text-amber-950 dark:bg-amber-950/25 dark:text-amber-100"
          aria-live="polite"
        >
          <p className="font-bold">Not quite.</p>
          <p className="mt-1">{question.explanation}</p>
          <button
            type="button"
            onClick={retryCurrent}
            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            Try this question again
            <span className="material-symbols-outlined text-base" aria-hidden>
              refresh
            </span>
          </button>
        </section>
      ) : null}

      {checkpointComplete ? (
        <>
          <div className="pointer-events-none fixed inset-0 z-40" aria-hidden>
            <ThreeConfetti active />
          </div>
          <section className="relative z-[1] mt-4 rounded-[1.5rem] border border-emerald-300/50 bg-emerald-50/90 p-6 pt-7 dark:bg-emerald-950/25">
            <p className="text-sm font-black leading-relaxed text-emerald-900 dark:text-emerald-100">
              Checkpoint cleared. Returning you to the map...
            </p>
          </section>
        </>
      ) : null}

      {finished && mode === "final_exam" ? (
        <section
          className={`mt-4 rounded-[1.5rem] border p-6 pt-7 ${
            examPassed
              ? "border-emerald-300/50 bg-emerald-50/90 dark:bg-emerald-950/25"
              : "border-amber-300/50 bg-amber-50/90 dark:bg-amber-950/25"
          }`}
        >
          <p className="text-sm font-black leading-relaxed text-slate-900 dark:text-white">
            {examPassed ? "Final exam passed." : "Final exam not passed yet."}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Score {score}% - Required {passingScore}%
          </p>
          {examFailed ? (
            <button
              type="button"
              onClick={() => {
                completionNotifiedRef.current = false;
                setIdx(0);
                setPicked(null);
                setStatus("idle");
                setCorrectAnswers([]);
                setFinished(false);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Retake exam
            </button>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
